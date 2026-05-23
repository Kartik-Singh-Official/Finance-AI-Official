import { GoogleGenerativeAI } from '@google/generative-ai';
import { CATEGORIES, normalizeCategory } from './categories';

// Lazy initialization pattern to prevent build-time crashes or eager fallback issues
let _genAI: GoogleGenerativeAI | null = null;
function getGenAI() {
  if (!_genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not configured");
    _genAI = new GoogleGenerativeAI(key);
  }
  return _genAI;
}

const modelName = 'gemini-2.5-flash';

export async function categoriseTransaction(note: string, amount: number, type: string): Promise<string> {
  // Input injection sanitization (H-2)
  const cleanNote = String(note).replace(/[\x00-\x1F\x7F]/g, "").trim().substring(0, 100);

  const systemInstruction = `
    You are a professional transaction categorizer for FinanceAI India.
    Categorize the provided transaction into one of these exact allowed categories:
    ${CATEGORIES.join(", ")}
    Return ONLY JSON matching this structure: {"category": "<exact_category_name>"}
  `;

  const model = getGenAI().getGenerativeModel({ 
    model: modelName,
    systemInstruction,
    generationConfig: {
      responseMimeType: "application/json"
    }
  });

  const prompt = `
    Transaction Details:
    Note/Merchant: "${cleanNote}"
    Amount: ₹${amount}
    Type: ${type}
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const parsed = JSON.parse(text);
    return normalizeCategory(parsed.category || "Other");
  } catch (error) {
    console.error("Gemini categoriseTransaction error:", error);
    return 'Other';
  }
}

export async function generateFinancialPlan(profile: any, expenses: any[], goals: any[]) {
  // Input injection sanitization (H-2)
  const safeProfile = {
    full_name: String(profile?.full_name || "Saver").substring(0, 100),
    monthly_salary: Number(profile?.monthly_salary) || 100000,
    risk_appetite: String(profile?.risk_appetite || "moderate").substring(0, 50),
    city: String(profile?.city || "India").substring(0, 100)
  };

  const safeExpenses = (expenses || []).map((e: any) => ({
    category: String(e?.category || "").substring(0, 50),
    monthly_amount: Number(e?.monthly_amount) || 0
  })).slice(0, 20);

  const safeGoals = (goals || []).map((g: any) => ({
    name: String(g?.name || "").substring(0, 50),
    target_amount: Number(g?.target_amount) || 0,
    deadline: String(g?.deadline || "").substring(0, 50)
  })).slice(0, 10);

  const systemInstruction = `
    You are a premium Indian Financial Advisor.
    Generate a personalised financial plan for an Indian user based on the 50/30/20 rule, adapted for their specific profile.
    Output ONLY JSON matching this structure:
    {
      "allocation": {
        "needs": number,
        "wants": number,
        "savings": number
      },
      "recommendations": string[],
      "emergencyFundStatus": {
        "recommended": number,
        "current": number,
        "months": number,
        "status": string
      },
      "topActions": string[]
    }
    All values must be relevant to the Indian financial ecosystem. Currencies in INR.
  `;

  const model = getGenAI().getGenerativeModel({ 
    model: modelName,
    systemInstruction,
    generationConfig: {
      responseMimeType: "application/json"
    }
  });

  const prompt = `
    Profile: ${JSON.stringify(safeProfile)}
    Expenses: ${JSON.stringify(safeExpenses)}
    Goals: ${JSON.stringify(safeGoals)}
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini generateFinancialPlan error:", error);
    return null;
  }
}

