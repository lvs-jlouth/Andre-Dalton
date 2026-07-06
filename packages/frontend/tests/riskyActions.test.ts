import { describe, expect, it } from 'vitest';
import { assessRiskyAction, isCancellationMessage, isConfirmationMessage } from '../src/utils/riskyActions.js';

describe('riskyActions', () => {
  it('flags destructive requests for confirmation', () => {
    const result = assessRiskyAction('Delete all saved notes now');
    expect(result.risky).toBe(true);
    expect(result.reason).toBe('destructive changes');
  });

  it('flags local-network requests for confirmation', () => {
    const result = assessRiskyAction('SSH into 192.168.1.10 and restart the router');
    expect(result.risky).toBe(true);
    expect(result.reason).toBe('local network or planned future integrations');
  });

  it('accepts plain conversational requests', () => {
    expect(assessRiskyAction('Summarize today’s meeting notes').risky).toBe(false);
  });

  it('recognizes confirmation and cancellation replies', () => {
    expect(isConfirmationMessage('confirm')).toBe(true);
    expect(isCancellationMessage('cancel')).toBe(true);
  });
});
