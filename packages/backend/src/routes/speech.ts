import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createLogger } from '../utils/logger.js';
import { getEnv } from '../utils/env.js';

const log = createLogger('route:speech');

const TranscribeSchema = z.object({
  /** base64-encoded audio payload when audio is sent as JSON */
  audioBase64: z.string().optional(),
  /** MIME type of the audio, e.g. "audio/webm" */
  mimeType: z.string().optional(),
  /** Language hint, BCP-47 tag e.g. "en-US" */
  language: z.string().optional(),
  /** Speech profile id for custom vocabulary / pause-tolerance settings */
  profileId: z.string().optional(),
});

const SpeakSchema = z.object({
  text: z.string().min(1).max(5000),
  voiceId: z.string().optional(),
  rate: z.number().min(0.5).max(2.0).optional(),
  pitch: z.number().min(0.0).max(2.0).optional(),
  volume: z.number().min(0.0).max(1.0).optional(),
});

function escapeXml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function normalizeAzureVoiceId(input: string | undefined, envDefault: string): string {
  const raw = (input ?? '').trim();
  if (/^[a-z]{2}-[A-Z]{2}-[A-Za-z]+Neural$/.test(raw)) return raw;
  const hint = raw.toLowerCase();
  const hasWord = (word: string) => new RegExp(`(?:^|[^a-z])${word}(?:[^a-z]|$)`, 'i').test(hint);
  if (hint.includes('sonia') || hint.includes('libby') || hint.includes('ava')) return 'en-GB-SoniaNeural';
  if (hint.includes('ryan') || hint.includes('thomas') || hint.includes('guy')) return 'en-GB-RyanNeural';
  if (hint.includes('onyx') || hint.includes('echo') || hint.includes('fable')) return 'en-GB-RyanNeural';
  if (hint.includes('nova') || hint.includes('shimmer') || hint.includes('coral')) return 'en-GB-SoniaNeural';
  if (hasWord('female') || hint.includes('friendly') || hint.includes('warm')) return 'en-GB-SoniaNeural';
  if (hint.includes('british') || hint.includes('butler') || hasWord('male')) return 'en-GB-RyanNeural';
  return envDefault;
}

function normalizeOpenAiVoiceId(input: string | undefined): string {
  const raw = (input ?? '').trim().toLowerCase();
  const hasWord = (word: string) => new RegExp(`(?:^|[^a-z])${word}(?:[^a-z]|$)`, 'i').test(raw);
  if (['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse'].includes(raw)) {
    return raw;
  }
  if (raw.includes('warm') || raw.includes('friendly') || hasWord('female') || raw.includes('sonia')) return 'nova';
  if (raw.includes('butler') || raw.includes('british') || hasWord('male') || raw.includes('ryan')) return 'onyx';
  if (raw.includes('scientific') || raw.includes('precise')) return 'sage';
  return 'alloy';
}

function mapRateToSsml(rate: number | undefined): string {
  const v = typeof rate === 'number' ? Math.min(2, Math.max(0.5, rate)) : 1;
  const percent = Math.round((v - 1) * 100);
  return `${percent >= 0 ? '+' : ''}${percent}%`;
}

function mapPitchToSsml(pitch: number | undefined): string {
  const v = typeof pitch === 'number' ? Math.min(2, Math.max(0, pitch)) : 1;
  const percent = Math.round((v - 1) * 50);
  return `${percent >= 0 ? '+' : ''}${percent}%`;
}

function mapVolumeToSsml(volume: number | undefined): string {
  const v = typeof volume === 'number' ? Math.min(1, Math.max(0, volume)) : 1;
  const percent = Math.round(v * 100);
  return `${percent}%`;
}

async function transcribeWithOpenAI(input: {
  audioBase64: string;
  mimeType?: string;
  language?: string;
}): Promise<{ transcript: string }> {
  const env = getEnv();
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for openai-stt');
  }

  const mimeType = input.mimeType?.trim() || 'audio/webm';
  const ext = mimeType.includes('wav') ? 'wav' : mimeType.includes('mp3') ? 'mp3' : 'webm';
  const audioBuffer = Buffer.from(input.audioBase64, 'base64');
  const audioBlob = new Blob([audioBuffer], { type: mimeType });
  const form = new FormData();
  form.append('model', env.OPENAI_STT_MODEL);
  form.append('file', audioBlob, `speech.${ext}`);
  if (input.language) form.append('language', input.language);

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: form,
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    throw new Error(`OpenAI STT API error: ${res.status}`);
  }

  const json = await res.json() as { text?: string };
  return { transcript: (json.text ?? '').trim() };
}

async function synthesizeWithOpenAI(input: {
  text: string;
  voiceId?: string;
  rate?: number;
}): Promise<{ audioBase64: string; mimeType: string }> {
  const env = getEnv();
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for openai-tts');
  }

  const voice = normalizeOpenAiVoiceId(input.voiceId);
  const speed = typeof input.rate === 'number' ? Math.min(2, Math.max(0.25, input.rate)) : 1;

  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.OPENAI_TTS_MODEL,
      voice,
      input: input.text,
      format: 'mp3',
      speed,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    throw new Error(`OpenAI TTS API error: ${res.status}`);
  }

  const audioBuffer = Buffer.from(await res.arrayBuffer());
  return {
    audioBase64: audioBuffer.toString('base64'),
    mimeType: 'audio/mpeg',
  };
}

