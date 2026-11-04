# 🔧 FixFlow — Field Service Management: Development Plan

> **Stack:** Next.js (frontend) · Express + TypeScript (backend, MVC) · PostgreSQL (Neon) + Prisma · bKash Sandbox
> **লক্ষ্য:** B7A6 assignment-এর সব mandatory requirement পূরণ করে, তাড়াতাড়ি একটা পূর্ণ, deploy করা, demo দেওয়ার মতো প্রজেক্ট।

---

## ০. এক নজরে

| বিষয় | সিদ্ধান্ত |
|---|---|
| Repo | একটা git repo, তার ভেতরে `backend/` আর `frontend/` আলাদা folder |
| Backend | Node 22, Express 5, TypeScript, **MVC + Service layer** |
| Database | PostgreSQL (Neon free tier) + Prisma ORM |
| Validation | Zod (backend ও frontend দুই জায়গাতেই) |
| Auth | JWT access token (১৫ মিনিট) + refresh token (৭ দিন, DB-তে রাখা, httpOnly cookie), bcrypt, Google login |
| Roles | `CUSTOMER`, `TECHNICIAN`, `ADMIN` |
| Payment | bKash Tokenized Checkout (sandbox) |
| Cache | Redis (Upstash). না থাকলে cache ছাড়াই চলবে |
| File upload | Multer + Cloudinary (work order-এর ছবি) |
| Security | helmet, CORS, express-rate-limit |
| Docs | Postman Collection (published) |
| Deploy | Backend → **Render**, Frontend → **Vercel**, DB → **Neon** |
| Frontend | Next.js 15 App Router, Tailwind, TanStack Query, React Hook Form + Zod, axios |

---

## ১. Roles ও Permissions

| কাজ | CUSTOMER | TECHNICIAN | ADMIN |
|---|:-:|:-:|:-:|
| Register / Login / Google login | ✅ | ✅ | ✅ |
| Service request (work order) তৈরি | ✅ | ❌ | ❌ |
| নিজের request edit (শুধু PENDING থাকলে) / cancel | ✅ | ❌ | ✅ |
| Request approve / reject | ❌ | ❌ | ✅ |
| Technician assign + schedule | ❌ | ❌ | ✅ |
| Status update (EN_ROUTE → IN_PROGRESS → COMPLETED) | ❌ | ✅ (শুধু নিজের job) | ✅ |
| Service report জমা | ❌ | ✅ | ❌ |
| Invoice-এর payment (bKash) | ✅ (শুধু নিজের) | ❌ | ❌ |
| Feedback / rating | ✅ (কাজ PAID হওয়ার পর) | ❌ | ❌ |
| Category manage | ❌ | ❌ | ✅ |
| User manage, stats, audit logs | ❌ | ❌ | ✅ |

> Technician নিজে register করতে পারবে না। Admin তাকে তৈরি করবে, অথবা কোনো user-এর role বদলে technician বানাবে। এতে role control শক্ত থাকে।

---

## ২. Work Order State Machine

```
PENDING ──approve──▶ APPROVED ──assign──▶ ASSIGNED ──▶ EN_ROUTE ──▶ IN_PROGRESS ──▶ COMPLETED ──pay──▶ PAID
   │                    │                    │
   └──reject──▶ REJECTED └──cancel──▶ CANCELLED ◀──cancel──┘
```

| From | To | কে করতে পারবে |
|---|---|---|
| PENDING | APPROVED / REJECTED | ADMIN |
| PENDING, APPROVED, ASSIGNED | CANCELLED | CUSTOMER (নিজের), ADMIN |
| APPROVED | ASSIGNED | ADMIN (assign endpoint দিয়ে) |
| ASSIGNED | EN_ROUTE | TECHNICIAN (assigned জন), ADMIN |
| EN_ROUTE | IN_PROGRESS | TECHNICIAN, ADMIN |
| IN_PROGRESS | COMPLETED | TECHNICIAN (service report লাগবে) |
| COMPLETED | PAID | শুধু সিস্টেম (bKash payment verify হলে) |

- Transition-এর নিয়মগুলো একটা `TRANSITIONS` map-এ রাখা থাকবে। নিয়মের বাইরে কিছু চাইলে `409 Conflict` আর পরিষ্কার error message।
- প্রতিটা transition-এর জন্য `AuditLog`-এ entry হবে।
- **COMPLETED** হলেই একই transaction-এ **Invoice** তৈরি হবে: `category.basePrice + report.partsCost`।

