// no-console is off for this file via eslint.config.js

const isDev = () => localStorage.getItem('debug') === '1';
const hasSentry = () => typeof window.Sentry !== 'undefined';

function buildExtra(args) {
  return args.reduce((acc, a, i) => {
    if (!(a instanceof Error)) acc[`arg${i}`] = a;
    return acc;
  }, {});
}

export function error(message, ...args) {
  console.error(message, ...args);
  if (hasSentry()) {
    const err = args.find(a => a instanceof Error);
    if (err && typeof window.Sentry.captureException === 'function') {
      window.Sentry.captureException(err, { extra: { message, ...buildExtra(args) } });
    } else if (typeof window.Sentry.captureMessage === 'function') {
      window.Sentry.captureMessage(message, { level: 'error', extra: buildExtra(args) });
    }
  }
}

export function warn(message, ...args) {
  console.warn(message, ...args);
  if (hasSentry() && typeof window.Sentry.captureMessage === 'function') {
    window.Sentry.captureMessage(message, { level: 'warning', extra: buildExtra(args) });
  }
}

export function info(message, ...args) {
  if (isDev()) console.info(message, ...args);
}

export function debug(message, ...args) {
  if (isDev()) console.debug(message, ...args);
}

export function breadcrumb(message, category = 'app', data = {}) {
  if (hasSentry() && typeof window.Sentry.addBreadcrumb === 'function') {
    window.Sentry.addBreadcrumb({ message, category, data, level: 'info' });
  }
}

export function setUser(user) {
  if (hasSentry() && typeof window.Sentry.setUser === 'function') {
    window.Sentry.setUser({ id: user.id, email: user.email });
  }
}

export function clearUser() {
  if (hasSentry() && typeof window.Sentry.setUser === 'function') {
    window.Sentry.setUser(null);
  }
}
