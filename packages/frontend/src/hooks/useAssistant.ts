import { useCallback } from 'react';
import { sendMessage } from '../services/api.js';
import { useAssistantStore } from '../store/assistantStore.js';
import { useSpeechProfileStore } from '../store/speechProfileStore.js';
import type { LlmMessage } from '../types/provider.js';
import { assessRiskyAction, isCancellationMessage, isConfirmationMessage } from '../utils/riskyActions.js';

export function useAssistant() {
  const addTurn = useAssistantStore((s) => s.addTurn);
  const setStatus = useAssistantStore((s) => s.setStatus);
  const setError = useAssistantStore((s) => s.setError);
  const setLastResponse = useAssistantStore((s) => s.setLastResponse);
  const conversation = useAssistantStore((s) => s.conversation);
  const pendingConfirmation = useAssistantStore((s) => s.pendingConfirmation);
  const requestConfirmation = useAssistantStore((s) => s.requestConfirmation);
  const clearPendingConfirmation = useAssistantStore((s) => s.clearPendingConfirmation);
  const profile = useSpeechProfileStore((s) => s.profile);

  const dispatchMessage = useCallback(
    async (resolved: string) => {
      if (!resolved.trim()) return null;

      addTurn({ role: 'user', content: resolved });
      setStatus('thinking');
      setError(null);

      const messages: LlmMessage[] = conversation
        .filter((t) => t.role !== 'system' && !t.localOnly)
        .map((t) => ({ role: t.role as 'user' | 'assistant', content: t.content }));

      // Append the new user message
      messages.push({ role: 'user', content: resolved });

      try {
        const response = await sendMessage({
          messages,
          profileName: profile.preferredName,
        });

        addTurn({ role: 'assistant', content: response.content, providerId: response.providerId });
        setLastResponse(response);
        setStatus('idle');
        return response.content;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        setError(message);
        setStatus('error');
        addTurn({ role: 'assistant', content: `I'm sorry, I encountered an issue: ${message}. Please try again.` });
        return null;
      }
    },
    [conversation, profile.preferredName, addTurn, setStatus, setError, setLastResponse],
  );

  const sendUserMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      // Apply command aliases from speech profile
      const resolved = profile.commandAliases[text.trim().toLowerCase()] ?? text;

      if (pendingConfirmation) {
        addTurn({ role: 'user', content: text.trim(), localOnly: true });

        if (isCancellationMessage(text)) {
          clearPendingConfirmation();
          addTurn({
            role: 'assistant',
            content: 'Okay — I cancelled that action request.',
            localOnly: true,
          });
          return null;
        }

        if (!isConfirmationMessage(text)) {
          addTurn({
            role: 'assistant',
            content: `Please type "confirm" to continue with "${pendingConfirmation.message}" or "cancel" to stop.`,
            localOnly: true,
          });
          return null;
        }

        clearPendingConfirmation();
        return dispatchMessage(pendingConfirmation.message);
      }

      const risk = assessRiskyAction(resolved);
      if (risk.risky) {
        addTurn({ role: 'user', content: resolved, localOnly: true });
        requestConfirmation(resolved, risk.reason ?? 'sensitive action');
        addTurn({
          role: 'assistant',
          content: `This request may affect ${risk.reason ?? 'sensitive systems'}. Type "confirm" to continue or "cancel" to stop.`,
          localOnly: true,
        });
        return null;
      }

      return dispatchMessage(resolved);
    },
    [
      profile,
      pendingConfirmation,
      addTurn,
      requestConfirmation,
      clearPendingConfirmation,
      dispatchMessage,
    ],
  );

  return { sendUserMessage };
}