---

## ৩. Database Schema (Prisma)

```prisma
enum Role            { CUSTOMER TECHNICIAN ADMIN }
enum UserStatus      { ACTIVE BLOCKED }
enum AuthProvider    { CREDENTIALS GOOGLE }
enum WorkOrderStatus { PENDING APPROVED REJECTED ASSIGNED EN_ROUTE IN_PROGRESS COMPLETED PAID CANCELLED }
enum Priority        { LOW MEDIUM HIGH URGENT }
enum InvoiceStatus   { UNPAID PAID VOID }
enum PaymentStatus   { INITIATED SUCCESS FAILED CANCELLED }
```

| Model | মূল field | Relation / Constraint / Index |
|---|---|---|
| **User** | id, name, email (unique), password?, phone, role, status, provider, googleId (unique), avatarUrl, deletedAt | 1–1 TechnicianProfile; index(role), index(deletedAt) |
| **TechnicianProfile** | userId (unique), skills `String[]`, bio, isAvailable, avgRating, totalJobs | M–N ServiceCategory (skills হিসেবে) |
| **ServiceCategory** | name (unique), description, basePrice `Decimal`, isActive, deletedAt | 1–N WorkOrder |
| **WorkOrder** | code (unique, যেমন `WO-2026-0001`), customerId, technicianId?, categoryId, title, description, address, priority, status, preferredDate, scheduledStart?, scheduledEnd?, images `String[]`, cancelReason?, deletedAt | index(status), index(customerId), index(technicianId, scheduledStart, scheduledEnd), index(createdAt) |
| **ServiceReport** | workOrderId (unique), workDone, partsUsed `Json`, partsCost `Decimal`, laborMinutes | 1–1 WorkOrder |
| **Invoice** | workOrderId (unique), invoiceNo (unique), subtotal, partsCost, total, status, issuedAt, paidAt? | 1–N Payment |
| **Payment** | invoiceId, userId, amount, provider (`BKASH`), bkashPaymentId (unique), trxId (unique?), status, rawResponse `Json`, paidAt? | index(status), index(userId) |
| **Feedback** | workOrderId (unique), customerId, technicianId, rating (1–5, Zod + DB check), comment | index(technicianId) |
| **AuditLog** | actorId, action (যেমন `WORK_ORDER_STATUS_CHANGED`), entity, entityId, before `Json?`, after `Json?`, ip, createdAt | index(entity, entityId), index(actorId), index(createdAt) |
| **RefreshToken** | userId, tokenHash (unique), expiresAt, revokedAt? | index(userId) |

### Schedule conflict detection (মূল backend challenge)

```
prisma.$transaction(async (tx) => {
  1. SELECT ... FROM "TechnicianProfile" WHERE userId = $1 FOR UPDATE   ← technician row lock
  2. খোঁজো: একই technician-এর কোনো work order আছে কিনা, যার status ∈ {ASSIGNED, EN_ROUTE, IN_PROGRESS}
     এবং existing.start < new.end AND existing.end > new.start
  3. থাকলে → 409 "Technician already booked from 3:00 PM to 5:00 PM"
  4. না থাকলে → work order update (technicianId, schedule, status = ASSIGNED) + audit log
})
```
Row lock থাকায় দুইজন admin একই সময়ে একই technician-কে assign করতে গেলে একজন অপেক্ষা করবে, তাই **double booking** হবে না। Video-তে "technical challenge" হিসেবে এটাই বলা যাবে।

### Seed data
- 1 Admin: `admin@fixflow.com` (password `.env`-এ)
- 4 Technician (AC, Plumbing, Electrical, Appliance skill)
- 3 Customer
- 6 Category
- বিভিন্ন status-এর ~১৫টা work order, কিছু invoice, payment আর feedback

---

## ৪. Backend Architecture (MVC + Service)

