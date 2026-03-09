import { describe, it, expect } from 'vitest';
import {
  normalizeOrchestratePackInput,
  buildInitialSteps,
  internalBaseUrl,
} from './orchestrator';

describe('normalizeOrchestratePackInput', () => {
  it('passes valid tone through', () => {
    const result = normalizeOrchestratePackInput({
      planId: 'p1',
      tone: 'professional',
    });
    expect(result.tone).toBe('professional');
  });

  it('defaults invalid tone to bold', () => {
    const result = normalizeOrchestratePackInput({
      planId: 'p1',
      tone: 'invalid-tone',
    });
    expect(result.tone).toBe('bold');
  });

  it('defaults missing tone to bold', () => {
    const result = normalizeOrchestratePackInput({ planId: 'p1' });
    expect(result.tone).toBe('bold');
  });

  it('deduplicates, lowercases, and trims channels', () => {
    const result = normalizeOrchestratePackInput({
      planId: 'p1',
      channels: ['  Instagram ', 'TWITTER', 'instagram', ''],
    });
    expect(result.channels).toEqual(['instagram', 'twitter']);
  });

  it('defaults non-array channels to empty array', () => {
    const result = normalizeOrchestratePackInput({
      planId: 'p1',
      channels: 'not-an-array' as never,
    });
    expect(result.channels).toEqual([]);
  });

  it('defaults undefined channels to empty array', () => {
    const result = normalizeOrchestratePackInput({ planId: 'p1' });
    expect(result.channels).toEqual([]);
  });

  it('trims goal whitespace', () => {
    const result = normalizeOrchestratePackInput({
      planId: 'p1',
      goal: '  Launch the app  ',
    });
    expect(result.goal).toBe('Launch the app');
  });

  it('converts empty goal to null', () => {
    const result = normalizeOrchestratePackInput({
      planId: 'p1',
      goal: '   ',
    });
    expect(result.goal).toBeNull();
  });

  it('converts undefined goal to null', () => {
    const result = normalizeOrchestratePackInput({ planId: 'p1' });
    expect(result.goal).toBeNull();
  });

  it('coerces includeVideo to boolean', () => {
    expect(normalizeOrchestratePackInput({ planId: 'p1', includeVideo: true }).includeVideo).toBe(true);
    expect(normalizeOrchestratePackInput({ planId: 'p1', includeVideo: false }).includeVideo).toBe(false);
    expect(normalizeOrchestratePackInput({ planId: 'p1' }).includeVideo).toBe(false);
    expect(normalizeOrchestratePackInput({ planId: 'p1', includeVideo: undefined }).includeVideo).toBe(false);
  });

  it('preserves planId', () => {
    const result = normalizeOrchestratePackInput({ planId: 'my-plan-id' });
    expect(result.planId).toBe('my-plan-id');
  });

  it('filters non-string values from channels', () => {
    const result = normalizeOrchestratePackInput({
      planId: 'p1',
      channels: ['twitter', 42 as never, null as never, 'linkedin'],
    });
    expect(result.channels).toEqual(['twitter', 'linkedin']);
  });
});

describe('buildInitialSteps', () => {
  it('returns 7 steps without video', () => {
    const steps = buildInitialSteps(false);
    expect(steps).toHaveLength(7);
    expect(steps.every((s) => s.status === 'pending')).toBe(true);
    expect(steps.map((s) => s.id)).toEqual([
      'brand-voice',
      'positioning-angles',
      'competitive-analysis',
      'generate-draft',
      'generate-emails',
      'atomize-content',
      'generate-translations',
    ]);
  });

  it('returns 8 steps with video', () => {
    const steps = buildInitialSteps(true);
    expect(steps).toHaveLength(8);
    expect(steps[7].id).toBe('generate-video');
    expect(steps[7].label).toBe('Video Kickoff');
    expect(steps[7].status).toBe('pending');
  });

  it('all steps have labels', () => {
    const steps = buildInitialSteps(true);
    for (const step of steps) {
      expect(step.label).toBeTruthy();
      expect(typeof step.label).toBe('string');
    }
  });
});

describe('internalBaseUrl', () => {
  it('returns localhost URL with default port', () => {
    const url = internalBaseUrl();
    expect(url).toMatch(/^http:\/\/localhost:\d+$/);
  });
});
