# User Blog API

Backend API for a blog platform built with **NestJS**, **MongoDB**, **Mongoose**, and **JWT authentication**.

---

## Overview

This API provides:

- public user registration
- JWT-based authentication
- automatic access token refresh inside the auth guard
- refresh token session rotation
- role-based access control
- administrative user management
- public blog listing and article reading
- article creation and editing for authors and admins
- article status workflow with `draft`, `pending`, and `published`

---

## Tech Stack

- **NestJS**
- **MongoDB**
- **Mongoose**
- **JWT**
- **Passport**
- **class-validator**
- **class-transformer**
- **bcrypt**

---

## Table of Contents

- [Environment Variables](#environment-variables)
- [Roles and Permissions](#roles-and-permissions)
- [Authentication](#authentication)
- [Global Authorization Behavior](#global-authorization-behavior)
- [Data Models](#data-models)
- [DTO Reference](#dto-reference)
- [API Routes](#api-routes)
- [Access Rules Summary](#access-rules-summary)
- [Running the Project](#running-the-project)
- [Notes](#notes)

---

## Environment Variables

Create a `.env` file in the project root:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/user_blog

JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret

JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

---

## Roles and Permissions

The system uses 3 roles:

- `admin`
- `author`
- `user`

### Role Behavior

| Role | Permissions |
|---|---|
| `admin` | Can manage users and all articles |
| `author` | Can create articles and manage only their own articles |
| `user` | Can read public articles only |

---

## Authentication

Authentication is based on two JWT tokens:

- `accessToken` — short-lived token for protected routes
- `refreshToken` — long-lived token used for silent token rotation

Refresh tokens are stored in MongoDB as hashed session records.

### Auth Flow

1. User registers.
2. User logs in.
3. API returns:
   - `accessToken`
   - `refreshToken`
4. Client sends protected requests with:

```http
Authorization: Bearer <accessToken>
x-refresh-token: <refreshToken>
```

### Token Refresh Behavior

If the access token is still valid:

- the request continues normally

If the access token is expired but the refresh token is valid:

- the auth guard silently issues a new token pair
- the request still continues
- the response contains new headers:

```http
x-access-token: <new_access_token>
x-refresh-token: <new_refresh_token>
```

The client must save the new tokens whenever these headers are present.

### Important

There is **no separate `POST /auth/refresh` route**.

Token refresh is handled automatically inside the auth guard for protected routes.

---

## Global Authorization Behavior

The API uses a **global JWT guard**.

That means:

- all routes are protected by default
- only routes marked as public are accessible without a token

### Public Routes

- `POST /auth/register`
- `POST /auth/login`
- `GET /blog`
- `GET /blog/:slug`

---

## Data Models

### User Model

#### Fields

- `_id`
- `email`
- `name`
- `passwordHash`
- `role`
- `isActive`
- `createdAt`
- `updatedAt`

#### Default Values

For public registration:

- `role: "user"`
- `isActive: true`

### Auth Session Model

Used to store refresh token sessions.

#### Fields

- `_id`
- `userId`
- `tokenHash`
- `userAgent`
- `ipAddress`
- `expiresAt`
- `revokedAt`
- `lastUsedAt`
- `createdAt`
- `updatedAt`

### Blog Post Model

#### Fields

- `_id`
- `title`
- `subtitle`
- `slug`
- `tags`
- `status`
- `authorId`
- `blocks`
- `publishedAt`
- `createdAt`
- `updatedAt`

#### Supported Statuses

- `draft`
- `pending`
- `published`

### Blog Content Block Model

Each article contains an array of flexible content blocks.

#### Fields

- `imageUrl` — optional direct image URL
- `html` — optional HTML content
- `layout` — required layout type

#### Validation Rule

Each block must contain at least one of:

- `imageUrl`
- `html`

#### Layout Values

- `image_top_text_bottom`
- `image_bottom_text_top`
- `image_left_text_right`
- `image_right_text_left`
- `image_only`
- `text_only`

---

## DTO Reference

### Auth DTOs

#### `RegisterDto`

Used for public registration.

```json
{
  "name": "John Doe",
  "email": "user@example.com",
  "password": "123456"
}
```

#### `LoginDto`

```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

### Users DTOs

#### `UpdateUserDto`

Used by admin only. All fields are optional.

```json
{
  "email": "updated@example.com",
  "name": "Updated Name",
  "password": "newpassword123",
  "role": "author",
  "isActive": true
}
```

### Blog DTOs

#### `BlogContentBlockDto`

```json
{
  "imageUrl": "https://example.com/image.jpg",
  "html": "<p>Some content</p>",
  "layout": "image_top_text_bottom"
}
```

#### `CreateBlogPostDto`

```json
{
  "title": "How to build a blog with NestJS",
  "subtitle": "Practical guide",
  "slug": "how-to-build-a-blog-with-nestjs",
  "tags": ["nestjs", "mongodb", "backend"],
  "status": "draft",
  "blocks": [
    {
      "imageUrl": "https://example.com/cover.jpg",
      "html": "<p>Introduction block</p>",
      "layout": "image_top_text_bottom"
    },
    {
      "html": "<h2>Second section</h2><p>Only text block</p>",
      "layout": "text_only"
    }
  ]
}
```

#### `UpdateBlogPostDto`

All fields are optional.

```json
{
  "title": "Updated title",
  "subtitle": "Updated subtitle",
  "slug": "updated-title",
  "tags": ["nestjs", "updated"],
  "status": "published",
  "blocks": [
    {
      "imageUrl": "https://example.com/new-image.jpg",
      "layout": "image_only"
    }
  ]
}
```

#### `GetBlogPostsQueryDto`

Supported query params:

- `search?: string`
- `tag?: string`
- `page?: number = 1`
- `limit?: number = 10`

Example:

```http
GET /blog?search=nestjs&tag=backend&page=1&limit=10
```

---

## API Routes

## Auth

### **POST** `/auth/register`

Public registration route.

Creates a new user with default role `user`.

**Access:** Public

#### Request Body

```json
{
  "name": "John Doe",
  "email": "user@example.com",
  "password": "123456"
}
```

#### Response Example

```json
{
  "_id": "65f0f1...",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user",
  "isActive": true,
  "createdAt": "2026-03-14T10:00:00.000Z",
  "updatedAt": "2026-03-14T10:00:00.000Z"
}
```

### **POST** `/auth/login`

Logs the user in and returns a token pair.

**Access:** Public

#### Request Body

```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

#### Response Example

```json
{
  "user": {
    "_id": "65f0f1...",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "isActive": true,
    "createdAt": "2026-03-14T10:00:00.000Z",
    "updatedAt": "2026-03-14T10:00:00.000Z"
  },
  "accessToken": "jwt_access_token",
  "refreshToken": "jwt_refresh_token"
}
```

### **GET** `/auth/me`

Returns the current authenticated user.

**Access:** Protected

#### Required Headers

```http
Authorization: Bearer <accessToken>
x-refresh-token: <refreshToken>
```

### **POST** `/auth/logout`

Logs out the current session.

**Access:** Protected

#### Required Headers

```http
Authorization: Bearer <accessToken>
x-refresh-token: <refreshToken>
```

### **POST** `/auth/logout-all`

Logs out all user sessions.

**Access:** Protected

#### Required Headers

```http
Authorization: Bearer <accessToken>
x-refresh-token: <refreshToken>
```

---

## Users

All user management routes are administrative.

### **GET** `/users`

Returns all users.

**Access:** Admin only

### **GET** `/users/:id`

Returns one user by ID.

**Access:** Admin only

### **PATCH** `/users/:id`

Updates user fields.

**Access:** Admin only

#### Request Body Example

```json
{
  "name": "Updated User",
  "role": "author",
  "isActive": true
}
```

### **DELETE** `/users/:id`

Deletes a user by ID.

**Access:** Admin only

---

## Blog

### **GET** `/blog`

Returns a paginated list of published articles.

**Access:** Public

#### Query Params

- `search`
- `tag`
- `page`
- `limit`

#### Example

```http
GET /blog?search=nestjs&page=1&limit=10
```

### **GET** `/blog/:slug`

Returns one published article by slug.

**Access:** Public

#### Example

```http
GET /blog/how-to-build-a-blog-with-nestjs
```

### **POST** `/blog`

Creates a new article.

**Access:** Admin or Author

#### Required Headers

```http
Authorization: Bearer <accessToken>
x-refresh-token: <refreshToken>
```

#### Request Body Example

```json
{
  "title": "How to build a blog with NestJS",
  "subtitle": "Practical guide",
  "slug": "how-to-build-a-blog-with-nestjs",
  "tags": ["nestjs", "mongodb", "backend"],
  "status": "draft",
  "blocks": [
    {
      "imageUrl": "https://example.com/cover.jpg",
      "html": "<p>Introduction block</p>",
      "layout": "image_top_text_bottom"
    }
  ]
}
```

### **PATCH** `/blog/:id`

Updates an article.

**Access:** Admin or Author

#### Permission Rules

- `admin` can update any article
- `author` can update only their own article

#### Required Headers

```http
Authorization: Bearer <accessToken>
x-refresh-token: <refreshToken>
```

### **DELETE** `/blog/:id`

Deletes an article.

**Access:** Admin or Author

#### Permission Rules

- `admin` can delete any article
- `author` can delete only their own article

#### Required Headers

```http
Authorization: Bearer <accessToken>
x-refresh-token: <refreshToken>
```

---

## Auto Refresh Headers

If the access token was expired and the guard successfully refreshed the session, the response will include:

```http
x-access-token: <new_access_token>
x-refresh-token: <new_refresh_token>
```

The client should check these headers on every protected request and update stored tokens if they exist.

---

## Access Rules Summary

### Public

- `POST /auth/register`
- `POST /auth/login`
- `GET /blog`
- `GET /blog/:slug`

### Protected

- `GET /auth/me`
- `POST /auth/logout`
- `POST /auth/logout-all`

### Admin Only

- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `DELETE /users/:id`

### Admin or Author

- `POST /blog`
- `PATCH /blog/:id`
- `DELETE /blog/:id`

### Ownership Rule

For article update and delete:

- `admin` can manage any article
- `author` can manage only their own article

---

## Example Protected Request

```http
GET /auth/me
Authorization: Bearer <accessToken>
x-refresh-token: <refreshToken>
```

If the access token is expired but the refresh token is valid, the request still succeeds and the response may contain:

```http
x-access-token: <new_access_token>
x-refresh-token: <new_refresh_token>
```

---

## Running the Project

Install dependencies:

```bash
npm install
```

Run in development mode:

```bash
npm run start:dev
```

Run production build:

```bash
npm run build
npm run start:prod
```

---

## Notes

- Public registration always creates a user with role `user`
- Refresh is handled automatically in the guard
- A separate refresh token route is not used
- Article public reading uses `slug`
- Article update and delete use document `id`
- After silent refresh, the new refresh token must always replace the old one on the client
