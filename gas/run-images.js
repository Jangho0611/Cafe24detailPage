const fs = require('fs');
const os = require('os');
const path = require('path');
const { google } = require('googleapis');
const OpenAI = require('openai');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const SHEET_NAME = '시트4';
const MAX_ROWS_PER_RUN = 3;
const DESKTOP_INFO_DIR = path.join(os.homedir(), 'Desktop', '인포');
const CAFE24_BASE_URL =
  'https://ecimg.cafe24img.com/pg2383b21973322017/daesan3833/web/prod_detail/infographic';
const DEFAULT_CONFIG_PATH = path.join(__dirname, 'image-config.json');
const IMAGE_CONFIG_PATH = process.env.IMAGE_CONFIG_PATH
  ? path.resolve(process.env.IMAGE_CONFIG_PATH)
  : DEFAULT_CONFIG_PATH;

const COL = {
  IMAGE_URL: 15,
  IMAGE_PROVIDER: 16,
  PROMPT: 20,
  STATUS: 21,
  ERROR: 22,
};

const STATUS = {
  PROMPT_CREATED: 'PROMPT_CREATED',
  IMAGE_SAVED: 'IMAGE_SAVED',
  ERROR: 'ERROR',
};

const DEFAULT_IMAGE_CONFIG = {
  image_provider: 'gpt',
  gpt_model: 'gpt-image-2',
  nano_banana_model: 'gemini-3-pro-image',
  nano_banana_fast_model: 'gemini-3.1-flash-image',
  fallback_provider: 'gpt',
  nano_banana_response_format: {
    type: 'image',
    mime_type: 'image/jpeg',
    aspect_ratio: '1:1',
    image_size: '1K',
  },
};

async function main() {
  const imageConfig = loadImageConfig();
  validateBaseEnv();
  ensureOutputDir();

  const sheets = await getSheetsClient();
  const sheetId = await getSheetId(sheets);
  const rows = await getPromptCreatedRows(sheets);

  if (rows.length === 0) {
    console.log('처리할 행이 없습니다. U열 = PROMPT_CREATED 인 행이 없습니다.');
    return;
  }

  const providers = createProviders(imageConfig);

  for (const row of rows.slice(0, MAX_ROWS_PER_RUN)) {
    await processRow({ providers, imageConfig, sheets, sheetId, row });
  }
}

function loadImageConfig() {
  if (!fs.existsSync(IMAGE_CONFIG_PATH)) {
    throw new Error(`이미지 설정 파일이 없습니다: ${IMAGE_CONFIG_PATH}`);
  }

  const fileContent = fs.readFileSync(IMAGE_CONFIG_PATH, 'utf8');
  let parsed;

  try {
    parsed = JSON.parse(fileContent);
  } catch (error) {
    throw new Error(`이미지 설정 파일 JSON 파싱 실패: ${error.message}`);
  }

  const config = {
    ...DEFAULT_IMAGE_CONFIG,
    ...parsed,
    nano_banana_response_format: {
      ...DEFAULT_IMAGE_CONFIG.nano_banana_response_format,
      ...(parsed.nano_banana_response_format || {}),
    },
  };

  validateImageConfig(config);
  return config;
}

function validateImageConfig(config) {
  const allowedProviders = ['gpt', 'nano_banana'];

  if (!allowedProviders.includes(config.image_provider)) {
    throw new Error(`지원하지 않는 image_provider 입니다: ${config.image_provider}`);
  }

  if (config.fallback_provider && !allowedProviders.includes(config.fallback_provider)) {
    throw new Error(`지원하지 않는 fallback_provider 입니다: ${config.fallback_provider}`);
  }

  if (!config.gpt_model) {
    throw new Error('gpt_model 설정이 비어 있습니다.');
  }

  if (!config.nano_banana_model) {
    throw new Error('nano_banana_model 설정이 비어 있습니다.');
  }
}

function validateBaseEnv() {
  const required = ['GOOGLE_SHEET_ID'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`필수 환경변수가 비어 있습니다: ${missing.join(', ')}`);
  }
}

function createProviders(imageConfig) {
  const providers = {};

  if (process.env.OPENAI_API_KEY) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    providers.gpt = {
      model: imageConfig.gpt_model,
      generate: async (prompt) => {
        const response = await callGptImageAPIWithRetry(openai, imageConfig.gpt_model, prompt);
        return extractOpenAIImageBuffer(response);
      },
    };
  }

  if (process.env.GEMINI_API_KEY) {
    providers.nano_banana = {
      model: imageConfig.nano_banana_model,
      generate: async (prompt) => {
        const response = await callNanoBananaAPIWithRetry(imageConfig, prompt);
        return extractNanoBananaImageBuffer(response);
      },
    };
  }

  return providers;
}

