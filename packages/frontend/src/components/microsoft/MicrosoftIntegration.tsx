/**
 * Microsoft Integration Panel — Entra ID login, OneDrive storage, and Office 365 access.
 */
import { useAuthStore } from '../../store/authStore.js';
import { Panel } from '../ui/Panel.js';
import { Button } from '../ui/Button.js';

export function MicrosoftIntegration() {
  const { isConfigured, isAuthenticated, isLoading, user, error, signIn, signOut, initialize } =
    useAuthStore();

  // Initialize auth on first render
  if (isConfigured && !isAuthenticated && !isLoading) {
    void initialize();
  }

  if (!isConfigured) {
    return (
      <Panel title="Microsoft Integration">
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-jargiin-bg/50 border border-jargiin-border">
            <h3 className="text-jargiin-cyan font-mono text-sm font-semibold mb-2">
              ⚙️ Configuration Required
            </h3>
            <p className="text-jargiin-muted text-sm leading-relaxed">
              Microsoft Entra ID is not configured. Set the following environment variables
              to enable authentication and Office 365 integration:
            </p>
            <ul className="mt-3 space-y-1 text-xs font-mono text-jargiin-muted">
              <li>• VITE_ENTRA_CLIENT_ID</li>
              <li>• VITE_ENTRA_TENANT_ID</li>
              <li>• ENTRA_CLIENT_SECRET (backend)</li>
            </ul>
            <p className="mt-3 text-jargiin-muted text-xs">
              Register an app at{' '}
              <a
                href="https://portal.azure.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-jargiin-cyan underline"
              >
                Azure Portal → App registrations
              </a>
            </p>
          </div>
        </div>
      </Panel>
    );
  }

  if (!isAuthenticated) {
    return (
      <Panel title="Microsoft Integration">
        <div className="space-y-4">
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🔐</div>
            <h3 className="text-jargiin-white font-semibold mb-2">Sign in with Microsoft</h3>
            <p className="text-jargiin-muted text-sm mb-6 max-w-md mx-auto">
              Connect your Microsoft account to enable OneDrive storage,
              Office 365 integration, and cross-device sync.
            </p>
            {error && (
              <p className="text-jargiin-danger text-xs mb-4">{error}</p>
            )}
            <Button onClick={() => signIn()} disabled={isLoading}>
              {isLoading ? 'Signing in…' : '🔑 Sign in with Entra ID'}
            </Button>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Microsoft Integration">
      <div className="space-y-6">
        {/* User Profile Card */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-jargiin-bg/50 border border-jargiin-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-jargiin-cyan/20 flex items-center justify-center">
              <span className="text-jargiin-cyan font-bold text-lg">
                {user?.name?.[0] ?? '?'}
              </span>
            </div>
            <div>
              <p className="text-jargiin-white font-medium text-sm">{user?.name}</p>
              <p className="text-jargiin-muted text-xs">{user?.email}</p>
            </div>
          </div>
          <Button onClick={() => signOut()} variant="ghost" size="sm">
            Sign out
          </Button>
        </div>

        {/* Integration Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <IntegrationCard
            icon="☁️"
            title="OneDrive Storage"
            description="App data synced across devices"
            status="connected"
          />
          <IntegrationCard
            icon="📧"
            title="Outlook Mail"
            description="Read, compose, and send emails"
            status="connected"
          />
          <IntegrationCard
            icon="📅"
            title="Calendar"
            description="View and create events"
            status="connected"
          />
          <IntegrationCard
            icon="💬"
            title="Teams"
            description="Chat and presence"
            status="connected"
          />
          <IntegrationCard
            icon="📄"
            title="Word & Excel"
            description="Create and edit documents"
            status="connected"
          />
          <IntegrationCard
            icon="🔄"
            title="Cross-Device Sync"
            description="Settings & conversations portable"
            status="connected"
          />
        </div>

        {/* Capabilities */}
        <div className="p-4 rounded-lg bg-jargiin-bg/50 border border-jargiin-border">
          <h4 className="text-jargiin-cyan font-mono text-xs font-semibold mb-3">
            AVAILABLE CAPABILITIES
          </h4>
          <ul className="space-y-2 text-sm text-jargiin-muted">
            <li className="flex items-center gap-2">
              <span className="text-jargiin-success">✓</span>
              Secure authentication via Microsoft Entra ID
            </li>
            <li className="flex items-center gap-2">
              <span className="text-jargiin-success">✓</span>
              OneDrive app storage (settings, conversations, files)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-jargiin-success">✓</span>
              Send/read emails through Outlook
            </li>
            <li className="flex items-center gap-2">
              <span className="text-jargiin-success">✓</span>
              Calendar event management
            </li>
            <li className="flex items-center gap-2">
              <span className="text-jargiin-success">✓</span>
              Teams chat and presence integration
            </li>
            <li className="flex items-center gap-2">
              <span className="text-jargiin-success">✓</span>
              Word/Excel document operations
            </li>
            <li className="flex items-center gap-2">
              <span className="text-jargiin-success">✓</span>
              Portable storage — access from any device
            </li>
          </ul>
        </div>
      </div>
    </Panel>
  );
}

function IntegrationCard({
  icon,
  title,
  description,
  status,
}: {
  icon: string;
  title: string;
  description: string;
  status: 'connected' | 'disconnected' | 'error';
}) {
  const statusColors = {
    connected: 'text-jargiin-success',
    disconnected: 'text-jargiin-muted',
    error: 'text-jargiin-danger',
  };

  return (
    <div className="p-3 rounded-lg bg-jargiin-panel border border-jargiin-border">
      <div className="flex items-center gap-2 mb-1">
        <span>{icon}</span>
        <span className="text-jargiin-white text-sm font-medium">{title}</span>
        <span className={`ml-auto text-xs ${statusColors[status]}`}>
          {status === 'connected' ? '● Active' : status === 'error' ? '● Error' : '○ Off'}
        </span>
      </div>
      <p className="text-jargiin-muted text-xs">{description}</p>
    </div>
  );
}
