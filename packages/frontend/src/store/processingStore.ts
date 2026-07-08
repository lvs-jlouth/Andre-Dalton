/**
 * Processing Mode Store — manages research and analysis sessions.
 */
import { create } from 'zustand';
import { type ResearchSession, type ResearchDepth, createResearchSession } from '../services/processing/researchMode.js';
import { type AnalysisSession, type AnalysisType, type AnalysisDepth, createAnalysisSession } from '../services/processing/analysisMode.js';

export type ProcessingMode = 'none' | 'research' | 'analysis';

interface ProcessingState {
  /** Current active mode */
  activeMode: ProcessingMode;
  /** Active research session (if any) */
  researchSession: ResearchSession | null;
  /** Active analysis session (if any) */
  analysisSession: AnalysisSession | null;
  /** History of completed sessions */
  history: Array<{ id: string; type: ProcessingMode; topic: string; completedAt: number }>;

  // Actions
  startResearch: (topic: string, depth: ResearchDepth) => void;
  startAnalysis: (type: AnalysisType, question: string, depth: AnalysisDepth) => void;
  updateResearch: (session: ResearchSession) => void;
  updateAnalysis: (session: AnalysisSession) => void;
  stopProcessing: () => void;
}

export const useProcessingStore = create<ProcessingState>((set, get) => ({
  activeMode: 'none',
  researchSession: null,
  analysisSession: null,
  history: [],

  startResearch: (topic, depth) => {
    const session = createResearchSession(topic, depth);
    set({ activeMode: 'research', researchSession: session, analysisSession: null });
  },

  startAnalysis: (type, question, depth) => {
    const session = createAnalysisSession(type, question, depth);
    set({ activeMode: 'analysis', analysisSession: session, researchSession: null });
  },

  updateResearch: (session) => set({ researchSession: session }),
  updateAnalysis: (session) => set({ analysisSession: session }),

  stopProcessing: () => {
    const { activeMode, researchSession, analysisSession } = get();
    const history = [...get().history];

    if (activeMode === 'research' && researchSession) {
      history.push({
        id: researchSession.id,
        type: 'research',
        topic: researchSession.topic,
        completedAt: Date.now(),
      });
    } else if (activeMode === 'analysis' && analysisSession) {
      history.push({
        id: analysisSession.id,
        type: 'analysis',
        topic: analysisSession.question,
        completedAt: Date.now(),
      });
    }

    set({
      activeMode: 'none',
      researchSession: null,
      analysisSession: null,
      history: history.slice(-20), // Keep last 20
    });
  },
}));
