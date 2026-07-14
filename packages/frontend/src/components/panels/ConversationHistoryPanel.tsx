import { useEffect, useMemo, useState } from 'react';
import { Panel } from '../ui/Panel.js';
import { Button } from '../ui/Button.js';
import { useAssistantStore } from '../../store/assistantStore.js';

export function ConversationHistoryPanel() {
  const conversations = useAssistantStore((s) => s.conversations);
  const activeConversationId = useAssistantStore((s) => s.activeConversationId);
  const conversation = useAssistantStore((s) => s.conversation);
  const createConversation = useAssistantStore((s) => s.createConversation);
  const selectConversation = useAssistantStore((s) => s.selectConversation);
  const renameConversation = useAssistantStore((s) => s.renameConversation);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  const orderedConversations = useMemo(
    () => [...conversations].sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations],
  );

  useEffect(() => {
    if (!editingId) return;
    const active = conversations.find((thread) => thread.id === editingId);
    setDraftTitle(active?.title ?? '');
  }, [editingId, conversations]);

  function saveTitle(conversationId: string) {
    renameConversation(conversationId, draftTitle);
    setEditingId(null);
  }

  return (
    <Panel title="Conversation History" aria-label="Conversation history list">
      <div className="space-y-3">
        <Button
          variant="primary"
          size="md"
          onClick={() => createConversation()}
          className="w-full justify-center"
        >
          + New conversation
        </Button>

        <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1 scrollbar-thin">
          {orderedConversations.map((thread) => {
            const isActive = thread.id === activeConversationId;
            const previewTurn = thread.turns[0];
            const preview = previewTurn?.content.trim() || (isActive && conversation.length === 0
              ? 'Start a new conversation'
              : 'No messages yet');
            const isEditing = editingId === thread.id;

            return (
              <div
                key={thread.id}
                className={`rounded-lg border p-3 transition-colors ${
                  isActive
                    ? 'border-aurora-cyan/70 bg-aurora-cyan/10'
                    : 'border-aurora-border/50 bg-aurora-bg/30 hover:border-aurora-cyan/40'
                }`}
              >
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => selectConversation(thread.id)}
                    className="flex-1 text-left space-y-1 focus:outline-none"
                    aria-current={isActive ? 'true' : undefined}
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveTitle(thread.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        onBlur={() => saveTitle(thread.id)}
                        autoFocus
                        className="w-full bg-aurora-bg/70 border border-aurora-border/60 rounded px-2 py-1 font-mono text-sm text-aurora-white focus:outline-none focus:ring-2 focus:ring-aurora-cyan/50"
                        aria-label={`Edit title for ${thread.title}`}
                      />
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <p className={`font-mono text-sm font-semibold truncate ${isActive ? 'text-aurora-cyan' : 'text-aurora-white'}`}>
                            {thread.title}
                          </p>
                          <span className="text-[11px] font-mono text-aurora-muted shrink-0">
                            {new Date(thread.updatedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                        <p className="max-h-10 overflow-hidden text-xs text-aurora-muted">
                          {preview}
                        </p>
                      </>
                    )}
                  </button>

                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => setEditingId(thread.id)}
                      className="shrink-0 rounded border border-transparent px-2 py-1 text-aurora-muted hover:border-aurora-cyan/40 hover:text-aurora-cyan focus:outline-none focus:ring-2 focus:ring-aurora-cyan/50"
                      aria-label={`Rename conversation ${thread.title}`}
                    >
                      ✎
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}
