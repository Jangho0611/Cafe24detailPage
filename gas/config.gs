/**
 * File: config.gs
 */
function getConfig() {
  const props = PropertiesService.getScriptProperties();
  const openai = props.getProperty("OPENAI_API_KEY");
  const nano = props.getProperty("NANOBANANA_API_KEY");
  const template = props.getProperty("TEMPLATE_UID");

  if (!openai || !nano || !template) {
    throw new Error("Missing required Script Properties.");
  }

  return {
    OPENAI_API_KEY: openai,
    NANOBANANA_API_KEY: nano,
    TEMPLATE_UID: template
  };
}
