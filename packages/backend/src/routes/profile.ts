import type { FastifyInstance } from 'fastify';
import {
  parseSpeechProfile,
  sanitizeSpeechProfileForStorage,
  validateSpeechProfile,
} from '../services/speechProfile.js';
import { EncryptedProfileStore } from '../services/encryptedProfileStore.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('route:profile');
const profileStore = new EncryptedProfileStore();

export async function profileRoutes(app: FastifyInstance): Promise<void> {
  /** GET /profile/speech — return the current speech profile (sanitised) */
  app.get('/speech', async (_req, reply) => {
    try {
      const profile = await profileStore.loadProfile();
      return reply.send({ profile: sanitizeSpeechProfileForStorage(profile) });
    } catch (error) {
      log.error('Failed to load encrypted speech profile', error);
      return reply.status(500).send({ error: 'Unable to load speech profile' });
    }
  });

  /** PUT /profile/speech — update the speech profile */
  app.put('/speech', async (req, reply) => {
    const validation = validateSpeechProfile(req.body);
    if (!validation.valid) {
      return reply.status(400).send({ error: 'Invalid speech profile', details: validation.errors });
    }

    try {
      const currentProfile = await profileStore.loadProfile();
      const profile = parseSpeechProfile(req.body, currentProfile);
      const savedProfile = await profileStore.saveProfile(profile);
      log.info('Speech profile updated');
      return reply.send({ profile: savedProfile, saved: true });
    } catch (error) {
      log.error('Failed to save encrypted speech profile', error);
      return reply.status(500).send({ error: 'Unable to save speech profile' });
    }
  });
}
