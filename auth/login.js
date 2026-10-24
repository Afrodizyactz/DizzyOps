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

  const panel = document.getElementById('signin-help-panel');
  const close = document.getElementById('signin-help-close');
  const openInfo = () => {
    panel.hidden = false;
    message.textContent = 'Google Workspace SSO is not connected. The next setup steps are shown below.';
    panel.focus();
  };
  const closeInfo = () => {
    panel.hidden = true;
    button.focus();
  };

  if (login) {
    status.classList.add('is-ready');
    message.textContent = 'Google Workspace single sign-on is available. Use your approved organization account.';
    button.addEventListener('click', () => window.location.assign(login));
    panel.hidden = true;
  } else {
    // The button remains keyboard/mouse/touch clickable so it can explain why
    // login is unavailable. It does NOT attempt a login or grant access.
    message.textContent = 'Google Workspace sign-in is not connected yet. Select the button for details.';
    button.addEventListener('click', openInfo);
    close.addEventListener('click', closeInfo);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !panel.hidden) closeInfo();
    });
  }
})();
