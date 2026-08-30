# 💸 Expense Tracker

A simple expense tracker built with **Next.js** + **Supabase**, deployed to **Vercel**.

- Add an expense with a **date**
- Add multiple **items** (description + amount) and **total them into one record**
- **Edit** or **delete** any record
- Data is stored in **Supabase** (PostgreSQL)

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up Supabase:
   - Create a project at https://supabase.com
   - Open the **SQL Editor** and run the script in `supabase-schema.sql`
   - Copy your project URL, anon key, and service role key
     (Settings → API)

3. Create a `.env.local` file:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
   > Note: the service role key bypasses RLS and is **server-side only**.
   > Please make sure it is only present in server env vars (not exposed to the client).

4. Run it:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000

## Deploy to Vercel

1. Push this project to a Git repository (GitHub / GitLab / Bitbucket).
2. Go to https://vercel.com → **New Project** → import the repo.
3. In the **Environment Variables** screen, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Click **Deploy**. Vercel builds and hosts it for you.

## API

- `GET /api/records` — list records (with items)
- `POST /api/records` — create a record with items
- `PUT /api/records/[id]` — update a record (replaces items)
- `DELETE /api/records/[id]` — delete a record and its items
