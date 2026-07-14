import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createLogger } from '../utils/logger.js';
import { getUserIdentityKey } from '../utils/userIdentity.js';
import {
  getDefaultUserSettings,
  loadUserSettings,
  saveUserSettings,
  type AccessibilitySettings,
  type PrivacySettings,
} from '../services/userSettingsStore.js';
import { parseSpeechProfile, validateSpeechProfile } from '../services/speechProfile.js';

const log = createLogger('route:settings');

const AccessibilitySchema = z.object({
  reducedMotion: z.boolean().optional(),
  highContrast: z.boolean().optional(),
  largeText: z.boolean().optional(),
  fontScale: z.number().min(0.8).max(2.5).optional(),
  captions: z.boolean().optional(),
  onHandedLayout: z.enum(['none', 'left', 'right']).optional(),
  keyboardNavigation: z.boolean().optional(),
  largeHitTargets: z.boolean().optional(),
});

const PrivacySchema = z.object({
  persistTranscripts: z.boolean().optional(),
  consentSpeechImprovement: z.boolean().optional(),
  debugMode: z.boolean().optional(),
  m365ContextEnabled: z.boolean().optional(),
});

const UserConfigSchema = z.object({
  speechProfile: z.record(z.unknown()),
  accessibility: AccessibilitySchema,
  privacy: PrivacySchema,
});

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  /** GET /settings/accessibility */
  app.get('/accessibility', async (req, reply) => {
    const userKey = getUserIdentityKey(req);
    const settings = await loadUserSettings(userKey);
    return reply.send({ accessibility: settings.accessibility });
  });

  /** PUT /settings/accessibility */
  app.put('/accessibility', async (req, reply) => {
    const parsed = AccessibilitySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid settings', details: parsed.error.flatten() });
    }

    try {
      const userKey = getUserIdentityKey(req);
      const current = await loadUserSettings(userKey);
      const accessibility: AccessibilitySettings = { ...current.accessibility, ...parsed.data };
      const saved = await saveUserSettings(userKey, {
        ...current,
        accessibility,
        updatedAt: new Date().toISOString(),
      });
      log.info('Accessibility settings updated');
      return reply.send({ accessibility: saved.accessibility });
    } catch (err) {
      log.error('Failed to save accessibility settings', err);
      return reply.status(500).send({ error: 'Failed to save accessibility settings' });
    }
  });

  /** GET /settings/user-config */
  app.get('/user-config', async (req, reply) => {
    const userKey = getUserIdentityKey(req);
    const settings = await loadUserSettings(userKey);
    return reply.send(settings);
  });

  /** PUT /settings/user-config */
  app.put('/user-config', async (req, reply) => {
    const parsed = UserConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid user config', details: parsed.error.flatten() });
    }

    const speechValidation = validateSpeechProfile(parsed.data.speechProfile);
    if (!speechValidation.valid) {
      return reply.status(400).send({ error: 'Invalid speech profile', details: speechValidation.errors });
    }

    try {
      const userKey = getUserIdentityKey(req);
      const current = await loadUserSettings(userKey);
      const privacy: PrivacySettings = { ...current.privacy, ...parsed.data.privacy };
      const saved = await saveUserSettings(userKey, {
        ...current,
        speechProfile: parseSpeechProfile(parsed.data.speechProfile),
        accessibility: { ...current.accessibility, ...parsed.data.accessibility },
        privacy,
        updatedAt: new Date().toISOString(),
      });
      return reply.send({ saved: true, ...saved });
    } catch (err) {
      log.error('Failed to save full user config', err);
      return reply.status(500).send({ error: 'Failed to save user config' });
    }
  });

  /** POST /settings/reset-local-fallback */
  app.post('/reset-local-fallback', async (_req, reply) => {
    const defaults = getDefaultUserSettings();
    return reply.send(defaults);
  });
}
