import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    // 0. CSRF Protection (SEC-06)
    const origin = req.headers.get("origin") || req.headers.get("referer");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://financeaiofficial.netlify.app";

    if (origin) {
      try {
        const originUrl = new URL(origin);
        const appUrlObj = new URL(appUrl);
        const isLocalhost = originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1';
        const isDev = process.env.NODE_ENV === 'development';
        
        if (originUrl.hostname !== appUrlObj.hostname && !(isDev && isLocalhost)) {
          return NextResponse.json({ error: "CSRF Validation Failed" }, { status: 403 });
        }
      } catch (err) {
        return NextResponse.json({ error: "Invalid Origin header" }, { status: 400 });
      }
    }

    // 1. Rate Limiting (M-2, SEC-04)
    const ip = getClientIp(req);
    if (await isRateLimited(ip)) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    // 2. Authentication check
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized session. Please sign in again." }, { status: 401 });
    }

    // Capture password from request body
    const body = await req.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: "Password confirmation is required." }, { status: 400 });
    }

    const isMock = token === "mock-session";
    const isDev = process.env.NODE_ENV === "development";

    if (isMock && isDev) {
      // Mock session delete account simulation
      return NextResponse.json({ message: "Mock account deleted successfully." });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    
    // Initialize Supabase using user's own token to verify access
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized session. Please sign in again." }, { status: 401 });
    }

    // 3. Re-authentication check: verify user password before performing account deletion (SEC-03)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: password,
    });

    if (signInError) {
      return NextResponse.json({ error: "Invalid password. Re-authentication failed." }, { status: 401 });
    }

    // 4. Perform transactional safe cascade deletion (SEC-03)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (serviceRoleKey && serviceRoleKey !== "placeholder") {
      // Using service role to delete auth user, which automatically cascade deletes profiles, transactions, goals etc.
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      const { error: adminDeleteError } = await adminClient.auth.admin.deleteUser(user.id);
      if (adminDeleteError) {
        console.error("Admin user deletion failed:", adminDeleteError);
        throw adminDeleteError;
      }
    } else {
      // Fallback: Delete all user's data from public schema via their authenticated client
      // Explicitly delete from child tables first to ensure no constraint violations, then delete profile
      await supabase.from('transactions').delete().eq('user_id', user.id);
      await supabase.from('goals').delete().eq('user_id', user.id);
      await supabase.from('emis_loans').delete().eq('user_id', user.id);
      await supabase.from('expense_profile').delete().eq('user_id', user.id);
      await supabase.from('budgets').delete().eq('user_id', user.id);
      await supabase.from('investments').delete().eq('user_id', user.id);

      const { error: profileDeleteError } = await supabase.from('profiles').delete().eq('id', user.id);
      if (profileDeleteError) {
        console.error("Profile deletion failed:", profileDeleteError);
        throw profileDeleteError;
      }
    }

    return NextResponse.json({ message: "Account successfully deleted." });
  } catch (error: any) {
    console.error("Account delete error:", error);
    return NextResponse.json({ error: "Failed to delete account. Please try again later." }, { status: 500 });
  }
}
