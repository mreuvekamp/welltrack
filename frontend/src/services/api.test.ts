import { describe, it, expect, beforeEach } from 'vitest';
import { setTokens, clearTokens, hasAccessToken } from './api';

const ACCESS_TOKEN_KEY = 'welltrack_access_token';
const REFRESH_TOKEN_KEY = 'welltrack_refresh_token';

describe('API service - token management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('setTokens stores both tokens in localStorage', () => {
    setTokens('access-123', 'refresh-456');

    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe('access-123');
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-456');
  });

  it('clearTokens removes both tokens from localStorage', () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, 'access-123');
    localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-456');

    clearTokens();

    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
  });

  it('hasAccessToken returns true when token exists', () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, 'access-123');

    expect(hasAccessToken()).toBe(true);
  });

  it('hasAccessToken returns false when token does not exist', () => {
    expect(hasAccessToken()).toBe(false);
  });
});
