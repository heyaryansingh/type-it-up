/**
 * @fileoverview Server-side Supabase client with SSR cookie handling.
 * @module lib/supabase
 */

import { createServerClient, type SupabaseClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates an authenticated Supabase client for server-side operations.
 * Uses Next.js cookies() API for session persistence.
 *
 * @returns Promise resolving to configured Supabase client
 * @throws {Error} If required environment variables are missing
 * @example
 * ```ts
 * const supabase = await createClient();
 * const { data } = await supabase.from('users').select();
 * ```
 */
export async function createClient(): Promise<SupabaseClient> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in environment variables."
    );
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch (error) {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
          console.warn(
            "Cookie update failed (expected in Server Components):",
            error instanceof Error ? error.message : "Unknown error"
          );
        }
      },
    },
  });
}
