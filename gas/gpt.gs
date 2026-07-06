function buildGptPrompt(rowData) {
  let prompt = `당신은 건축자재 상세 이미지를 설계하는 전문 디자이너 AI입니다.
반드시 아래 형식의 완전한 JSON 객체만 출력하십시오.
다른 문장, 설명, 공백, 마크다운 코드블록을 절대 포함하지 마십시오.

출력 형식:
{
  "full_image_prompt": "..."
}

조건:
- 800x1400 세로형 상세 이미지 제작 지시문(full_image_prompt)을 작성하십시오.
- 반드시 Section 1, Section 2, Section 3를 명시하십시오.
- product_image_url(${rowData.productImageUrl})을 반드시 그대로 포함하십시오.
- section2_type이 comparison이면 반드시 “일반 MDF vs 고밀도 HDF” 비교 구조를 시각적으로 명확히 지시하십시오.
- 한글 텍스트 배치 및 좌/우 배치 지시를 포함하여 매우 구체적으로 작성하십시오.
- 디자인 실행이 가능하도록 400자 이상 상세히 기술하십시오.`;

  return prompt;
}

function callGpt(rowData) {
  const config = getConfig();
  const systemPrompt = buildGptPrompt(rowData);
  const userPrompt = `입력 데이터:\nproduct_name: ${rowData.productName}\nsection2_type: ${rowData.section2Type}\ndescription_html: ${rowData.descriptionHtml}`;

  const payload = {
    model: "gpt-4-turbo-preview",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.1,
    response_format: { type: "json_object" }
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + config.OPENAI_API_KEY },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch("https://api.openai.com/v1/chat/completions", options);
  const responseText = response.getContentText();
  const resJson = JSON.parse(responseText);

  if (response.getResponseCode() !== 200) {
    throw new Error("GPT API 에러: " + (resJson.error ? resJson.error.message : responseText));
  }

  const result = JSON.parse(resJson.choices[0].message.content);

  if (!result.full_image_prompt) {
    throw new Error("Invalid GPT JSON structure");
  }

  return result;
}
