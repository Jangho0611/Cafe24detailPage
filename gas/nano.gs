const NANO_API_URL = "https://api.nanobanana.com/v1/render";

function buildNanoPayload(full_image_prompt) {
  return {
    "prompt": full_image_prompt,
    "width": 800,
    "height": 1400
  };
}

function callNano(payload) {
  const config = getConfig();
  const options = {
    method: "post",
    contentType: "application/json",
    headers: { "X-API-KEY": config.NANOBANANA_API_KEY },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(NANO_API_URL, options);
  const responseText = response.getContentText();
  let resJson;
  
  try {
    resJson = JSON.parse(responseText);
  } catch (e) {
    throw new Error("Nanobanana API 파싱 에러: " + responseText);
  }

  if (response.getResponseCode() !== 200) {
    throw new Error("Nanobanana API 에러: " + (resJson.error || responseText));
  }

  if (!resJson.image_url) {
    throw new Error("Nanobanana API 에러: 결과이미지 URL이 응답에 없습니다.");
  }

  return resJson.image_url;
}
