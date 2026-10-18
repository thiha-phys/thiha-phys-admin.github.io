# Admin App Integration Contract

Customer app: `thiha-phys.github.io`
Admin app: `thiha-phys-admin.github.io`
Firebase project: `thkapp-305`, Realtime Database at `https://thkapp-305-default-rtdb.firebaseio.com`

The admin app must reuse the customer app's Firebase data and must not introduce a second catalog or order store. Keep the customer app's existing paths and field names stable when changing admin code.

## Shared Firebase Paths

### `masterData/order`

Single source of truth for customer/admin book and delivery settings:

- `settings`: `priceThresholds`, `royalServiceFee`, `codMaxTotal`
- `books/{bookId}`: `id`, `name`, `image`, `weight`, `prices`, `quantityHeader`, `amountHeader`
- `deliveryCities/{cityId}`: `english`, `myanmar`, `label`, `upTo2Kg`, `nextKg`
- `updatedAt`

Customer book listing, book preview, order form, and feedback form read the catalog from here. Customer order totals are recalculated server-side from this master data, not trusted from browser-submitted prices.

### `orders/{orderId}`

Customer order records are Firebase push-key children. Current fields:

- `ownerUid`: Firebase Auth UID that submitted the order
- `syncStatus`: `pending`, `synced`, or `failed`
- `createdAt`
- `request`: `name`, `phone`, `phone2`, `deliveryCity`, `address`, `deliveryService`, `carDetails`, `paymentMethod`, and `items: [{id, quantity}]`
- `receipt`: server-calculated voucher and item/fee totals after the order Sheet accepts it
- `sheetSyncedAt`, `syncAttempts`, `syncError` as applicable

Customer clients can create a pending order and read their own order. They cannot update/delete an order after creation. Do not change the customer request field names without updating the customer app, `database.rules.json`, and `Code.gs` together.

The customer app's Apps Script bridge writes to the separate order spreadsheet (`Book Orders` tab). That spreadsheet and its `Code.gs` deployment are distinct from the Profiles/Recommendations spreadsheet and its `sms.gs` deployment.

### `profiles/{phoneDigits}`

Phone digits without spaces are the Firebase key. Current record includes `name`, `job`, `email`, formatted `phone`, `ownerUid`, `syncStatus`, `createdAt`/`updatedAt`, and optional `syncPreviousPhone` for phone changes. The Profiles Sheet has `Name`, `Job`, `Email`, `Phone`, `Paid`; `Paid` is manually managed in the Sheet and must never be overwritten by profile sync.

### `recommendations/{phoneDigits_timestamp}`

Current record includes `ownerUid`, `name`, formatted `phone`, `job`, `books: [{id, rating, suggestion}]`, `otherSuggestion`, `submittedAt`, and `syncStatus`. `sms.gs` syncs to the existing Recommendations tab's `Submitted At`, `Name`, `Phone`, `Job`, each book's `Rating`/`Suggestion` columns, then `Other Suggestion`.

## Admin Capabilities To Implement

1. Read `masterData/order` and show the same IDs, names, price tiers, weights, cities, and delivery fees as the customer app.
2. Add/edit/disable books, price tiers, weights, city aliases, Royal fees, COD threshold, and delivery fees by updating `masterData/order`. Customer clients must remain read-only for this path.
3. List and inspect orders from Firebase `orders`, including customer, items, address, delivery/payment details, computed receipt, `syncStatus`, and sync errors.
4. Let an authorized admin edit operational order fields, then sync the corresponding Firebase record and its `Book Orders` row consistently. Preserve the historical receipt/order-price snapshot and record audit metadata for who changed what and when.
5. Allow an admin to create an order on behalf of a customer using the same `orders/{pushKey}` shape and server-side calculation path, with the admin UID recorded as the actor and customer identity retained in `request`.
6. Provide a retry action for failed/pending Sheet syncs rather than writing directly to either spreadsheet from the admin browser.

## Security And Compatibility

- Use Firebase Authentication for the admin app; verify an admin custom claim or a server-side admin allowlist. Do not treat a localStorage profile or the shared `phys1` customer password as authorization.
- Keep `.write: false` on `masterData/order` for customers. Add admin-only writes with a verified admin identity; do not make the path public.
- Keep customer order writes create-only and owner-bound. Add admin edits through a trusted server endpoint or explicit admin-only rules, not a broad authenticated-user write rule.
- `profiles` currently allows any authenticated user to read/write profile records. Before relying on it for real personal data, tighten this to record-owner/admin access and migrate existing anonymous users as needed.
- The two Sheets have separate Apps Script projects, deployments, and Script Properties. Do not replace one Web App URL with the other.
- Preserve existing customer behavior while working in the admin repo: customer catalog reads from Firebase, orders are Firebase-first then synced to the order Sheet, and profile/recommendation records are Firebase-first then synced by `sms.gs` to their separate Sheet.

## Admin Work Checklist

- Open/add the `thiha-phys-admin.github.io` repo before editing admin files.
- Inspect its existing auth and Firebase integrations before changing them.
- Reuse this contract and the existing `database.rules.json`; merge rule changes instead of replacing unrelated customer paths.
- Test admin actions against a test order and test master-data record, then verify customer pages still read the same records and calculations.
- Do not copy private service-account keys into either repository. Apps Script secrets stay in each project's Script Properties.
