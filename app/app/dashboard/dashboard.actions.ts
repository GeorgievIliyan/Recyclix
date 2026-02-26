"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type Profile = {
  username: string;
  level: number;
  xp: number;
};

type RecyclingEvent = {
  material: string;
  points: number;
  co2_saved: number;
  created_at: string;
};

export async function getDashboardData(): Promise<{
  profile: Profile | null;
  events: RecyclingEvent[];
  error?: string;
}> {
  try {
    console.log("Getting dashboard data...");

    const cookieStore = await cookies();
    console.log("Cookie store obtained:", !!cookieStore);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {
              console.log("Cookie set error (expected in middleware):", error);
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({ name, value: "", ...options });
            } catch (error) {
              console.log("Cookie remove error:", error);
            }
          },
        },
      },
    );

    console.log("Supabase client created, checking auth...");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("Auth error:", authError);
      return { profile: null, events: [], error: authError.message };
    }

    console.log("User authenticated:", !!user);

    if (!user) {
      console.log("No user found, returning empty data");
      return { profile: null, events: [] };
    }

    console.log("Fetching profile for user:", user.id);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("username, level, xp")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Profile error:", profileError);
      // без грешка ако не съществува профил
      if (profileError.code === "PGRST116") {
        console.log("No profile found for user");
      }
    }

    console.log("Fetching events for user:", user.id);

    const { data: events = [], error: eventsError } = await supabase
      .from("recycling_events")
      .select("material, points, co2_saved, created_at")
      .eq("user_id", user.id);

    if (eventsError) {
      console.error("Events error:", eventsError);
    }

    console.log("Data fetched successfully:", {
      hasProfile: !!profile,
      eventsCount: events?.length || 0,
    });

    return {
      profile: profile ?? null,
      events: events ?? [],
    };
  } catch (error) {
    console.error("Unexpected error in getDashboardData:", error);
    return {
      profile: null,
      events: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
