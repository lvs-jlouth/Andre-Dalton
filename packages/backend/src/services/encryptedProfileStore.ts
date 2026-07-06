import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getEnv } from '../utils/env.js';
import {
  getDefaultSpeechProfile,
  parseSpeechProfile,
  sanitizeSpeechProfileForStorage,
  validateSpeechProfile,
  type SpeechProfile,
} from './speechProfile.js';

interface EncryptedProfileStoreOptions {
  storageDir?: string;
  encryptionKey?: string;
  profileFileName?: string;
  keyFileName?: string;
}

interface EncryptedEnvelope {
  iv: string;
  authTag: string;
  ciphertext: string;
}

export class EncryptedProfileStore {
  private readonly storageDir: string;
  private readonly profilePath: string;
  private readonly keyPath: string;
  private readonly encryptionKey?: string;

  constructor(options: EncryptedProfileStoreOptions = {}) {
    const env = getEnv();
    this.storageDir = options.storageDir ?? env.PROFILE_STORAGE_DIR;
    this.profilePath = path.join(this.storageDir, options.profileFileName ?? 'speech-profile.enc');
    this.keyPath = path.join(this.storageDir, options.keyFileName ?? 'speech-profile.key');
    this.encryptionKey = options.encryptionKey ?? env.PROFILE_ENCRYPTION_KEY;
  }

  async loadProfile(): Promise<SpeechProfile> {
    try {
      const encrypted = await readFile(this.profilePath, 'utf8');
      const envelope = JSON.parse(encrypted) as EncryptedEnvelope;
      const decrypted = await this.decrypt(envelope);
      const raw = JSON.parse(decrypted) as unknown;
      const validation = validateSpeechProfile(raw);

      if (!validation.valid) {
        throw new Error(`Stored speech profile is invalid: ${(validation.errors ?? []).join('; ')}`);
      }

      return parseSpeechProfile(raw);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return getDefaultSpeechProfile();
      }

      throw error;
    }
  }

  async saveProfile(profile: SpeechProfile): Promise<SpeechProfile> {
    const sanitized = sanitizeSpeechProfileForStorage(parseSpeechProfile(profile));
    const ciphertext = await this.encrypt(JSON.stringify(sanitized));

    await mkdir(this.storageDir, { recursive: true, mode: 0o700 });
    await writeFile(this.profilePath, JSON.stringify(ciphertext), { mode: 0o600 });

    return sanitized;
  }

  private async encrypt(plaintext: string): Promise<EncryptedEnvelope> {
    const key = await this.getKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      ciphertext: ciphertext.toString('base64'),
    };
  }

  private async decrypt(envelope: EncryptedEnvelope): Promise<string> {
    const key = await this.getKey();
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(envelope.authTag, 'base64'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
      decipher.final(),
    ]);

    return plaintext.toString('utf8');
  }

  private async getKey(): Promise<Buffer> {
    if (this.encryptionKey) {
      return deriveKey(this.encryptionKey);
    }

    await mkdir(this.storageDir, { recursive: true, mode: 0o700 });

    try {
      const existingKey = await readFile(this.keyPath, 'utf8');
      return deriveKey(existingKey.trim());
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    const generatedKey = randomBytes(32).toString('hex');
    await writeFile(this.keyPath, `${generatedKey}\n`, { mode: 0o600 });
    return deriveKey(generatedKey);
  }
}

function deriveKey(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}
