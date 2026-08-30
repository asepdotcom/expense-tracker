import { createClient } from "@supabase/supabase-js";

// Server-side admin client using the service role key.
// The client is created lazily so builds don't require env vars to be present.
// Never expose this client to the browser; only use in API route handlers.
let _admin = null;

export function getSupabaseAdmin() {
  if (!_admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      throw new Error(
        "Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
      );
    }

    _admin = createClient(url, serviceKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${serviceKey}` } },
    });
  }
  return _admin;
}
