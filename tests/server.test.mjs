import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import http from 'node:http';
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';
import { createApp } from '../server.mjs';

const SAMPLE_PASSWORD = 'Example-Login!2026';
const NEW_PASSWORD = 'Changed-Login!2026';
const SEED_USERS = [
  { username: 'admin', displayName: 'Administrator', role: 'admin', password: SAMPLE_PASSWORD, mustChangePassword: false },
  { username: 'alice', displayName: 'Alice', role: 'user', password: SAMPLE_PASSWORD, mustChangePassword: false },
  { username: 'bob', displayName: 'Bob', role: 'user', password: SAMPLE_PASSWORD, mustChangePassword: false },
  { username: 'charlie', displayName: 'Charlie', role: 'user', password: SAMPLE_PASSWORD, mustChangePassword: false },
];

async function fixture(t, overrides = {}) {
  const root = await mkdtemp(join(tmpdir(), 'modern-site-api-'));
  const publicDir = join(root, 'public');
  const dataDir = join(root, 'private-data');
  await mkdir(publicDir);
  await writeFile(join(publicDir, 'index.html'), '<!doctype html><title>Members only</title>');
  await writeFile(join(publicDir, 'login.html'), '<!doctype html><title>Sign in</title>');
  await writeFile(join(publicDir, 'portal.js'), '/* public client */');
  const app = createApp({ dataDir, publicDir, seedUsers: SEED_USERS, secureCookies: false, ...overrides });
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const eventClients = [];
  let closed = false;
  async function close() {
    if (closed) return;
    closed = true;
    eventClients.forEach(client => client.abort());
    await app.close();
  }
  t.after(async () => { await close(); await rm(root, { recursive: true, force: true }); });
  async function request(path, { method = 'GET', body, session, csrf = true, headers = {}, redirect = 'manual' } = {}) {
    const outgoing = { ...headers };
    if (session) {
      outgoing.Cookie = session.cookie;
      if (csrf && method !== 'GET') outgoing['X-CSRF-Token'] = session.csrfToken;
    }
    if (body !== undefined) outgoing['Content-Type'] = 'application/json';
    const response = await fetch(base + path, {
      method, headers: outgoing, redirect, body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { response, status: response.status, data };
  }
  async function login(username, password = SAMPLE_PASSWORD) {
    const result = await request('/api/login', { method: 'POST', body: { username, password } });
    assert.equal(result.status, 200, `Login should succeed for ${username}`);
    assert.ok(result.data.user?.id);
    assert.equal(typeof result.data.csrfToken, 'string');
    const cookieHeader = result.response.headers.get('set-cookie');
    assert.ok(cookieHeader);
    return { ...result.data, cookie: cookieHeader.split(';', 1)[0], cookieHeader };
  }
  async function events(session) {
    const controller = new AbortController();
    const response = await fetch(base + '/api/events', { headers: { Cookie: session.cookie }, signal: controller.signal });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/event-stream/);
    const client = { events: [], abort: () => controller.abort() };
    eventClients.push(client);
    client.done = (async () => {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          pending += decoder.decode(value, { stream: true }).replaceAll('\r\n', '\n');
          let boundary;
          while ((boundary = pending.indexOf('\n\n')) !== -1) {
            const block = pending.slice(0, boundary);
            pending = pending.slice(boundary + 2);
            let type = 'message';
            const data = [];
            for (const line of block.split('\n')) {
              if (line.startsWith('event:')) type = line.slice(6).trim();
              if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
            }
            if (data.length) {
              let parsed;
              try { parsed = JSON.parse(data.join('\n')); } catch { parsed = data.join('\n'); }
              client.events.push({ type, data: parsed });
            }
          }
        }
      } catch (error) { if (!controller.signal.aborted) throw error; }
    })();
    return client;
  }
  return { app, root, publicDir, dataDir, base, request, login, events, close };
}

async function expectEvent(client, predicate) {
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    const event = client.events.find(predicate);
    if (event) return event;
    await pause(15);
  }
  assert.fail('Expected real-time event did not arrive');
}

