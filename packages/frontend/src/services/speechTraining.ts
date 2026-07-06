export interface TrainingPrompt {
  id: string;
  topic: string;
  sentence: string;
}

export const TRAINING_PROMPTS: TrainingPrompt[] = [
  { id: 'family-routines', topic: 'Daily routine', sentence: 'My family makes oatmeal and fruit every Monday morning.' },
  { id: 'weather-outing', topic: 'Weather', sentence: 'The bright wind pushed three blue kites across the park.' },
  { id: 'travel-directions', topic: 'Travel', sentence: 'Please take the third train to the central station after lunch.' },
  { id: 'kitchen-actions', topic: 'Kitchen', sentence: 'We packed blue backpacks before breakfast and brought fresh bread.' },
  { id: 'medical-checkin', topic: 'Health', sentence: 'The doctor checked my throat, breathing, and balance very carefully.' },
  { id: 'technology-help', topic: 'Technology', sentence: 'Can you charge the tablet and open the camera settings for me?' },
  { id: 'outdoor-sounds', topic: 'Nature', sentence: 'She sells seashells by the seashore while gulls circle slowly above.' },
  { id: 'friendly-chat', topic: 'Conversation', sentence: 'George and Julia shared gentle jokes during the long journey home.' },
  { id: 'numbers-times', topic: 'Numbers', sentence: 'At quarter past six, five students carried twelve boxes downstairs.' },
  { id: 'community-visit', topic: 'Community', sentence: 'The library hosted a music class with poems, drums, and quiet reading.' },
  { id: 'commands-needs', topic: 'Requests', sentence: 'Please turn on the hallway light and bring my green notebook.' },
  { id: 'mixed-phonetics', topic: 'Phonetic mix', sentence: 'Quick beige foxes jumped past shining bridges and quiet church bells.' },
];

export function calculateTranscriptMatch(expectedText: string, spokenText: string): number {
  const expectedTokens = normalizeTokens(expectedText);
  const spokenTokens = normalizeTokens(spokenText);

  if (expectedTokens.length === 0 || spokenTokens.length === 0) {
    return 0;
  }

  let matched = 0;
  const remaining = [...spokenTokens];

  for (const token of expectedTokens) {
    const index = remaining.indexOf(token);
    if (index >= 0) {
      matched += 1;
      remaining.splice(index, 1);
    }
  }

  return matched / expectedTokens.length;
}

function normalizeTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}
