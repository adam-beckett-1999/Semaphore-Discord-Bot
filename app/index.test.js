import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { splitButtonsIntoRows, validateEnv } from './testHelpers.js';

// Test env validation

describe('validateEnv', () => {
  it('throws if any required env var is missing', () => {
    expect(() => validateEnv(['A', 'B'], { A: '1' })).toThrow(/Missing required environment variables/);
  });
  it('does not throw if all required env vars are present', () => {
    expect(() => validateEnv(['A', 'B'], { A: '1', B: '2' })).not.toThrow();
  });
});

describe('splitButtonsIntoRows', () => {
  it('splits 7 buttons into 2 rows (5+2)', () => {
    const fakeButtons = Array.from({ length: 7 }, (_, i) => `btn${i}`);
    const rows = splitButtonsIntoRows(fakeButtons);
    expect(rows.length).toBe(2);
    expect(rows[0].length).toBe(5);
    expect(rows[1].length).toBe(2);
  });
  it('splits 5 buttons into 1 row', () => {
    const fakeButtons = Array.from({ length: 5 }, (_, i) => `btn${i}`);
    const rows = splitButtonsIntoRows(fakeButtons);
    expect(rows.length).toBe(1);
    expect(rows[0].length).toBe(5);
  });
});
