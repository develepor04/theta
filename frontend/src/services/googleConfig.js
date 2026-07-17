const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export function isGoogleConfigured() {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.length > 10);
}

/**
 * Opens Google's OAuth popup and resolves with an access token.
 * Requires the GIS script to be loaded (index.html).
 */
export function googleSignInPopup() {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services not loaded yet. Please refresh and try again.'));
      return;
    }
    if (!GOOGLE_CLIENT_ID) {
      reject(new Error('Google sign-in is not configured (VITE_GOOGLE_CLIENT_ID missing).'));
      return;
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
        } else {
          resolve(response.access_token);
        }
      },
    });

    client.requestAccessToken({ prompt: 'select_account' });
  });
}
