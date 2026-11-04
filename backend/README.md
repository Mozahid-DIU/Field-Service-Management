# FixFlow API — Field Service Management Backend

REST API for a field service business. Customers request repairs, admins review requests and assign technicians (with schedule-conflict detection), technicians update job status and submit service reports, and customers pay the generated invoice through **bKash**.

|                     |                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Live API**        | `https://<your-service>.onrender.com/api/v1` _(fill after deploy)_                                                              |
| **API Docs**        | [`postman/FixFlow.postman_collection.json`](postman/FixFlow.postman_collection.json) · published link _(fill after publishing)_ |
| **Admin (demo)**    | `admin@fixflow.com` / `Admin@12345`                                                                                             |
| **Demo customer**   | `rahim@example.com` / `Password@123`                                                                                            |
| **Demo technician** | `karim.tech@fixflow.com` / `Password@123`                                                                                       |

---

## Tech stack

| Concern             | Choice                                                                                              |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| Runtime / framework | Node.js 22, Express 5, TypeScript 5.9                                                               |
| Database / ORM      | PostgreSQL (Neon) + Prisma 6                                                                        |
| Validation          | Zod 4 on every body, query and param                                                                |
| Auth                | JWT access token (Bearer) + rotating opaque refresh token (httpOnly cookie), bcrypt, Google Sign-In |
| Payments            | bKash Tokenized Checkout (sandbox)                                                                  |
| Caching             | Redis (optional; degrades gracefully)                                                               |
| Uploads             | Multer + Cloudinary                                                                                 |
| Security            | helmet, CORS allow-list, express-rate-limit (global + strict auth limiter)                          |
| Quality             | Biome (lint + format), Vitest + Supertest                                                           |

## Architecture (MVC + service layer)

```
Route ─▶ Middleware (authenticate · authorize(role) · validate(zod)) ─▶ Controller ─▶ Service ─▶ Prisma (Model)
                                                                                          └─▶ AuditLog (same transaction)
```

```
src/
├── app.ts / server.ts
├── config/        env (zod-validated), prisma, redis
├── middlewares/   auth, validate, rateLimiter, upload, notFound, errorHandler
├── modules/
│   ├── auth/          register, login, google, refresh, logout, change-password
│   ├── user/          profile + technician profile
│   ├── category/      service catalog (cached)
│   ├── workOrder/     CRUD, state machine, scheduling, workflow
│   ├── technician/    availability search, my jobs, stats
│   ├── feedback/      ratings
│   ├── payment/       bKash client, invoices, payments
│   ├── admin/         users, dashboard stats, audit logs
│   └── upload/        Cloudinary images
└── utils/         AppError, sendResponse, pagination, tokens, auditLog, cache
```

- **Controllers** only translate HTTP ⇄ service calls.
- **Services** hold all business rules, transactions and audit logging.
- **Models** are the Prisma schema ([`prisma/schema.prisma`](prisma/schema.prisma)).

## Roles

| Capability                                            | CUSTOMER | TECHNICIAN  |   ADMIN   |
| ----------------------------------------------------- | :------: | :---------: | :-------: |
| Create / edit (while PENDING) / cancel own request    |    ✅    |             | ✅ cancel |
| Approve / reject, assign + schedule technician        |          |             |    ✅     |
| Move job EN_ROUTE → IN_PROGRESS                       |          | ✅ own jobs |    ✅     |
| Submit service report (completes job, issues invoice) |          | ✅ own jobs |           |
| Pay invoice with bKash, leave feedback                |  ✅ own  |             |           |
| Manage categories, users, roles; stats; audit logs    |          |             |    ✅     |

Customers only ever see their own work orders, technicians only their assigned ones (row-level scoping in every query). Accessing someone else's resource returns **403**.

## Work order lifecycle

```
PENDING ─approve─▶ APPROVED ─assign─▶ ASSIGNED ─▶ EN_ROUTE ─▶ IN_PROGRESS ─report─▶ COMPLETED ─bKash─▶ PAID
   │                  │                   │
   └─reject─▶ REJECTED └────cancel───▶ CANCELLED ◀───cancel───┘
```

All transitions are defined in one table ([`workOrder.stateMachine.ts`](src/modules/workOrder/workOrder.stateMachine.ts)): an impossible move returns **409**, a valid move by the wrong role returns **403**. Only the server (after verifying a bKash payment) can set **PAID**.

### Technical challenge — preventing double booking

Assigning a technician runs in one interactive transaction:

1. `SELECT … FOR UPDATE` on the work order row and on the technician's profile row.
2. Look for an active job (`ASSIGNED | EN_ROUTE | IN_PROGRESS`) where `existing.start < new.end AND existing.end > new.start`.
3. If found → **409** naming the clashing work order; otherwise assign and write the audit log.

Because both admins must take the same technician row lock, two simultaneous bookings are serialized — the second one sees the first and is rejected. Every other status change uses an optimistic guard (`UPDATE … WHERE status = <expected>`), so concurrent edits fail with 409 instead of overwriting each other.

### bKash payment flow

