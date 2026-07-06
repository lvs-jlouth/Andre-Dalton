import pino from 'pino';
import { getEnv } from './env.js';
import { redactSensitive } from './redaction.js';

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

  return {
    info: (msg: string, meta?: unknown) => logger.info(meta ?? {}, msg),
    warn: (msg: string, meta?: unknown) => logger.warn(meta ?? {}, msg),
    error: (msg: string, meta?: unknown) => logger.error(meta ?? {}, msg),
    debug: (msg: string, meta?: unknown) => {
      if (env.DEBUG_MODE) {
        logger.debug(meta ?? {}, msg);
      }
    },
  };
}
