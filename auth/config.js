// PUBLIC identifiers only. Never add Firebase Admin credentials, signing keys or secrets.
// Identity Platform MUST NOT be enabled until Cloud Run's protected same-origin
// /auth/session endpoint is deployed, and the Workspace SAML provider is verified.
// Frontend flags are NOT authorization. The backend enforces an explicit staff allowlist.
window.DIZZYOPS_AUTH_CONFIG = Object.freeze({
  // Legacy custom SAML service-provider integration (unused by managed Identity Platform).
  enabled: false,
  loginUrl: "",
  // Managed Google Cloud Identity Platform: replace Firebase web identifiers using
  // Google Cloud Console > Identity Platform > Project settings > Web app.
  identityPlatform: {
    enabled: false,
    providerId: "saml.afrodizzyacts",
    firebase: {
      apiKey: "REPLACE_ME",
      authDomain: "REPLACE_ME",
      projectId: "REPLACE_ME",
      appId: "REPLACE_ME"
    }
  }
});
