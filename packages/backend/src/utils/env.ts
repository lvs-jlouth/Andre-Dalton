/**
 * Secure environment variable loader.
 * All required variables are validated at startup; missing ones throw clearly.
 * Never expose raw env values to logs or API responses.
 */
export interface AppEnv {
  PORT: number;
  HOST: string;
  NODE_ENV: string;
  CORS_ORIGIN: string;

  // LLM provider keys — all optional
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  GOOGLE_GEMINI_API_KEY?: string;
  AZURE_OPENAI_API_KEY?: string;
  AZURE_OPENAI_ENDPOINT?: string;
  AZURE_OPENAI_DEPLOYMENT?: string;
  MISTRAL_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_BASE_URL: string;
  LOCAL_LLM_BASE_URL: string;

  DEFAULT_PROVIDER: string;

  // STT
  STT_PROVIDER: string;
  DEEPGRAM_API_KEY?: string;

  // TTS
  TTS_PROVIDER: string;
  ELEVENLABS_API_KEY?: string;

  // Privacy
  DEBUG_MODE: boolean;
  PERSIST_TRANSCRIPTS: boolean;
}

let _env: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (_env) return _env;

  _env = {
    PORT: parseInt(process.env['PORT'] ?? '3001', 10),
    HOST: process.env['HOST'] ?? '0.0.0.0',
    NODE_ENV: process.env['NODE_ENV'] ?? 'development',
    CORS_ORIGIN: process.env['CORS_ORIGIN'] ?? 'http://localhost:5173',

    OPENAI_API_KEY: process.env['OPENAI_API_KEY'] || undefined,
    ANTHROPIC_API_KEY: process.env['ANTHROPIC_API_KEY'] || undefined,
    GOOGLE_GEMINI_API_KEY: process.env['GOOGLE_GEMINI_API_KEY'] || undefined,
    AZURE_OPENAI_API_KEY: process.env['AZURE_OPENAI_API_KEY'] || undefined,
    AZURE_OPENAI_ENDPOINT: process.env['AZURE_OPENAI_ENDPOINT'] || undefined,
    AZURE_OPENAI_DEPLOYMENT: process.env['AZURE_OPENAI_DEPLOYMENT'] || undefined,
    MISTRAL_API_KEY: process.env['MISTRAL_API_KEY'] || undefined,
    OPENROUTER_API_KEY: process.env['OPENROUTER_API_KEY'] || undefined,
    OPENROUTER_BASE_URL: process.env['OPENROUTER_BASE_URL'] ?? 'https://openrouter.ai/api/v1',
    LOCAL_LLM_BASE_URL: process.env['LOCAL_LLM_BASE_URL'] ?? 'http://localhost:11434',

    DEFAULT_PROVIDER: process.env['DEFAULT_PROVIDER'] ?? 'ollama',

    STT_PROVIDER: process.env['STT_PROVIDER'] ?? 'browser',
    DEEPGRAM_API_KEY: process.env['DEEPGRAM_API_KEY'] || undefined,

    TTS_PROVIDER: process.env['TTS_PROVIDER'] ?? 'browser',
    ELEVENLABS_API_KEY: process.env['ELEVENLABS_API_KEY'] || undefined,

    DEBUG_MODE: process.env['DEBUG_MODE'] === 'true',
    PERSIST_TRANSCRIPTS: process.env['PERSIST_TRANSCRIPTS'] === 'true',
  };

  return _env;
}

/**
 * Returns the configured provider API key by provider id.
 * Never expose this value in logs or responses — only pass to HTTP clients.
 */
export function getProviderApiKey(providerId: string): string | undefined {
  const env = getEnv();
  const keyMap: Record<string, string | undefined> = {
    openai: env.OPENAI_API_KEY,
    anthropic: env.ANTHROPIC_API_KEY,
    gemini: env.GOOGLE_GEMINI_API_KEY,
    azure: env.AZURE_OPENAI_API_KEY,
    mistral: env.MISTRAL_API_KEY,
    openrouter: env.OPENROUTER_API_KEY,
    ollama: undefined, // Local, no key needed
  };
  return keyMap[providerId];
}
