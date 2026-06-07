import { config } from "dotenv";
config({ path: ".env" });

export const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function functionsUrl(name: string) {
  return `${SUPABASE_URL}/functions/v1/${name}`;
}

export function authHeaders(key?: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key || SUPABASE_ANON_KEY}`,
  };
}
