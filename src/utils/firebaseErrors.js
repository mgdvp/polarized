// Common Firebase Auth error handler with localized messages
// Reference: https://firebase.google.com/docs/auth/admin/errors
import i18n from '../i18n';

// Map Firebase error codes to i18n key suffixes under "auth.*"
const AUTH_ERROR_KEYS = {
  // Sign-in errors
  'auth/invalid-email': 'invalidEmail',
  'auth/missing-email': 'missingEmail',
  'auth/missing-password': 'missingPassword',
  'auth/wrong-password': 'wrongPassword',
  'auth/user-not-found': 'userNotFound',
  'auth/user-disabled': 'userDisabled',
  'auth/too-many-requests': 'tooManyRequests',
  'auth/network-request-failed': 'networkRequestFailed',

  // Sign-up errors
  'auth/email-already-in-use': 'emailAlreadyInUse',
  'auth/weak-password': 'weakPassword',

  // Popup and provider errors
  'auth/popup-closed-by-user': 'popupClosedByUser',
  'auth/cancelled-popup-request': 'cancelledPopupRequest',
  'auth/popup-blocked': 'popupBlocked',

  // Credential and account existence
  'auth/account-exists-with-different-credential': 'accountExistsWithDifferentCredential',
  'auth/credential-already-in-use': 'credentialAlreadyInUse',

  // Recaptcha or timeouts
  'auth/timeout': 'timeout',
};

export function getAuthErrorMessage(error) {
  if (!error) return i18n.t('auth.unknown');
  // Firebase v9+ typically exposes error.code
  const code = typeof error === 'string' ? error : error.code || error.message || '';
  if (typeof code === 'string') {
    const normalized = code.startsWith('auth/') ? code : `auth/${code}`;
    const keySuffix = AUTH_ERROR_KEYS[normalized];
    if (keySuffix) return i18n.t(`auth.${keySuffix}`);
  }
  return i18n.t('auth.generic');
}
