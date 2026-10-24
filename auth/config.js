// Public configuration only; no private signing keys, client secrets, or API tokens.
// This must remain disabled until an HTTPS SAML service provider has been deployed,
// configured in Google Workspace, and tested with authorized AfrodizzyActs users.
// The loginUrl must be the application's own SP-initiated SAML login endpoint.
// NEVER point loginUrl directly to Google's IdP URL: it is not a usable login request.
window.DIZZYOPS_AUTH_CONFIG = Object.freeze({
  enabled: false,
  loginUrl: ""
});
