# Secret Santa

A standalone, responsive HTML/CSS/JavaScript app for family gift exchanges. Open the project via HTTPS GitHub Pages or a localhost web server. No hosted account or backend is needed for drawing. The public GitHub repository contains only code and no participant names or assignments.

## Storage, privacy, and manual GitHub sync

**Your browser is the working copy.** Events are encrypted with AES-256-GCM before being saved to localStorage. Saving and editing is automatic locally. Nothing goes to GitHub until you click **↑ Sync to GitHub**. The status strip clearly says **Not synced** when the local encrypted copy differs from the last successfully synced copy.

Clicking **Sync to GitHub** saves your encrypted collection into the JSON file at `projects/secret-santa/events.encrypted.json`.

The repository is **public**. This JSON stores only random salts, IVs, encrypted ciphertext, and non-secret metadata, never readable names, assignments, or passphrases. **Anyone can download the encrypted JSON and attempt offline guesses of the passphrase.** Use a long, unique passphrase that is not easy to guess; do not use a secret you have already shared publicly.

Each family/person has their own encryption passphrase and encrypted collection. Each collection holds many years of family events. The page never stores your passphrase or a recoverable passphrase hash. It uses PBKDF2-HMAC-SHA-256 with 600,000 iterations and a random salt to derive the AES-256-GCM encryption key. A new random nonce is used on every write.

### Initial setup to upload to GitHub

1. Go to your GitHub account’s **Settings → Developer settings → Personal access tokens → Fine-grained tokens** or https://github.com/settings/personal-access-tokens/new.
2. Create a token scoped to the **kameronyork/kameronyork.github.io** repository **only**, granting **Contents: Read and write**. No other permissions are needed. GitHub may require an expiration date; create a new token when it expires.
3. Open your Secret Santa webpage using HTTPS, create or unlock your events, and click **Sync to GitHub**.
4. Paste the token when prompted. The token is sent over HTTPS *only* to GitHub’s REST API. It is held **only in memory** until you lock the page or reload it; it is never stored in localStorage or committed to GitHub.
5. Wait for the page to confirm **Synced to GitHub**. You can check the repository JSON file and GitHub commit history for the encrypted update.

GitHub Pages is a static site and has no secret server credentials. **Without that token, anyone can download synced encrypted events, but cannot upload/edit the GitHub data.** Other users with their own PINs will need a repository-authorized token to sync their changes, or you can sync on their behalf. Do not enter the token on a page you do not trust.

### On a new phone or after clearing site data

1. Open the same Secret Santa webpage.
2. Click **↓ Load saved events from GitHub** (no GitHub token needed for download).
3. Unlock with the *same* passphrase you used when you synced. The page can also attempt to download automatically when an unlock attempt finds no matching local collection.
4. Your complete synced event history is restored locally. Any edits **since the last successful sync** cannot be recovered from GitHub.

If you have older events saved unencrypted by the first version, create a passphrase on the **original browser and hostname**. Those existing local events will be encrypted and imported. Then click **Sync to GitHub**.

### Change a PIN to a passphrase

Previously created numeric PINs (6–12 digits) still unlock existing collections. New passphrases support 8–128 printable ASCII characters, including letters, numbers and symbols (without spaces). You can use **Change passphrase** while your collection is unlocked: enter the existing PIN and the new passphrase twice. The collection is re-encrypted with a fresh salt. **Sync right afterward:** until you do, your GitHub backup still uses the previous PIN.

No passphrase is ever hardcoded in the public website or repository. No one with repo access can change an existing user’s local encrypted collection without their existing PIN and browser storage.

### Conflicts and backup status

Each click on Sync uses GitHub’s file revision SHA. If the same collection was edited on another device since your last download, the app **refuses to overwrite that newer GitHub copy**. It displays a conflict warning rather than silently losing data. When you are locked, **Load saved events from GitHub** refreshes clean local copies; unsynced local edits are never overwritten. To avoid conflicts, sync before changing devices, then download the current copy before making changes on another device.

Clearing *only* cookies generally leaves localStorage intact; clearing **site data** can remove localStorage. Deleting browser site data before a successful sync can permanently lose unsynced events. Keeping your passphrase safe is essential: there is no online account password recovery.
## Using the app

