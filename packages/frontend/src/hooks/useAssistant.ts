import { useCallback } from 'react';
import { sendMessage } from '../services/api.js';
import { useAssistantStore } from '../store/assistantStore.js';
import { useSpeechProfileStore } from '../store/speechProfileStore.js';
import { useSettingsStore } from '../store/settingsStore.js';
import type { LlmMessage } from '../types/provider.js';

function shouldUseWebSearch(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return /(latest|current|today|tonight|this week|news|weather|forecast|search the web|web search|look online|up[- ]to[- ]date|recent)/i.test(normalized);
}

export function useAssistant() {
  const addTurn = useAssistantStore((s) => s.addTurn);
  const setStatus = useAssistantStore((s) => s.setStatus);
  const setError = useAssistantStore((s) => s.setError);
  const setLastResponse = useAssistantStore((s) => s.setLastResponse);
  const conversation = useAssistantStore((s) => s.conversation);
  const preferredModel = useAssistantStore((s) => s.preferredModel);
  const profile = useSpeechProfileStore((s) => s.profile);
  const m365ContextEnabled = useSettingsStore((s) => s.privacy.m365ContextEnabled);

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
        const routedProviderId = preferredModel === 'gpt-5-mini' ? 'azure' : 'openai';
        const personalityStyle = profile.personalityStyle ?? 'balanced';
        const personalityPrompt = profile.personalityPrompt ?? '';
        const personalityDirectives = personalityPrompt
          ? `Personality guidance: ${personalityPrompt}`
          : 'Personality guidance: Keep a balanced, calm, and supportive tone.';

        const response = await sendMessage({
          messages,
          providerId: routedProviderId,
          model: preferredModel,
          systemPrompt: `You are J.A.R.G.I.I.N., a calm, patient, and highly capable personal AI assistant. 
You are speaking with ${profile.preferredName}. 
Use the configured communication style: ${personalityStyle}.
${personalityDirectives}
Always respond clearly and concisely. 
If unsure about a request, calmly ask a single clarifying question.
Never be dismissive of speech that seems unusual — the user may communicate differently.`,
          useWebSearch: shouldUseWebSearch(resolved),
          includeM365Context: m365ContextEnabled,
        });

        const content = typeof response.content === 'string' ? response.content.trim() : '';
        if (!content) {
          throw new Error('Provider returned an empty response. Please try again.');
        }

        addTurn({ role: 'assistant', content, providerId: response.providerId });
        setLastResponse(response);
        setStatus('idle');
        return content;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        setError(message);
        setStatus('error');
        addTurn({ role: 'assistant', content: `I'm sorry, I encountered an issue: ${message}. Please try again.` });
        return null;
      }
    },
    [conversation, m365ContextEnabled, preferredModel, profile, addTurn, setStatus, setError, setLastResponse],
  );

  return { sendUserMessage };
}
