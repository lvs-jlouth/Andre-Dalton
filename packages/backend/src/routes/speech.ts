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

    // Future: plug in Deepgram, Whisper, etc. here
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

    return reply.status(501).send({ error: `TTS provider "${ttsProvider}" not yet implemented server-side` });
  });
}
