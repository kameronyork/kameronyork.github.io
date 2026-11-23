# Secret Santa

A standalone, responsive HTML/CSS/JavaScript app for family gift exchanges. Open the project via GitHub Pages or a local HTTP server. No account or backend is needed for drawing. The public page does not contain any actual family data.

## Using the app

1. Name the event, optionally enter a USD gift limit, and add names (one per line).
2. Expand each participant's exclusion list. With "Apply changes both ways" checked, excluding a spouse automatically excludes the reverse pairing too. Uncheck it for directional exclusions. Self-draw prevention is checked by default.
3. Draw names. Each participant receives exactly one assignment, and each recipient appears once. If the constraints are impossible, the app explains that instead of creating an invalid draw.
4. The results page hides assignments behind a blurred placeholder until the eye is clicked. "Hide all names" closes reveals. Resetting a draw requires confirmation and does not recall notifications.
5. Select Send text next to a participant and enter their phone number. No assignment is shown in that dialog.
6. Use New event to keep separate family events. Reuse for next year copies the participants, exclusions, settings and budget but not assignments or notification history. You can edit the copied event name and year.

Events and assignments are saved in localStorage on the current browser/origin. No cloud sync, encryption, or login. Clearing browser data can erase events; avoid using a shared browser if secrecy matters. Phone numbers are not persisted by the app. A hidden assignment is not protected from someone who inspects browser storage. Do not put any real participant data in this repository.

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
