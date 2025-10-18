// Common Firebase Auth error handler with user-friendly messages
// Reference: https://firebase.google.com/docs/auth/admin/errors

const AUTH_ERROR_MESSAGES = {
  // Sign-in errors
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/missing-email': 'Please enter your email address.',
  'auth/missing-password': 'Please enter your password.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/user-not-found': "We couldn't find an account with that email.",
  'auth/user-disabled': 'This account has been disabled. Contact support if this is an error.',
  'auth/too-many-requests': 'Too many attempts. Please wait a bit and try again.',
  'auth/network-request-failed': 'Network error. Please check your connection and try again.',

  // Sign-up errors
  'auth/email-already-in-use': 'There is already an account with this email.',
  'auth/weak-password': 'Password is too weak. Use at least 6 characters.',

  // Popup and provider errors
  'auth/popup-closed-by-user': 'Sign-in was canceled before it was completed.',
  'auth/cancelled-popup-request': 'Another sign-in popup was already open.',
  'auth/popup-blocked': 'Popup was blocked by your browser. Allow popups and try again.',

  // Credential and account existence
  'auth/account-exists-with-different-credential': 'An account already exists with the same email but different sign-in method.',
  'auth/credential-already-in-use': 'Those credentials are already used by another account.',

  // Recaptcha or timeouts
  'auth/timeout': 'The request timed out. Please try again.',
};

export function getAuthErrorMessage(error) {
  if (!error) return 'An unknown error occurred.';
  // Firebase v9+ typically exposes error.code
  const code = typeof error === 'string' ? error : error.code || error.message || '';
  if (typeof code === 'string') {
    const normalized = code.startsWith('auth/') ? code : `auth/${code}`;
    if (AUTH_ERROR_MESSAGES[normalized]) return AUTH_ERROR_MESSAGES[normalized];
  }
  return 'Something went wrong. Please try again.';
}