```
POST /payments/bkash/initiate {invoiceId}
  → grant token (cached) → create payment → Payment(INITIATED) → { bkashURL }
Customer pays on bkashURL (sandbox wallet 01619777283 · OTP 123456 · PIN 12121 — other docs wallets may report "Insufficient balance")
bKash → GET /payments/bkash/callback?paymentID=…&status=success|failure|cancel
  → never trusts `status`: execute → (fallback) query → amount must equal invoice total
  → one transaction: Payment SUCCESS · Invoice PAID · WorkOrder PAID · AuditLog
  → 303 redirect to FRONTEND_URL/payment/{success|failed|cancelled}
```

Repeated callbacks are no-ops (idempotent). A payment is only marked FAILED/CANCELLED when bKash itself confirms it did not complete — a forged `status=cancel` cannot cancel a paid payment, and network errors leave it **pending** (re-checkable via `POST /payments/:id/verify`). A new attempt first settles older attempts with bKash, and a second successful payment for an already-paid invoice is recorded and flagged for refund instead of being lost.

## API overview (`/api/v1`, 40+ endpoints)

| Area        | Endpoints                                                                                                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth        | `POST /auth/register` · `POST /auth/login` · `POST /auth/google` · `POST /auth/refresh-token` · `POST /auth/logout` · `PATCH /auth/change-password`                                                     |
| Profile     | `GET /users/me` · `PATCH /users/me` · `PATCH /users/me/technician-profile`                                                                                                                              |
| Categories  | `GET /categories` · `POST /categories` · `PATCH /categories/:id` · `DELETE /categories/:id`                                                                                                             |
| Work orders | `POST /work-orders` · `GET /work-orders` · `GET /work-orders/search` · `GET /work-orders/:id` · `PATCH /work-orders/:id` · `DELETE /work-orders/:id` · `GET /work-orders/:id/history`                   |
| Workflow    | `PATCH /work-orders/:id/review` · `POST /work-orders/:id/assign` · `PATCH /work-orders/:id/status` · `POST /work-orders/:id/cancel` · `POST /work-orders/:id/report` · `POST /work-orders/:id/feedback` |
| Technicians | `GET /technicians` · `GET /technicians/me/jobs` · `GET /technicians/:id/stats` · `GET /technicians/:id/feedback`                                                                                        |
| Payments    | `POST /payments/bkash/initiate` · `GET /payments/bkash/callback` · `POST /payments/:id/verify` · `GET /payments/me` · `GET /payments/:id` · `GET /invoices/:id`                                         |
| Admin       | `GET /admin/users` · `POST /admin/technicians` · `PATCH /admin/users/:id/role` · `PATCH /admin/users/:id/status` · `GET /admin/dashboard-stats` · `GET /admin/audit-logs`                               |
| Uploads     | `POST /uploads/images`                                                                                                                                                                                  |

List endpoints support `page`, `limit`, `sortBy`, `sortOrder` and domain filters, e.g.
`GET /work-orders?status=PENDING,APPROVED&priority=HIGH&sortBy=createdAt&sortOrder=desc&page=1&limit=10`.

### Response format

```json
{ "success": true, "message": "Work orders retrieved", "data": [], "meta": { "page": 1, "limit": 10, "total": 15, "totalPages": 2 } }
{ "success": false, "message": "Validation failed", "errors": [{ "path": "email", "message": "Invalid email format" }] }
```

## Database

10 models: `User`, `TechnicianProfile`, `RefreshToken`, `ServiceCategory`, `WorkOrder`, `ServiceReport`, `Invoice`, `Payment`, `Feedback`, `AuditLog` (+ implicit technician ↔ skill join table).

- **Soft delete:** `deletedAt` on users, categories and work orders.
- **Indexes:** status, role, `(customerId, status)`, `(technicianId, scheduledStart, scheduledEnd)`, audit `(entity, entityId)`, etc.
- **DB CHECK constraints** (in the migration): rating 1–5, positive amounts, `scheduledEnd > scheduledStart`.
- **Money:** `Decimal(10,2)` everywhere; parts cost is computed server-side.

## Run locally

```bash
cd backend
cp .env.example .env          # fill DATABASE_URL, JWT secrets, bKash sandbox keys
npm install
npx prisma migrate deploy     # applies prisma/migrations
npm run db:seed               # demo users, categories, 15 work orders
npm run dev                   # http://localhost:5000/api/v1/health
```

| Script                        | Purpose                    |
| ----------------------------- | -------------------------- |
| `npm run dev`                 | Watch mode (tsx)           |
| `npm run build` / `npm start` | Compile to `dist/` and run |
| `npm test`                    | Vitest suite               |
| `npm run lint`                | Biome check                |
| `npm run typecheck`           | `tsc --noEmit`             |

**bKash sandbox:** the public sandbox merchant credentials from the bKash developer docs work out of the box. Set them in `.env` (`BKASH_USERNAME`, `BKASH_PASSWORD`, `BKASH_APP_KEY`, `BKASH_APP_SECRET`).

## Deploy (Render)

`render.yaml` at the repository root defines the web service. Set the secret environment variables in the Render dashboard, then:

- Build: `npm ci --include=dev && npm run build && npx prisma migrate deploy`
- Start: `npm start`
- Set `BKASH_CALLBACK_URL` to `https://<service>.onrender.com/api/v1/payments/bkash/callback` and `FRONTEND_URL` to the deployed frontend.
