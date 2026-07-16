const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { google } = require('googleapis');
const OpenAI = require('openai');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const SHEET_NAME = '시트4';
const MAX_ROWS_PER_RUN = 3;
const DESKTOP_INFO_DIR = path.join(os.homedir(), 'Desktop', '인포');
const AUDIT_DIR = path.join(DESKTOP_INFO_DIR, 'audit');
const LOCK_STALE_MS = 30 * 60 * 1000;
const OWNED_ROW_LOCKS = new Set();
const CAFE24_BASE_URL =
  'https://ecimg.cafe24img.com/pg2383b21973322017/daesan3833/web/prod_detail/infographic';
const DEFAULT_CONFIG_PATH = path.join(__dirname, 'image-config.json');
const IMAGE_CONFIG_PATH = process.env.IMAGE_CONFIG_PATH
  ? path.resolve(process.env.IMAGE_CONFIG_PATH)
  : DEFAULT_CONFIG_PATH;

const COL = {
  PRODUCT_NAME: 2,
  GRADE: 5,
  IMAGE_URL: 15,
  IMAGE_PROVIDER: 16,
  IMAGE_URL_2: 17,
  TYPE: 18,
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
  const audit = createAuditLogger();
  const targetRow = getTargetRowArg(process.argv.slice(2));

  audit.write('run_started', {
    startedAt: new Date().toISOString(),
    pid: process.pid,
    cwd: process.cwd(),
    scriptPath: __filename,
    scriptSha256: sha256(fs.readFileSync(__filename)),
    targetRow,
  });

  const sheets = await getSheetsClient();
  const sheetId = await getSheetId(sheets);
  const rows = await getPromptCreatedRows(sheets, targetRow);

  if (rows.length === 0) {
    console.log('처리할 행이 없습니다. U열 = PROMPT_CREATED 인 행이 없습니다.');
    return;
  }

  const providers = createProviders(imageConfig);

  for (const row of rows.slice(0, MAX_ROWS_PER_RUN)) {
    await processRow({ providers, imageConfig, sheets, sheetId, row, audit });
  }

  audit.write('run_finished', { finishedAt: new Date().toISOString() });
}

