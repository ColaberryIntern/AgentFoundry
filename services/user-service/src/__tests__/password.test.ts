import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password';

describe('hashPassword', () => {
  it('returns a bcrypt hash string', async () => {
    const hash = await hashPassword('MyPassword1!');
    expect(typeof hash).toBe('string');
    // bcrypt hashes start with $2a$ or $2b$
    expect(hash).toMatch(/^\$2[ab]\$/);
  });

  it('produces different hashes for the same plaintext (salted)', async () => {
    const hash1 = await hashPassword('SamePassword1!');
    const hash2 = await hashPassword('SamePassword1!');
    expect(hash1).not.toBe(hash2);
  });
});

describe('comparePassword', () => {
  it('returns true for matching plaintext and hash', async () => {
    const plaintext = 'Correct#Horse1';
    const hash = await hashPassword(plaintext);
    const result = await comparePassword(plaintext, hash);
    expect(result).toBe(true);
  });

  it('returns false for wrong plaintext', async () => {
    const hash = await hashPassword('Correct#Horse1');
    const result = await comparePassword('WrongPassword1!', hash);
    expect(result).toBe(false);
  });

  it('returns false for empty plaintext', async () => {
    const hash = await hashPassword('Correct#Horse1');
    const result = await comparePassword('', hash);
    expect(result).toBe(false);
  });
});

describe('validatePasswordStrength', () => {
  it('passes for a strong password', () => {
    const result = validatePasswordStrength('MyStr0ng!Pass');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails for password shorter than 8 characters', () => {
    const result = validatePasswordStrength('Ab1!xyz');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must be at least 8 characters long');
  });

  it('fails for password without uppercase letter', () => {
    const result = validatePasswordStrength('alllower1!case');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one uppercase letter');
  });

  it('fails for password without a number', () => {
    const result = validatePasswordStrength('NoNumbers!Here');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one number');
  });

  it('fails for password without a special character', () => {
    const result = validatePasswordStrength('NoSpecial1Chars');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one special character');
  });

  it('returns multiple errors for a very weak password', () => {
    const result = validatePasswordStrength('abc');
    expect(result.valid).toBe(false);
    // Should fail for: too short, no uppercase, no number, no special char
    expect(result.errors.length).toBeGreaterThanOrEqual(4);
  });

  it('passes with various special characters', () => {
    const specials = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '-', '='];
    for (const char of specials) {
      const result = validatePasswordStrength(`Password1${char}`);
      expect(result.valid).toBe(true);
    }
  });
});
