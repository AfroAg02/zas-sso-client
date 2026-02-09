import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initSSO, getConfig } from '../init-config';

describe('initSSO', () => {
  beforeEach(() => {
    // Reset process.env or other state if necessary
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://original.com');
  });

  it('should initialize with provided options', () => {
    initSSO({
      appUrl: 'http://localhost:3000',
      ssoUrl: 'https://login.example.com',
      redirectUri: '/callback',
      cookieName: 'my-session',
      cookieMaxAgeSeconds: 3600,
    });

    const config = getConfig();
    expect(config.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000');
    expect(config.NEXT_PUBLIC_SSO_URL).toBe('https://login.example.com');
    expect(config.REDIRECT_URI).toBe('/callback');
    expect(config.COOKIE_SESSION_NAME).toBe('my-session');
    expect(config.MAX_COOKIES_AGE).toBe(3600);
  });

  it('should handle endpoint overrides', () => {
    initSSO({
      endpoints: {
        login: 'https://api.example.com/custom-login',
      },
    });

    const config = getConfig();
    expect(config.ENDPOINTS.login).toBe('https://api.example.com/custom-login');
    // me should remain default if not provided
    expect(config.ENDPOINTS.me).toContain('/users/me');
  });

  it('should normalize URLs by removing trailing slashes', () => {
    initSSO({
      appUrl: 'http://localhost:3000/',
      ssoUrl: 'https://login.example.com///',
    });

    const config = getConfig();
    expect(config.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000');
    expect(config.NEXT_PUBLIC_SSO_URL).toBe('https://login.example.com');
  });
});