```
backend/
├── prisma/
│   ├── schema.prisma          ← M (Model)
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── app.ts                 ← express app, middleware, routes
│   ├── server.ts              ← listen
│   ├── config/                ← env (Zod দিয়ে validate), prisma, redis, cloudinary
│   ├── middlewares/
│   │   ├── auth.ts            ← Bearer token যাচাই
│   │   ├── authorize.ts       ← authorize('ADMIN', 'TECHNICIAN')
│   │   ├── validate.ts        ← Zod schema (body/query/params)
│   │   ├── rateLimiter.ts
│   │   ├── upload.ts          ← multer
│   │   ├── notFound.ts        ← 404 JSON
│   │   └── errorHandler.ts    ← Zod / Prisma / JWT / AppError → একই error format
│   ├── modules/
│   │   ├── auth/              auth.routes.ts · auth.controller.ts · auth.service.ts · auth.validation.ts
│   │   ├── user/
│   │   ├── category/
│   │   ├── workOrder/         + workOrder.stateMachine.ts · workOrder.scheduling.ts
│   │   ├── technician/
│   │   ├── payment/           + bkash.client.ts
│   │   ├── feedback/
│   │   └── admin/
│   ├── utils/                 ← AppError, catchAsync, sendResponse, pagination, jwt, auditLog, cache
│   └── types/
├── tests/                     ← vitest + supertest
├── postman/FixFlow.postman_collection.json
└── .env.example
```

**Request flow:** `Route → Middleware (auth, role, validate) → Controller → Service → Prisma (Model) → sendResponse()`
- **Controller:** শুধু req/res সামলায়, কোনো business logic রাখে না
- **Service:** সব business logic, transaction আর audit log এখানে
- **View:** backend-এর ক্ষেত্রে JSON response। UI-এর view হলো Next.js।

**Response format (সব জায়গায় একই):**
```json
{ "success": true,  "message": "Work order created", "data": {}, "meta": { "page": 1, "limit": 10, "total": 42 } }
{ "success": false, "message": "Validation failed", "errors": [{ "path": "email", "message": "Invalid email" }] }
```

---

## ৫. API তালিকা (৩৪টা endpoint, `/api/v1`)

### Auth (৬)
| Method | Endpoint | Role |
|---|---|---|
| POST | `/auth/register` | Public (CUSTOMER হিসেবে) |
| POST | `/auth/login` | Public |
| POST | `/auth/google` | Public: frontend-এর Google `idToken` verify করে |
| POST | `/auth/refresh-token` | Public (cookie অথবা body থেকে) |
| POST | `/auth/logout` | Auth |
| PATCH | `/auth/change-password` | Auth |

### User / Profile (৩)
| GET | `/users/me` | Auth |
|---|---|---|
| PATCH | `/users/me` | Auth (avatar upload সহ) |
| PATCH | `/users/me/technician-profile` | TECHNICIAN (skills, bio, availability) |

### Service Category (৪)
| GET | `/categories` | Public (Redis cache) |
|---|---|---|
| POST | `/categories` | ADMIN |
| PATCH | `/categories/:id` | ADMIN |
| DELETE | `/categories/:id` | ADMIN (soft delete) |

### Work Order (১১)
| POST | `/work-orders` | CUSTOMER (ছবি সহ) |
|---|---|---|
| GET | `/work-orders` | Auth: role অনুযায়ী data। `?page&limit&status&priority&categoryId&sortBy&sortOrder&from&to` |
| GET | `/work-orders/search?q=` | Auth: code, title, address দিয়ে search |
| GET | `/work-orders/:id` | মালিক / assigned technician / ADMIN |
| PATCH | `/work-orders/:id` | CUSTOMER (শুধু PENDING থাকলে) |
| DELETE | `/work-orders/:id` | ADMIN (soft delete) |
| PATCH | `/work-orders/:id/review` | ADMIN: `{ decision: APPROVE \| REJECT, note }` |
| POST | `/work-orders/:id/assign` | ADMIN: `{ technicianId, scheduledStart, scheduledEnd }` + conflict check |
| PATCH | `/work-orders/:id/status` | TECHNICIAN / ADMIN: state machine |
| POST | `/work-orders/:id/cancel` | CUSTOMER / ADMIN |
| GET | `/work-orders/:id/history` | মালিক / ADMIN: audit timeline |

### Technician (৪)
| GET | `/technicians` | ADMIN: `?skill&available&from&to` (ওই সময়ে free কারা) |
|---|---|---|
| GET | `/technicians/me/jobs` | TECHNICIAN: `?status&date` |
| POST | `/work-orders/:id/report` | TECHNICIAN: service report |
| GET | `/technicians/:id/stats` | ADMIN / TECHNICIAN (নিজের): jobs, rating, আয় |

### Invoice & Payment, bKash (৫)
| GET | `/invoices/:id` | মালিক / ADMIN |
|---|---|---|
| POST | `/payments/bkash/initiate` | CUSTOMER: `{ invoiceId }` → `{ bkashURL }` |
| GET | `/payments/bkash/callback` | bKash redirect: execute → verify → DB update → frontend-এ redirect |
| GET | `/payments/:id` | মালিক / ADMIN |
| GET | `/payments/me` | CUSTOMER: payment history (paginated) |

