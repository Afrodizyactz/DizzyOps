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

  close.addEventListener('click', closeInfo);
  document.addEventListener('keydown', event => {
    if(event.key === 'Escape' && !panel.hidden) closeInfo();
  });
  const standby = () => {
    // Clickable status, no fake login attempt or public-portal bypass.
    status.classList.remove('is-ready');
    button.disabled = false;
    message.textContent = 'Google Workspace sign-in is not connected yet. Select the button for details.';
    button.addEventListener('click', openInfo);
  };
  const ip = config.identityPlatform || {};
  const f = ip.firebase || {};
  const configured = ip.enabled === true &&
    /^saml\.[a-zA-Z0-9_.-]+$/.test(ip.providerId || '') &&
    [f.apiKey,f.authDomain,f.projectId,f.appId].every(v=>typeof v === 'string' && v.length > 5 && !v.includes('REPLACE_ME')) &&
    window.location.protocol === 'https:';
  if (configured) {
    // Requires the same-origin Cloud Run /auth/session endpoint to actually work.
    button.disabled = true;
    message.textContent = 'Initializing secure sign-in…';
    import('./identity-platform.js')
      .then(({wireSaml})=>wireSaml({config:ip,button,status,message}))
      .catch(()=>{
        message.textContent = 'Unable to start Identity Platform authentication. Contact your administrator.';
        button.disabled = false;
        button.addEventListener('click', openInfo);
      });
  } else if (login) {
    // Legacy custom-SP alternative, only when deliberately configured.
    status.classList.add('is-ready');
    message.textContent = 'Google Workspace single sign-on is available. Use your approved organization account.';
    button.addEventListener('click', () => window.location.assign(login));
  } else {
    standby();
  }
})();
