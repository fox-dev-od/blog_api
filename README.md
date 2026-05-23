# DASP Backend API

NestJS backend with MongoDB/Mongoose, JWT auth, Redis cache, activity logging, blacklist checks, blog, cases, and case categories.

## Stack

- NestJS
- MongoDB + Mongoose
- Redis
- JWT auth
- Passport
- class-validator / class-transformer
- bcrypt
- Nest throttler

## Environment

Create `.env` in the API root:

```env
PORT=3000

MONGO_URI=mongodb://localhost:27017/dasp

JWT_ACCESS_SECRET=change_me_access
JWT_REFRESH_SECRET=change_me_refresh
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_DEFAULT_TTL=14400

THROTTLE_TTL=60000
THROTTLE_LIMIT=20
```
## Run

```bash
npm install
npm run start:dev
```

Production:

```bash
npm run build
npm run start:prod
```

## Auth

Auth is global by default. Routes are protected unless marked public.

Send protected requests with:

```http
Authorization: Bearer <accessToken>
x-refresh-token: <refreshToken>
```

If the access token expired and the refresh token is valid, the global auth guard rotates tokens and returns:

```http
x-access-token: <new_access_token>
x-refresh-token: <new_refresh_token>
```

The client should replace stored tokens when these headers are present.

Roles:

- `admin`
- `author`
- `user`

## Rate Limiting

Rate limiting is enabled globally through `@nestjs/throttler`.

Defaults:

- `THROTTLE_TTL=60000`
- `THROTTLE_LIMIT=20`

## Redis Cache

Redis is used from service layer only. Controllers do not access Redis directly.

Cache behavior:

- Redis failures are logged.
- If Redis is unavailable, services fall back to MongoDB.
- Values are stored as JSON.
- Default TTL is 4 hours (`14400` seconds).

Cached areas:

- public blog list and blog reads
- case/category reads and lists
- blacklist IP/user checks for global middleware

Blacklist cache keys:

- `blacklist:ip:{ip}`
- `blacklist:user:{userId}`

Blog cache keys:

- `blog:id:{id}`
- `blog:slug:{slug}`
- `blog:public:slug:{slug}`
- `blog:list:{hash}`

Case category cache keys:

- `case-category:id:{id}`
- `case-category:slug:{slug}`
- `case-category:list:all`
- `case-category:list:public`

Case cache keys:

- `case:id:{id}`
- `case:slug:{slug}`
- `case:public:slug:{slug}`
- `case:list:{hash}`
- `case:category:{categorySlug}:*`

## Activity Logging

Use the decorator on controller methods:

```ts
@ActivityLog({ action: 'case.create', entity: 'case' })
```

The global interceptor logs successful and failed requests without blocking the main request if logging fails.

Sensitive fields are redacted:

- `password`
- `confirmPassword`
- `token`
- `accessToken`
- `refreshToken`
- `authorization`
- `secret`
- `apiKey`

Activity log routes:

- `GET /activity-logs`
- `GET /activity-logs/:id`
- `DELETE /activity-logs/:id`

Query params for `GET /activity-logs`:

- `page`
- `limit`
- `action`
- `entity`
- `userId`
- `ip`
- `success`
- `dateFrom`
- `dateTo`

## Blacklist

The global blacklist middleware checks request IP before auth and does not block `OPTIONS` or `/health`.

IP sources:

- `x-forwarded-for`
- `cf-connecting-ip`
- `req.ip`
- `req.socket.remoteAddress`

IPv6 mapped IPv4 values like `::ffff:127.0.0.1` are normalized.

Blacklist routes:

- `GET /blacklist`
- `POST /blacklist`
- `GET /blacklist/:id`
- `PATCH /blacklist/:id`
- `DELETE /blacklist/:id`
- `PATCH /blacklist/:id/activate`
- `PATCH /blacklist/:id/deactivate`

Entry types:

- `ip`
- `user`

Create example:

```json
{
  "type": "ip",
  "ip": "127.0.0.1",
  "reason": "Abuse",
  "expiresAt": null,
  "isActive": true
}
```

The service also exposes:

```ts
isUserBlocked(userId: string): Promise<boolean>
```

for later guard integration.

## API Routes

### Auth

- `POST /auth/register` - public registration, creates `user`
- `POST /auth/login` - public login
- `GET /auth/me` - current user
- `POST /auth/logout` - logout current session
- `POST /auth/logout-all` - logout all sessions

### Users

Admin only:

- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `DELETE /users/:id`

### Blog

Public:

- `GET /blog`
- `GET /blog/:slug`

Admin or author:

- `POST /blog`
- `PATCH /blog/:id`
- `DELETE /blog/:id`

Authors can update/delete only their own articles. Admin can manage all articles.

### Case Categories

Admin only:

- `GET /case-categories`
- `POST /case-categories`
- `GET /case-categories/:id`
- `PATCH /case-categories/:id`
- `DELETE /case-categories/:id`

### Cases

Public:

- `GET /cases/public/by-slug/:slug`

Admin only:

- `GET /cases`
- `POST /cases`
- `GET /cases/by-slug/:slug`
- `GET /cases/:id`
- `PATCH /cases/:id`
- `DELETE /cases/:id`

## Validation

Global `ValidationPipe` is enabled with:

- `whitelist: true`
- `transform: true`
- `forbidNonWhitelisted: true`

DTOs are validated with `class-validator`.

## Architecture

Modules follow:

```text
controller -> service -> repository
```

Rules:

- Controllers accept requests and call services.
- Services contain validation, business logic, cache usage, and exceptions.
- Repositories are the only layer that talks to MongoDB.
- Redis is accessed through `RedisService`, not directly from controllers.
