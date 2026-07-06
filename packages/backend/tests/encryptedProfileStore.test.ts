import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { EncryptedProfileStore } from '../src/services/encryptedProfileStore.js';
import { parseSpeechProfile } from '../src/services/speechProfile.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('EncryptedProfileStore', () => {
  it('returns a default profile when no file exists', async () => {
    const storageDir = await mkdtemp(path.join(os.tmpdir(), 'aurora-profile-'));
    tempDirs.push(storageDir);
    const store = new EncryptedProfileStore({ storageDir, encryptionKey: 'test-key' });

    const profile = await store.loadProfile();

    expect(profile.preferredName).toBe('User');
    expect(profile.trainingSessions).toEqual([]);
  });

  it('encrypts saved profile data at rest', async () => {
    const storageDir = await mkdtemp(path.join(os.tmpdir(), 'aurora-profile-'));
    tempDirs.push(storageDir);
    const store = new EncryptedProfileStore({ storageDir, encryptionKey: 'test-key' });
    const profile = parseSpeechProfile({
      preferredName: 'Andre',
      consentLocalLearning: true,
      trainingSessions: [
        {
          id: 'session-1',
          startedAt: '2024-01-01T00:00:00.000Z',
          completedAt: '2024-01-01T00:10:00.000Z',
          promptsCompleted: 1,
          averageConfidence: 0.88,
          averageMatchScore: 0.91,
          attempts: [
            {
              promptId: 'prompt-1',
              expectedText: 'We packed blue backpacks before breakfast.',
              spokenText: 'We packed blue backpacks before breakfast.',
              confidence: 0.88,
              matchScore: 1,
              recordedAt: '2024-01-01T00:05:00.000Z',
            },
          ],
        },
      ],
      lastTrainingAt: '2024-01-01T00:10:00.000Z',
    });

    await store.saveProfile(profile);

    const rawFile = await readFile(path.join(storageDir, 'speech-profile.enc'), 'utf8');
    const loadedProfile = await store.loadProfile();

    expect(rawFile).not.toContain('Andre');
    expect(rawFile).not.toContain('blue backpacks');
    expect(loadedProfile.preferredName).toBe('Andre');
    expect(loadedProfile.trainingSessions).toHaveLength(1);
  });
});
