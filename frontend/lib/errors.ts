/**
 * lib/errors.ts
 * Translates backend error codes into plain human-readable messages.
 * The backend returns machine codes like EMAIL_ALREADY_REGISTERED — we never
 * show those to users. Every code maps to a sentence a real person can act on.
 */

import { ApiException } from '@/lib/api';

const CODE_MAP: Record<string, string> = {
  // Auth
  EMAIL_ALREADY_REGISTERED:   'An account with that email address already exists. Try signing in instead.',
  EMAIL_TAKEN:                'An account with that email address already exists. Try signing in instead.',
  INVALID_CREDENTIALS:        'The email or password is incorrect. Please try again.',
  ACCOUNT_SUSPENDED:          'This account has been suspended. Please contact support if you think this is a mistake.',
  ACCOUNT_BANNED:             'This account is no longer active.',
  TOKEN_EXPIRED:              'Your session has expired. Please sign in again.',
  UNAUTHORIZED:               'You need to be signed in to do that.',
  FORBIDDEN:                  'You don\'t have permission to do that.',
  REFRESH_TOKEN_INVALID:      'Your session has expired. Please sign in again.',
  REFRESH_TOKEN_REVOKED:      'Your session has expired. Please sign in again.',

  // Verification
  INVALID_OTP:                'That code is incorrect or has expired. Check your email and try again.',
  ALREADY_VERIFIED:           'This email address is already verified.',
  INVALID_RESET_CODE:         'That reset code is incorrect or has expired. Request a new one.',
  RESEND_RATE_LIMIT:          'Too many attempts. Please wait an hour before requesting another code.',
  ORG_NAME_REQUIRED:          'Organisation name is required.',

  // Donations
  DONATION_NOT_FOUND:         'This donation no longer exists or has already been collected.',
  DONATION_NOT_AVAILABLE:     'This donation is no longer available.',
  DONATION_NOT_EDITABLE:      'This donation can\'t be edited — it may already be reserved or completed.',
  DONATION_COMPLETED:         'This donation has already been completed and can\'t be cancelled.',
  INSUFFICIENT_QUANTITY:      'There isn\'t enough available to fulfil your request.',

  // Pickups
  PICKUP_NOT_FOUND:           'That pickup code doesn\'t exist or has already been used.',
  PICKUP_NOT_PENDING:         'This pickup has already been confirmed or cancelled.',
  CODE_EXPIRED:               'That pickup code has expired.',
  WRONG_DONOR:                'This code doesn\'t belong to one of your listings.',
  WRONG_SESSION:              'This pickup doesn\'t belong to your session.',
  DUPLICATE_REQUEST:          'You already have a pending pickup for this donation.',
  COOLDOWN_ACTIVE:            'Please wait a little while before requesting from this donor again.',
  SESSION_INVALID:            'Your session has expired. Please refresh the page and try again.',

  // Reports
  REPORT_RATE_LIMITED:        'Too many reports submitted from this location. Please wait an hour.',

  // Admin
  CANNOT_MODIFY_ADMIN:        'Admin accounts can\'t be modified from here.',
  USER_NOT_FOUND:             'That user account doesn\'t exist.',
  OPEN_CRITICAL_REPORTS_EXIST: 'This donation can\'t be reinstated until its open safety reports are resolved.',

  // Generic
  EMAIL_SEND_FAILED:          'Could not send verification email. Please try again or request a new code.',
  NETWORK_ERROR:              'Could not reach the server. Check your connection and try again.',
  PARSE_ERROR:                'Received an unexpected response from the server. Please try again.',
  VALIDATION_ERROR:           'Please check your details and try again.',
  NOT_FOUND:                  'That page or resource doesn\'t exist.',
  INTERNAL_ERROR:             'Something went wrong on our end. Please try again in a moment.',
};

/**
 * Returns a plain-English message for any error.
 * Priority: code map → err.message (if it reads like plain English) → fallback
 */
export function friendlyError(
  err: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  if (err instanceof ApiException) {
    // Prefer the mapped message
    if (err.code && CODE_MAP[err.code]) return CODE_MAP[err.code];

    // If the message contains stack trace or node_modules or SMTP internals, do not show technical trace
    if (
      err.message.includes('SMTPConnection') ||
      err.message.includes('Authentication credentials invalid') ||
      err.message.includes('\n at ') ||
      err.message.includes('node_modules') ||
      err.message.includes('Invalid login: 535')
    ) {
      return fallback;
    }

    // If the message from the server looks like a machine code (all caps + underscores), hide it
    if (/^[A-Z_]+$/.test(err.message)) return fallback;

    // If the message looks like a Joi validation detail (contains quotes + must), clean it up
    if (err.message.includes('"') && err.message.includes('must')) {
      return 'Please check your details and try again.';
    }

    // Otherwise trust the server message — it was probably written for humans
    return err.message;
  }

  if (err instanceof Error) {
    if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
      return 'Could not reach the server. Check your connection and try again.';
    }
  }

  return fallback;
}

/**
 * Returns a field-level validation message (for inline form errors).
 * Strips Joi quoting: '"email" must be a valid email' → 'Must be a valid email'
 */
export function cleanValidationMessage(msg: string): string {
  // Remove leading "fieldName" quoted part: '"email" must...' → 'Must...'
  const stripped = msg.replace(/^"[^"]+"\s+/, '');
  // Capitalise first letter
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}
