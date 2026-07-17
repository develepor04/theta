import { PublicClientApplication } from '@azure/msal-browser';

const TENANT_ID = import.meta.env.VITE_AZURE_TENANT_ID || '';
const CLIENT_ID = import.meta.env.VITE_AZURE_CLIENT_ID  || '';

// SECURITY: VITE_AZURE_TENANT_ID must be set to your org's tenant ID.
// Leaving it unset falls back to 'common', which allows any Microsoft
// account (personal or any Azure AD tenant) to complete the OAuth flow.
// The backend DB lookup is the final gate, but setting the tenant ID
// restricts the OAuth popup to your org's directory as a first layer.
if (!TENANT_ID) {
  console.warn('[MSAL] VITE_AZURE_TENANT_ID is not set — falling back to "common". Set it to your Azure AD tenant ID to restrict login to your organisation.');
}

export const msalConfig = {
  auth: {
    clientId:    CLIENT_ID,
    authority:   `https://login.microsoftonline.com/${TENANT_ID || 'common'}`,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation:        'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ['User.Read'],
};

export const TEAMS_DOMAIN = 'thetadynamic.io';

/** Returns true only when a real Client ID has been provided. */
export function isMsalConfigured() {
  return Boolean(CLIENT_ID && CLIENT_ID.trim().length > 10);
}

let _msalInstance = null;

export function getMsalInstance() {
  if (!_msalInstance) {
    _msalInstance = new PublicClientApplication(msalConfig);
  }
  return _msalInstance;
}


export async function initializeMsal() {
  const msal = getMsalInstance();

  try {
    // REQUIRED in MSAL v3+
    await msal.initialize();

    const response = await msal.handleRedirectPromise();

    if (response?.account) {
      msal.setActiveAccount(response.account);
    } else {
      const accounts = msal.getAllAccounts();
      if (accounts.length > 0) {
        msal.setActiveAccount(accounts[0]);
      }
    }
  } catch (error) {
    // Suppress benign no_token_request_cache_error (occurs when using popup instead of redirect)
    if (error?.errorCode !== 'no_token_request_cache_error') {
      console.error("[MSAL] Initialization error:", error);
    }
  }
}