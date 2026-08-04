import { describe, it, expect } from 'vitest';
import { isActionable, strongestAction, toRecommendedAction } from '../src/index.js';

describe('isActionable', () => {
    it('is true from flag_for_review upwards', () => {
        expect(isActionable('flag_for_review')).toBe(true);
        expect(isActionable('block')).toBe(true);
        expect(isActionable('immediate_intervention')).toBe(true);
    });

    it('is false for monitor-only verdicts', () => {
        expect(isActionable('none')).toBe(false);
        expect(isActionable('monitor')).toBe(false);
        expect(isActionable(undefined)).toBe(false);
    });
});

describe('toRecommendedAction', () => {
    it('passes canonical values through', () => {
        expect(toRecommendedAction('monitor')).toBe('monitor');
        expect(toRecommendedAction('immediate_intervention')).toBe('immediate_intervention');
    });

    it('maps legacy spellings from older API deployments', () => {
        expect(toRecommendedAction('flag_for_moderator')).toBe('flag_for_review');
        expect(toRecommendedAction('no_action')).toBe('none');
    });

    it('returns undefined for anything unrecognised', () => {
        expect(toRecommendedAction('nonsense')).toBeUndefined();
        expect(toRecommendedAction(undefined)).toBeUndefined();
        expect(toRecommendedAction(42)).toBeUndefined();
    });
});

describe('strongestAction', () => {
    it('returns the strongest of several', () => {
        expect(strongestAction(['monitor', 'immediate_intervention', 'none'])).toBe('immediate_intervention');
        expect(strongestAction(['none', 'monitor'])).toBe('monitor');
        expect(strongestAction(['block', 'flag_for_review'])).toBe('block');
    });

    it('returns none for an empty or absent set', () => {
        expect(strongestAction([])).toBe('none');
        expect(strongestAction([undefined, undefined])).toBe('none');
    });

    it('normalises legacy spellings before ranking', () => {
        expect(strongestAction(['flag_for_moderator', 'no_action'])).toBe('flag_for_review');
    });

    it('escalates an unrecognised value instead of discarding it', () => {
        // Failing towards a human is the only safe default here: silently
        // dropping an unknown verdict is how a real signal disappears.
        expect(strongestAction(['some_future_verdict'])).toBe('flag_for_review');
        expect(strongestAction(['none', 'unknown_thing'])).toBe('flag_for_review');
    });

    it('lets a stronger known value win over an unrecognised one', () => {
        expect(strongestAction(['unknown_thing', 'immediate_intervention'])).toBe('immediate_intervention');
    });
});
