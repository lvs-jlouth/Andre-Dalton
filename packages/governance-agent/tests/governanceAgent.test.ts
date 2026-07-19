import { describe, it, expect } from 'vitest';
import { GovernanceDocumentationAgent } from '../src/index.js';
import { createSharedSubsystems } from '@unifi/shared-core';

describe('GovernanceDocumentationAgent', () => {
  it('generates tokenized governance artifacts for all numbered sets', () => {
    const shared = createSharedSubsystems();
    const agent = new GovernanceDocumentationAgent(shared);

    const result = agent.generate({
      projectNameToken: '{{PROJECT_NAME}}',
      siteNameToken: '{{SITE_NAME}}',
      serverNameToken: '{{SERVER_NAME}}',
      ipAddressToken: '{{IP_ADDRESS}}',
      versionToken: '{{VERSION}}',
      sourceInputs: [
        { system: 'UniFi AI Operations Assistant', summary: 'Operational events and change telemetry' },
        { system: 'Infrastructure Monitoring', summary: 'Host, service, and dependency health data' },
      ],
      formats: ['markdown', 'html'],
    });

    expect(result.documents.length).toBeGreaterThan(20);
    const markdownDoc = result.documents.find((doc) => doc.format === 'markdown');
    expect(markdownDoc?.content).toContain('{{PROJECT_NAME}}');
    expect(markdownDoc?.content).toContain('{{CHANGE_ID}}');
    expect(result.executiveSummary).toContain('{{CHANGE_ID}}');
    expect(result.approvalRequest.status).toBe('pending');
    expect(result.futureIntegrations.sharePointPages.toLowerCase()).toContain('sharepoint');
  });
});
