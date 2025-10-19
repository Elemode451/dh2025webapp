# Next.js Authentication App

A Next.js application with email/password authentication using NextAuth v5 (Auth.js) and Vercel Postgres.

## Features

- Next.js 15 with App Router
- TypeScript
- Tailwind CSS
- NextAuth v5 (Auth.js) for authentication
- JWT-based sessions
- Vercel Postgres for database
- Bcrypt for password hashing
- Protected routes with middleware
- Login and signup pages
- User dashboard

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Prisma Database

1. Get your Prisma database connection URL (you already have one configured)
2. Your `.env.local` should have `DATABASE_URL` set

### 3. Configure Environment Variables

Your `.env.local` should look like this:

```env
# Database - Prisma connection URL
DATABASE_URL="your-database-url"

# NextAuth
NEXTAUTH_SECRET="A7b/tmeW85J61CjGEfZrpVO5aCaL7/KVLju/Uh/jU14="
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Push Database Schema

Use Prisma to sync your database schema:

```bash
npx dotenv -e .env.local -- prisma db push
```

This will create the `users` table in your database.

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
app/
├── api/
│   ├── auth/[...nextauth]/    # NextAuth API route
│   │   └── route.ts
│   └── signup/                # Signup endpoint
│       └── route.ts
├── dashboard/                  # Protected dashboard page
│   └── page.tsx
├── login/                      # Login page
│   └── page.tsx
├── signup/                     # Signup page
│   └── page.tsx
└── page.tsx                    # Home page

auth.ts                         # NextAuth configuration
auth.config.ts                  # NextAuth config (for middleware)
middleware.ts                   # Route protection middleware
schema.sql                      # Database schema
```

## How Authentication Works

1. **Signup**: User creates account via `/signup`, password is hashed with bcrypt and stored in Postgres
2. **Login**: User logs in via `/login`, credentials are verified against database
3. **Session**: JWT token is created and stored in httpOnly cookie
4. **Protected Routes**: Middleware checks JWT on each request to `/dashboard/*`
5. **Logout**: Session token is cleared

## Protected Routes

Any route under `/dashboard` is automatically protected by the middleware. Unauthenticated users are redirected to `/login`.

To protect additional routes, update the matcher in `middleware.ts`.

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Vercel will auto-detect Next.js
4. Add your environment variables in Vercel project settings
5. Deploy

**Important**: Update `NEXTAUTH_URL` to your production URL in Vercel environment variables.

## API Routes

### POST `/api/signup`

Create a new user account.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe" // optional
}
```

### POST `/api/auth/signin`

Handled by NextAuth - use the `signIn()` function from `next-auth/react`.

### POST `/api/auth/signout`

Handled by NextAuth - use the `signOut()` function from `next-auth/react`.

## Security Features

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens stored in httpOnly cookies
- Email validation with Zod
- Password minimum length: 6 characters
- Protected routes with middleware
- CSRF protection via NextAuth

## Tech Stack

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth v5 (Auth.js)
- **Database**: Prisma ORM with PostgreSQL
- **Password Hashing**: bcryptjs
- **Validation**: Zod

## License

MIT
