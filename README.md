# DizzyOps

AfrodizzyActs operations portal.

Live preview: https://afrodizzyacts.github.io/DizzyOps/

The initial frontend contains navigation and empty operational modules. Database persistence and external integrations are not enabled. GitHub Pages is a **public preview, not a protected business application**.

## Google Workspace SAML SSO (configuration staged)

A new Google Workspace IdP signing certificate (valid until 23 October 2031), IdP metadata and safe disabled login entry are staged on a feature branch. **Actual sign-in is NOT live** until the SAML service provider and secure session/data API are deployed, Google Workspace ACS and entity ID are configured, and end-to-end testing is complete.

- [SSO integration architecture and setup](docs/google-workspace-sso.md)
- [Google Workspace post-job workflow integration](docs/post-job-google-workspace-integration.md)

Do not store production customer or performer data in the browser-only quotation UI or public repository.
