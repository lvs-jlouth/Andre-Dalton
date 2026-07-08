import { useCallback } from 'react';
import { sendMessage } from '../services/api.js';
import { useAssistantStore } from '../store/assistantStore.js';
import { useSpeechProfileStore } from '../store/speechProfileStore.js';
import type { LlmMessage } from '../types/provider.js';

export function useAssistant() {
  const addTurn = useAssistantStore((s) => s.addTurn);
  const setStatus = useAssistantStore((s) => s.setStatus);
  const setError = useAssistantStore((s) => s.setError);
  const setLastResponse = useAssistantStore((s) => s.setLastResponse);
  const conversation = useAssistantStore((s) => s.conversation);
  const profile = useSpeechProfileStore((s) => s.profile);

  const sendUserMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      // Apply command aliases from speech profile
      const resolved = profile.commandAliases[text.trim().toLowerCase()] ?? text;

      addTurn({ role: 'user', content: resolved });
      setStatus('thinking');
      setError(null);

      const messages: LlmMessage[] = conversation
        .filter((t) => t.role !== 'system')
        .map((t) => ({ role: t.role as 'user' | 'assistant', content: t.content }));

      // Append the new user message
      messages.push({ role: 'user', content: resolved });

      try {
        const response = await sendMessage({
          messages,
          systemPrompt: `You are J.A.R.G.I.I.N., a calm, patient, and highly capable personal AI assistant. 
You are speaking with ${profile.preferredName}. 
Always respond clearly and concisely. 
If unsure about a request, calmly ask a single clarifying question.
Never be dismissive of speech that seems unusual — the user may communicate differently.`,
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
    [conversation, profile, addTurn, setStatus, setError, setLastResponse],
  );

  return { sendUserMessage };
}
