import type { FastifyInstance } from 'fastify';
import {
  parseSpeechProfile,
  validateSpeechProfile,
} from '../services/speechProfile.js';
import { loadUserSettings, saveUserSettings } from '../services/userSettingsStore.js';
import { createLogger } from '../utils/logger.js';
import { getUserIdentityKey } from '../utils/userIdentity.js';

const log = createLogger('route:profile');

export async function profileRoutes(app: FastifyInstance): Promise<void> {
  /** GET /profile/speech — return the current speech profile (sanitised) */
  app.get('/speech', async (req, reply) => {
    const userKey = getUserIdentityKey(req);
    const settings = await loadUserSettings(userKey);
    const profile = settings.speechProfile;
    return reply.send({ profile });
  });

  /** PUT /profile/speech — update the speech profile */
  app.put('/speech', async (req, reply) => {
    const validation = validateSpeechProfile(req.body);
    if (!validation.valid) {
      return reply.status(400).send({ error: 'Invalid speech profile', details: validation.errors });
    }

    const profile = parseSpeechProfile(req.body);
    try {
      const userKey = getUserIdentityKey(req);
      const current = await loadUserSettings(userKey);
      const saved = await saveUserSettings(userKey, {
        ...current,
        speechProfile: profile,
        updatedAt: new Date().toISOString(),
      });
      log.info('Speech profile updated');
      return reply.send({ profile: saved.speechProfile, saved: true });
    } catch (err) {
      log.error('Failed to save speech profile', err);
      return reply.status(500).send({ error: 'Failed to save speech profile' });
    }
  });
}