### Feedback (২)
| POST | `/work-orders/:id/feedback` | CUSTOMER (PAID হওয়ার পর, একবারই) |
|---|---|---|
| GET | `/technicians/:id/feedback` | Public / Auth |

### Admin (৫)
| GET | `/admin/users` | ADMIN: `?role&status&search&page` |
|---|---|---|
| POST | `/admin/technicians` | ADMIN: technician account তৈরি |
| PATCH | `/admin/users/:id/role` | ADMIN (audit log সহ) |
| PATCH | `/admin/users/:id/status` | ADMIN: block / unblock |
| GET | `/admin/dashboard-stats` | ADMIN: মোট আয়, status অনুযায়ী count, top technician (Redis ৬০ সেকেন্ড cache) |
| GET | `/admin/audit-logs` | ADMIN: `?entity&actorId&action&page` |

---

## ৬. bKash Sandbox Flow

```
1. POST /payments/bkash/initiate { invoiceId }
   ├─ যাচাই: invoice customer-এর নিজের, আর status UNPAID
   ├─ bKash: POST /tokenized/checkout/token/grant   (id_token, Redis-এ ~55 মিনিট cache)
   ├─ bKash: POST /tokenized/checkout/create        (amount, merchantInvoiceNumber, callbackURL)
   ├─ DB: Payment { status: INITIATED, bkashPaymentId }
   └─ response: { bkashURL }

2. Customer bkashURL-এ গিয়ে sandbox wallet নম্বর, OTP আর PIN দেয়

3. bKash → GET /payments/bkash/callback?paymentID=...&status=success|failure|cancel
   ├─ success → bKash: POST /tokenized/checkout/execute
   │    ├─ statusCode "0000" আর transactionStatus "Completed"
   │    │    → $transaction: Payment=SUCCESS(trxID) · Invoice=PAID · WorkOrder=PAID · AuditLog
   │    └─ অন্য কিছু → Payment=FAILED
   ├─ failure/cancel → Payment=FAILED/CANCELLED
   └─ redirect → FRONTEND_URL/payment/{success|failed|cancelled}?id=...

4. Idempotency: একই paymentID-এর callback দুইবার এলে দ্বিতীয়বার কিছু হবে না।
   execute fail করলে /checkout/payment/status দিয়ে query করে নিশ্চিত হওয়া হবে।
```

Env: `BKASH_BASE_URL`, `BKASH_USERNAME`, `BKASH_PASSWORD`, `BKASH_APP_KEY`, `BKASH_APP_SECRET`, `BKASH_CALLBACK_URL`

---

## ৭. Frontend (Next.js) Pages

```
frontend/src/app/
├── (public)/            page.tsx (landing) · services/ (category list)
├── (auth)/              login/ · register/   ← Google button সহ
├── customer/            dashboard/ · requests/ · requests/new/ · requests/[id]/ (timeline, invoice, pay, feedback)
├── technician/          dashboard/ · jobs/ · jobs/[id]/ (status buttons, report form)
├── admin/               dashboard/ (stats) · work-orders/ (review + assign) · technicians/ · users/ · categories/ · audit-logs/
└── payment/             success/ · failed/ · cancelled/
```

- `lib/api.ts`: axios instance। প্রতিটা request-এ Bearer token যায়, 401 এলে নিজে থেকেই refresh করে।
- `middleware.ts`: role অনুযায়ী route guard (customer admin page-এ ঢুকতে পারবে না)
- Design: একটা "operations console" ধাঁচের UI, status অনুযায়ী আলাদা রঙ, work order timeline। Default template-এর মতো দেখাবে না।

---

## ৮. Phase ভিত্তিক কাজের ধাপ ও Commit Plan

> প্রতিটা ধাপ শেষে commit হবে। শুধু backend-এই ২০টার বেশি meaningful commit হবে।

### Phase 1: Setup ও Database
1. `chore(backend): initialize express typescript project with biome`
2. `chore(backend): add env validation and prisma config`
3. `feat(db): design prisma schema with relations, enums and indexes`
4. `feat(db): add initial migration and seed data`
5. `feat(backend): add response helper, AppError and global error handler`

