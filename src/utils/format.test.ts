import { describe, it, expect } from 'vitest';

// Simple utility functions to test
function add(a: number, b: number): number {
  return a + b;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

describe('Utility Functions', () => {
  it('should add two numbers correctly', () => {
    expect(add(2, 3)).toBe(5);
    expect(add(-1, 1)).toBe(0);
    expect(add(0, 0)).toBe(0);
  });

  it('should format dates correctly', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    expect(formatDate(date)).toBe('2024-01-15');
  });

  it('should validate email addresses correctly', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);
    expect(isValidEmail('test@')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
  });

  it('should handle edge cases', () => {
    expect(add(Number.MAX_SAFE_INTEGER, 1)).toBe(Number.MAX_SAFE_INTEGER + 1);
    expect(formatDate(new Date(0))).toBe('1970-01-01');
    expect(isValidEmail('')).toBe(false);
  });
});