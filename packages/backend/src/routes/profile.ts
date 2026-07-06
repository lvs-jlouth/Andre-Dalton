import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  getDefaultSpeechProfile,
  parseSpeechProfile,
  validateSpeechProfile,
} from '../services/speechProfile.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('route:profile');

export async function profileRoutes(app: FastifyInstance): Promise<void> {
  /** GET /profile/speech — return the current speech profile (sanitised) */
  app.get('/speech', async (_req, reply) => {
    // In MVP: return defaults.  Future: load from encrypted user store.
    const profile = getDefaultSpeechProfile();
    return reply.send({ profile });
  });

  /** PUT /profile/speech — update the speech profile */
  app.put('/speech', async (req, reply) => {
    const validation = validateSpeechProfile(req.body);
    if (!validation.valid) {
      return reply.status(400).send({ error: 'Invalid speech profile', details: validation.errors });
    }

    const profile = parseSpeechProfile(req.body);
    log.info('Speech profile updated');
    // In MVP: acknowledge only.  Future: persist to encrypted storage.
    return reply.send({ profile, saved: true });
  });
}
