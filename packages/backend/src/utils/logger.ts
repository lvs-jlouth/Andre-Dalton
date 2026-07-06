import pino from 'pino';
import { getEnv } from './env.js';
import { redactObject, redactSensitive } from './redaction.js';

/**
 * Creates a named logger.
 * In DEBUG_MODE prompts/transcripts may be logged; in production they are
 * suppressed and sensitive values are redacted automatically.
 */
export function createLogger(name: string) {
  const env = getEnv();
  const level = env.DEBUG_MODE ? 'debug' : 'info';

  const logger = pino({
    name,
    level,
    serializers: {
      // Redact all object values before they hit the transport
      err: (err: unknown) => {
        if (err instanceof Error) {
          return { message: redactSensitive(err.message), stack: err.stack };
        }
        return err;
      },
    },
  });

  function sanitizeMeta(meta?: unknown): unknown {
    if (meta === undefined) return {};
    if (typeof meta === 'string') return redactSensitive(meta);
    if (Array.isArray(meta)) return meta.map((item) => sanitizeMeta(item));
    if (meta instanceof Error) {
      return {
        message: redactSensitive(meta.message),
        stack: meta.stack,
      };
    }
    if (meta && typeof meta === 'object') {
      return redactObject(meta as Record<string, unknown>);
    }
    return meta;
  }

  return {
    info: (msg: string, meta?: unknown) => logger.info(sanitizeMeta(meta), redactSensitive(msg)),
    warn: (msg: string, meta?: unknown) => logger.warn(sanitizeMeta(meta), redactSensitive(msg)),
    error: (msg: string, meta?: unknown) => logger.error(sanitizeMeta(meta), redactSensitive(msg)),
    debug: (msg: string, meta?: unknown) => {
      if (env.DEBUG_MODE) {
        logger.debug(sanitizeMeta(meta), redactSensitive(msg));
      }
    },
  };
}
