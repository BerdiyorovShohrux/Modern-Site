(() => {
  'use strict';
  const form = document.getElementById('login-form');
  const submit = form.querySelector('[type="submit"]');
  const error = document.getElementById('login-error');
  const help = document.getElementById('login-help');
  const password = form.elements.namedItem('password');
  const toggle = document.getElementById('password-toggle');
  const t = key => window.SiteI18n.t(key);
  let errorKey = '';
  function showError(key) { errorKey = key; error.textContent = t(key); error.hidden = false; }
  function refreshToggle() { toggle.setAttribute('aria-label', t(password.type === 'password' ? 'login.showPassword' : 'login.hidePassword')); }
  toggle.addEventListener('click', () => {
    const showing = password.type === 'password';
    password.type = showing ? 'text' : 'password';
    toggle.setAttribute('aria-pressed', String(showing));
    refreshToggle();
  });
  document.getElementById('password-help').addEventListener('click', () => { help.hidden = !help.hidden; });
  document.addEventListener('site-language-change', () => { refreshToggle(); if (errorKey) error.textContent = t(errorKey); });
  form.addEventListener('input', () => { error.hidden = true; errorKey = ''; });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submit.disabled) return;
    error.hidden = true;
    submit.disabled = true;
    submit.querySelector('span').textContent = t('login.loading');
    try {
      const response = await fetch('/api/login', { method: 'POST', credentials: 'same-origin', headers: {'Content-Type':'application/json'}, body: JSON.stringify({username: form.elements.namedItem('username').value.trim(), password: password.value}) });
      if (response.ok) { password.value = ''; window.location.replace('/'); return; }
      const code = await response.json().then(data => data.error?.code).catch(() => '');
      showError(response.status === 429 ? 'login.rateLimit' : response.status >= 500 ? 'login.unavailable' : code === 'ORIGIN_REJECTED' ? 'login.unavailable' : 'login.invalid');
      password.value = '';
      password.focus();
    } catch { showError('login.unavailable'); }
    finally { submit.disabled = false; submit.querySelector('span').textContent = t('login.submit'); }
  });
  fetch('/api/session', {credentials:'same-origin', cache:'no-store'}).then(response => { if (response.ok) window.location.replace('/'); }).catch(() => {});
  document.getElementById('login-year').textContent = new Date().getFullYear();
  refreshToggle();
})();