1. Create an 8+ character passphrase (letters and numbers are supported) or unlock with your existing PIN/passphrase. Each passphrase opens its own family history.
2. Name the event, optionally enter a USD gift limit, and add names (one per line).
3. Expand each participant's exclusion list. With "Apply changes both ways" checked, excluding a spouse automatically excludes the reverse pairing too. Uncheck it for directional exclusions. Self-draw prevention is checked by default.
4. Optionally check **Exclude the person each participant drew in a previous event**, then choose a completed previous event under the same PIN. Names match case-insensitively after trimming whitespace. The page lists matched giver → recipient pairs and unmatched people (including former recipients no longer participating). If names change, edit them and recheck the match list. The historical restriction combines with all manually chosen exclusions. Reusing a drawn event for next year automatically enables the prior-event restriction and selects the original drawing.
5. Draw names. Each participant receives exactly one assignment, and each recipient appears once. If the constraints are impossible, the app explains that instead of creating an invalid draw.
6. The results page hides assignments behind a blurred placeholder until the eye is clicked. "Hide all names" closes reveals. Resetting a draw requires confirmation and does not recall notifications.
7. Select Send text next to a participant and enter their phone number. No assignment is shown in that dialog.
8. Use New event to keep separate family events. Reuse for next year copies the participants, exclusions, settings and budget but not assignments or notification history. You can edit the copied event name and year.

## Automated tests

Run `node draw.test.cjs`, `node history.test.cjs`, `node vault.test.cjs` and `node cloud.test.cjs` (Node 20+).

## Text messages: two options

**Device mode (default):** opens an SMS draft in your Messages app. Send it yourself, then choose "I sent it" in Secret Santa. The conversation may appear on your personal phone, and you may see the assignment. The app cannot confirm delivery in this mode. Desktop browsers may not have an SMS handler.

**Direct mode (recommended for keeping assignments secret from the organizer):** the included Cloudflare Worker sends via Twilio from a separate SMS-capable number, so the message does not appear in your personal Messages app. The app shows whether the provider accepted the request, not whether the recipient received it. Twilio may retain message records, and normal SMS is not end-to-end encrypted.

### One-time direct SMS setup

GitHub Pages is static and cannot hold SMS provider credentials securely. The backend must run separately. No live SMS account or endpoint is configured by this commit.

1. Set up a Twilio account and acquire an SMS-capable sender number. Complete any required sender registration/verification, enable destination countries, and verify recipients if using a trial account. Provider charges and rules apply. See https://www.twilio.com/docs/messaging.
2. Install Node.js and use the Cloudflare Wrangler CLI with your own Cloudflare account. From this directory run:

       cd sms-worker
       npx wrangler login
       npx wrangler deploy
       npx wrangler secret put TWILIO_ACCOUNT_SID
       npx wrangler secret put TWILIO_AUTH_TOKEN
       npx wrangler secret put TWILIO_FROM
       npx wrangler secret put SMS_ACCESS_KEY

   Enter your account SID, auth token, sender in +E.164 format, and a strong random access key (at least 32 characters, e.g. generated using openssl rand -hex 32). Do not commit or share those values. The included configuration sets a 20-request-per-minute authenticated rate limit; Cloudflare's rate limiting is approximate/per location. Keep your provider spending controls and monitoring enabled. Deploy again if required by Wrangler.
3. Copy the HTTPS Worker URL. In the Secret Santa results page choose SMS settings, enter that URL, and save.
4. Select Send text on a test participant, enter your own phone number and the access key, and send. The access key stays in page memory until reload or endpoint change. The endpoint URL is saved locally. The browser sends the phone number and generated message to the configured Worker, which forwards them to Twilio. Only configure an endpoint you own/trust.
5. Verify receipt before sending to family. Use only numbers whose owners expect these notifications.

The Worker restricts browser origins to the website domains, requires the access key on every send, validates inputs, and never returns the assignment or phone. Do not enable request-body logging. If hosting on another origin, explicitly add it to the allowlist in worker.mjs before deployment. For local UI testing use device mode or a mock endpoint; do not weaken the production allowlist.

## Tests

Run node draw.test.cjs from this folder. The drawing algorithm first attempts random permutations, then falls back to randomized bipartite matching to guarantee a valid drawing if one exists. The fallback is randomized but not guaranteed to be uniformly distributed across every valid assignment.
