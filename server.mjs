import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const COOKIE_NAME = 'modern_session';
const MAX_BODY_BYTES = 16 * 1024;
const SESSION_TTL = 8 * 60 * 60 * 1000;
const USERNAME = /^[a-z0-9_.-]{3,32}$/;
const hashToken = token => createHash('sha256').update(token).digest('hex');
const randomToken = () => randomBytes(32).toString('base64url');
const nowIso = () => new Date().toISOString();

class HttpError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const fail = (status, code, message) => { throw new HttpError(status, code, message); };
const passwordValid = password => typeof password === 'string' && password.length >= 12 && password.length <= 128 && password.trim().length > 0;
const saltAndHash = password => {
  const salt = randomBytes(16).toString('hex');
  return { salt, hash: scryptSync(password, salt, 64).toString('hex') };
};
const checkPassword = (password, row) => {
  if (typeof password !== 'string' || password.length > 128) return false;
  const expected = Buffer.from(row.password_hash, 'hex');
  const actual = scryptSync(password, row.salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};
const publicUser = row => ({ id: row.id, username: row.username, displayName: row.display_name, role: row.role, mustChangePassword: Boolean(row.must_change_password) });
const adminUser = row => ({ ...publicUser(row), active: Boolean(row.active), createdAt: row.created_at });
const publicMessage = row => ({ id: row.id, senderId: row.sender_id, recipientId: row.recipient_id, body: row.body, createdAt: row.created_at, senderName: row.sender_name });

export function createApp(options = {}) {
  const dataDir = resolve(options.dataDir || process.env.DATA_DIR || resolve(ROOT, '.data'));
  const publicDir = resolve(options.publicDir || ROOT);
  const secureCookies = options.secureCookies ?? process.env.COOKIE_SECURE === '1';
  const allowedOrigin = options.allowedOrigin || process.env.PUBLIC_ORIGIN || null;
  if (allowedOrigin && !/^https?:\/\/[^/]+$/.test(allowedOrigin)) throw new Error('PUBLIC_ORIGIN must be a complete origin without a trailing slash or path.');
  const sessionTtl = options.sessionTtlMs ?? SESSION_TTL;
  const eventPingMs = options.eventPingMs ?? 15000;
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  chmodSync(dataDir, 0o700);
  const dbPath = resolve(dataDir, 'members.sqlite');
  const db = new DatabaseSync(dbPath);
  chmodSync(dbPath, 0o600);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','user')),
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      must_change_password INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      csrf_token TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL REFERENCES users(id),
      recipient_id INTEGER REFERENCES users(id),
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS messages_recipient ON messages(recipient_id, id);
    CREATE INDEX IF NOT EXISTS messages_sender ON messages(sender_id, id);
  `);
  const credentialsPath = resolve(dataDir, 'initial-credentials.json');
  const byId = id => db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (db.prepare('SELECT COUNT(*) AS count FROM users').get().count === 0) {
    const generated = options.seedUsers || [
      { username: 'admin', displayName: 'Administrator', role: 'admin', password: randomBytes(18).toString('base64url') },
      ...Array.from({ length: 20 }, (_, i) => ({ username: `user${String(i + 1).padStart(2, '0')}`, displayName: `User ${String(i + 1).padStart(2, '0')}`, role: 'user', password: randomBytes(18).toString('base64url') }))
    ];
    if (!generated.some(user => user.role === 'admin')) throw new Error('At least one administrator is required.');
    const accounts = generated.map(account => {
      const username = String(account.username).trim().toLowerCase();
      if (!USERNAME.test(username) || !passwordValid(account.password) || !['user', 'admin'].includes(account.role || 'user')) throw new Error('Invalid initial account.');
      return { ...account, username, role: account.role || 'user', displayName: String(account.displayName || username).trim().slice(0, 80) };
    });
    const insert = db.prepare('INSERT INTO users (username, display_name, role, password_hash, salt, must_change_password, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    db.exec('BEGIN IMMEDIATE');
    try {
      for (const account of accounts) {
        const { salt, hash } = saltAndHash(account.password);
        insert.run(account.username, account.displayName, account.role, hash, salt, account.mustChangePassword === false ? 0 : 1, nowIso());
      }
      writeFileSync(credentialsPath, JSON.stringify({ createdAt: nowIso(), accounts: accounts.map(({ username, password, displayName, role }) => ({ username, password, displayName, role })) }, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
      chmodSync(credentialsPath, 0o600);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK'); db.close(); throw error;
    }
  }

  const dummy = saltAndHash(randomToken());
  const dummyUser = { password_hash: dummy.hash, salt: dummy.salt };
  const clients = new Map();
  const loginAttempts = new Map();
  const messageAttempts = new Map();
  const cookie = (token, ttl = sessionTtl) => `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(ttl / 1000)}${secureCookies ? '; Secure' : ''}`;
  const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
    'Cache-Control': 'no-store'
  };
  const json = (res, status, value, headers = {}) => {
    if (res.writableEnded) return;
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
    res.end(JSON.stringify(value));
  };
  const queryMessage = id => db.prepare('SELECT m.*, u.display_name AS sender_name FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.id=?').get(id);
  const readSession = req => {
    const raw = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(COOKIE_NAME + '='))?.slice(COOKIE_NAME.length + 1);
    if (!raw || !/^[a-zA-Z0-9_-]{43}$/.test(raw)) return null;
    const tokenHash = hashToken(raw);
    const session = db.prepare('SELECT * FROM sessions WHERE token_hash=?').get(tokenHash);
    if (!session) return null;
    if (session.expires_at <= Date.now()) { db.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash); return null; }
    const user = byId(session.user_id);
    return user?.active ? { ...session, user } : null;
  };
  const requireSession = req => readSession(req) || fail(401, 'UNAUTHENTICATED', 'Please log in to continue.');
  const requireReady = session => { if (session.user.must_change_password) fail(403, 'PASSWORD_CHANGE_REQUIRED', 'Change your temporary password before continuing.'); };
  const requireAdmin = session => { if (session.user.role !== 'admin') fail(403, 'FORBIDDEN', 'Administrator access is required.'); };
  const checkOrigin = req => {
    if (req.headers['sec-fetch-site'] === 'cross-site') fail(403, 'ORIGIN_REJECTED', 'Cross-site requests are not allowed.');
    if (req.headers.origin) {
      const expected = allowedOrigin || `${secureCookies ? 'https' : 'http'}://${req.headers.host}`;
      if (req.headers.origin !== expected) fail(403, 'ORIGIN_REJECTED', 'The request origin is not allowed.');
    }
  };
  const requireCsrf = (req, session) => {
    checkOrigin(req);
    const token = req.headers['x-csrf-token'];
    if (typeof token !== 'string' || !/^[a-zA-Z0-9_-]{43}$/.test(token) || !timingSafeEqual(Buffer.from(token), Buffer.from(session.csrf_token))) fail(403, 'CSRF_INVALID', 'The session token is missing or invalid. Refresh and try again.');
  };
  const readJson = async req => {
    if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) fail(415, 'JSON_REQUIRED', 'Send an application/json request body.');
    let size = 0; const chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) { req.resume(); fail(413, 'BODY_TOO_LARGE', 'The request is too large.'); }
      chunks.push(chunk);
    }
    let value;
    try { value = JSON.parse(Buffer.concat(chunks).toString()); } catch { fail(400, 'INVALID_JSON', 'The request body must be valid JSON.'); }
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400, 'INVALID_JSON', 'A JSON object is required.');
    return value;
  };
  const readAuthenticatedJson = async (req, session, { allowTemporary = false, admin = false } = {}) => {
    const value = await readJson(req);
    // A password reset, disable or expiry may occur while a slow request body
    // is arriving. Re-authorize immediately before the synchronous mutation.
    const current = requireSession(req);
    requireCsrf(req, current);
    if (!allowTemporary) requireReady(current);
    if (admin) requireAdmin(current);
    Object.assign(session, current);
    return value;
  };
  const setSession = (res, userId) => {
    const token = randomToken(), csrfToken = randomToken(), now = Date.now();
    db.prepare('INSERT INTO sessions (token_hash,user_id,csrf_token,expires_at,created_at) VALUES (?,?,?,?,?)').run(hashToken(token), userId, csrfToken, now + sessionTtl, now);
    res.setHeader('Set-Cookie', cookie(token));
    return { user: publicUser(byId(userId)), csrfToken };
  };
  const sendEvent = (res, type, data) => {
    if (res.writableEnded || res.destroyed) { clients.delete(res); return; }
    try {
      const client = clients.get(res);
      if (client && type !== 'session-revoked') {
        const current = db.prepare('SELECT user_id,expires_at FROM sessions WHERE token_hash=?').get(client.sessionHash);
        if (!current || current.expires_at <= Date.now() || !byId(current.user_id)?.active) {
          res.write('event: session-revoked\ndata: {}\n\n');
          clients.delete(res); res.end(); return;
        }
      }
      if (!res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`)) { clients.delete(res); res.end(); }
    } catch { clients.delete(res); res.destroy(); }
  };
  const broadcast = (type, data, audience = () => true) => {
    for (const [res, client] of clients) if (audience(client)) sendEvent(res, type, data);
  };
  const messageAudience = message => client => message.recipientId === null || client.userId === message.senderId || client.userId === message.recipientId;
  const revokeSessions = (userId, exceptHash = null) => {
    const sql = exceptHash ? 'DELETE FROM sessions WHERE user_id=? AND token_hash<>?' : 'DELETE FROM sessions WHERE user_id=?';
    db.prepare(sql).run(...(exceptHash ? [userId, exceptHash] : [userId]));
    for (const [res, client] of clients) {
      if (client.userId === userId && client.sessionHash !== exceptHash) { sendEvent(res, 'session-revoked', {}); clients.delete(res); res.end(); }
    }
  };
  const rateCheck = (map, key, max, windowMs, code) => {
    const now = Date.now();
    if (map.size > 10000) for (const [entry, value] of map) { if (value.until <= now || map.size > 10000) map.delete(entry); }
    let item = map.get(key);
    if (!item || item.until <= now) { item = { count: 0, until: now + windowMs }; map.set(key, item); }
    item.count++;
    if (item.count > max) fail(429, code, 'Too many attempts. Please try again later.');
  };
  const validateAccount = body => {
    const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
    if (!USERNAME.test(username)) fail(400, 'INVALID_USERNAME', 'Use 3–32 letters, numbers, dots, underscores or hyphens.');
    if (!displayName || displayName.length > 80) fail(400, 'INVALID_NAME', 'A display name of 1–80 characters is required.');
    return { username, displayName };
  };
  const serveFile = (res, name, type) => {
    try { const body = readFileSync(resolve(publicDir, name)); res.writeHead(200, { 'Content-Type': type }); res.end(body); }
    catch { fail(404, 'NOT_FOUND', 'This resource was not found.'); }
  };
  const staticFiles = new Map([
    ['/portal.js', ['portal.js', 'text/javascript; charset=utf-8']],
    ['/portal.css', ['portal.css', 'text/css; charset=utf-8']],
    ['/login.js', ['login.js', 'text/javascript; charset=utf-8']],
    ['/login.css', ['login.css', 'text/css; charset=utf-8']],
    ['/i18n.js', ['i18n.js', 'text/javascript; charset=utf-8']]
  ]);

  const server = http.createServer(async (req, res) => {
    for (const [key, value] of Object.entries(securityHeaders)) res.setHeader(key, value);
    try {
      const url = new URL(req.url, 'http://localhost');
      const path = url.pathname;
      if (req.method === 'GET' && path === '/api/health') return json(res, 200, { ok: true });
      if (req.method === 'GET' && (path === '/login' || path === '/login.html')) return serveFile(res, 'login.html', 'text/html; charset=utf-8');
      if (req.method === 'GET' && (path === '/' || path === '/index.html')) {
        if (!readSession(req)) { res.writeHead(302, { Location: '/login' }); return res.end(); }
        return serveFile(res, 'index.html', 'text/html; charset=utf-8');
      }
      if (req.method === 'GET' && staticFiles.has(path)) return serveFile(res, ...staticFiles.get(path));
      if (req.method === 'GET' && path === '/favicon.ico') { res.writeHead(204); return res.end(); }
      if (req.method === 'POST' && path === '/api/login') {
        checkOrigin(req);
        const body = await readJson(req);
        const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
        const ip = req.socket.remoteAddress || 'unknown';
        rateCheck(loginAttempts, `ip:${ip}`, options.loginIpMaxAttempts ?? 100, 15 * 60 * 1000, 'LOGIN_RATE_LIMIT');
        rateCheck(loginAttempts, `${ip}:${username.slice(0, 32)}`, options.loginMaxAttempts ?? 12, 15 * 60 * 1000, 'LOGIN_RATE_LIMIT');
        const row = USERNAME.test(username) ? db.prepare('SELECT * FROM users WHERE username=?').get(username) : null;
        const valid = checkPassword(body.password, row || dummyUser);
        if (!valid || !row?.active) fail(401, 'INVALID_CREDENTIALS', 'The username or password is incorrect.');
        loginAttempts.delete(`${ip}:${username}`);
        return json(res, 200, setSession(res, row.id));
      }
      if (!path.startsWith('/api/')) fail(404, 'NOT_FOUND', 'This resource was not found.');
      const session = requireSession(req);
      if (req.method === 'GET' && path === '/api/session') return json(res, 200, { user: publicUser(session.user), csrfToken: session.csrf_token });
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) requireCsrf(req, session);
      if (req.method === 'POST' && path === '/api/logout') {
        db.prepare('DELETE FROM sessions WHERE token_hash=?').run(session.token_hash);
        for (const [clientRes, client] of clients) if (client.sessionHash === session.token_hash) { sendEvent(clientRes, 'session-revoked', {}); clients.delete(clientRes); clientRes.end(); }
        res.setHeader('Set-Cookie', cookie('', 0));
        return json(res, 200, { ok: true });
      }
      if (req.method === 'POST' && path === '/api/password') {
        const body = await readAuthenticatedJson(req, session, { allowTemporary: true });
        if (!checkPassword(body.currentPassword, session.user)) fail(400, 'CURRENT_PASSWORD_INVALID', 'The current password is incorrect.');
        if (!passwordValid(body.newPassword)) fail(400, 'INVALID_PASSWORD', 'Use a new password of 12–128 characters.');
        if (body.newPassword === body.currentPassword) fail(400, 'PASSWORD_UNCHANGED', 'Choose a password different from the temporary/current password.');
        const { hash, salt } = saltAndHash(body.newPassword);
        db.prepare('UPDATE users SET password_hash=?,salt=?,must_change_password=0 WHERE id=?').run(hash, salt, session.user.id);
        // Notify other devices, but close the current stream quietly so this
        // successful password-change response can install its rotated cookie.
        revokeSessions(session.user.id, session.token_hash);
        db.prepare('DELETE FROM sessions WHERE token_hash=?').run(session.token_hash);
        for (const [clientRes, client] of clients) if (client.sessionHash === session.token_hash) { clients.delete(clientRes); clientRes.end(); }
        return json(res, 200, setSession(res, session.user.id));
      }
      requireReady(session);
      if (req.method === 'GET' && path === '/api/members') {
        const users = db.prepare('SELECT id,username,display_name,role FROM users WHERE active=1 ORDER BY role,display_name').all().map(row => ({ id: row.id, username: row.username, displayName: row.display_name, role: row.role }));
        return json(res, 200, { users });
      }
      if (req.method === 'GET' && path === '/api/messages') {
        const peerValue = url.searchParams.get('peer') || 'all';
        const peer = peerValue === 'all' ? null : Number(peerValue);
        if (peer !== null && (!Number.isSafeInteger(peer) || peer <= 0 || !byId(peer))) fail(400, 'INVALID_PEER', 'Choose a valid conversation.');
        const after = Number(url.searchParams.get('after') || 0), before = Number(url.searchParams.get('before') || 0);
        if (!Number.isSafeInteger(after) || after < 0 || !Number.isSafeInteger(before) || before < 0 || (after && before)) fail(400, 'INVALID_CURSOR', 'Use a valid message cursor.');
        const params = [], conditions = [];
        if (peer === null) conditions.push('m.recipient_id IS NULL');
        else { conditions.push('((m.sender_id=? AND m.recipient_id=?) OR (m.sender_id=? AND m.recipient_id=?))'); params.push(session.user.id, peer, peer, session.user.id); }
        if (after) { conditions.push('m.id>?'); params.push(after); }
        if (before) { conditions.push('m.id<?'); params.push(before); }
        const ascending = Boolean(after);
        const rows = db.prepare(`SELECT m.*,u.display_name AS sender_name FROM messages m JOIN users u ON u.id=m.sender_id WHERE ${conditions.join(' AND ')} ORDER BY m.id ${ascending ? 'ASC' : 'DESC'} LIMIT 101`).all(...params);
        const hasMore = rows.length > 100;
        const messages = rows.slice(0, 100);
        if (!ascending) messages.reverse();
        return json(res, 200, { messages: messages.map(publicMessage), hasMore });
      }
      if (req.method === 'POST' && path === '/api/messages') {
        const body = await readAuthenticatedJson(req, session);
        if (typeof body.body !== 'string' || !body.body.trim() || body.body.trim().length > 2000) fail(400, 'INVALID_MESSAGE', 'Messages must contain 1–2000 characters.');
        const recipient = body.recipientId === null || body.recipientId === undefined ? null : body.recipientId;
        if (recipient !== null && (!Number.isSafeInteger(recipient) || recipient <= 0 || !byId(recipient)?.active)) fail(400, 'INVALID_RECIPIENT', 'This recipient is unavailable.');
        rateCheck(messageAttempts, session.user.id, 60, 60 * 1000, 'MESSAGE_RATE_LIMIT');
        const result = db.prepare('INSERT INTO messages (sender_id,recipient_id,body,created_at) VALUES (?,?,?,?)').run(session.user.id, recipient, body.body.trim(), nowIso());
        const message = publicMessage(queryMessage(Number(result.lastInsertRowid)));
        broadcast('message', message, messageAudience(message));
        return json(res, 201, { message });
      }
      if (req.method === 'GET' && path === '/api/events') {
        const perUser = [...clients.values()].filter(client => client.userId === session.user.id).length;
        if (perUser >= 5) fail(429, 'TOO_MANY_STREAMS', 'Too many open chat connections. Close another tab.');
        res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Connection': 'keep-alive', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' });
        res.flushHeaders();
        clients.set(res, { userId: session.user.id, sessionHash: session.token_hash });
        sendEvent(res, 'connected', { userId: session.user.id });
        const ping = setInterval(() => {
          const current = db.prepare('SELECT * FROM sessions WHERE token_hash=?').get(session.token_hash);
          if (!current || current.expires_at <= Date.now() || !byId(session.user.id)?.active) { sendEvent(res, 'session-revoked', {}); clients.delete(res); res.end(); return; }
          if (!res.write(': keepalive\n\n')) { clients.delete(res); res.end(); }
        }, eventPingMs);
        ping.unref();
        res.on('close', () => { clearInterval(ping); clients.delete(res); });
        return;
      }
      if (path.startsWith('/api/admin/')) {
        requireAdmin(session);
        if (req.method === 'GET' && path === '/api/admin/users') {
          const users = db.prepare('SELECT * FROM users ORDER BY role,id').all().map(adminUser);
          const totalMessages = db.prepare('SELECT COUNT(*) AS count FROM messages').get().count;
          return json(res, 200, { users, stats: { totalUsers: users.length, activeUsers: users.filter(user => user.active).length, totalMessages } });
        }
        if (req.method === 'POST' && path === '/api/admin/users') {
          const body = await readAuthenticatedJson(req, session, { admin: true }), { username, displayName } = validateAccount(body);
          if (!passwordValid(body.password)) fail(400, 'INVALID_PASSWORD', 'Use a password of 12–128 characters.');
          if (db.prepare('SELECT id FROM users WHERE username=?').get(username)) fail(409, 'USERNAME_EXISTS', 'This username is already in use.');
          const { hash, salt } = saltAndHash(body.password);
          const result = db.prepare('INSERT INTO users (username,display_name,role,password_hash,salt,must_change_password,created_at) VALUES (?,?,?,?,?,1,?)').run(username, displayName, 'user', hash, salt, nowIso());
          broadcast('users-changed', {});
          return json(res, 201, { user: adminUser(byId(Number(result.lastInsertRowid))) });
        }
        const passwordMatch = path.match(/^\/api\/admin\/users\/(\d+)\/password$/);
        const userMatch = path.match(/^\/api\/admin\/users\/(\d+)$/);
        const messageMatch = path.match(/^\/api\/admin\/messages\/(\d+)$/);
        if (req.method === 'PATCH' && userMatch) {
          const id = Number(userMatch[1]);
          const body = await readAuthenticatedJson(req, session, { admin: true });
          const row = byId(id);
          if (!row) fail(404, 'USER_NOT_FOUND', 'This user was not found.');
          if (Object.keys(body).some(key => !['username', 'displayName', 'active'].includes(key))) fail(400, 'INVALID_FIELDS', 'Only username, displayName and active can be changed.');
          const { username, displayName } = validateAccount({ username: body.username ?? row.username, displayName: body.displayName ?? row.display_name });
          if (body.active !== undefined && typeof body.active !== 'boolean') fail(400, 'INVALID_STATUS', 'Active must be true or false.');
          const active = body.active === undefined ? row.active : Number(body.active);
          if (row.role === 'admin' && !active) fail(400, 'ADMIN_PROTECTED', 'The administrator account cannot be disabled.');
          const duplicate = db.prepare('SELECT id FROM users WHERE username=? AND id<>?').get(username, id);
          if (duplicate) fail(409, 'USERNAME_EXISTS', 'This username is already in use.');
          db.prepare('UPDATE users SET username=?,display_name=?,active=? WHERE id=?').run(username, displayName, active, id);
          if (!active) revokeSessions(id);
          broadcast('users-changed', {});
          return json(res, 200, { user: adminUser(byId(id)) });
        }
        if (req.method === 'POST' && passwordMatch) {
          const id = Number(passwordMatch[1]), row = byId(id);
          if (!row) fail(404, 'USER_NOT_FOUND', 'This user was not found.');
          const body = await readAuthenticatedJson(req, session, { admin: true });
          if (!passwordValid(body.password)) fail(400, 'INVALID_PASSWORD', 'Use a password of 12–128 characters.');
          const { hash, salt } = saltAndHash(body.password);
          db.prepare('UPDATE users SET password_hash=?,salt=?,must_change_password=1 WHERE id=?').run(hash, salt, id);
          revokeSessions(id);
          broadcast('users-changed', {});
          return json(res, 200, { user: adminUser(byId(id)) });
        }
        if (req.method === 'DELETE' && messageMatch) {
          const row = queryMessage(Number(messageMatch[1]));
          if (!row) fail(404, 'MESSAGE_NOT_FOUND', 'This message was not found.');
          const message = publicMessage(row);
          db.prepare('DELETE FROM messages WHERE id=?').run(message.id);
          broadcast('message-deleted', { id: message.id }, messageAudience(message));
          return json(res, 200, { ok: true });
        }
      }
      fail(404, 'NOT_FOUND', 'This resource was not found.');
    } catch (error) {
      if (res.headersSent) { res.end(); return; }
      if (error instanceof HttpError) return json(res, error.status, { error: { code: error.code, message: error.message } });
      console.error('Request failed:', error.code || error.name || 'InternalError');
      return json(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } });
    }
  });
  server.headersTimeout = 15000;
  server.requestTimeout = 30000;
  const maintenance = setInterval(() => {
    const now = Date.now();
    db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(now);
    for (const map of [loginAttempts, messageAttempts]) for (const [key, value] of map) if (value.until <= now) map.delete(key);
  }, 60000);
  maintenance.unref();
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true; clearInterval(maintenance);
    for (const [res] of clients) res.end();
    clients.clear();
    if (server.listening) await new Promise((resolveClose, reject) => { server.close(error => error ? reject(error) : resolveClose()); server.closeIdleConnections(); });
    db.close();
  };
  return { server, db, credentialsPath, close };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 3000), host = process.env.HOST || '0.0.0.0';
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');
  const app = createApp();
  app.server.listen(port, host, () => console.log(`Modern members server listening on ${host}:${port}. Initial account credentials are stored privately in ${app.credentialsPath}.`));
  const shutdown = () => app.close().then(() => process.exit(0));
  process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown);
}
