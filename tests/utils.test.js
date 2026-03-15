import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { escapeHtml, showToast, formatDate, slugify, MAX_RETRIES, RETRY_DELAY_MS, isNetworkError, delay } from '../assets/js/utils.js';

// ── escapeHtml ──────────────────────────────────────────────────────────────

describe('escapeHtml', () => {
  it('escapes & < > " \'', () => {
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#x27;');
  });

  it('returns empty string for null', () => {
    expect(escapeHtml(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(escapeHtml(undefined)).toBe('');
  });

  it('coerces numbers to string', () => {
    expect(escapeHtml(42)).toBe('42');
  });

  it('passes through safe text unchanged', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
  });

  it('handles script injection attempt', () => {
    const xss = '<script>alert("xss")</script>';
    const result = escapeHtml(xss);
    expect(result).not.toContain('<script');
    expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('handles strings with only special chars', () => {
    expect(escapeHtml('<<<>>>')).toBe('&lt;&lt;&lt;&gt;&gt;&gt;');
  });
});

// ── showToast ───────────────────────────────────────────────────────────────

describe('showToast', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a toast element if none exists', () => {
    showToast('Hello');
    const toast = document.getElementById('bl-toast');
    expect(toast).not.toBeNull();
    expect(toast.textContent).toBe('Hello');
  });

  it('reuses existing toast element', () => {
    showToast('First');
    showToast('Second');
    const toasts = document.querySelectorAll('#bl-toast');
    expect(toasts.length).toBe(1);
    expect(toasts[0].textContent).toBe('Second');
  });

  it('applies type class', () => {
    showToast('Error!', 'error');
    const toast = document.getElementById('bl-toast');
    expect(toast.classList.contains('bl-toast--error')).toBe(true);
    expect(toast.classList.contains('bl-toast--visible')).toBe(true);
  });

  it('defaults to info type', () => {
    showToast('Info message');
    const toast = document.getElementById('bl-toast');
    expect(toast.classList.contains('bl-toast--info')).toBe(true);
  });

  it('removes visible class after duration', () => {
    showToast('Temporary', 'info', 1000);
    const toast = document.getElementById('bl-toast');
    expect(toast.classList.contains('bl-toast--visible')).toBe(true);

    vi.advanceTimersByTime(1000);
    expect(toast.classList.contains('bl-toast--visible')).toBe(false);
  });

  it('resets timer when called rapidly', () => {
    showToast('First', 'info', 2000);
    vi.advanceTimersByTime(1500);

    showToast('Second', 'info', 2000);
    const toast = document.getElementById('bl-toast');

    // Only 1500ms into second toast — should still be visible
    vi.advanceTimersByTime(1500);
    expect(toast.classList.contains('bl-toast--visible')).toBe(true);

    // Now 2000ms into second toast — should be hidden
    vi.advanceTimersByTime(500);
    expect(toast.classList.contains('bl-toast--visible')).toBe(false);
  });
});

// ── formatDate ──────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('formats ISO date string', () => {
    const result = formatDate('2024-06-15T10:00:00Z');
    expect(result).toContain('June');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatDate('')).toBe('');
  });
});

// ── slugify ─────────────────────────────────────────────────────────────────

describe('slugify', () => {
  it('converts to lowercase', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('hello world')).toBe('hello-world');
  });

  it('strips special characters', () => {
    expect(slugify("O'Brien's Winery!")).toBe('obriens-winery');
  });

  it('collapses multiple hyphens', () => {
    expect(slugify('hello---world')).toBe('hello-world');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('--hello-world--')).toBe('hello-world');
  });

  it('handles underscores', () => {
    expect(slugify('hello_world')).toBe('hello-world');
  });

  it('trims whitespace', () => {
    expect(slugify('  hello  ')).toBe('hello');
  });

  it('handles mixed separators', () => {
    expect(slugify('hello - world _ test')).toBe('hello-world-test');
  });
});

// ── Network retry helpers ──────────────────────────────────────────────────

describe('MAX_RETRIES', () => {
  it('is 2', () => {
    expect(MAX_RETRIES).toBe(2);
  });
});

describe('RETRY_DELAY_MS', () => {
  it('is 1500', () => {
    expect(RETRY_DELAY_MS).toBe(1500);
  });
});

describe('isNetworkError', () => {
  it('returns false for PGRST116 (row not found)', () => {
    expect(isNetworkError({ code: 'PGRST116', message: 'no rows' })).toBe(false);
  });

  it('returns true for "Failed to fetch"', () => {
    expect(isNetworkError({ message: 'Failed to fetch' })).toBe(true);
  });

  it('returns true for "NetworkError"', () => {
    expect(isNetworkError({ message: 'NetworkError when attempting to fetch' })).toBe(true);
  });

  it('returns true for Safari "Load failed"', () => {
    expect(isNetworkError({ message: 'Load failed' })).toBe(true);
  });

  it('returns true for TypeError without code (fetch failure)', () => {
    const err = new TypeError('fetch failed');
    expect(isNetworkError(err)).toBe(true);
  });

  it('returns false for TypeError with a code', () => {
    const err = new TypeError('something');
    err.code = '42501';
    expect(isNetworkError(err)).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
  });
});

describe('delay', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('resolves after the specified ms', async () => {
    let resolved = false;
    delay(500).then(() => { resolved = true; });
    expect(resolved).toBe(false);
    await vi.advanceTimersByTimeAsync(500);
    expect(resolved).toBe(true);
  });
});