### Phase 2: Auth ও RBAC
6. `feat(auth): implement register and login with bcrypt and jwt`
7. `feat(auth): add refresh token rotation and logout`
8. `feat(auth): add google login via id token verification`
9. `feat(auth): add auth and role-based authorization middleware`
10. `feat(user): add profile and technician profile endpoints`

### Phase 3: Core ও Business Logic
11. `feat(category): add service category crud with soft delete`
12. `feat(work-order): add work order create, list, detail with pagination and filters`
13. `feat(work-order): add search and customer update/cancel`
14. `feat(work-order): implement status state machine with audit logging`
15. `feat(work-order): add technician assignment with schedule conflict detection`
16. `feat(technician): add my jobs, availability search and service report`
17. `feat(invoice): auto-generate invoice on completion in transaction`
18. `feat(feedback): add rating and update technician average`

### Phase 4: Payment, Admin, Performance
19. `feat(payment): integrate bkash tokenized checkout initiate`
20. `feat(payment): handle bkash callback with execute and idempotent verification`
21. `feat(admin): add user management, dashboard stats and audit logs`
22. `perf: add redis caching for categories and dashboard stats`
23. `feat(upload): add cloudinary image upload for work orders`
24. `feat(security): add helmet, cors and rate limiting`
25. `test: add tests for state machine, conflict detection and auth`
26. `docs: add postman collection and backend readme`

### Phase 5: Frontend
27. `chore(frontend): initialize nextjs with tailwind and api client`
28. `feat(frontend): auth pages with google login and route guards`
29. `feat(frontend): customer dashboard, request form and bkash payment`
30. `feat(frontend): technician job board and status updates`
31. `feat(frontend): admin console for review, assignment, users and audit logs`

### Phase 6: Deploy ও Submission
32. `chore: deploy configs for render and vercel`
33. `docs: final readme with live links and demo credentials`
- Live-এ সব flow test করা (৩ role, 403, 404, validation error, bKash payment)
- Video record করা (৫–১০ মিনিট)

---

## ৯. Environment Variables

**backend/.env**
```
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://...neon.tech/fixflow?sslmode=require
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
GOOGLE_CLIENT_ID=...
FRONTEND_URL=http://localhost:3000
BKASH_BASE_URL=https://tokenized.sandbox.bka.sh/v1.2.0-beta
BKASH_USERNAME=... BKASH_PASSWORD=... BKASH_APP_KEY=... BKASH_APP_SECRET=...
BKASH_CALLBACK_URL=http://localhost:5000/api/v1/payments/bkash/callback
REDIS_URL=...            # optional
CLOUDINARY_CLOUD_NAME=... CLOUDINARY_API_KEY=... CLOUDINARY_API_SECRET=...
SEED_ADMIN_EMAIL=admin@fixflow.com
SEED_ADMIN_PASSWORD=...
```

**frontend/.env.local**
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
```

---

## ১০. তোমার কাছ থেকে যা লাগবে

| জিনিস | কোথা থেকে | কখন লাগবে |
|---|---|---|
| `DATABASE_URL` | neon.tech → New Project | Phase 1 (migration চালাতে) |
| Google Client ID | Google Cloud Console → Credentials → OAuth Client (Web) | Phase 2 |
| bKash sandbox credentials | bKash developer portal (public sandbox credentials) | Phase 4 |
| Cloudinary keys | cloudinary.com (free) | Phase 4 |
| Upstash Redis URL | upstash.com (free), optional | Phase 4 |
| GitHub repo | github.com → New repo | Phase 1 শেষে push |
| Render ও Vercel account | GitHub দিয়ে login | Phase 6 |

---

## ১১. Submission-এর আগে Final Checklist

- [ ] ২০+ API, সব Postman-এ documented
- [ ] সব response `{ success, message, data / errors }` format-এ
- [ ] সব POST/PATCH route-এ Zod validation
- [ ] Email/password + Google login কাজ করছে
- [ ] ৩ role, আর অন্যের route-এ গেলে 403
- [ ] Pagination, filter, sort, search
- [ ] Soft delete + audit logs
- [ ] Assignment-এ transaction + conflict detection
- [ ] bKash sandbox payment শুরু থেকে শেষ পর্যন্ত, DB-তে status update
- [ ] helmet, CORS, rate limit, Redis cache
- [ ] Live API (Render) + live frontend (Vercel)
- [ ] Admin demo credentials
- [ ] ২০+ meaningful commit
- [ ] ৫–১০ মিনিটের video
