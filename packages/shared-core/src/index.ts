export interface AuthPrincipal {
  id: string;
  displayName: string;
  roles: string[];
  isAuthenticated: boolean;
}

export interface AuthenticationSubsystem {
  authenticate(apiToken?: string): AuthPrincipal;
}

export interface AuthorizationSubsystem {
  canPerform(principal: AuthPrincipal, action: string): boolean;
}

export interface StoredArtifact {
  id: string;
  createdAt: string;
  agent: string;
  category: string;
  format: string;
  title: string;
  filename: string;
  content: string;
}

export interface AuditRecord {
  id: string;
  timestamp: string;
  actorId: string;
  action: string;
  outcome: 'success' | 'denied' | 'error';
  details: string;
}

export interface ApprovalRequest {
  id: string;
  createdAt: string;
  changeIdToken: string;
  requestedBy: string;
  approverToken: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface GovernanceDatabaseSubsystem {
  saveArtifact(artifact: StoredArtifact): void;
  listArtifacts(): StoredArtifact[];
  saveAuditRecord(record: AuditRecord): void;
  listAuditRecords(): AuditRecord[];
}

export interface AuditLoggingSubsystem {
  record(entry: Omit<AuditRecord, 'id' | 'timestamp'>): AuditRecord;
}

export interface ApprovalWorkflowSubsystem {
  createRequest(changeIdToken: string, requestedBy: string): ApprovalRequest;
  approve(requestId: string): ApprovalRequest | null;
}

export interface ReportingEngineSubsystem {
  createExecutiveSummary(input: {
    projectNameToken: string;
    artifactCount: number;
    sourceSystems: string[];
  }): string;
}

export interface SharedUiFramework {
  name: string;
  designSystem: string;
}

export interface SharedApiFramework {
  name: string;
  style: string;
}

export interface ObservabilitySubsystem {
  increment(metricName: string): void;
  snapshot(): Record<string, number>;
}

export interface ConfigurationSubsystem {
  get(key: string): string | undefined;
}

export interface SharedSubsystems {
  authentication: AuthenticationSubsystem;
  authorization: AuthorizationSubsystem;
  database: GovernanceDatabaseSubsystem;
  auditLogging: AuditLoggingSubsystem;
  approvalWorkflows: ApprovalWorkflowSubsystem;
  reportingEngine: ReportingEngineSubsystem;
  sharedUiFramework: SharedUiFramework;
  sharedApiFramework: SharedApiFramework;
  observability: ObservabilitySubsystem;
  configuration: ConfigurationSubsystem;
}

export interface SharedSubsystemOptions {
  governanceApiToken?: string;
}

function nextId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createSharedSubsystems(options: SharedSubsystemOptions = {}): SharedSubsystems {
  const artifacts: StoredArtifact[] = [];
  const auditRecords: AuditRecord[] = [];
  const approvals = new Map<string, ApprovalRequest>();
  const metrics = new Map<string, number>();

  const configuration: ConfigurationSubsystem = {
    get: (key: string) => process.env[key],
  };

  const authentication: AuthenticationSubsystem = {
    authenticate: (apiToken?: string): AuthPrincipal => {
      const expectedToken = options.governanceApiToken ?? configuration.get('GOVERNANCE_API_TOKEN');
      if (!expectedToken) {
        return {
          id: 'system-shared-service',
          displayName: 'Shared Service Principal',
          roles: ['operator', 'governance-writer'],
          isAuthenticated: true,
        };
      }

      if (apiToken && apiToken === expectedToken) {
        return {
          id: 'governance-operator',
          displayName: '{{APPROVER_NAME}}',
          roles: ['operator', 'governance-writer', 'approver'],
          isAuthenticated: true,
        };
      }

      return {
        id: 'anonymous',
        displayName: 'Anonymous',
        roles: [],
        isAuthenticated: false,
      };
    },
  };

  const authorization: AuthorizationSubsystem = {
    canPerform: (principal: AuthPrincipal, action: string): boolean => {
      if (!principal.isAuthenticated) {
        return false;
      }
      if (principal.roles.includes('operator')) {
        return true;
      }
      return action === 'assistant.message' && principal.roles.includes('assistant-user');
    },
  };

  const database: GovernanceDatabaseSubsystem = {
    saveArtifact: (artifact: StoredArtifact): void => {
      artifacts.push(artifact);
    },
    listArtifacts: (): StoredArtifact[] => artifacts.slice(),
    saveAuditRecord: (record: AuditRecord): void => {
      auditRecords.push(record);
    },
    listAuditRecords: (): AuditRecord[] => auditRecords.slice(),
  };

  const auditLogging: AuditLoggingSubsystem = {
    record: (entry): AuditRecord => {
      const record: AuditRecord = {
        id: nextId('audit'),
        timestamp: new Date().toISOString(),
        ...entry,
      };
      database.saveAuditRecord(record);
      return record;
    },
  };

  const approvalWorkflows: ApprovalWorkflowSubsystem = {
    createRequest: (changeIdToken, requestedBy): ApprovalRequest => {
      const request: ApprovalRequest = {
        id: nextId('approval'),
        createdAt: new Date().toISOString(),
        changeIdToken,
        requestedBy,
        approverToken: '{{APPROVER_NAME}}',
        status: 'pending',
      };
      approvals.set(request.id, request);
      return request;
    },
    approve: (requestId): ApprovalRequest | null => {
      const request = approvals.get(requestId);
      if (!request) {
        return null;
      }
      const approved: ApprovalRequest = { ...request, status: 'approved' };
      approvals.set(requestId, approved);
      return approved;
    },
  };

  const reportingEngine: ReportingEngineSubsystem = {
    createExecutiveSummary: (input): string =>
      `Executive Summary for ${input.projectNameToken}: ${input.artifactCount} governance artifacts generated from ${input.sourceSystems.join(', ')}. Change control references {{CHANGE_ID}} and approval by {{APPROVER_NAME}} on {{DATE_APPROVED}}.`,
  };

  const observability: ObservabilitySubsystem = {
    increment: (metricName: string): void => {
      const existing = metrics.get(metricName) ?? 0;
      metrics.set(metricName, existing + 1);
    },
    snapshot: (): Record<string, number> => {
      const snapshot: Record<string, number> = {};
      for (const [metric, value] of metrics.entries()) {
        snapshot[metric] = value;
      }
      return snapshot;
    },
  };

  return {
    authentication,
    authorization,
    database,
    auditLogging,
    approvalWorkflows,
    reportingEngine,
    sharedUiFramework: {
      name: 'React + Tailwind shared component framework',
      designSystem: 'AURORA/UniFi HUD primitives',
    },
    sharedApiFramework: {
      name: 'Fastify shared API framework',
      style: 'Typed route contracts and service adapters',
    },
    observability,
    configuration,
  };
}
