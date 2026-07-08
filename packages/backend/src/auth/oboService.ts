/**
 * On-Behalf-Of (OBO) token exchange service.
 * Exchanges the user's access token for a Microsoft Graph token
 * so the backend can call Graph API on behalf of the user.
 */
import { getMsalInstance } from './msalConfig.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('obo');

interface OboTokenResult {
  accessToken: string;
  expiresOn: Date;
}

/**
 * Exchange a user assertion (their access token) for a Graph API token.
 */
export async function acquireTokenOnBehalfOf(
  userToken: string,
  scopes: string[],
): Promise<OboTokenResult> {
  const msalInstance = getMsalInstance();

  try {
    const result = await msalInstance.acquireTokenOnBehalfOf({
      oboAssertion: userToken,
      scopes: scopes.map((s) => `https://graph.microsoft.com/${s}`),
    });

    if (!result) {
      throw new Error('OBO token exchange returned null');
    }

    return {
      accessToken: result.accessToken,
      expiresOn: result.expiresOn ?? new Date(Date.now() + 3600 * 1000),
    };
  } catch (err) {
    log.error('OBO token exchange failed', err);
    throw new Error('Failed to acquire token on behalf of user');
  }
}
