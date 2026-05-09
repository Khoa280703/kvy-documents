import { describe, it, expect, vi, beforeEach } from 'vitest';

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending_upload: ['pending_verification'],
  pending_verification: ['verified', 'rejected', 'inconclusive', 'expired'],
  inconclusive: ['pending_review'],
  pending_review: ['approved', 'rejected'],
  verified: [],
  approved: [],
  rejected: [],
  expired: [],
};

const TERMINAL_STATES = ['verified', 'approved', 'rejected', 'expired'];

function isValidTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

function isTerminal(status: string): boolean {
  return TERMINAL_STATES.includes(status);
}

describe('Document Verification State Machine', () => {
  describe('valid transitions', () => {
    const validCases: [string, string][] = [
      ['pending_upload', 'pending_verification'],
      ['pending_verification', 'verified'],
      ['pending_verification', 'rejected'],
      ['pending_verification', 'inconclusive'],
      ['pending_verification', 'expired'],
      ['inconclusive', 'pending_review'],
      ['pending_review', 'approved'],
      ['pending_review', 'rejected'],
    ];

    it.each(validCases)('%s → %s should be allowed', (from, to) => {
      expect(isValidTransition(from, to)).toBe(true);
    });
  });

  describe('invalid transitions', () => {
    const invalidCases: [string, string][] = [
      ['pending_upload', 'verified'],
      ['pending_upload', 'approved'],
      ['pending_verification', 'approved'],
      ['pending_verification', 'pending_review'],
      ['inconclusive', 'verified'],
      ['inconclusive', 'rejected'],
      ['pending_review', 'verified'],
      ['pending_review', 'inconclusive'],
      ['verified', 'rejected'],
      ['approved', 'rejected'],
      ['rejected', 'approved'],
      ['expired', 'verified'],
    ];

    it.each(invalidCases)('%s → %s should be rejected', (from, to) => {
      expect(isValidTransition(from, to)).toBe(false);
    });
  });

  describe('terminal states', () => {
    it('verified, approved, rejected, expired are terminal', () => {
      expect(isTerminal('verified')).toBe(true);
      expect(isTerminal('approved')).toBe(true);
      expect(isTerminal('rejected')).toBe(true);
      expect(isTerminal('expired')).toBe(true);
    });

    it('non-terminal states allow further transitions', () => {
      expect(isTerminal('pending_upload')).toBe(false);
      expect(isTerminal('pending_verification')).toBe(false);
      expect(isTerminal('inconclusive')).toBe(false);
      expect(isTerminal('pending_review')).toBe(false);
    });

    it('terminal states have no outgoing transitions', () => {
      for (const state of TERMINAL_STATES) {
        expect(VALID_TRANSITIONS[state]).toEqual([]);
      }
    });
  });

  describe('complete workflow paths', () => {
    it('happy path: upload → verify → verified', () => {
      expect(isValidTransition('pending_upload', 'pending_verification')).toBe(true);
      expect(isValidTransition('pending_verification', 'verified')).toBe(true);
      expect(isTerminal('verified')).toBe(true);
    });

    it('rejection path: upload → verify → rejected', () => {
      expect(isValidTransition('pending_upload', 'pending_verification')).toBe(true);
      expect(isValidTransition('pending_verification', 'rejected')).toBe(true);
      expect(isTerminal('rejected')).toBe(true);
    });

    it('inconclusive → admin review → approved', () => {
      expect(isValidTransition('pending_upload', 'pending_verification')).toBe(true);
      expect(isValidTransition('pending_verification', 'inconclusive')).toBe(true);
      expect(isValidTransition('inconclusive', 'pending_review')).toBe(true);
      expect(isValidTransition('pending_review', 'approved')).toBe(true);
      expect(isTerminal('approved')).toBe(true);
    });

    it('inconclusive → admin review → rejected', () => {
      expect(isValidTransition('pending_verification', 'inconclusive')).toBe(true);
      expect(isValidTransition('inconclusive', 'pending_review')).toBe(true);
      expect(isValidTransition('pending_review', 'rejected')).toBe(true);
      expect(isTerminal('rejected')).toBe(true);
    });

    it('timeout path: upload → verify → expired', () => {
      expect(isValidTransition('pending_upload', 'pending_verification')).toBe(true);
      expect(isValidTransition('pending_verification', 'expired')).toBe(true);
      expect(isTerminal('expired')).toBe(true);
    });
  });

  describe('state machine completeness', () => {
    it('all states are defined', () => {
      const allStates = [
        'pending_upload', 'pending_verification', 'inconclusive',
        'pending_review', 'verified', 'approved', 'rejected', 'expired',
      ];
      for (const state of allStates) {
        expect(VALID_TRANSITIONS).toHaveProperty(state);
      }
    });

    it('no transition leads to an undefined state', () => {
      for (const [, targets] of Object.entries(VALID_TRANSITIONS)) {
        for (const target of targets) {
          expect(VALID_TRANSITIONS).toHaveProperty(target);
        }
      }
    });
  });
});
