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
  AZURE_OPENAI_DEPLOYMENT_GPT_5_5?: string;
  AZURE_OPENAI_DEPLOYMENT_GPT_5_MINI?: string;
  AZURE_OPENAI_DEPLOYMENT_GPT_5_NANO?: string;
  AZURE_OPENAI_API_VERSION?: string;
  MISTRAL_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_BASE_URL: string;
  LOCAL_LLM_BASE_URL: string;

  DEFAULT_PROVIDER: string;

  // STT
  STT_PROVIDER: string;
  DEEPGRAM_API_KEY?: string;
  OPENAI_STT_MODEL: string;

  // TTS
  TTS_PROVIDER: string;
  ELEVENLABS_API_KEY?: string;
  OPENAI_TTS_MODEL: string;
  AZURE_SPEECH_KEY?: string;
  AZURE_SPEECH_REGION?: string;
  AZURE_SPEECH_ENDPOINT?: string;
  AZURE_SPEECH_VOICE: string;

  // Privacy
  DEBUG_MODE: boolean;
  PERSIST_TRANSCRIPTS: boolean;

  // Azure Blob Storage for settings persistence
  AZURE_STORAGE_ACCOUNT_NAME?: string;

  // Microsoft Graph / M365 context (optional — requires admin consent activation)
  M365_TENANT_ID?: string;
  M365_CLIENT_ID?: string;
  M365_CLIENT_SECRET?: string;

  // Legacy SharePoint / Graph settings (kept for backward compat, unused when blob is configured)
  GRAPH_TENANT_ID?: string;
  GRAPH_CLIENT_ID?: string;
  GRAPH_CLIENT_SECRET?: string;
  SHAREPOINT_SITE_ID?: string;
  SHAREPOINT_SETTINGS_FOLDER: string;
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
    AZURE_OPENAI_DEPLOYMENT_GPT_5_5: process.env['AZURE_OPENAI_DEPLOYMENT_GPT_5_5'] || undefined,
    AZURE_OPENAI_DEPLOYMENT_GPT_5_MINI: process.env['AZURE_OPENAI_DEPLOYMENT_GPT_5_MINI'] || undefined,
    AZURE_OPENAI_DEPLOYMENT_GPT_5_NANO: process.env['AZURE_OPENAI_DEPLOYMENT_GPT_5_NANO'] || undefined,
    AZURE_OPENAI_API_VERSION: process.env['AZURE_OPENAI_API_VERSION'] || undefined,
    MISTRAL_API_KEY: process.env['MISTRAL_API_KEY'] || undefined,
    OPENROUTER_API_KEY: process.env['OPENROUTER_API_KEY'] || undefined,
    OPENROUTER_BASE_URL: process.env['OPENROUTER_BASE_URL'] ?? 'https://openrouter.ai/api/v1',
    LOCAL_LLM_BASE_URL: process.env['LOCAL_LLM_BASE_URL'] ?? 'http://localhost:11434',

    DEFAULT_PROVIDER: process.env['DEFAULT_PROVIDER'] ?? 'azure',

    STT_PROVIDER: process.env['STT_PROVIDER'] ?? 'browser',
    DEEPGRAM_API_KEY: process.env['DEEPGRAM_API_KEY'] || undefined,
    OPENAI_STT_MODEL: process.env['OPENAI_STT_MODEL'] ?? 'gpt-4o-mini-transcribe',

    TTS_PROVIDER: process.env['TTS_PROVIDER'] ?? 'browser',
    ELEVENLABS_API_KEY: process.env['ELEVENLABS_API_KEY'] || undefined,
    OPENAI_TTS_MODEL: process.env['OPENAI_TTS_MODEL'] ?? 'gpt-4o-mini-tts',
    AZURE_SPEECH_KEY: process.env['AZURE_SPEECH_KEY'] || undefined,
    AZURE_SPEECH_REGION: process.env['AZURE_SPEECH_REGION'] || undefined,
    AZURE_SPEECH_ENDPOINT: process.env['AZURE_SPEECH_ENDPOINT'] || undefined,
    AZURE_SPEECH_VOICE: process.env['AZURE_SPEECH_VOICE'] ?? 'en-GB-SoniaNeural',

    DEBUG_MODE: process.env['DEBUG_MODE'] === 'true',
    PERSIST_TRANSCRIPTS: process.env['PERSIST_TRANSCRIPTS'] === 'true',

    GRAPH_TENANT_ID: process.env['GRAPH_TENANT_ID'] || undefined,
    GRAPH_CLIENT_ID: process.env['GRAPH_CLIENT_ID'] || undefined,
    GRAPH_CLIENT_SECRET: process.env['GRAPH_CLIENT_SECRET'] || undefined,
    SHAREPOINT_SITE_ID: process.env['SHAREPOINT_SITE_ID'] || undefined,
    SHAREPOINT_SETTINGS_FOLDER: process.env['SHAREPOINT_SETTINGS_FOLDER'] ?? 'JargiinSettings',

    AZURE_STORAGE_ACCOUNT_NAME: process.env['AZURE_STORAGE_ACCOUNT_NAME'] || undefined,
    M365_TENANT_ID: process.env['M365_TENANT_ID'] || undefined,
    M365_CLIENT_ID: process.env['M365_CLIENT_ID'] || undefined,
    M365_CLIENT_SECRET: process.env['M365_CLIENT_SECRET'] || undefined,
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