function ensureOutputDir() {
  fs.mkdirSync(DESKTOP_INFO_DIR, { recursive: true });
}

async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const authClient = await auth.getClient();
  return google.sheets({ version: 'v4', auth: authClient });
}

async function getSheetId(sheets) {
  const response = await sheets.spreadsheets.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    fields: 'sheets(properties(sheetId,title))',
  });

  const sheet = (response.data.sheets || []).find(
    (item) => item.properties && item.properties.title === SHEET_NAME
  );

  if (!sheet || !sheet.properties || typeof sheet.properties.sheetId !== 'number') {
    throw new Error(`${SHEET_NAME} 시트를 찾을 수 없습니다.`);
  }

  return sheet.properties.sheetId;
}

async function getPromptCreatedRows(sheets) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAME}!A:V`,
  });

  const values = response.data.values || [];
  const rows = [];

  for (let i = 1; i < values.length; i += 1) {
    const rowIndex = i + 1;
    const row = values[i];
    const prompt = row[COL.PROMPT - 1] || '';
    const status = row[COL.STATUS - 1] || '';
    const imageProvider = row[COL.IMAGE_PROVIDER - 1] || '';

    if (status === STATUS.PROMPT_CREATED && prompt.trim()) {
      rows.push({
        rowIndex,
        prompt,
        imageProvider,
      });
    }
  }

  return rows;
}

async function processRow({ providers, imageConfig, sheets, sheetId, row }) {
  const { rowIndex, prompt } = row;
  const localFile = path.join(DESKTOP_INFO_DIR, `${rowIndex}.png`);
  const imageUrl = `${CAFE24_BASE_URL}/${rowIndex}.png`;

  console.log(`처리 시작: row ${rowIndex}`);

  try {
    const generated = await generateImage({ providers, imageConfig, row });
    await saveImage(localFile, generated);
    await updateRowSuccess({ sheets, sheetId, rowIndex, imageUrl });
    console.log(`완료: row ${rowIndex} -> ${localFile}`);
  } catch (error) {
    await updateRowError({ sheets, sheetId, rowIndex, error });
    console.error(`실패: row ${rowIndex} -> ${error.message}`);
  }
}

async function generateImage({ providers, imageConfig, row }) {
  const { prompt } = row;
  console.log('=== 전달 프롬프터 ===');
  console.log(prompt);
  console.log('=== 프롬프터 끝 ===');

  const primaryProvider = resolveRowProvider(row.imageProvider);
  const fallbackProvider = getFallbackProvider(imageConfig, primaryProvider);

  try {
    return await runProvider(providers, primaryProvider, prompt);
  } catch (error) {
    if (!fallbackProvider) {
      throw error;
    }

    console.warn(
      `1차 provider 실패: ${primaryProvider} -> ${error.message}\nfallback provider ${fallbackProvider} 로 재시도합니다.`
    );
    return runProvider(providers, fallbackProvider, prompt);
  }
}

function resolveRowProvider(rawValue) {
  const value = String(rawValue || '').trim();

  if (!value) {
    return 'gpt';
  }

  if (value === 'gpt' || value === 'nano_banana') {
    return value;
  }

  throw new Error('이미지엔진 값 오류');
}

function getFallbackProvider(imageConfig, primaryProvider) {
  const fallbackProvider = imageConfig.fallback_provider;

  if (!fallbackProvider || fallbackProvider === primaryProvider) {
    return null;
  }

  return fallbackProvider;
}

async function runProvider(providers, providerName, prompt) {
  const provider = providers[providerName];

  if (!provider) {
    if (providerName === 'gpt') {
      throw new Error('OPENAI_API_KEY 없음');
    }
    if (providerName === 'nano_banana') {
      throw new Error('GEMINI_API_KEY 없음');
    }
    throw new Error(`provider 초기화 실패: ${providerName}`);
  }

  console.log(`이미지 provider: ${providerName} / model: ${provider.model}`);
  return provider.generate(prompt);
}

async function callGptImageAPIWithRetry(openai, model, prompt, maxRetry = 3) {
  for (let i = 0; i < maxRetry; i += 1) {
    try {
      return await openai.images.generate({
        model,
        prompt,
        n: 1,
        size: '1024x1024',
      });
    } catch (error) {
      const status = error?.status || error?.response?.status;
      console.log(`GPT 재시도 ${i + 1}/${maxRetry} — 오류: ${status} ${error.message}`);
      if ([429, 502, 503].includes(status) && i < maxRetry - 1) {
        await wait(3000 * (i + 1));
        continue;
      }
      throw error;
    }
  }
}

function extractOpenAIImageBuffer(response) {
  if (!response.data || !response.data[0]) {
    throw new Error('OpenAI 이미지 응답이 비어 있습니다.');
  }

  const imgData = response.data[0];

  if (imgData.b64_json) {
    return { type: 'buffer', data: Buffer.from(imgData.b64_json, 'base64') };
  }

  if (imgData.url) {
    return { type: 'url', data: imgData.url };
  }

  throw new Error('OpenAI 이미지 데이터가 없습니다.');
}

async function callNanoBananaAPIWithRetry(imageConfig, prompt, maxRetry = 3) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/interactions';

  for (let i = 0; i < maxRetry; i += 1) {
    try {
      const response = await axios.post(
        url,
        {
          model: imageConfig.nano_banana_model,
          input: prompt,
          response_modalities: ['image'],
          response_format: imageConfig.nano_banana_response_format,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': process.env.GEMINI_API_KEY,
          },
          timeout: 120000,
        }
      );

      return response.data;
    } catch (error) {
      const status = error?.response?.status;
      const message = extractAxiosErrorMessage(error);
      console.log(`Nano Banana 재시도 ${i + 1}/${maxRetry} — 오류: ${status} ${message}`);
      if ([429, 500, 502, 503].includes(status) && i < maxRetry - 1) {
        await wait(3000 * (i + 1));
        continue;
      }
      throw new Error(`Nano Banana API 오류: ${message}`);
    }
  }
}

function extractNanoBananaImageBuffer(response) {
  if (response?.output?.length) {
    const imageBlock = response.output.find((item) => item?.data);
    if (imageBlock?.data) {
      return { type: 'buffer', data: Buffer.from(imageBlock.data, 'base64') };
    }
  }

  if (response?.output_image?.data) {
    return { type: 'buffer', data: Buffer.from(response.output_image.data, 'base64') };
  }

  if (Array.isArray(response?.steps)) {
    for (const step of response.steps) {
      if (!Array.isArray(step?.content)) continue;
      const imageBlock = step.content.find((item) => item?.type === 'image' && item?.data);
      if (imageBlock?.data) {
        return { type: 'buffer', data: Buffer.from(imageBlock.data, 'base64') };
      }
    }
  }

  throw new Error('Nano Banana 이미지 응답이 비어 있습니다.');
}

async function saveImage(localFile, generated) {
  if (generated.type === 'buffer') {
    fs.writeFileSync(localFile, generated.data);
    return;
  }

  if (generated.type === 'url') {
    const response = await axios.get(generated.data, {
      responseType: 'arraybuffer',
      timeout: 60000,
    });
    fs.writeFileSync(localFile, Buffer.from(response.data));
    return;
  }

  throw new Error(`지원하지 않는 이미지 저장 타입입니다: ${generated.type}`);
}

async function updateRowSuccess({ sheets, sheetId, rowIndex, imageUrl }) {
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        {
          range: `${SHEET_NAME}!O${rowIndex}`,
          values: [[imageUrl]],
        },
        {
          range: `${SHEET_NAME}!U${rowIndex}`,
          values: [[STATUS.IMAGE_SAVED]],
        },
        {
          range: `${SHEET_NAME}!V${rowIndex}`,
          values: [['']],
        },
      ],
    },
  });

  await setRowStatusColor({
    sheets,
    sheetId,
    rowIndex,
    red: 0.91,
    green: 0.97,
    blue: 0.91,
  });
}

async function updateRowError({ sheets, sheetId, rowIndex, error }) {
  const message = normalizeErrorMessage(error);

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        {
          range: `${SHEET_NAME}!U${rowIndex}`,
          values: [[STATUS.ERROR]],
        },
        {
          range: `${SHEET_NAME}!V${rowIndex}`,
          values: [[message]],
        },
      ],
    },
  });

  await setRowStatusColor({
    sheets,
    sheetId,
    rowIndex,
    red: 0.98,
    green: 0.9,
    blue: 0.9,
  });
}

function normalizeErrorMessage(error) {
  if (!error) return '알 수 없는 오류';
  if (typeof error.message === 'string' && error.message) return error.message.slice(0, 500);
  return String(error).slice(0, 500);
}

async function setRowStatusColor({ sheets, sheetId, rowIndex, red, green, blue }) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: rowIndex - 1,
              endRowIndex: rowIndex,
              startColumnIndex: COL.STATUS - 1,
              endColumnIndex: COL.ERROR,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red, green, blue },
              },
            },
            fields: 'userEnteredFormat.backgroundColor',
          },
        },
      ],
    },
  });
}

function extractAxiosErrorMessage(error) {
  if (typeof error?.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }

  if (typeof error?.response?.data?.message === 'string') {
    return error.response.data.message;
  }

  if (typeof error?.message === 'string') {
    return error.message;
  }

  return '알 수 없는 API 오류';
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
