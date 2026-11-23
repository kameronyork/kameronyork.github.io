# Secret Santa

A responsive family Secret Santa webpage that keeps multiple years of events, exclusions, and assignments encrypted in the browser. Only the website owner can upload an encrypted collection to the shared GitHub JSON.

## GitHub sync via OAuth — owner only

**Everyone can create and use local events. Only the verified GitHub repository owner can click Sync and upload.**

- **Local first:** Everything you edit is saved encrypted in your browser. A visible **Not synced** indicator warns you when your changes are not yet uploaded.
- **Shared encrypted file:** All collections that the owner syncs accumulate in `projects/secret-santa/events.encrypted.json`. Existing collections remain intact when another collection is updated. The file lives in the public GitHub Pages repository.
- **Only the GitHub owner may upload:** The Sync button sends the owner through GitHub OAuth. A separate Cloudflare Worker verifies the signed-in identity matches **kameronyork (GitHub user ID 122046751)** before it can write anything. Other GitHub accounts receive **403 Forbidden** and cannot upload.
- **No GitHub token form:** You never paste a GitHub token into the website, and no GitHub OAuth client secret is put in the public HTML or JavaScript. A one-time Cloudflare Worker + OAuth App setup is still necessary.
- **Getting your events back after clearing your phone:** Open the website, choose **Load saved events from GitHub**, then unlock the collection with its original passphrase. Events not synced before local storage was cleared cannot be recovered.

### Important: owner setup is required once

The OAuth Worker is included as source code in [sync-worker/](sync-worker/README.md), but it **is not deployed merely by committing it**. To enable the Sync button, the owner must:

1. Deploy `sync-worker/worker.mjs` to a Cloudflare Worker.
2. Create a GitHub OAuth App with the Worker's `/auth/callback` URL.
3. Store the OAuth App Client ID, Client Secret and a random session-encryption key in **Cloudflare Worker secrets**.
4. Set the Worker's public HTTPS origin in `sync-config.js`, then push that small configuration update.

Follow the full [one-time setup guide](sync-worker/README.md). Until then, your local encrypted events continue to work, but uploading is unavailable. **No GitHub token is requested from the webpage.**

### Security and scope

Passphrases do not appear in GitHub. AES-256-GCM encryption is performed in the browser with a key derived using PBKDF2-HMAC-SHA-256 (600,000 iterations) and a per-collection random salt. Every local save uses a new random IV. Older 6–12 digit PINs are still accepted when unlocking old vaults; new passphrases support 8–128 non-space printable ASCII characters. Change a PIN in the unlocked app and sync afterward.

The public GitHub JSON contains ciphertext only, but anyone can download it and attempt offline guessing. Use a strong, unique passphrase. There is no PIN recovery.

**GitHub OAuth Apps request the `public_repo` scope**, which grants broader access to the owner's public repositories than just this one file. The Worker itself is restricted to the exact Secret Santa JSON path and checks the owner's immutable GitHub user ID before uploads. A future GitHub App implementation could narrow GitHub-granted permissions further.

Sync uses GitHub file SHA checks and per-collection fingerprints. If someone has changed a collection since your previous successful sync, your update is refused instead of overwriting it. Other family members' local events cannot be synced by them; to add them to the shared GitHub backup, the owner would first need to receive their encrypted data.

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

Run `node draw.test.cjs`, `node history.test.cjs`, `node vault.test.cjs`, `node cloud.test.cjs`, and `node --test sync-worker/worker.test.mjs` (Node 20+).

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
