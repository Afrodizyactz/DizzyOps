/**
 * Managed SAML through Google Cloud Identity Platform (Firebase JS SDK).
 * Only imported when a project is explicitly configured and a backend is deployed.
 * Public Firebase web identifiers are configuration, never authentication secrets.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {
  getAuth, SAMLAuthProvider, getRedirectResult, signInWithRedirect,
  setPersistence, inMemoryPersistence, signOut
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';

export async function wireSaml({config, button, status, message}) {
  const app = initializeApp(config.firebase);
  const auth = getAuth(app);
  await setPersistence(auth, inMemoryPersistence);
  const provider = new SAMLAuthProvider(config.providerId);
  const fail = () => {
    status.classList.remove('is-ready');
    message.textContent = 'Authentication failed or your account has not been approved. Contact your AfrodizzyActs administrator.';
    button.disabled = false;
  };
  const createServerSession = async user => {
    button.disabled = true;
    message.textContent = 'Verifying your account and access permissions…';
    try {
      const token = await user.getIdToken(true);
      const csrf = await fetch('/auth/csrf',{credentials:'same-origin',cache:'no-store'});
      if(!csrf.ok) throw new Error('Session service unavailable');
      const {csrfToken} = await csrf.json();
      const response = await fetch('/auth/session',{
        method:'POST',
        credentials:'same-origin',
        cache:'no-store',
        headers:{'Content-Type':'application/json','X-CSRF-Token':csrfToken},
        body:JSON.stringify({idToken:token})
      });
      if(!response.ok) throw new Error('Access denied');
      await signOut(auth);
      window.location.replace('/portal.html');
    }catch{
      await signOut(auth).catch(()=>{});
      fail();
    }
  };
  button.disabled = true;
  try {
    const result = await getRedirectResult(auth);
    if(result?.user) return await createServerSession(result.user);
    // No authentication is inferred from a front-end flag or previous page visit.
    button.disabled = false;
    status.classList.add('is-ready');
    message.textContent = 'Google Workspace sign-in is available. Use your approved organization account.';
    button.addEventListener('click', async()=>{
      button.disabled = true;
      message.textContent = 'Opening the secure Google Workspace sign-in…';
      try{await signInWithRedirect(auth, provider);}
      catch{fail();}
    });
  }catch{
    fail();
  }
}
