/* DizzyOps: landing-page UI only. Authorization is enforced by the deployed backend. */
(() => {
  'use strict';
  const button = document.getElementById('google-signin');
  const status = document.getElementById('auth-status');
  const message = document.getElementById('auth-status-text');
  const config = window.DIZZYOPS_AUTH_CONFIG || {};
  const year = String(new Date().getFullYear());
  for (const id of ['copyright-year', 'mobile-copyright-year']) {
    const el = document.getElementById(id);
    if (el) el.textContent = year;
  }

  // Permit only a same-origin SP-initiated login path. An IdP URL is NOT a login endpoint.
  // This is only a UI safety check, not an authentication or authorization boundary.
  let login = null;
  try {
    if (config.enabled === true &&
        typeof config.loginUrl === 'string' &&
        /^\/(?!\/)/.test(config.loginUrl) &&
        window.location.protocol === 'https:') {
      const candidate = new URL(config.loginUrl, window.location.origin);
      if (candidate.origin === window.location.origin &&
          candidate.pathname === '/auth/saml/login' &&
          !candidate.username && !candidate.password &&
          !candidate.search && !candidate.hash) {
        login = candidate.href;
      }
    }
  } catch {
    login = null;
  }

  if (login) {
    button.disabled = false;
    status.classList.add('is-ready');
    message.textContent = 'Google Workspace single sign-on is available. Use your approved organization account.';
    button.addEventListener('click', () => {
      window.location.assign(login);
    });
  } else {
    button.disabled = true;
    message.textContent = 'Secure sign-in is being configured by your administrator. Access will be enabled once the identity service is ready.';
  }
})();