test('default seed contains twenty users and one admin, stores hashes and preserves initial credentials on restart', async t => {
  const f = await fixture(t, { seedUsers: undefined });
  const users = f.app.db.prepare('SELECT * FROM users').all();
  assert.equal(users.length, 21);
  assert.equal(users.filter(user => user.role === 'admin').length, 1);
  assert.deepEqual(users.filter(user => user.role === 'user').map(user => user.username).sort(),
    Array.from({ length: 20 }, (_, index) => `user${String(index + 1).padStart(2, '0')}`));
  assert.ok(users.every(user => user.must_change_password === 1));
  assert.ok(users.every(user => typeof user.password_hash === 'string' && user.password_hash.length >= 64));
  assert.equal(new Set(users.map(user => user.salt)).size, 21);
  assert.equal((await stat(f.app.credentialsPath)).mode & 0o777, 0o600);
  const original = await readFile(f.app.credentialsPath, 'utf8');
  await f.close();
  const restored = createApp({ dataDir: f.dataDir, publicDir: f.publicDir, secureCookies: false });
  try {
    assert.equal(restored.db.prepare('SELECT COUNT(*) AS total FROM users').get().total, 21);
    assert.equal(await readFile(restored.credentialsPath, 'utf8'), original);
  } finally { await restored.close(); }
});

test('unauthenticated visitors see login and cannot read protected APIs, source files or private data', async t => {
  const f = await fixture(t);
  for (const path of ['/', '/index.html']) {
    const result = await f.request(path);
    assert.equal(result.status, 302);
    assert.equal(result.response.headers.get('location'), '/login');
  }
  assert.equal((await f.request('/login')).status, 200);
  assert.equal((await f.request('/portal.js')).status, 200);
  assert.equal((await f.request('/api/health')).status, 200);
  assert.equal((await f.request('/api/session')).status, 401);
  assert.equal((await f.request('/api/messages')).status, 401);
  for (const path of ['/server.mjs', '/package.json', '/README.md', '/.data/initial-credentials.txt', '/private-data/app.db', '/%2e%2e/server.mjs']) {
    assert.equal((await f.request(path)).status, 404, `${path} must never be served`);
  }
  const wrong = await f.request('/api/login', { method: 'POST', body: { username: 'alice', password: 'Wrong-password!' } });
  assert.equal(wrong.status, 401);
});

test('sessions use protected cookies and require CSRF and same-origin mutations; normal users cannot administer', async t => {
  const f = await fixture(t);
  const alice = await f.login('alice');
  const admin = await f.login('admin');
  assert.match(alice.cookieHeader, /HttpOnly/i);
  assert.match(alice.cookieHeader, /SameSite=Strict/i);
  assert.equal((await f.request('/api/session', { session: alice })).data.user.username, 'alice');
  assert.equal((await f.request('/api/admin/users', { session: alice })).status, 403);
  const directory = await f.request('/api/admin/users', { session: admin });
  assert.equal(directory.status, 200);
  assert.equal(directory.data.users.length, 4);
  assert.equal(directory.data.stats.totalUsers, 4);
  assert.ok(directory.data.users.every(user => !('password' in user) && !('password_hash' in user) && !('salt' in user)));
  const missing = await f.request('/api/messages', { method: 'POST', session: alice, csrf: false, body: { body: 'Missing CSRF token', recipientId: null } });
  assert.equal(missing.status, 403);
  const foreign = await f.request('/api/messages', { method: 'POST', session: alice, headers: { Origin: 'https://untrusted.example' }, body: { body: 'Cross-origin mutation', recipientId: null } });
  assert.equal(foreign.status, 403);
  const okay = await f.request('/api/messages', { method: 'POST', session: alice, headers: { Origin: f.base }, body: { body: 'A same-origin message', recipientId: null } });
  assert.ok([200, 201].includes(okay.status));
  assert.equal((await f.request('/api/logout', { method: 'POST', session: alice })).status, 200);
  assert.equal((await f.request('/api/session', { session: alice })).status, 401);
});

test('initial passwords must change before member access and rotation invalidates the old session', async t => {
  const f = await fixture(t, { seedUsers: [SEED_USERS[0], { ...SEED_USERS[1], mustChangePassword: true }] });
  const initial = await f.login('alice');
  assert.equal(initial.user.mustChangePassword, true);
  const denied = await f.request('/api/members', { session: initial });
  assert.equal(denied.status, 403);
  assert.equal(denied.data.error.code, 'PASSWORD_CHANGE_REQUIRED');
  const result = await f.request('/api/password', { method: 'POST', session: initial, body: { currentPassword: SAMPLE_PASSWORD, newPassword: NEW_PASSWORD } });
  assert.equal(result.status, 200);
  assert.equal(result.data.user.mustChangePassword, false);
  assert.ok(result.response.headers.get('set-cookie'));
  assert.notEqual(result.data.csrfToken, initial.csrfToken);
  assert.equal((await f.request('/api/session', { session: initial })).status, 401);
  assert.equal((await f.request('/api/login', { method: 'POST', body: { username: 'alice', password: SAMPLE_PASSWORD } })).status, 401);
  const changed = await f.login('alice', NEW_PASSWORD);
  assert.equal((await f.request('/api/members', { session: changed })).status, 200);
  const row = f.app.db.prepare('SELECT * FROM users WHERE username = ?').get('alice');
  assert.notEqual(row.password_hash, NEW_PASSWORD);
  assert.ok(!JSON.stringify(row).includes(NEW_PASSWORD));
});

