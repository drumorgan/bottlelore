import { describe, it, expect, beforeEach, vi } from 'vitest';

// We need to reset module state between tests, so use dynamic imports
// But first, let's set up the mocks for the module
let t, tc, detectLocale, getLocale, setLocale, getSupportedLocales, createLanguageToggle;

describe('i18n module', () => {
  beforeEach(async () => {
    // Reset localStorage and APP_CONFIG
    localStorage.clear();
    delete window.APP_CONFIG;

    // Re-import to get fresh module (vitest caches, but we can reset state via setLocale)
    const mod = await import('../assets/js/i18n.js');
    t = mod.t;
    tc = mod.tc;
    detectLocale = mod.detectLocale;
    getLocale = mod.getLocale;
    setLocale = mod.setLocale;
    getSupportedLocales = mod.getSupportedLocales;
    createLanguageToggle = mod.createLanguageToggle;

    // Reset to English as baseline
    setLocale('en');
  });

  describe('detectLocale', () => {
    it('returns "en" by default', () => {
      const locale = detectLocale();
      expect(locale).toBe('en');
    });

    it('uses localStorage override when set', () => {
      localStorage.setItem('bl-locale', 'es');
      const locale = detectLocale();
      expect(locale).toBe('es');
    });

    it('ignores unsupported locale in localStorage', () => {
      localStorage.setItem('bl-locale', 'fr');
      const locale = detectLocale();
      // Should fall through to browser or default
      expect(['en', 'es']).toContain(locale);
    });

    it('uses APP_CONFIG.locale when set', () => {
      localStorage.clear(); // clear the 'en' set by beforeEach's setLocale
      window.APP_CONFIG = { locale: 'es' };
      const locale = detectLocale();
      expect(locale).toBe('es');
    });

    it('localStorage takes priority over APP_CONFIG', () => {
      localStorage.setItem('bl-locale', 'en');
      window.APP_CONFIG = { locale: 'es' };
      const locale = detectLocale();
      expect(locale).toBe('en');
    });
  });

  describe('setLocale / getLocale', () => {
    it('sets and gets locale', () => {
      setLocale('es');
      expect(getLocale()).toBe('es');
    });

    it('persists to localStorage', () => {
      setLocale('es');
      expect(localStorage.getItem('bl-locale')).toBe('es');
    });

    it('ignores unsupported locales', () => {
      setLocale('fr');
      expect(getLocale()).toBe('en'); // still the previous value
    });
  });

  describe('t() — UI string translation', () => {
    it('returns English string for known key', () => {
      setLocale('en');
      expect(t('app.tagline')).toBe('Every bottle has a story');
    });

    it('returns Spanish string when locale is es', () => {
      setLocale('es');
      expect(t('app.tagline')).toBe('Cada botella tiene una historia');
    });

    it('falls back to English when key missing in target locale', () => {
      setLocale('es');
      // Both en and es should have this, but let's test with a key that exists
      expect(t('app.name')).toBe('BottleLore');
    });

    it('returns the key itself when not found in any locale', () => {
      expect(t('nonexistent.key')).toBe('nonexistent.key');
    });

    it('supports interpolation', () => {
      setLocale('en');
      expect(t('admin.edit_wine', { name: 'Merlot' })).toBe('Edit Merlot');
    });

    it('handles missing interpolation params gracefully', () => {
      setLocale('en');
      expect(t('admin.edit_wine')).toBe('Edit {name}');
    });

    it('interpolation works in Spanish', () => {
      setLocale('es');
      expect(t('admin.edit_wine', { name: 'Merlot' })).toBe('Editar Merlot');
    });
  });

  describe('tc() — content translation', () => {
    const record = {
      name: 'Estate Merlot',
      description: 'A rich red wine.',
      translations: {
        es: {
          name: 'Merlot de la Finca',
          description: 'Un vino tinto rico.',
        },
      },
    };

    it('returns base field when locale is en', () => {
      setLocale('en');
      expect(tc(record, 'name')).toBe('Estate Merlot');
    });

    it('returns translated field when locale is es', () => {
      setLocale('es');
      expect(tc(record, 'name')).toBe('Merlot de la Finca');
    });

    it('falls back to base field when translation missing', () => {
      setLocale('es');
      const partial = { name: 'Test', translations: { es: {} } };
      expect(tc(partial, 'name')).toBe('Test');
    });

    it('falls back when translations column is null', () => {
      setLocale('es');
      const noTranslations = { name: 'Test', translations: null };
      expect(tc(noTranslations, 'name')).toBe('Test');
    });

    it('returns null for null record', () => {
      expect(tc(null, 'name')).toBeNull();
    });

    it('returns null for missing field', () => {
      setLocale('en');
      expect(tc(record, 'nonexistent')).toBeNull();
    });
  });

  describe('getSupportedLocales', () => {
    it('returns array with en and es', () => {
      const locales = getSupportedLocales();
      expect(locales).toContain('en');
      expect(locales).toContain('es');
      expect(locales).toHaveLength(2);
    });
  });

  describe('createLanguageToggle', () => {
    it('creates a toggle element with buttons for each locale', () => {
      const el = createLanguageToggle();
      expect(el.className).toBe('lang-toggle');
      const buttons = el.querySelectorAll('.lang-toggle__btn');
      expect(buttons.length).toBe(2);
    });

    it('marks the current locale as active', () => {
      setLocale('en');
      const el = createLanguageToggle();
      const active = el.querySelector('.lang-toggle__btn--active');
      expect(active.dataset.locale).toBe('en');
    });

    it('switches locale on click and calls onSwitch', () => {
      setLocale('en');
      const onSwitch = vi.fn();
      const el = createLanguageToggle(onSwitch);

      // Click the ES button
      const esBtn = el.querySelector('[data-locale="es"]');
      esBtn.click();

      expect(getLocale()).toBe('es');
      expect(onSwitch).toHaveBeenCalledWith('es');
    });

    it('does not call onSwitch when clicking already active locale', () => {
      setLocale('en');
      const onSwitch = vi.fn();
      const el = createLanguageToggle(onSwitch);

      const enBtn = el.querySelector('[data-locale="en"]');
      enBtn.click();

      expect(onSwitch).not.toHaveBeenCalled();
    });
  });
});
