# Secret Santa

A responsive, single-page family gift exchange app on GitHub Pages. Visitors can create a one-time Secret Santa event immediately, without creating an account or entering a PIN. Only Kameron signs in to see saved multi-year events and sync an encrypted history to GitHub.

## Guest mode (default)

The main page opens directly to event setup. Guests can name an event, add names, set a spending limit, make spouse / participant exclusions, draw assignments, reveal/hide recipients, and use the same text-message controls as before.

- **A guest has one active event at a time.** Clicking New event replaces their current guest event after confirmation. Guests do not see the event history selector, Reuse for next year, Change passphrase, or GitHub Sync.
- The current guest event is saved only in that browser's `localStorage` (`secret-santa.guest.v1`). It survives ordinary refreshes, but clearing browser site data, changing phones, or private-browsing cleanup can remove it. **It is not uploaded or backed up to GitHub.**
- The amber notice and Settings menu offer **Download Event Backup** and **Load Event Backup**. These JSON backups include the event's names **and completed assignments in readable text**, so store them privately; **do not upload guest backups to a public GitHub repository**.
- Guest events are not PIN-encrypted, because there is no guest PIN. They are visible to anyone with access to that device's browser storage. A blurred assignment is a visual convenience only.
- Previous-year exclusions appear only after Kameron signs in because a guest event is intended to be one-time and has no earlier event library. Individual exclusion controls work for everyone.

## Kameron Sign In

Open the **☰ Settings** hamburger menu and click **Kameron Sign In**. The sign-in dialog asks for the existing private PIN or passphrase and can download your previously synced encrypted GitHub history after you reset your phone. If no encrypted vault exists in the browser yet, it also offers initial passphrase creation.

Signing in unlocks the private event picker (multiple years), Reuse for next year, previous-event exclusions, Change passphrase, and **Sync to GitHub**. Click **Sign Out** in Settings or the top toolbar when finished. The app returns to the guest event, without deleting either the local guest event or your encrypted private history. On a new browser visit, the app **always starts in guest mode**; it does not leave your private event history unlocked.

The private collection is encrypted in the browser with **AES-256-GCM**, using a key derived from the passphrase with **PBKDF2-HMAC-SHA-256, 600,000 iterations** and a random salt. The PIN itself is never stored. Older numeric PINs still work; new passphrases may be 8–128 printable characters. Only people who know the private passphrase can unlock this history in the normal UI. This is browser-level protection, **not server-verified identity authentication**: a person who learns the private passphrase could unlock the events, but GitHub still requires an authorized token to accept a sync.

If you're updating from an older version of the webpage, the prior vault is retained under `secret-santa.vaults.v2`. Existing unencrypted events in `secret-santa.v1` can be imported and encrypted during initial private-vault creation on that same browser and hostname. Guest mode uses a separate storage key and will **never overwrite the existing encrypted vault**.

## Private owner GitHub Sync (manual token; no Cloudflare)

Only while signed in does **↑ Sync to GitHub** appear. It sends the unlocked owner's already-encrypted collection to the single repository file at `projects/secret-santa/events.encrypted.json`, preserving any other encrypted collections already in that file.

One-time setup:

1. While signed into GitHub, open [fine-grained personal access tokens](https://github.com/settings/personal-access-tokens/new).
2. Create a token restricted to **kameronyork/kameronyork.github.io**, with **Contents: Read and write** repository permission. If the token expires, create a replacement.
3. In the Secret Santa webpage, open **☰ Settings → Kameron Sign In**, unlock your private events, and click **Sync to GitHub**.
4. Paste the token into the Sync dialog. The page uses it to call GitHub's API over HTTPS; the token is held **only in page memory**, not stored in localStorage or committed to the repository.
5. Wait for **Synced to GitHub**. If you edit anything afterward, the strip will change to **Not synced** until the next successful upload.

The repository JSON is public but contains **encrypted ciphertext, not readable names, participants or assignments**. Strong, unique passphrases resist offline guessing. Anyone can download the encrypted file, but uploading requires the authorized GitHub token. GitHub protects against concurrent uploads via the file revision SHA, and the app guards against overwriting another device's newer copy.

To restore your private events after clearing browser data, use **☰ Settings → Kameron Sign In → Load saved events from GitHub**, then enter your original passphrase. Changes not synced before data was cleared cannot be recovered. Local guest events are separate and must be backed up with the guest Download button.

## Previous-year exclusions

After signing in, check **Exclude the person each participant drew in a previous event** in the Exclusions section, choose a completed previous event, and review matched/unmatched names. Matching is case-insensitive. This restriction combines with individual exclusions and self-draw prevention. **Reuse for next year** automatically selects the previous event's completed drawing.

## Automated tests

From this directory run `node draw.test.cjs`, `node history.test.cjs`, `node vault.test.cjs` and `node cloud.test.cjs` (Node 20+).

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
