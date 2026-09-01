# 💸 Expense Tracker

A simple expense tracker built with **Next.js** + **Supabase**, deployed to **Vercel**.

- Add an expense with a **date**, a **category**, and a **title**
- Add multiple **items** (description + amount) and **total them into one record**
- **Category master data** — categories live in their own DB table (`categories`), maintained directly in the database
- The expense **category dropdown** reads from that master; pick an option **or use "＋ Add new category…"** to add a fresh one (saved to the master automatically)
- **Edit** or **delete** any record
- **Bulk delete** — select multiple records and delete them all at once
- Data is stored in **Supabase** (PostgreSQL)

## API Endpoints

- `GET /api/records` — list records (with items)
- `POST /api/records` — create a record with items
- `PUT /api/records/[id]` — update a record (replaces items)
- `DELETE /api/records/[id]` — delete a single record and its items
- `DELETE /api/records` — bulk delete multiple records (body: `{ "ids": [1, 2, 3] }`)
- `GET /api/categories` — list categories from the master table
- `POST /api/categories` — add a new category to the master (used by the "add new" dropdown)

## Local setup

1. Install dependencies:

