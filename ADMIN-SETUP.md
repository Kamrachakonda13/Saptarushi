# Saptarushi Admin & Content Management

## Start

Requires Node.js 20+.

```bash
node serve.js 4173
```

Open `/admin.html` and sign in with the administrator credentials already configured for your deployment.

For a new deployment, set these environment variables before the first start:

```bash
export ADMIN_USER=admin
export ADMIN_PASS='use-a-strong-password-here'
node serve.js 4173
```

The server stores only a salted PBKDF2 password hash in `content/admin-auth.json`. That file is ignored by Git and is never served as a public asset.

## Change password

Use **Admin → Security → Change admin password**. The password is never displayed in the interface or returned by the API. After changing it, the current sessions are invalidated and you must sign in again.

## Content

- **Pages:** edit page-level title, description and additional content in English, Telugu and Sanskrit.
- **Inline page editing:** administrators can edit supported visible page text directly on the public page.
- **Books:** maintain English, Telugu and Sanskrit book content, import PDF text, and attach narration audio.
- **Media:** upload site files as well as audio assets.
- **Language switcher:** every public page gets English / తెలుగు / संस्कृतम् controls and remembers the visitor's choice.

## Security notes

- Admin write endpoints require an active server-side session token.
- Uploads now require authentication.
- CORS explicitly permits the admin authentication header used by the UI.
- Session tokens are kept in server memory rather than a publicly readable token file.
- Do not commit `content/admin-auth.json`.
