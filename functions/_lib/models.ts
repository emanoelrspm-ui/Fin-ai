/**
 * Modelos do Cloudflare Workers AI centralizados para fácil substituição.
 * Consulte os IDs disponíveis no catálogo da Cloudflare caso algum modelo seja atualizado.
 */
export const AI_MODELS = {
  TEXT: '@cf/meta/llama-3.1-8b-instruct',
  VISION: '@cf/meta/llama-3.2-11b-vision-instruct',
} as const;

export const AI_DAILY_LIMIT = 40;

/**
 * Prompt único exigido pela Cloudflare na primeira execução de modelos Llama 3.2 Vision
 * caso a licença da Meta ainda não tenha sido aceita na conta.
 */
export const VISION_LICENSE_ACCEPT_PROMPT = 'agree';
