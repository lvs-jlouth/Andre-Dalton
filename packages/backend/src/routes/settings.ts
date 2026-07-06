import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createLogger } from '../utils/logger.js';

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

// In-memory settings store for MVP.  Future: encrypted persistent store.
let accessibilitySettings: z.infer<typeof AccessibilitySchema> = {
  reducedMotion: false,
  highContrast: false,
  largeText: false,
  fontScale: 1.0,
  captions: true,
  onHandedLayout: 'none',
  keyboardNavigation: true,
  largeHitTargets: true,
};

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  /** GET /settings/accessibility */
  app.get('/accessibility', async (_req, reply) => {
    return reply.send({ accessibility: accessibilitySettings });
  });

  /** PUT /settings/accessibility */
  app.put('/accessibility', async (req, reply) => {
    const parsed = AccessibilitySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid settings', details: parsed.error.flatten() });
    }

    accessibilitySettings = { ...accessibilitySettings, ...parsed.data };
    log.info('Accessibility settings updated');
    return reply.send({ accessibility: accessibilitySettings });
  });
}
