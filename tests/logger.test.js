import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as logger from '../assets/js/logger.js';

describe('logger', () => {
  let mockSentry;

  beforeEach(() => {
    mockSentry = {
      captureException: vi.fn(),
      captureMessage: vi.fn(),
      addBreadcrumb: vi.fn(),
      setUser: vi.fn(),
    };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete window.Sentry;
    localStorage.removeItem('debug');
  });

  // ── error ───────────────────────────────────────────────────────────────

  describe('error', () => {
    it('logs to console.error', () => {
      logger.error('something broke');
      expect(console.error).toHaveBeenCalledWith('something broke');
    });

    it('sends Error to Sentry.captureException', () => {
      window.Sentry = mockSentry;
      const err = new Error('test error');
      logger.error('context', err);
      expect(mockSentry.captureException).toHaveBeenCalledWith(err, {
        extra: { message: 'context' },
      });
    });

    it('sends string message to Sentry.captureMessage when no Error', () => {
      window.Sentry = mockSentry;
      logger.error('plain message', { detail: 'info' });
      expect(mockSentry.captureMessage).toHaveBeenCalledWith('plain message', {
        level: 'error',
        extra: { arg0: { detail: 'info' } },
      });
    });

    it('does not call Sentry if not loaded', () => {
      logger.error('no sentry');
      // Should not throw — Sentry is undefined
    });
  });

  // ── warn ────────────────────────────────────────────────────────────────

  describe('warn', () => {
    it('logs to console.warn', () => {
      logger.warn('heads up');
      expect(console.warn).toHaveBeenCalledWith('heads up');
    });

    it('sends to Sentry with warning level', () => {
      window.Sentry = mockSentry;
      logger.warn('warning msg');
      expect(mockSentry.captureMessage).toHaveBeenCalledWith('warning msg', {
        level: 'warning',
        extra: {},
      });
    });
  });

  // ── info / debug (dev-only) ─────────────────────────────────────────────

  describe('info', () => {
    it('does NOT log when debug is off', () => {
      logger.info('hidden');
      expect(console.info).not.toHaveBeenCalled();
    });

    it('logs when debug is enabled', () => {
      localStorage.setItem('debug', '1');
      logger.info('visible');
      expect(console.info).toHaveBeenCalledWith('visible');
    });
  });

  describe('debug', () => {
    it('does NOT log when debug is off', () => {
      logger.debug('hidden');
      expect(console.debug).not.toHaveBeenCalled();
    });

    it('logs when debug is enabled', () => {
      localStorage.setItem('debug', '1');
      logger.debug('visible');
      expect(console.debug).toHaveBeenCalledWith('visible');
    });
  });

  // ── breadcrumb ──────────────────────────────────────────────────────────

  describe('breadcrumb', () => {
    it('adds breadcrumb to Sentry', () => {
      window.Sentry = mockSentry;
      logger.breadcrumb('clicked button', 'ui', { btn: 'save' });
      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'clicked button',
        category: 'ui',
        data: { btn: 'save' },
        level: 'info',
      });
    });

    it('uses default category and data', () => {
      window.Sentry = mockSentry;
      logger.breadcrumb('test');
      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'test',
        category: 'app',
        data: {},
        level: 'info',
      });
    });

    it('does nothing without Sentry', () => {
      logger.breadcrumb('no sentry'); // should not throw
    });
  });

  // ── setUser / clearUser ─────────────────────────────────────────────────

  describe('setUser', () => {
    it('sets user on Sentry', () => {
      window.Sentry = mockSentry;
      logger.setUser({ id: 'u1', email: 'test@test.com' });
      expect(mockSentry.setUser).toHaveBeenCalledWith({ id: 'u1', email: 'test@test.com' });
    });
  });

  describe('clearUser', () => {
    it('clears user on Sentry', () => {
      window.Sentry = mockSentry;
      logger.clearUser();
      expect(mockSentry.setUser).toHaveBeenCalledWith(null);
    });
  });
});
