# Secret Santa — owner-only GitHub OAuth sync

This folder contains a small Cloudflare Worker used by the [Secret Santa webpage](../). The webpage is hosted on GitHub Pages, which **cannot store GitHub API credentials safely**. This Worker performs the GitHub OAuth web flow and allows **only the verified GitHub account `kameronyork` (numeric ID `122046751`)** to upload encrypted collections. No one else can upload, even if they sign into a different GitHub account.

## What everyone can do

Everyone can create events and save encrypted data in their own browser, browse the already-synced encrypted public JSON file, and unlock only collections for which they know the passphrase. **Only the repository owner can Sync.** Other visitors will not be authorized to write.

All encrypted collections accumulate in a **single file**: `projects/secret-santa/events.encrypted.json`. This file is publicly readable, but the event contents are encrypted before upload. Use long, unique passphrases to resist offline guessing.

## One-time owner setup

This setup requires a Cloudflare account and a GitHub OAuth App. The Worker is **source code only until deployed**. It cannot be deployed from GitHub Pages.

1. From a local checkout of the website repository, open a terminal:

   ```sh
   cd projects/secret-santa/sync-worker
   npx wrangler login
   npx wrangler deploy
   ```

2. Copy the HTTPS URL of your Worker (for example `https://secret-santa-owner-sync.YOUR-SUBDOMAIN.workers.dev`). The Worker initially reports `"configured":false` at `/health` until secrets are added.

3. While signed in to GitHub as **kameronyork**, open <https://github.com/settings/developers> → **OAuth Apps** → **New OAuth App**. Use:
   - **Application name:** Secret Santa Family Sync
   - **Homepage URL:** `https://www.kameronyork.com/projects/secret-santa/`
   - **Authorization callback URL:** `https://YOUR-WORKER-URL/auth/callback` (use your actual HTTPS Worker host)
   - Save the app and copy its Client ID, then generate a Client Secret.

4. Set the following Cloudflare Worker secrets, one by one, **without ever committing them to GitHub**:

   ```sh
   npx wrangler secret put GITHUB_CLIENT_ID
   npx wrangler secret put GITHUB_CLIENT_SECRET
   npx wrangler secret put SESSION_KEY
   ```

   Generate the value for `SESSION_KEY` separately using `openssl rand -hex 32` (exactly 64 hex characters). Keep the session key private. This key encrypts temporary owner sign-in sessions. Changing it will invalidate active sessions.

5. Edit the public file `projects/secret-santa/sync-config.js` and set **only** the deployed Worker **origin**, without a trailing slash:

   ```js
   window.SantaSyncConfig = Object.freeze({
     endpoint: 'https://secret-santa-owner-sync.YOUR-SUBDOMAIN.workers.dev'
   });
   ```

   Commit and push this small configuration change to `main`. A Worker hostname is public configuration, **not a credential**. Do not add a Client Secret, OAuth access token or session key to it.

6. Open the website over HTTPS. Unlock your events, then click **Sync (owner only)**. GitHub will ask you to authorize the OAuth app, which requests `public_repo` permission. After authorization, the Worker verifies your immutable numeric GitHub user ID and then syncs **your encrypted JSON only**. The page may return to the locked screen; you can unlock again to see the status. Further Sync clicks in the same tab use a short-lived, in-memory session until it expires.

7. Confirm your events are represented by encrypted ciphertext in `projects/secret-santa/events.encrypted.json`. Never assume the data is backed up until the page reports **Synced to GitHub**.

### GitHub authorization and access scope

The OAuth app requests `public_repo`, which grants broad write access to public repositories belonging to the authorizing user, not just Secret Santa. This is a limitation of classic GitHub OAuth Apps. The Worker source is hardcoded to write **only the Secret Santa JSON path** and verifies the GitHub owner's numeric ID on sign-in and on each upload. If you want more narrowly scoped GitHub permissions, install a **GitHub App** instead in a future version. You can revoke the OAuth app from your GitHub account settings at any time.

### Security notes

- The OAuth Client Secret and session encryption key stay in Cloudflare Worker secrets; they are never shipped to the browser.
- GitHub's OAuth state and PKCE challenge help protect the sign-in flow. The Worker uses an `HttpOnly; Secure; SameSite=Lax` state cookie and verifies the resulting GitHub identity.
- The Worker returns a short-lived encrypted session capability after sign-in. It travels to the website in a URL fragment, which the webpage immediately removes from the address bar; it is held only in browser memory and is never stored in localStorage.
- The Worker allows cross-origin uploads only from the website's known HTTPS origins. Actual upload authorization is performed **server-side**, so browser checks and CORS are not relied on for identity.
- Multiple collections stay in the one GitHub JSON file. Updates use GitHub's current file SHA, plus per-collection fingerprints, so two devices cannot silently overwrite different revisions.
- Visitors cannot sync new events without the owner's authorization. To upload a relative's locally created collection, the owner must securely obtain its encrypted data through a future import/export flow; the Worker deliberately does not allow anonymous writes.
- `/health` reports whether required secrets are set, never their values. Keep request-body and authorization-header logging disabled.

### Local tests

```sh
node --test worker.test.mjs
```

The backend remains inactive until these steps are completed. Reading previously synced events from public GitHub does not require an OAuth login.
