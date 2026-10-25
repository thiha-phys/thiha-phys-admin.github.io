# Book Order App — Firebase through a secure API proxy

This package keeps the HTML/CSS/JavaScript customer and admin pages, but the browser no longer calls Firebase directly. It calls a Cloudflare Worker API, which then accesses Firebase Realtime Database using a server-side service-account secret.

## Folder structure
- `customer/`: customer order form
- `admin/`: admin login, create-order page, and order history
- `shared/books.json`: book prices and weights
- `shared/cities.json`: delivery rates imported from the supplied spreadsheet
- `shared/common.js`: frontend API URL and shared calculations
- `worker.js`: backend API (Cloudflare Worker)
- `wrangler.toml`: Worker configuration

## Important: deployment/configuration is required
The package is prepared, but it is **not live yet**. You must deploy the Worker and enter secrets in your own Cloudflare/Firebase accounts. VPN-free access cannot be guaranteed until tested from the actual Myanmar networks.

### 1. Deploy the Worker
1. Sign in to Cloudflare and open **Workers & Pages**.
2. Create a Worker named `book-order-api` and deploy `worker.js` (or use Wrangler from a local terminal).
3. Configure the Worker variable `ALLOWED_ORIGINS` as a comma-separated list of the exact HTTPS origins hosting the customer/admin site, e.g. `https://your-project.pages.dev,https://yourdomain.com`. During local development include `http://localhost:8080` too.
4. Keep the Worker URL, for example `https://book-order-api.your-subdomain.workers.dev`.

### 2. Add server-side secrets
In Worker **Settings → Variables and Secrets**, add these as **Secrets** (not ordinary variables):
- `FIREBASE_SERVICE_ACCOUNT_JSON`: the complete JSON contents of a service-account key for your Firebase project. In Firebase Console → Project settings → Service accounts, generate a private key. Do not upload this key into the website folder, GitHub, or frontend JavaScript.
- `ADMIN_PASSWORD`: a strong, unique password used to log into the admin page.

The service account must belong to the **`test-51e64` Firebase project** and have permission to access its Realtime Database. This package now defaults to `https://test-51e64-default-rtdb.asia-southeast1.firebasedatabase.app`. If needed, set the Worker variable `FIREBASE_DATABASE_URL` to that exact URL. Do not use the old `thkapp-305` service-account key. Redeploy after setting secrets.

**About the API key:** this secure proxy package does not use the browser Firebase API key. It authenticates server-to-server with the Firebase service-account JSON secret. Generate/download the service-account key from the `test-51e64` project; do not paste a service-account private key into this chat or frontend files. The web API key you shared is not a replacement for the service-account credential.

### 3. Point the website at the Worker
Open `shared/common.js` and replace `https://YOUR-WORKER-NAME.YOUR-SUBDOMAIN.workers.dev` with your actual Worker URL. Then upload the **entire folder structure** to your static host. Keep `shared`, `customer`, and `admin` folders together.

### 4. Test
- Open `https://YOUR-WORKER-URL/api/health`; it should return `{"ok":true,"service":"book-order-api"}`.
- Test a customer order from a phone/browser without VPN.
- Open `/admin/`, log in using `ADMIN_PASSWORD`, then check Order History.
- Repeat on the Myanmar ISPs your customers use. The proxy changes the browser's Firebase connection path, but if the Worker hostname itself is blocked, a different API hostname/provider will be needed.

## Security notes
- Do **not** make all of Realtime Database publicly readable/writable to solve this.
- Customer order creation is public, so the Worker performs basic field/quantity checks. Before a large public launch, add server-side recalculation of prices/delivery, abuse/rate limiting, and stronger anti-spam protection.
- Admin order history requires a server-verified signed session token. The password and Firebase service-account key must remain Worker secrets.
- This proxy does not make network censorship disappear automatically. It is a deployment/test approach, not a guarantee that every Myanmar ISP can reach the Worker.

## Pricing/delivery rules
- Price tier applies separately to each book type: 1–9, 10–29, 30–49, and 50+.
- Delivery: the selected city's rate for up to 2 kg plus one `nextKg` charge for each full/started kg above 2 kg (using ceiling).
