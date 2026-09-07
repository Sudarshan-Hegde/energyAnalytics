// Simple hardcoded gate to keep the public Render deployment private.
// This is access-limiting, not real security: the credentials ship in the
// frontend bundle. Anyone with the built JS can read them.
export const AUTH_USERNAME = 'power-minds';
export const AUTH_PASSWORD = 'continuum-associates123';

const STORAGE_KEY = 'gridops_auth';

export const checkCredentials = (username, password) =>
  username === AUTH_USERNAME && password === AUTH_PASSWORD;

// Basic auth header the backend expects on every API call.
export const getAuthHeader = () =>
  `Basic ${btoa(`${AUTH_USERNAME}:${AUTH_PASSWORD}`)}`;

export const isAuthenticated = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const setAuthenticated = () => {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    // storage unavailable (private mode) - session stays in memory only
  }
};

export const clearAuthentication = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nothing to clear
  }
};

// fetch() wrapper that attaches the shared credentials. Use it for every call
// to our own backend; plain fetch() is fine for third-party APIs.
export const authFetch = (url, options = {}) =>
  fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: getAuthHeader(),
    },
  });