test('general and private chat have separate history and private live events reach only participants', async t => {
  const f = await fixture(t);
  const [alice, bob, charlie] = await Promise.all(['alice', 'bob', 'charlie'].map(username => f.login(username)));
  const [aliceEvents, bobEvents, charlieEvents] = await Promise.all([alice, bob, charlie].map(session => f.events(session)));
  const privateResult = await f.request('/api/messages', { method: 'POST', session: alice, body: { recipientId: bob.user.id, body: 'Only Alice and Bob should see this.' } });
  assert.ok([200, 201].includes(privateResult.status));
  const secret = privateResult.data.message;
  assert.equal(secret.recipientId, bob.user.id);
  await expectEvent(aliceEvents, event => event.type === 'message' && event.data.id === secret.id);
  await expectEvent(bobEvents, event => event.type === 'message' && event.data.id === secret.id);
  const publicResult = await f.request('/api/messages', { method: 'POST', session: bob, body: { recipientId: null, body: 'Hello to the whole group.' } });
  assert.ok([200, 201].includes(publicResult.status));
  const publicMessage = publicResult.data.message;
  await expectEvent(charlieEvents, event => event.type === 'message' && event.data.id === publicMessage.id);
  assert.ok(!charlieEvents.events.some(event => event.type === 'message' && event.data.id === secret.id));
  const bobHistory = await f.request(`/api/messages?peer=${alice.user.id}`, { session: bob });
  assert.deepEqual(bobHistory.data.messages.map(message => message.id), [secret.id]);
  const outsiderHistory = await f.request(`/api/messages?peer=${alice.user.id}`, { session: charlie });
  assert.deepEqual(outsiderHistory.data.messages, []);
  const groupHistory = await f.request('/api/messages?peer=all', { session: alice });
  assert.deepEqual(groupHistory.data.messages.map(message => message.id), [publicMessage.id]);
  const after = await f.request(`/api/messages?peer=all&after=${publicMessage.id}`, { session: alice });
  assert.deepEqual(after.data.messages, []);
  assert.equal((await f.request('/api/messages', { method: 'POST', session: alice, body: { recipientId: null, body: '   ' } })).status, 400);
  assert.equal((await f.request('/api/messages', { method: 'POST', session: alice, body: { recipientId: null, body: 'x'.repeat(2001) } })).status, 400);
});

test('admin can create, edit, reset and disable users while preventing self-lockout', async t => {
  const f = await fixture(t);
  const admin = await f.login('admin');
  const bob = await f.login('bob');
  const created = await f.request('/api/admin/users', { method: 'POST', session: admin, body: { username: 'newmember', displayName: 'New Member', password: SAMPLE_PASSWORD } });
  assert.ok([200, 201].includes(created.status));
  assert.equal(created.data.user.mustChangePassword, true);
  const edited = await f.request(`/api/admin/users/${created.data.user.id}`, { method: 'PATCH', session: admin, body: { displayName: 'Updated Member', username: 'updatedmember' } });
  assert.equal(edited.status, 200);
  assert.equal(edited.data.user.displayName, 'Updated Member');
  assert.equal(edited.data.user.username, 'updatedmember');
  const reset = await f.request(`/api/admin/users/${bob.user.id}/password`, { method: 'POST', session: admin, body: { password: NEW_PASSWORD } });
  assert.equal(reset.status, 200);
  assert.equal((await f.request('/api/session', { session: bob })).status, 401);
  const resetLogin = await f.login('bob', NEW_PASSWORD);
  assert.equal(resetLogin.user.mustChangePassword, true);
  assert.equal((await f.request(`/api/admin/users/${bob.user.id}`, { method: 'PATCH', session: admin, body: { active: false } })).status, 200);
  assert.equal((await f.request('/api/session', { session: resetLogin })).status, 401);
  const disabled = await f.request('/api/login', { method: 'POST', body: { username: 'bob', password: NEW_PASSWORD } });
  assert.ok([401, 403].includes(disabled.status));
  const members = await f.request('/api/members', { session: admin });
  assert.ok(!members.data.users.some(user => user.id === bob.user.id));
  const selfDisable = await f.request(`/api/admin/users/${admin.user.id}`, { method: 'PATCH', session: admin, body: { active: false } });
  assert.ok([400, 403, 409].includes(selfDisable.status));
  assert.equal((await f.request('/api/session', { session: admin })).status, 200);
});

