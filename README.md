# PhotoVault Backend API

A secure, high-performance RESTful API for storing, managing, and sharing personal photos and albums. This project is built with **Node.js**, **TypeScript**, and **PostgreSQL** (via Neon), leveraging **Redis** for caching and **Cloudinary** for optimized image storage.

---

## 🚀 Features

### Core Capabilities
*   **Authentication**: Secure Signup, Login, and Role-Based Access Control (RBAC) using JWT.
*   **Photo Management**: Upload (multipart/form-data), delete, and retrieve photos.
*   **Album Organization**: Group photos into albums with cover images.
*   **Search & Pagination**: Optimized query performance with pagination filters (`page`, `limit`) and search (`search`).
*   **Smart Tags**: AI-powered auto-tagging (via Cloudinary) for improved searchability. Manual tags also supported.

### Advanced Sharing & Privacy
*   **Collaborative Albums**: Share albums with `EDITOR` or `CONTRIBUTOR` role to allow others to upload photos. Default role is `VIEWER`.
*   **Album Sharing**: Grant read/write access to specific users via email.
*   **Privacy Controls**: Password-protect sensitive albums (hashed with bcrypt).
*   **Granular Access**: Owners can view access lists (`sharedUsers`) and revoke permissions.
    *   **VIEWER**: Read-only access.
    *   **CONTRIBUTOR**: Can view and add photos.
    *   **OWNER**: Full control.
*   **Secure Access Logic**: Access is granted if:
    1.  User is the **Owner**.
    2.  User is in the **Shared List**.
    3.  User provides the correct **Password** (via `X-Album-Password` header).
    4.  User accesses via a valid **Magic Link** token.

### Magic Links (Public Access)
*   **Generate Links**: Create unique, time-limited URLs for albums.
*   **Secure Tokens**: Uses cryptographically secure random tokens.
*   **Expiration**: Default 7-day expiry, configurable per link.
*   **Revocation**: Instant revocation of tokens by the owner.

### Soft Delete (Trash Bin)
*   **Recovery**: Accidental deletions can be restored.
*   **Trash View**: View deleted photos and albums separately.
*   **Hard Delete**: Option for permanent removal.

### Automated Trash Cleanup
*   **Stale Item Removal**: Automatically hard-deletes photos and albums that have been in the trash for more than 30 days.
*   **Cron Job**: Runs daily at midnight to keep the system clean and performant.

### Enhanced Authentication
*   **Google OAuth**: Login and Signup using Google Accounts.
*   **Password Reset**: Secure forgot-password flow with email delivery (via Resend) and hashed tokens.
*   **HttpOnly Cookies**: JWT tokens are stored in secure, HttpOnly cookies to prevent XSS attacks.

### Push Notifications
*   **Real-time Alerts**: Subscribe to push notifications for album updates (e.g., new photos in shared albums).
*   **Web Push Standard**: VAPID-based secure push delivery.

### Bulk Operations
*   **Download Album**: Download entire albums as a `.zip` archive, respecting all permissions.

### Admin Dashboard & Audit
*   **User Management**: Admin API to list users, ban users, and update roles.
*   **Audit Logging**: Detailed DB logging of all critical admin actions (Bans, Role Updates) for accountability.
*   **User Stats**: View storage usage (photo/album counts) per user.

### Security & Observability
*   **Security Headers**: Implements `helmet` for strict HTTP headers (HSTS, No-Sniff, etc.).
*   **Rate Limiting**: Protects authentication endpoints against brute-force attacks.
*   **Input Validation**: Strict Zod schemas for all incoming requests.
*   **Wide Event Logging**: Implements "One Request, One Log" philosophy using `AsyncLocalStorage` to capture high-cardinality context (Trace ID, User ID, HTTP details) in a single JSON blob per request.
*   **Caching**: Redis caching strategy for high-traffic endpoints.

---

## 🛠️ Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Runtime** | Node.js (v18+) | JavaScript runtime environment. |
| **Language** | TypeScript | Statically typed JavaScript. |
| **Framework** | Express.js | Fast, unopinionated web framework. |
| **Database** | PostgreSQL | Relational database (via Neon Serverless). |
| **ORM** | Prisma | Modern database access for TypeScript. |
| **Caching** | Redis | In-memory data store for caching strategies. |
| **Storage** | Cloudinary | Cloud-based image management and optimization. |
| **Validation** | Zod | TypeScript-first schema validation. |
| **Testing** | Jest | JavaScript testing framework. |

---

## 📂 Architecture & Design

### Directory Structure
```
src/
├── configs/        # Configuration (DB, Redis, Cloudinary, Env)
├── controllers/    # Business logic & Request handling
├── middleware/     # Auth, Validation, Error Handling, Wide Logger
├── routes/         # API Route definitions
├── schemas/        # Zod validation schemas
├── utils/          # Utilities (Image optimization, Logger)
└── server.ts       # Entry point
```