async function synthesizeWithAzureSpeech(input: {
  text: string;
  voiceId?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}): Promise<{ audioBase64: string; mimeType: string; voiceId: string }> {
  const env = getEnv();
  if (!env.AZURE_SPEECH_KEY) {
    throw new Error('AZURE_SPEECH_KEY is required for azure-speech');
  }
  if (!env.AZURE_SPEECH_REGION && !env.AZURE_SPEECH_ENDPOINT) {
    throw new Error('AZURE_SPEECH_REGION or AZURE_SPEECH_ENDPOINT is required for azure-speech');
  }

  const endpoint = env.AZURE_SPEECH_ENDPOINT
    ? `${env.AZURE_SPEECH_ENDPOINT.replace(/\/+$/, '')}/cognitiveservices/v1`
    : `https://${env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const voice = normalizeAzureVoiceId(input.voiceId, env.AZURE_SPEECH_VOICE);
  const text = escapeXml(input.text);
  const ssml = `<speak version="1.0" xml:lang="en-GB"><voice name="${voice}"><prosody rate="${mapRateToSsml(input.rate)}" pitch="${mapPitchToSsml(input.pitch)}" volume="${mapVolumeToSsml(input.volume)}">${text}</prosody></voice></speak>`;

  const headers: Record<string, string> = {
    'Ocp-Apim-Subscription-Key': env.AZURE_SPEECH_KEY,
    'Content-Type': 'application/ssml+xml',
    'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
    'User-Agent': 'jargiin-api',
  };
  if (env.AZURE_SPEECH_REGION) {
    headers['Ocp-Apim-Subscription-Region'] = env.AZURE_SPEECH_REGION;
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: ssml,
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    throw new Error(`Azure Speech TTS API error: ${res.status}`);
  }

  const audioBuffer = Buffer.from(await res.arrayBuffer());
  return {
    audioBase64: audioBuffer.toString('base64'),
    mimeType: 'audio/mpeg',
    voiceId: voice,
  };
}

export async function speechRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /speech/transcribe
   * Placeholder: routes audio to the configured STT provider.
   * In MVP, browser-side STT is used; this endpoint is the server stub
   * for future cloud STT integration (e.g. Deepgram, Whisper).
   */
  app.post('/transcribe', async (req, reply) => {
    const parsed = TranscribeSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
    }

    const env = getEnv();
    const sttProvider = env.STT_PROVIDER;

    // Privacy: never log the audio content or transcript
    log.info(`STT transcription request, provider: ${sttProvider}`);

    if (sttProvider === 'browser') {
      // Browser-side STT — server acts only as a relay confirmation
      return reply.send({
        status: 'browser_stt',
        message: 'Use browser Web Speech API for client-side STT',
      });
    }

    if (sttProvider === 'openai-stt' || sttProvider === 'openai') {
      if (!parsed.data.audioBase64) {
        return reply.status(400).send({ error: 'audioBase64 is required for openai-stt' });
      }
      try {
        const result = await transcribeWithOpenAI({
          audioBase64: parsed.data.audioBase64,
          mimeType: parsed.data.mimeType,
          language: parsed.data.language,
        });
        return reply.send({
          status: 'ok',
          transcript: result.transcript,
          provider: 'openai-stt',
          model: env.OPENAI_STT_MODEL,
        });
      } catch (err) {
        log.error('OpenAI STT transcription failed', err);
        return reply.status(502).send({ error: 'Failed to transcribe speech with OpenAI STT' });
      }
    }

    return reply.status(501).send({ error: `STT provider "${sttProvider}" not yet implemented server-side` });
  });

  /**
   * POST /speech/speak
   * Placeholder: routes TTS request to the configured provider.
   * In MVP, browser-side TTS is used; this stub supports future cloud TTS.
   */
  app.post('/speak', async (req, reply) => {
    const parsed = SpeakSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
    }

    const env = getEnv();
    const ttsProvider = env.TTS_PROVIDER;

    // Privacy: never log text content
    log.info(`TTS synthesis request, provider: ${ttsProvider}`);

    if (ttsProvider === 'browser') {
      return reply.send({
        status: 'browser_tts',
        message: 'Use browser SpeechSynthesis API for client-side TTS',
      });
    }

    if (ttsProvider === 'openai-tts' || ttsProvider === 'openai') {
      try {
        const audio = await synthesizeWithOpenAI({
          text: parsed.data.text,
          voiceId: parsed.data.voiceId,
          rate: parsed.data.rate,
        });
        return reply.send({
          status: 'ok',
          provider: 'openai-tts',
          model: env.OPENAI_TTS_MODEL,
          ...audio,
        });
      } catch (err) {
        log.error('OpenAI TTS synthesis failed', err);
        return reply.status(502).send({ error: 'Failed to synthesize speech with OpenAI TTS' });
      }
    }

    if (ttsProvider === 'azure-speech' || ttsProvider === 'azure') {
      try {
        const audio = await synthesizeWithAzureSpeech({
          text: parsed.data.text,
          voiceId: parsed.data.voiceId,
          rate: parsed.data.rate,
          pitch: parsed.data.pitch,
          volume: parsed.data.volume,
        });
        return reply.send({
          status: 'ok',
          provider: 'azure-speech',
          model: 'azure-neural-tts',
          ...audio,
        });
      } catch (err) {
        log.error('Azure Speech TTS synthesis failed', err);
        return reply.status(502).send({ error: 'Failed to synthesize speech with Azure Speech TTS' });
      }
    }

    return reply.status(501).send({ error: `TTS provider "${ttsProvider}" not yet implemented server-side` });
  });
}
