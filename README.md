# Modern — private design community

The Awwwards-inspired homepage now has a matching sign-in page, invited member accounts, general and private chat, an administrator panel, and an Uzbek / Russian / English interface.

## Run

Use **Node.js 24 LTS** (minimum 22.13). There are no third-party dependencies or install steps.

```sh
npm start
```

Open `http://localhost:3000`. The server redirects visitors to `/login`; `index.html` is served after authentication. For development, another port can be selected with `PORT=3001 npm start`.

**GitHub Pages and opening `index.html` directly cannot run the authentication, database, or shared chat.** Deploy the whole repository to a Node.js host, with a persistent disk for `.data`, or use the Dockerfile below. This repository update does not automatically deploy a website.

## Initial accounts

On the first server start, the database creates exactly one administrator (`admin`) and 20 member accounts (`user01` through `user20`). Each has a different randomly generated temporary password.

The initial usernames and passwords are written to **`.data/initial-credentials.json`**, accessible only to the server owner. This file is ignored by Git, is never served by the web application, and is not recreated or overwritten on ordinary restarts. It is a one-time handoff, not a list of current passwords after changes. Copy credentials securely to the relevant people. Everyone, including the administrator, must change the temporary password before accessing chat or the admin tools. Passwords must contain 12–128 characters.

In the administrator panel you can:

- Create additional members and edit usernames or display names.
- Disable or re-enable access; disabling a member signs their sessions out.
- Set a temporary replacement password; the member must change it at the next login.
- View account/message totals and remove messages visible in your chat conversations.

The administrator cannot disable their own administrator account. Normal users have no access to administrator APIs. There is no public registration. The administrator's private chat access is the same as other members: they cannot read other people's direct messages.

## Chat and language

- The shared room is available to all active members who have changed their initial password.
- Private conversations are accessible only to their sender and recipient.
- Messages persist in SQLite and updates arrive using server-sent events (SSE). The UI can load older history and catch up after reconnecting.
- The UZ / RU / EN selector changes the site's interface and login/member/admin screens. It preserves brand names, the illustrated website examples, and users' messages; it is not a text-translation service.
- A member can change their own password under **My account** and end the current session with **Log out**.

## Deployment

Use a single Node process with a persistent data directory. Terminate HTTPS at your hosting provider or reverse proxy. For example, replace the origin and paths with your actual settings:

```sh
PORT=3000 \
DATA_DIR=/var/lib/modern-members \
PUBLIC_ORIGIN=https://your-domain.example \
COOKIE_SECURE=1 \
npm start
```

`PUBLIC_ORIGIN` must be the exact browser origin with no trailing slash. `COOKIE_SECURE=1` requires HTTPS in the browser; use the default for local HTTP development. Configure the proxy to preserve the `Host` header, disable buffering for `/api/events`, and allow long-lived SSE connections. Keep the application and API on the same origin. Do not use a static-file server for this application: it bypasses the server's page gate and does not implement its APIs.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP listening port |
| `HOST` | `0.0.0.0` | Listening address |
| `DATA_DIR` | `.data` beside `server.mjs` | Private persistent SQLite directory |
| `PUBLIC_ORIGIN` | Request origin inferred from Host | Exact public origin used for request validation |
| `COOKIE_SECURE` | `0` | Set to `1` behind public HTTPS |

Back up the whole data directory using a consistent SQLite backup or while the server is stopped. Losing the database loses accounts and chats. Keep initial credential handoffs out of public repositories and shared backups; the administrator can reset member passwords from the panel.

To build the container:

```sh
docker build -t modern-members .
docker run --rm -p 3000:3000 -v modern-data:/app/.data modern-members
```

Set the same HTTPS environment variables on your production container. Obtain the first-start account handoff from `/app/.data/initial-credentials.json` inside your own running container. No passwords are embedded in the image.

## Tests

```sh
npm test
```

The isolated Node tests cover authentication, forced password changes, session cookies and expiry, CSRF/origin rejection, administrator permissions, private-message access, SSE delivery/revocation, account management, private-file protection, and persistent/idempotent seeding. Test credentials are fixtures for temporary databases only.

The application uses salted scrypt password hashes, hashed random session tokens, HttpOnly / SameSite cookies, bounded request bodies, request throttling, prepared SQL statements, and server-enforced authorization. Production TLS and persistent storage must be supplied by the host.
