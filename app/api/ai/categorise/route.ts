import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isRateLimited, getClientIp } from "@/lib/rateLimit";
import { normalizeCategory } from "@/lib/categories";

let _genAI: GoogleGenerativeAI | null = null;
function getGenAI() {
  if (!_genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not configured");
    _genAI = new GoogleGenerativeAI(key);
  }
  return _genAI;
}

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

    // 2. Authentication check (C-4)
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Allow mock-session only in development
    const isMock = token === "mock-session";
    const isDev = process.env.NODE_ENV === "development";
    let user: any = null;

    if (isMock && isDev) {
      user = { id: "test-user-id" };
    } else {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
      if (error || !supabaseUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      user = supabaseUser;
    }

    // 3. Input validation & sanitization (H-2)
    const body = await req.json();
    const note = body.note || "";
    
    // Sanitize: strip control characters, limit length
    const cleanNote = String(note)
      .replace(/[\x00-\x1F\x7F]/g, "")
      .trim()
      .substring(0, 100);

    const cleanNoteLower = cleanNote.toLowerCase();

    // High-fidelity offline classification dictionary
    if (cleanNoteLower.includes("zomato") || cleanNoteLower.includes("swiggy") || cleanNoteLower.includes("food") || cleanNoteLower.includes("dining") || cleanNoteLower.includes("restaurant") || cleanNoteLower.includes("cafe") || cleanNoteLower.includes("tea") || cleanNoteLower.includes("coffee") || cleanNoteLower.includes("starbucks") || cleanNoteLower.includes("biryani") || cleanNoteLower.includes("maggi")) {
      return NextResponse.json({ category: "Food & Dining" });
    }
    if (cleanNoteLower.includes("uber") || cleanNoteLower.includes("ola") || cleanNoteLower.includes("metro") || cleanNoteLower.includes("auto") || cleanNoteLower.includes("taxi") || cleanNoteLower.includes("petrol") || cleanNoteLower.includes("diesel") || cleanNoteLower.includes("fuel") || cleanNoteLower.includes("cng") || cleanNoteLower.includes("rapido")) {
      return NextResponse.json({ category: "Transport" });
    }
    if (cleanNoteLower.includes("amazon") || cleanNoteLower.includes("flipkart") || cleanNoteLower.includes("myntra") || cleanNoteLower.includes("shopp") || cleanNoteLower.includes("clothing") || cleanNoteLower.includes("grocer") || cleanNoteLower.includes("blinkit") || cleanNoteLower.includes("instamart") || cleanNoteLower.includes("zepto") || cleanNoteLower.includes("shoes") || cleanNoteLower.includes("watch")) {
      return NextResponse.json({ category: "Shopping" });
    }
    if (cleanNoteLower.includes("electric") || cleanNoteLower.includes("power") || cleanNoteLower.includes("water") || cleanNoteLower.includes("wifi") || cleanNoteLower.includes("broadband") || cleanNoteLower.includes("recharge") || cleanNoteLower.includes("jio") || cleanNoteLower.includes("airtel") || cleanNoteLower.includes("gas") || cleanNoteLower.includes("indane") || cleanNoteLower.includes("bill")) {
      return NextResponse.json({ category: "Utilities" });
    }
    if (cleanNoteLower.includes("netflix") || cleanNoteLower.includes("prime") || cleanNoteLower.includes("hotstar") || cleanNoteLower.includes("movie") || cleanNoteLower.includes("cinema") || cleanNoteLower.includes("concert") || cleanNoteLower.includes("game") || cleanNoteLower.includes("booking") || cleanNoteLower.includes("bookmyshow") || cleanNoteLower.includes("spotify")) {
      return NextResponse.json({ category: "Entertainment" });
    }
    if (cleanNoteLower.includes("doctor") || cleanNoteLower.includes("hospital") || cleanNoteLower.includes("medicine") || cleanNoteLower.includes("pharmacy") || cleanNoteLower.includes("apollo") || cleanNoteLower.includes("dental") || cleanNoteLower.includes("clinic") || cleanNoteLower.includes("health") || cleanNoteLower.includes("insurance")) {
      return NextResponse.json({ category: "Health" });
    }
    if (cleanNoteLower.includes("fee") || cleanNoteLower.includes("school") || cleanNoteLower.includes("college") || cleanNoteLower.includes("book") || cleanNoteLower.includes("course") || cleanNoteLower.includes("udemy" ) || cleanNoteLower.includes("coursera") || cleanNoteLower.includes("coaching") || cleanNoteLower.includes("tutor")) {
      return NextResponse.json({ category: "Education" });
    }
    if (cleanNoteLower.includes("sip") || cleanNoteLower.includes("mutual") || cleanNoteLower.includes("stock") || cleanNoteLower.includes("groww") || cleanNoteLower.includes("zerodha") || cleanNoteLower.includes("invest") || cleanNoteLower.includes("nps") || cleanNoteLower.includes("ppf") || cleanNoteLower.includes("fd") || cleanNoteLower.includes("share")) {
      return NextResponse.json({ category: "Investment" });
    }
    if (cleanNoteLower.includes("salary") || cleanNoteLower.includes("bonus") || cleanNoteLower.includes("dividend") || cleanNoteLower.includes("interest") || cleanNoteLower.includes("cashback") || cleanNoteLower.includes("refund") || cleanNoteLower.includes("income")) {
      return NextResponse.json({ category: "Income" });
    }

    const isApiKeyMissing = !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "placeholder" || process.env.GEMINI_API_KEY === "";

    if (isApiKeyMissing) {
      return NextResponse.json({ category: "Other" });
    }

    try {
      // 4. Input injection defense: Use system instructions + separate inputs (H-2)
      // 5. Structure outputs reliably: Use JSON output (M-7)
      const model = getGenAI().getGenerativeModel({ 
        model: "gemini-2.5-flash",
        systemInstruction: "You are a specialized financial transaction classifier for Indian personal finance. Categorize transaction notes into one of the designated categories and output ONLY JSON in this structure: {\"category\": \"<Category>\"}",
        generationConfig: {
          responseMimeType: "application/json"
        }
      });

      const prompt = `
        Classify this transaction:
        Note: "${cleanNote}"
        
        Allowed Categories:
        Food & Dining, Transport, Utilities, Shopping, Entertainment, Health, Education, Investment, Income, Other.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text().trim();

      const parsed = JSON.parse(responseText);
      const category = normalizeCategory(parsed.category || "Other");

      return NextResponse.json({ category });
    } catch (apiError) {
      console.error("Gemini categorise API failed, falling back to Other:", apiError);
      return NextResponse.json({ category: "Other" });
    }
  } catch (error) {
    return NextResponse.json({ category: "Other" });
  }
}
