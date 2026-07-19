import { describe, it, expect } from 'vitest';
import { createSharedSubsystems } from '@unifi/shared-core';
import { KnowledgeInstitutionalMemoryAgent } from '../src/index.js';

describe('KnowledgeInstitutionalMemoryAgent', () => {
  it('ingests documents idempotently and supports evidence-backed queries', () => {
    const shared = createSharedSubsystems();
    const agent = new KnowledgeInstitutionalMemoryAgent(shared);

    const source = agent.registerSource({
      source_type: 'governance',
      source_name: 'Governance Artifacts',
      source_uri: 'internal://governance',
      system_owner: 'Tech Elixir',
      trust_level: 'high',
      last_ingested_at: undefined,
    });

    const first = agent.ingestDocument({
      source_id: source.id,
      title: 'MOP-100 VLAN Change',
      document_type: 'mop',
      document_status: 'approved',
      version: '1.0.0',
      content: '# Change Summary\nCHG-100 updated VLAN 20 on Switch-A.\n# Risk\nRISK-9 mitigated by rollback testing.',
      metadata_json: { tags: ['change', 'vlan'] },
    });
    expect(first.duplicate).toBe(false);
    expect(first.chunks.length).toBeGreaterThan(1);

    const second = agent.ingestDocument({
      source_id: source.id,
      title: 'MOP-100 VLAN Change',
      document_type: 'mop',
      document_status: 'approved',
      version: '1.0.0',
      content: '# Change Summary\nCHG-100 updated VLAN 20 on Switch-A.\n# Risk\nRISK-9 mitigated by rollback testing.',
    });
    expect(second.duplicate).toBe(true);

    const answer = agent.query('tester', 'What changed for VLAN 20?');
    expect(answer.evidence.length).toBeGreaterThan(0);
    expect(answer.answer).toContain('strongest evidence');
  });
});