### Key Patterns
*   **Wide Logger**: Located in `src/utils/wideLogger.ts`, this utility aggregates logs throughout the request lifecycle and emits a single canonical log line at the end. This simplifies debugging and metrics generation.
*   **Zod Middleware**: All incoming requests are validated against strict Zod schemas (`src/middleware/validator.middleware.ts`) before reaching the controller.
*   **Service-Controller**: Logic is primarily contained in Controllers (`src/controllers`), interacting directly with Prisma for data access.

---

## 💾 Database Schema

The application uses **PostgreSQL** with the following relationships:

*   **User**: `1-to-Many` with **Photos** and **Albums**.
*   **User**: `Many-to-Many` with **Albums** (via **SharedAlbum**).
*   **Album**: `1-to-Many` with **Photos**.
*   **SharedAlbum**: Join table (`albumId`, `userId`) for sharing permissions.

*(See `prisma/schema.prisma` for the full DSL)*

---

## ⚡ Getting Started

### Prerequisites
*   Node.js (v18+)
*   PostgreSQL database
*   Redis instance
*   Cloudinary Account credential

### 1. Installation
```bash
git clone <repository-url>
cd PhotoVault
npm install
```

### 2. Environment Configuration
Create `.env`:
```bash
cp .env.example .env
```
**Required Variables:**
*   `DATABASE_URL`: `postgresql://user:pass@host/db`
*   `JWT_SECRET`: `super_secret_key`
*   `CLOUDINARY_CLOUD_NAME`: `...`
*   `CLOUDINARY_API_KEY`: `...`
*   `CLOUDINARY_API_SECRET`: `...`
*   `REDIS_URL`: `redis://localhost:6379`

### 3. Database Setup
```bash
# Run migrations using Prisma
npm run p:mig
```

### 4. Build & Run
```bash
# Development (Hot Reload)
npm run dev

# Production
npm run build
npm start
```

---

## 📡 API Reference

### Headers
*   **Authorization**: `Bearer <token>` (Required for all protected routes)
*   **X-Album-Password**: `<password>` (Required for accessing password-protected albums if not owner)

### User / Auth
*   **Register**: `POST /api/auth/register`
    ```json
    { "email": "user@example.com", "password": "secure123" }
    ```
*   **Login**: `POST /api/auth/login`
*   **Google Auth**: `GET /api/auth/google` (Redirects to Google)
*   **Forgot Password**: `POST /api/auth/forgot-password`
    ```json
    { "email": "user@example.com" }
    ```
*   **Reset Password**: `POST /api/auth/reset-password`
    ```json
    { "token": "...", "newPassword": "..." }
    ```

### Push Notifications
*   **Subscribe**: `POST /api/push/subscribe`
    ```json
    { "endpoint": "...", "keys": { "p256dh": "...", "auth": "..." } }
    ```

### Albums

#### Create Album
*   `POST /api/albums`
    ```json
    { "title": "Summer Vacation" }
    ```

#### Manage Sharing
*   **Share**: `POST /api/albums/:id/share`
    ```json
    { "email": "friend@example.com" }
    ```
*   **Revoke**: `DELETE /api/albums/:id/share`
    ```json
    { "email": "ex-friend@example.com" }
    ```

#### Privacy
*   **Set Password**: `PUT /api/albums/:id/privacy`
    ```json
    { "password": "secretPassword123" }
    ```
*   **Remove Password**: `PUT /api/albums/:id/privacy`
    ```json
    { "password": null }
    ```
    { "password": null }
    ```

#### Magic Links
*   **Generate**: `POST /api/albums/:id/magic-link`
    ```json
    { "expiresInDays": 7 }
    ```
*   **Revoke**: `DELETE /api/albums/:id/magic-link`
*   **Access (Public)**: `GET /api/albums/magic/:token`

#### Trash Management
*   **View Trash**: `GET /api/albums/trash`
*   **Restore**: `POST /api/albums/:id/restore`
*   **Hard Delete**: `DELETE /api/albums/:id/hard`
#### Retrieve
*   **My Albums**: `GET /api/albums/my-albums?page=1&limit=10&search=summer`
*   **Shared With Me**: `GET /api/albums/shared`
*   **Get One**: `GET /api/albums/:id`
    *   *Returns*: Album details, Photos, and `sharedUsers` (if Owner).
*   **Download Zip**: `GET /api/albums/:id/download`

---

## 🧪 Testing

Run integration tests using Jest:
```bash
npm test
```

---
**Author**: Raphael Menyawovor
**License**: ISC
