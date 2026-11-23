/* Set endpoint to the HTTPS origin of the separately deployed owner-only OAuth Worker.
   Example: https://secret-santa-owner-sync.YOUR-SUBDOMAIN.workers.dev
   Public configuration only. NEVER place OAuth client secrets or GitHub tokens here. */
window.SantaSyncConfig = Object.freeze({ endpoint: '' });
