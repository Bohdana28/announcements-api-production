# Announcements REST API

Production-readiness extension of the announcements JSON API. Built with Express 5, TypeScript, Prisma 7, PostgreSQL, JWT, Zod, Helmet, CORS, express-rate-limit, Pino, Multer, Cloudinary and Vitest.

## Requirements

- Node.js 20+
- PostgreSQL
- npm
- Cloudinary account (only required when uploading an image)

## Setup

1. Install dependencies and generate the lockfile for this updated version:

   ```bash
   npm install
   ```

2. Create your local environment file:

   ```bash
   cp .env.example .env
   ```

3. Set `DATABASE_URL` to your PostgreSQL connection string, and set `JWT_SECRET` to a random secret of at least 32 characters. Set `ALLOWED_ORIGINS` to a comma-separated list of allowed frontend origins (for example `http://localhost:5173,http://localhost:3000`).

4. For image uploads, create a Cloudinary account and fill in `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`. These credentials are not required for requests that do not contain an image.

5. Generate Prisma Client and apply all migrations, including the optional `Announcement.imageUrl` column:

   ```bash
   npm run prisma:generate
   npm run prisma:migrate -- --name add_announcement_image_url
   ```

   If the migration already exists in `prisma/migrations`, Prisma applies the checked-in migrations.

6. Start the server:

   ```bash
   npm run dev
   ```

The API runs at `http://localhost:3000`; Swagger UI is at `http://localhost:3000/api-docs`.

## Security

- Helmet adds secure HTTP response headers.
- CORS allows only origins listed in `ALLOWED_ORIGINS`. Requests without an `Origin` header (for example, curl and server-to-server calls) are allowed because CORS is a browser policy.
- All `/auth` routes share a limit of 10 requests per IP per 15 minutes. Excess requests receive HTTP 429 and `Too many requests, please try again later`.
- Access tokens expire after 15 minutes; refresh tokens expire after 7 days and are rotated on refresh.

## Logging

Pino is initialized once in `src/logger.ts`. `pino-http` logs every HTTP request, while controllers and upload middleware log registration, login, announcement creation and successful Cloudinary image uploads. In development, logs are formatted with `pino-pretty`.

## Image uploads

`POST /announcements` and `PATCH /announcements/:id` accept `multipart/form-data`. Send the optional image under the field name `image`. Supported content is limited to image MIME types and 5 MB per file. Multer writes the file temporarily to `uploads/`; the file is uploaded to Cloudinary and the temporary local file is removed. Only Cloudinary's secure URL is stored in `Announcement.imageUrl`. Creating or updating an announcement without an image remains supported.

## Endpoints

### Authentication

| Method | Endpoint | Access |
|---|---|---|
| POST | `/auth/register` | Public, rate limited |
| POST | `/auth/login` | Public, rate limited |
| POST | `/auth/refresh` | Public, rate limited |
| POST | `/auth/logout` | Bearer token, rate limited |
| GET | `/auth/me` | Bearer token, rate limited |

### Announcements

| Method | Endpoint | Access |
|---|---|---|
| GET | `/announcements` | Public |
| GET | `/announcements/:id` | Public |
| POST | `/announcements` | Bearer token; multipart/form-data |
| PATCH | `/announcements/:id` | Owner only; multipart/form-data |
| DELETE | `/announcements/:id` | Owner only |

`GET /announcements` supports `search`, `sort` (`newest` or `oldest`) and `page`, with 10 results per page. Allowed categories are `sale`, `service`, `job` and `other`.

## Tests

Run the automated tests with:

```bash
npm test
```

The Vitest suite covers bcrypt password hashing and access/refresh JWT generation and verification.

## Environment and secrets

Use `.env.example` as a template. Never commit `.env`, Cloudinary credentials, database credentials or JWT secrets. The `uploads/` directory is only temporary storage and is excluded from version control except for its `.gitkeep` placeholder.