function getTargetRowArg(args) {
  const index = args.indexOf('--row');
  if (index === -1) return null;
  const row = Number(args[index + 1]);
  if (!Number.isInteger(row) || row < 2) {
    throw new Error('--row 뒤에는 2 이상의 행 번호가 필요합니다.');
  }
  return row;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function createAuditLogger() {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
  const runId = new Date().toISOString().replace(/[:.]/g, '-') + '.' + process.pid;
  const filePath = path.join(AUDIT_DIR, `run-images.${runId}.jsonl`);
  return {
    filePath,
    write(event, details) {
      fs.appendFileSync(filePath, JSON.stringify({ event, ...details }) + '\n', 'utf8');
    },
  };
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
      generate: async (prompt, audit, imageSize) => {
        const response = await callGptImageAPIWithRetry(openai, imageConfig.gpt_model, prompt, imageSize);
        auditOpenAIResponse(audit, response);
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

async function getPromptCreatedRows(sheets, targetRow) {
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
    const productName = row[COL.PRODUCT_NAME - 1] || '';
    const grade = row[COL.GRADE - 1] || '';
    const type = row[COL.TYPE - 1] || '';
    const isSelectedRow = targetRow === rowIndex;

    if ((isSelectedRow || (!targetRow && status === STATUS.PROMPT_CREATED)) && prompt.trim()) {
      const isTwoPartInfographic = isVerticalGeneralPlywoodInfographic({ productName, grade, type });
      const imageSize = isTwoPartInfographic
        ? '1024x1536'
        : '1024x1024';
      let imageJobs = [];
      let manifestError = null;
      try {
        imageJobs = parseImageJobs(prompt, isTwoPartInfographic);
      } catch (error) {
        manifestError = withPartContext(error, 0, 'manifest');
      }
      rows.push({
        rowIndex,
        imageProvider,
        productName,
        imageSize,
        imageJobs,
        manifestError,
      });
    }
  }

  return rows;
}

function parseImageJobs(value, isTwoPartInfographic) {
  if (!isTwoPartInfographic) {
    return [{ key: 'default', prompt: String(value || '') }];
  }
  let manifest;
  try {
    manifest = JSON.parse(value);
  } catch (error) {
    throw new Error('일반합판 Type A 프롬프트 Manifest JSON 파싱 실패');
  }
  const images = manifest && manifest.version === 1 && Array.isArray(manifest.images)
    ? manifest.images
    : [];
  const expectedKeys = ['overview', 'guide'];
  if (
    images.length !== 2 ||
    images.some((image) => !image || !String(image.prompt || '').trim()) ||
    images.some((image, index) => image.key !== expectedKeys[index]) ||
    new Set(images.map((image) => image.key)).size !== images.length
  ) {
    throw new Error('일반합판 Type A 프롬프트 Manifest는 이미지 2개가 필요합니다.');
  }
  return images.map((image) => ({ key: String(image.key), prompt: String(image.prompt) }));
}

function isVerticalGeneralPlywoodInfographic(data) {
  const productName = String(data && data.productName || '').trim().replace(/\s+/g, ' ');
  const grade = String(data && data.grade || '').trim();
  const type = String(data && data.type || '').trim();
  const isGeneralPlywoodName = /^일반합판\(수입산\) (?:4\*8|3\*6)$/.test(productName);
  const isGeneralPlywoodKnowledge = isGeneralPlywoodName && /^BB\s*\/\s*CC$/i.test(grade);
  return type === 'A' && isGeneralPlywoodKnowledge;
}

async function processRow({ providers, imageConfig, sheets, sheetId, row, audit }) {
  const { rowIndex, imageJobs } = row;
  const isTwoPartInfographic = Boolean(row.manifestError) || imageJobs.length === 2;
  const lock = acquireRowLock(rowIndex);

  if (!lock) {
    audit.write('row_skipped_locked', { rowIndex, skippedAt: new Date().toISOString() });
    return;
  }

  console.log(`처리 시작: row ${rowIndex}`);

  try {
    if (row.manifestError) throw row.manifestError;
    const imageUrls = [];
    const generatedParts = [];
    for (let index = 0; index < imageJobs.length; index += 1) {
      const job = imageJobs[index];
      const partIndex = index + 1;
      const fileStem = isTwoPartInfographic ? `${rowIndex}_${partIndex}` : String(rowIndex);
      const localFile = path.join(DESKTOP_INFO_DIR, `${fileStem}.png`);
      const imageUrl = `${CAFE24_BASE_URL}/${fileStem}.png`;
      audit.write('request_ready', {
        rowIndex,
        partIndex,
        imageKey: job.key,
        productName: row.productName,
        provider: resolveRowProvider(row.imageProvider),
        imageSize: row.imageSize,
        filePath: localFile,
        promptLength: job.prompt.length,
        promptBytes: Buffer.byteLength(job.prompt, 'utf8'),
        promptSha256: sha256(Buffer.from(job.prompt, 'utf8')),
        promptFirst500: job.prompt.slice(0, 500),
        promptLast500: job.prompt.slice(-500),
      });
      let buffer;
      try {
        const generated = await generateImage({
          providers,
          imageConfig,
          row: { ...row, prompt: job.prompt },
          audit,
        });
        buffer = await materializeImageBuffer(generated);
      } catch (error) {
        throw withPartContext(error, partIndex, job.key);
      }
      generatedParts.push({ localFile, buffer, partIndex, imageKey: job.key });
      imageUrls.push(imageUrl);
    }
    let savedParts;
    try {
      savedParts = isTwoPartInfographic
        ? saveImageSetAtomically(generatedParts)
        : [saveImageAtomically(generatedParts[0].localFile, generatedParts[0].buffer)];
    } catch (error) {
      throw error.partIndex ? error : withPartContext(error, 0, 'save');
    }
    savedParts.forEach((saved, index) => {
      const part = generatedParts[index];
      audit.write('image_saved', {
        rowIndex,
        partIndex: part.partIndex,
        imageKey: part.imageKey,
        imageSize: row.imageSize,
        ...saved,
      });
      console.log(`이미지 저장: row ${rowIndex} part ${part.partIndex} -> ${part.localFile}`);
    });
    await updateRowSuccess({ sheets, sheetId, rowIndex, imageUrls, isTwoPartInfographic });
    console.log(`완료: row ${rowIndex}`);
  } catch (error) {
    audit.write('row_failed', {
      rowIndex,
      partIndex: error.partIndex || null,
      imageKey: error.imageKey || null,
      message: normalizeErrorMessage(error),
    });
    await updateRowError({ sheets, sheetId, rowIndex, error });
    console.error(`실패: row ${rowIndex} -> ${error.message}`);
  } finally {
    releaseRowLock(lock);
  }
}

function withPartContext(error, partIndex, imageKey) {
  const wrapped = error instanceof Error ? error : new Error(String(error));
  wrapped.partIndex = partIndex;
  wrapped.imageKey = imageKey;
  return wrapped;
}

async function generateImage({ providers, imageConfig, row, audit }) {
  const { prompt, imageSize } = row;

  const primaryProvider = resolveRowProvider(row.imageProvider);
  const fallbackProvider = getFallbackProvider(imageConfig, primaryProvider);

  try {
    return await runProvider(providers, primaryProvider, prompt, audit, imageSize);
  } catch (error) {
    if (!fallbackProvider) {
      throw error;
    }

    console.warn(
      `1차 provider 실패: ${primaryProvider} -> ${error.message}\nfallback provider ${fallbackProvider} 로 재시도합니다.`
    );
    return runProvider(providers, fallbackProvider, prompt, audit, imageSize);
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

async function runProvider(providers, providerName, prompt, audit, imageSize) {
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
  return provider.generate(prompt, audit, imageSize);
}

async function callGptImageAPIWithRetry(openai, model, prompt, imageSize, maxRetry = 3) {
  for (let i = 0; i < maxRetry; i += 1) {
    try {
      return await openai.images.generate({
        model,
        prompt,
        n: 1,
        size: imageSize,
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

function auditOpenAIResponse(audit, response) {
  const data = Array.isArray(response && response.data) ? response.data : [];
  const first = data[0] || {};
  audit.write('openai_response', {
    receivedAt: new Date().toISOString(),
    responseFields: Object.keys(response || {}),
    created: response && response.created,
    usage: response && response.usage,
    revisedPrompt: first.revised_prompt || null,
    dataLength: data.length,
    hasB64Json: typeof first.b64_json === 'string' && first.b64_json.length > 0,
    hasUrl: typeof first.url === 'string' && first.url.length > 0,
  });
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

async function materializeImageBuffer(generated) {
  if (generated.type === 'buffer') {
    return generated.data;
  }

  if (generated.type === 'url') {
    const response = await axios.get(generated.data, {
      responseType: 'arraybuffer',
      timeout: 60000,
    });
    return Buffer.from(response.data);
  }

  throw new Error(`지원하지 않는 이미지 저장 타입입니다: ${generated.type}`);
}

function saveImageAtomically(localFile, buffer) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const tempFile = `${localFile.slice(0, -4)}.${timestamp}.${process.pid}.tmp.png`;
  const bufferHash = sha256(buffer);

  fs.writeFileSync(tempFile, buffer, { flag: 'wx' });
  const tempBuffer = fs.readFileSync(tempFile);
  const tempHash = sha256(tempBuffer);
  if (bufferHash !== tempHash) {
    fs.unlinkSync(tempFile);
    throw new Error('임시 이미지 파일 해시가 저장 전 버퍼와 일치하지 않습니다.');
  }

  fs.renameSync(tempFile, localFile);
  const fileBuffer = fs.readFileSync(localFile);
  const stat = fs.statSync(localFile);
  const fileHash = sha256(fileBuffer);

  return {
    bufferBytes: buffer.length,
    bufferSha256: bufferHash,
    tempFile,
    tempBytes: tempBuffer.length,
    tempSha256: tempHash,
    filePath: localFile,
    fileBytes: stat.size,
    fileModifiedAt: stat.mtime.toISOString(),
    fileSha256: fileHash,
    hashesMatch: bufferHash === tempHash && tempHash === fileHash,
  };
}

function saveImageSetAtomically(parts) {
  const transactionId = new Date().toISOString().replace(/[:.]/g, '-') + '.' + process.pid;
  const staged = [];
  const backups = [];
  const committed = [];
  try {
    parts.forEach((part) => {
      const stageFile = `${part.localFile}.${transactionId}.stage`;
      staged.push({ ...part, stageFile });
      try {
        fs.writeFileSync(stageFile, part.buffer, { flag: 'wx' });
        const stageBuffer = fs.readFileSync(stageFile);
        if (sha256(stageBuffer) !== sha256(part.buffer)) {
          throw new Error('스테이징 이미지 해시가 생성 버퍼와 일치하지 않습니다.');
        }
      } catch (error) {
        throw withPartContext(error, part.partIndex, part.imageKey);
      }
    });

    staged.forEach((part) => {
      if (fs.existsSync(part.localFile)) {
        const backupFile = `${part.localFile}.${transactionId}.backup`;
        try {
          fs.renameSync(part.localFile, backupFile);
        } catch (error) {
          throw withPartContext(error, part.partIndex, part.imageKey);
        }
        backups.push({ localFile: part.localFile, backupFile });
      }
    });

    staged.forEach((part) => {
      try {
        fs.renameSync(part.stageFile, part.localFile);
        committed.push(part.localFile);
      } catch (error) {
        throw withPartContext(error, part.partIndex, part.imageKey);
      }
    });

    const results = staged.map((part) => {
      const fileBuffer = fs.readFileSync(part.localFile);
      const stat = fs.statSync(part.localFile);
      return {
        bufferBytes: part.buffer.length,
        bufferSha256: sha256(part.buffer),
        filePath: part.localFile,
        fileBytes: stat.size,
        fileModifiedAt: stat.mtime.toISOString(),
        fileSha256: sha256(fileBuffer),
        hashesMatch: sha256(part.buffer) === sha256(fileBuffer),
      };
    });
    backups.forEach((backup) => {
      try {
        fs.unlinkSync(backup.backupFile);
      } catch (error) {
        console.warn(`백업 파일 정리 실패: ${backup.backupFile} -> ${error.message}`);
      }
    });
    return results;
  } catch (error) {
    committed.forEach((file) => {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    });
    backups.forEach((backup) => {
      if (fs.existsSync(backup.backupFile)) fs.renameSync(backup.backupFile, backup.localFile);
    });
    staged.forEach((part) => {
      if (fs.existsSync(part.stageFile)) fs.unlinkSync(part.stageFile);
    });
    throw error;
  }
}

function acquireRowLock(rowIndex) {
  const lockPath = path.join(DESKTOP_INFO_DIR, `.row-${rowIndex}.lock`);
  const payload = JSON.stringify({
    pid: process.pid,
    startedAt: new Date().toISOString(),
    scriptPath: __filename,
    hostname: os.hostname(),
  });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      fs.writeFileSync(lockPath, payload, { flag: 'wx' });
      OWNED_ROW_LOCKS.add(lockPath);
      return lockPath;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const stat = fs.statSync(lockPath);
      const ageMs = Date.now() - stat.mtimeMs;
      let existing = null;
      try {
        existing = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      } catch (parseError) {
        existing = null;
      }
      const existingPid = Number(existing && existing.pid);
      const sameScript = existing && existing.scriptPath === __filename;
      const sameHostname = existing && existing.hostname === os.hostname();
      const legacyLocalLock = existing && !existing.hostname && sameScript;
      if ((sameHostname || legacyLocalLock) && sameScript && Number.isInteger(existingPid) && existingPid > 0) {
        const pidAlive = getPidLiveness(existingPid);
        if (pidAlive === true) {
          console.log(`건너뜀: row ${rowIndex}는 PID ${existingPid}가 처리 중입니다.`);
          return null;
        }
        if (pidAlive === false) {
          fs.unlinkSync(lockPath);
          console.log(`stale lock 제거: row ${rowIndex} / dead PID ${existingPid}`);
          continue;
        }
      }
      if (ageMs <= LOCK_STALE_MS) {
        console.log(`건너뜀: row ${rowIndex}는 다른 프로세스가 처리 중입니다.`);
        return null;
      }
      fs.unlinkSync(lockPath);
      console.log(`stale lock 제거: row ${rowIndex} / TTL 초과`);
    }
  }

  return null;
}

function getPidLiveness(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error && error.code === 'ESRCH') return false;
    if (error && error.code === 'EPERM') return true;
    return null;
  }
}

function releaseRowLock(lockPath) {
  if (lockPath && fs.existsSync(lockPath) && isCurrentProcessLock(lockPath)) fs.unlinkSync(lockPath);
  if (lockPath) OWNED_ROW_LOCKS.delete(lockPath);
}

function isCurrentProcessLock(lockPath) {
  try {
    const payload = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    return Number(payload.pid) === process.pid &&
      payload.hostname === os.hostname() &&
      payload.scriptPath === __filename;
  } catch (error) {
    return false;
  }
}

function cleanupOwnedRowLocks() {
  Array.from(OWNED_ROW_LOCKS).forEach((lockPath) => releaseRowLock(lockPath));
}

function registerLockSignalHandlers() {
  process.once('SIGINT', () => {
    cleanupOwnedRowLocks();
    process.exit(130);
  });
  process.once('SIGTERM', () => {
    cleanupOwnedRowLocks();
    process.exit(143);
  });
}

async function updateRowSuccess({ sheets, sheetId, rowIndex, imageUrls, isTwoPartInfographic }) {
  const firstImageUrl = imageUrls[0] || '';
  const secondImageUrl = imageUrls[1] || '';
  const data = [
    {
      range: `${SHEET_NAME}!O${rowIndex}`,
      values: [[firstImageUrl]],
    },
  ];
  if (isTwoPartInfographic) {
    data.push({
      range: `${SHEET_NAME}!Q${rowIndex}`,
      values: [[secondImageUrl]],
    });
  }
  data.push(
    {
      range: `${SHEET_NAME}!U${rowIndex}`,
      values: [[STATUS.IMAGE_SAVED]],
    },
    {
      range: `${SHEET_NAME}!V${rowIndex}`,
      values: [['']],
    }
  );
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    requestBody: {
      valueInputOption: 'RAW',
      data,
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
  const context = error && (error.partIndex || error.imageKey)
    ? `partIndex=${error.partIndex}, imageKey=${error.imageKey || 'unknown'}: `
    : '';
  const message = context + normalizeErrorMessage(error);

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

registerLockSignalHandlers();

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
