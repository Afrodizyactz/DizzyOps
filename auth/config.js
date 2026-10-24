// Public frontend configuration only. Do not add secrets or trust this flag for server authorization.
window.DIZZYOPS_AUTH_CONFIG = Object.freeze({
  enabled: false,
  // Set only after the SAML Service Provider / Cloud Run backend is deployed and verified.
  // Must initiate a valid SP-initiated login (never point directly to the Google IdP SSO URL).
  loginUrl: ""
});