test('only admin may moderate chat and deleted messages disappear from persistent history', async t => {
  const f = await fixture(t);
  const [admin, alice] = await Promise.all(['admin', 'alice'].map(username => f.login(username)));
  const posted = await f.request('/api/messages', { method: 'POST', session: alice, body: { recipientId: null, body: 'A message to moderate.' } });
  assert.ok([200, 201].includes(posted.status));
  const id = posted.data.message.id;
  assert.equal((await f.request(`/api/admin/messages/${id}`, { method: 'DELETE', session: alice })).status, 403);
  assert.equal((await f.request(`/api/admin/messages/${id}`, { method: 'DELETE', session: admin })).status, 200);
  const history = await f.request('/api/messages?peer=all', { session: alice });
  assert.ok(!history.data.messages.some(message => message.id === id));
});

test('malformed CSRF tokens are denied without server errors and repeated bad logins are throttled', async t => {
  const f = await fixture(t, { loginMaxAttempts: 2 });
  const alice = await f.login('alice');
  const malformed = await f.request('/api/messages', {
    method: 'POST', session: alice, csrf: false,
    headers: { 'X-CSRF-Token': 'é'.repeat(alice.csrfToken.length) },
    body: { recipientId: null, body: 'This request must be rejected.' },
  });
  assert.equal(malformed.status, 403);
  for (let attempt = 0; attempt < 2; attempt++) {
    assert.equal((await f.request('/api/login', { method: 'POST', body: { username: 'bob', password: 'Incorrect-password!' } })).status, 401);
  }
  const limited = await f.request('/api/login', { method: 'POST', body: { username: 'bob', password: 'Incorrect-password!' } });
  assert.equal(limited.status, 429);
  assert.equal(limited.data.error.code, 'LOGIN_RATE_LIMIT');
});

test('expired sessions cannot access member data', async t => {
  const f = await fixture(t, { sessionTtlMs: 100 });
  const alice = await f.login('alice');
  assert.equal((await f.request('/api/session', { session: alice })).status, 200);
  await pause(130);
  assert.equal((await f.request('/api/session', { session: alice })).status, 401);
  assert.equal((await f.request('/api/members', { session: alice })).status, 401);
});

test('revoking an account while a request body is streaming prevents the pending mutation', async t => {
  const f = await fixture(t);
  const [admin, alice] = await Promise.all(['admin', 'alice'].map(username => f.login(username)));
  const payload = JSON.stringify({ recipientId: null, body: 'This pending message must never be saved.' });
  const arrived = once(f.app.server, 'request');
  let streamedRequest;
  const responsePromise = new Promise((resolveResponse, reject) => {
    streamedRequest = http.request(f.base + '/api/messages', {
      method: 'POST',
      headers: {
        Cookie: alice.cookie,
        'X-CSRF-Token': alice.csrfToken,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolveResponse({ status: response.statusCode, body: Buffer.concat(chunks).toString() }));
      response.on('error', reject);
    });
    streamedRequest.on('error', reject);
    streamedRequest.write(payload.slice(0, 20));
  });
  t.after(() => streamedRequest.destroy());
  await arrived;
  assert.equal((await f.request(`/api/admin/users/${alice.user.id}`, {
    method: 'PATCH', session: admin, body: { active: false },
  })).status, 200);
  streamedRequest.end(payload.slice(20));
  const blocked = await responsePromise;
  assert.equal(blocked.status, 401);
  const history = await f.request('/api/messages?peer=all', { session: admin });
  assert.deepEqual(history.data.messages, []);
});

test('an expired SSE session receives no broadcasts before the next heartbeat', async t => {
  const f = await fixture(t, { eventPingMs: 60_000 });
  const alice = await f.login('alice');
  const aliceEvents = await f.events(alice);
  await expectEvent(aliceEvents, event => event.type === 'connected');
  f.app.db.prepare('UPDATE sessions SET expires_at = ? WHERE user_id = ?').run(Date.now() - 1, alice.user.id);
  const bob = await f.login('bob');
  const posted = await f.request('/api/messages', {
    method: 'POST', session: bob, body: { recipientId: null, body: 'Only unexpired sessions may receive this broadcast.' },
  });
  assert.ok([200, 201].includes(posted.status));
  await expectEvent(aliceEvents, event => event.type === 'session-revoked');
  assert.ok(!aliceEvents.events.some(event => event.type === 'message' && event.data.id === posted.data.message.id));
  assert.equal((await f.request('/api/session', { session: alice })).status, 401);
});
