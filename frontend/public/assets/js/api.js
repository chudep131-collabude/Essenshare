/**
 * api.js — Global Surplus Redistribution Platform
 * Fetch wrapper for /api/v1 endpoints.
 *
 * Security rules:
 * - Auth token is NEVER placed in URL query parameters.
 * - Token is sent only in the Authorization header.
 * - Passwords are NEVER logged.
 * - On 401, token is cleared and user is redirected to login.
 */

'use strict';

var API_BASE = '/api/v1';
var TOKEN_KEY = 'auth_token';

/* ── Token Helpers ──────────────────────────────────────────────────────────── */

/**
 * Retrieve the stored auth token from localStorage.
 * @returns {string|null}
 */
function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Store the auth token in localStorage.
 * @param {string} token
 */
function setToken(token) {
  if (typeof token !== 'string' || !token) {
    // Do not store empty or non-string values
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove the auth token from localStorage.
 */
function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/* ── Request Builder ────────────────────────────────────────────────────────── */

/**
 * Build request headers. Token is sent in Authorization header only.
 * @returns {Record<string, string>}
 */
function buildHeaders() {
  var headers = {
    'Content-Type': 'application/json',
  };

  var token = getToken();
  if (token) {
    // SECURITY: token goes in Authorization header, never in URL query params
    headers['Authorization'] = 'Bearer ' + token;
  }

  return headers;
}

/**
 * Handle a fetch response. Parses JSON, handles 401 by clearing token and
 * redirecting to login, and throws on non-2xx status codes.
 * @param {Response} response
 * @returns {Promise<any>}
 */
function handleResponse(response) {
  // On 401 Unauthorized: clear token and redirect to login
  if (response.status === 401) {
    clearToken();
    window.location.href = '/login.html';
    // Return a rejected promise so callers can handle the redirect gracefully
    return Promise.reject(new Error('Unauthorized — redirecting to login'));
  }

  return response.json().then(function (data) {
    if (!response.ok) {
      // Surface the server error message if available
      var message = (data && data.message) ? data.message : 'Request failed with status ' + response.status;
      var err = new Error(message);
      err.status = response.status;
      err.data   = data;
      return Promise.reject(err);
    }
    return data;
  });
}

/**
 * Core fetch wrapper.
 * @param {string} method  HTTP method
 * @param {string} path    API path (without /api/v1 prefix)
 * @param {any}    [body]  Request body (will be JSON-stringified)
 * @returns {Promise<any>}
 */
function request(method, path, body) {
  var url = API_BASE + path;

  var options = {
    method: method,
    headers: buildHeaders(),
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  return fetch(url, options).then(handleResponse);
}

/* ── Public API Object ──────────────────────────────────────────────────────── */

var api = {
  /**
   * HTTP GET
   * @param {string} path
   * @returns {Promise<any>}
   */
  get: function (path) {
    return request('GET', path);
  },

  /**
   * HTTP POST
   * @param {string} path
   * @param {any} body
   * @returns {Promise<any>}
   */
  post: function (path, body) {
    return request('POST', path, body);
  },

  /**
   * HTTP PUT
   * @param {string} path
   * @param {any} body
   * @returns {Promise<any>}
   */
  put: function (path, body) {
    return request('PUT', path, body);
  },

  /**
   * HTTP PATCH
   * @param {string} path
   * @param {any} body
   * @returns {Promise<any>}
   */
  patch: function (path, body) {
    return request('PATCH', path, body);
  },

  /**
   * HTTP DELETE
   * @param {string} path
   * @returns {Promise<any>}
   */
  del: function (path) {
    return request('DELETE', path);
  },
};

/* ── Exports ────────────────────────────────────────────────────────────────── */
// Export for use as global variables in browser environment.
// These names are referenced by login.html, register.html, impact.html, etc.
window.api       = api;
window.getToken  = getToken;
window.setToken  = setToken;
window.clearToken = clearToken;
