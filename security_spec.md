# Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Default-Deny Catch-All**: No unlisted collection or sub-collection is ever readable or writable (`allow read, write: if false`).
2. **Public Catalog Visibility Boundary**: Documents in `/settings`, `/categories`, `/products`, `/packages`, `/gallery`, `/testimonials`, `/promos`, `/articles`, `/calendar`, and `/serviceAreas` can only be listed or read publicly if `resource.data.visibility == 'public'`.
3. **PII Split-Collection Isolation for Calendar Bookings**: Public date availability (`/calendar/{dateId}`) strictly forbids storing customer PII and only exposes `date`, `status`, and `publicNote`. Private customer details (`clientName`, `privateNote`) are isolated in `/calendarPrivate/{dateId}`, which is strictly restricted to `isAdmin()`.
4. **Verified Admin Write Exclusivity**: Only an authenticated, email-verified administrator (`request.auth.token.email_verified == true` and either bootstrapped owner email `ahhidayat953@gmail.com` or existing in `/admins/$(request.auth.uid)`) may create, update, or delete catalog, promo, article, calendar, or setting documents.
5. **Strict Key & Schema Enforcement**: Every `create` and `update` must pass its `isValid[Entity](incoming())` helper, enforcing exact key allowlists (`hasOnly`), required keys (`hasAll`), string `.size()` bounds, list `.size()` bounds, and numeric bounds.
6. **Temporal & Identity Immutability**: On `create`, `authorUid == request.auth.uid`, `createdAt == request.time`, and `updatedAt == request.time`. On `update`, `authorUid == existing().authorUid`, `createdAt == existing().createdAt`, and `updatedAt == request.time`.

## 2. The "Dirty Dozen" Payloads

1. **Shadow Field Injection on Product Create**: Adding `"isSuperFeatured": true` to `/products/prod-1`. Rejected by `hasOnly()`.
2. **Unverified Admin Email Spoof**: Writing to `/products/prod-1` with `email: "ahhidayat953@gmail.com"` but `email_verified: false`. Rejected by `isAdmin()`.
3. **Author UID Spoofing on Create**: Creating `/promos/promo-1` with `authorUid: "someone-else"`. Rejected by `incoming().authorUid == request.auth.uid`.
4. **Timestamp Forgery on Create**: Creating `/articles/art-1` with a client-supplied past timestamp instead of `request.time`. Rejected by `incoming().createdAt == request.time`.
5. **Immutable Field Mutation on Update**: Updating `createdAt` or `authorUid` on `/packages/pkg-1`. Rejected by `incoming().createdAt == existing().createdAt` and `affectedKeys().hasOnly(...)`.
6. **Denial-of-Wallet Oversized ID**: Calling `create` on `/products/` with a 200-character document ID or invalid characters. Rejected by `isValidId()`.
7. **Value Poisoning on Update**: Updating `price` on `/products/prod-1` with a string `"free"` or negative number `-500`. Rejected by `isValidProduct(incoming())`.
8. **Unbounded Array Exhaustion**: Sending 50 images in `images` array on `/products/prod-1`. Rejected by `data.images.size() <= 20`.
9. **Unauthorized Public List Scraping**: Listing `/products` without `where('visibility', '==', 'public')` as a non-admin. Rejected by `allow list: if existing().visibility == 'public' || isAdmin()`.
10. **PII Leak on Calendar Private Notes**: Non-admin user attempting `get` or `list` on `/calendarPrivate/2026-10-10`. Rejected because `/calendarPrivate` only allows `isAdmin()`.
11. **Privilege Escalation on `/admins`**: Non-admin authenticated user attempting to create `/admins/{theirUid}`. Rejected by `isAdmin()`.
12. **Cross-User Consultation History Access**: User A attempting to read, list, or write to `/users/userB/consultations/{consultationId}` or `/messages/{messageId}`. Rejected by `request.auth.uid == userId`, `existing().userId == request.auth.uid`, and Master Gate parent `get()` verification.

