import { describe, expect, it } from 'vitest';
import { isSafeResetTarget } from './db-safety.js';

describe('isSafeResetTarget', () => {
  it('allows localhost connections', () => {
    expect(isSafeResetTarget('postgresql://postgres:postgres@localhost:5432/tailtimes')).toBe(true);
    expect(isSafeResetTarget('postgresql://postgres:postgres@127.0.0.1:5432/tailtimes')).toBe(true);
  });

  it('rejects remote hosts', () => {
    expect(
      isSafeResetTarget('postgresql://postgres:postgres@db.supabase-example.co:5432/tailtimes')
    ).toBe(false);
  });

  it('rejects invalid URLs', () => {
    expect(isSafeResetTarget('not-a-database-url')).toBe(false);
  });
});
