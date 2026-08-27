export {
  allDefaultTemplates,
  buildDefaultTemplates,
  defaultContentFor,
  DEFAULT_TEMPLATE_LANGUAGE,
  resolveTemplateLanguage,
  TEMPLATE_LANGUAGES,
} from "./default-templates";
export { createPreviewContext } from "./preview-fixture";
export { listUnsupportedVariables, renderOrderTemplate } from "./render-template";
export { getTemplate, loadTemplates } from "./template-store";
export {
  extractPlaceholders,
  isVariableSupported,
  templateVariables,
} from "./template-variables";
export type {
  MessageTemplateRecord,
  RenderTemplateResult,
  TemplateKind,
  TemplateRenderContext,
  TemplateVariableDef,
  TemplateVariableKey,
} from "./types";
export { validateTemplateContent, type TemplateValidation } from "./validate-template";
