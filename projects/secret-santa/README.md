# Secret Santa

A standalone, responsive HTML/CSS/JavaScript app for family gift exchanges. Open the project via HTTPS GitHub Pages or a localhost web server. No hosted account or backend is needed for drawing. The public GitHub repository contains only code and no participant names or assignments.

## Using the app

1. Create a 6–12 digit PIN (8 or more digits strongly recommended) to make a personal encrypted event collection in this browser, or unlock one with your existing PIN. Each PIN has its own set of events.
2. Name the event, optionally enter a USD gift limit, and add names (one per line).
3. Expand each participant's exclusion list. With "Apply changes both ways" checked, excluding a spouse automatically excludes the reverse pairing too. Uncheck it for directional exclusions. Self-draw prevention is checked by default.
4. Optionally check **Exclude the person each participant drew in a previous event**, then choose a completed previous event under the same PIN. Names match case-insensitively after trimming whitespace. The page lists matched giver → recipient pairs and unmatched people (including former recipients no longer participating). If names change, edit them and recheck the match list. The historical restriction combines with all manually chosen exclusions. Reusing a drawn event for next year automatically enables the prior-event restriction and selects the original drawing.
5. Draw names. Each participant receives exactly one assignment, and each recipient appears once. If the constraints are impossible, the app explains that instead of creating an invalid draw.
6. The results page hides assignments behind a blurred placeholder until the eye is clicked. "Hide all names" closes reveals. Resetting a draw requires confirmation and does not recall notifications.
7. Select Send text next to a participant and enter their phone number. No assignment is shown in that dialog.
8. Use New event to keep separate family events. Reuse for next year copies the participants, exclusions, settings and budget but not assignments or notification history. You can edit the copied event name and year.

## PIN privacy and encryption

- A PIN is required before events and past assignments appear. Select **Lock** when finished.
- Each PIN opens a separate event collection on the **same browser and website origin**. Different relatives can set different PINs and see only their own events locally. There is **no cloud storage, sync between devices, or PIN recovery**. A new PIN on a different device starts an empty collection.
- Your event names, participants, exclusions, assignments, sent status, and optional SMS endpoint are encrypted with browser **AES-256-GCM**. The encryption key is derived using **PBKDF2-HMAC-SHA-256** with a per-collection random salt and 600,000 iterations. A fresh random IV is generated for every write.
- The browser stores only the salt, IV, encryption parameters, collection ID and encrypted ciphertext in localStorage (key `secret-santa.vaults.v2`). It never stores the PIN itself or an easily reversible hash. In technical terms, **a hash cannot be decoded to recover names**; encryption is required to display those details again.
- Previous events saved by the older unencrypted version (`secret-santa.v1`) are migrated **when the first PIN is created in that browser**. They are encrypted under that new PIN, verified, and the old unencrypted entry is then removed. Create the initial PIN from the same browser and domain where you originally used the app. If events were saved under a different hostname (such as `www` versus non-`www`), that is different browser storage and will not be automatically imported.
- This is **device-level convenience privacy**, not an online identity system. Someone who knows or guesses your PIN, anyone who uses your browser while it is unlocked, or malicious scripts with access to the page can read the decrypted results. A copied encrypted file can be attacked offline; longer unpredictable PINs are safer. On shared devices, always click **Lock**.
- Browser data deletion, private browsing and storage clearing can permanently erase your events. The repository has no backup. Phone numbers entered for sending are not saved. Never commit private participant data to GitHub.

### Local test commands

```sh
node draw.test.cjs
node history.test.cjs
node vault.test.cjs
```
The encryption test requires Node.js 20 or later. Open the live webpage over HTTPS (Web Crypto needs a secure context).



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
