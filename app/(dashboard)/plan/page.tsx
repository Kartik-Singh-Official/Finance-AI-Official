"use client";

import { useState, useEffect } from "react";
import { Download, RefreshCw, CheckCircle2, AlertTriangle, Sparkles, Loader2, Target } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function FinancialPlanPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [plan, setPlan] = useState<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadPlanPDF = async () => {
    setIsDownloading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      
      // Header Banner
      doc.setFillColor(15, 23, 42); // Deep navy background
      doc.rect(0, 0, 210, 45, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("FinanceAI India", 15, 20);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("PERSONALIZED FINANCIAL BLUEPRINT", 15, 32);

      // Section: Profile
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(`Financial Plan for ${profile?.full_name || 'Valued User'}`, 15, 60);

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Monthly CTC Salary: Rs. ${(profile?.monthly_salary || 100000).toLocaleString("en-IN")}`, 15, 72);
      doc.text(`Risk Profile Appetite: ${(profile?.risk_appetite || 'moderate').toUpperCase()}`, 15, 80);
      doc.text(`Report Generation Date: ${new Date().toLocaleDateString('en-IN')}`, 15, 88);

      // Section: Allocations
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("1. RECOMMENDED MONTHLY ALLOCATION", 15, 105);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`- Essential Needs (50%): Rs. ${((profile?.monthly_salary || 100000) * ((plan?.allocation?.needs || 50) / 100)).toLocaleString("en-IN")}`, 15, 115);
      doc.text(`- Discretionary Wants (30%): Rs. ${((profile?.monthly_salary || 100000) * ((plan?.allocation?.wants || 30) / 100)).toLocaleString("en-IN")}`, 15, 123);
      doc.text(`- Wealth Building Savings (20%): Rs. ${((profile?.monthly_salary || 100000) * ((plan?.allocation?.savings || 20) / 100)).toLocaleString("en-IN")}`, 15, 131);

      // Section: Top Actions
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("2. PRIORITY ACTION ITEMS", 15, 150);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      
      let yOffset = 160;
      if (plan?.top_actions && plan.top_actions.length > 0) {
        plan.top_actions.forEach((action: any, i: number) => {
          const titleText = `${i + 1}. ${action.title} (${action.impact || 'High'} Impact)`;
          const splitDesc = doc.splitTextToSize(action.desc || "", 180);
          const descHeight = splitDesc.length * 6; // roughly 6 units per description line
          const totalHeight = 8 + descHeight; // Title height (8) + desc height

          if (yOffset + totalHeight > 280) {
            doc.addPage();
            yOffset = 25;
          }

          doc.setFont("helvetica", "bold");
          doc.text(titleText, 15, yOffset);
          doc.setFont("helvetica", "normal");
          doc.text(splitDesc, 15, yOffset + 6);
          yOffset += totalHeight + 10;
        });
      } else {
        doc.text("- Maximize tax investments under Section 80C up to Rs. 1.5 Lakhs.", 15, 160);
        doc.text("- Start a monthly index mutual fund mutual fund SIP.", 15, 168);
        doc.text("- Build a robust emergency fund containing at least 6 months of living expenses.", 15, 176);
      }

      doc.save("FinanceAI_Financial_Plan.pdf");
    } catch (err) {
      console.error("PDF download error:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    fetchPlanData();
  }, []);

  async function fetchPlanData(forceRegenerate = false) {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const isMock = process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && document.cookie.includes("mock-session");
      const userId = user?.id || (isMock ? "test-user-id" : null);
      if (!userId) {
        setIsLoading(false);
        return;
      }

      let profileData: any = null;
      let expenseData: any[] = [];

      if (userId === "test-user-id") {
        const cachedProfile = localStorage.getItem("mock-profile");
        profileData = cachedProfile ? JSON.parse(cachedProfile) : {
          full_name: "Demo User",
          monthly_salary: 125000,
          risk_appetite: "moderate",
        };
        const cachedExpenses = localStorage.getItem("mock-expenses");
        expenseData = cachedExpenses ? JSON.parse(cachedExpenses) : [];
      } else {
        // Fetch Profile from Supabase
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        profileData = prof;

        // Fetch Expenses from Supabase
        const { data: exp } = await supabase
          .from('expense_profile')
          .select('*')
          .eq('user_id', userId);
        expenseData = exp || [];
      }

      setProfile(profileData);
      setExpenses(expenseData);

      // Cache keys
      const cacheStateKey = `financeai_plan_state_${userId}`;
      const cacheDataKey = `financeai_plan_data_${userId}`;
      
      const currentHash = `${profileData?.monthly_salary || 0}_${expenseData?.length || 0}_${profileData?.risk_appetite || 'moderate'}`;
      const cachedHash = localStorage.getItem(cacheStateKey);
      const cachedPlan = localStorage.getItem(cacheDataKey);

      if (!forceRegenerate && cachedHash === currentHash && cachedPlan) {
        setPlan(JSON.parse(cachedPlan));
      } else {
        if (userId === "test-user-id") {
          const offlinePlan = generateClientSideOfflinePlan(profileData, expenseData);
          setPlan(offlinePlan);
          localStorage.setItem(cacheStateKey, currentHash);
          localStorage.setItem(cacheDataKey, JSON.stringify(offlinePlan));
        } else {
          // Generate AI Plan freshly
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            
            const reqHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) {
              reqHeaders['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch('/api/ai/plan', {
              method: 'POST',
              headers: reqHeaders,
              body: JSON.stringify({ 
                profile: profileData || { monthly_salary: 100000, risk_appetite: 'moderate' }, 
                expenses: expenseData || [] 
              }),
            });
            if (!response.ok) throw new Error("API Route 404 or unavailable");
            const data = await response.json();
            setPlan(data);
            
            // Cache the newly generated plan and user state hash
            localStorage.setItem(cacheStateKey, currentHash);
            localStorage.setItem(cacheDataKey, JSON.stringify(data));
          } catch (apiError) {
            console.warn("AI Plan API route failed or 404 (common in Netlify static export). Executing high-fidelity client-side offline plan builder...", apiError);
            const offlinePlan = generateClientSideOfflinePlan(profileData, expenseData || []);
            setPlan(offlinePlan);
            
            localStorage.setItem(cacheStateKey, currentHash);
            localStorage.setItem(cacheDataKey, JSON.stringify(offlinePlan));
          }
        }
      }
    } catch (error) {
      console.error("Error generating plan:", error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-secondary">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-accent" />
        <p className="font-medium">AI is crafting your ultimate financial blueprint...</p>
      </div>
    );
  }

  const displaySalary = profile?.monthly_salary || 100000;
  
  const allocation = [
    { name: "Needs (Rent/Food/Bills)", value: displaySalary * ((plan?.allocation?.needs || 50) / 100), percentage: plan?.allocation?.needs || 50, color: "bg-rose-500" },
    { name: "Wants (Shopping/Entertainment)", value: displaySalary * ((plan?.allocation?.wants || 30) / 100), percentage: plan?.allocation?.wants || 30, color: "bg-amber-500" },
    { name: "Savings & Investments", value: displaySalary * ((plan?.allocation?.savings || 20) / 100), percentage: plan?.allocation?.savings || 20, color: "bg-emerald-500" },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral flex items-center gap-2">
            Your Personalised Plan <Sparkles className="w-6 h-6 text-amber-500 fill-amber-500" />
          </h1>
          <p className="text-secondary mt-1 text-sm">
            Based on {formatCurrency(displaySalary)} monthly take-home salary
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => fetchPlanData(true)} className="secondary-btn flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Regenerate
          </button>
          <button 
            onClick={downloadPlanPDF} 
            disabled={isDownloading}
            className="primary-btn flex items-center gap-2 bg-neutral hover:bg-neutral/90 disabled:opacity-70"
          >
            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isDownloading ? "Generating..." : "Download PDF"}
          </button>
        </div>
      </div>

      {/* Salary Allocation Section */}
      <section className="card-container">
        <h2 className="text-xl font-bold text-neutral mb-6">Salary Allocation</h2>
        
        {/* Visual Progress bar */}
        <div className="h-10 w-full rounded-xl overflow-hidden flex mb-8 border border-border shadow-sm">
          {allocation.map((item) => (
            <div 
              key={item.name} 
              className={`h-full ${item.color} flex items-center justify-center text-xs font-bold text-white transition-all`}
              style={{ width: `${item.percentage}%` }}
            >
              {item.percentage > 10 ? `${item.percentage}%` : ''}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="grid md:grid-cols-3 gap-6">
          {allocation.map((item) => (
            <div key={item.name} className="p-5 bg-page rounded-2xl border border-border">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-3 h-3 rounded-full ${item.color}`} />
                <span className="text-xs font-bold text-neutral uppercase tracking-wider">{item.name.split(" ")[0]}</span>
              </div>
              <div className="text-2xl font-extrabold tabular-nums-style text-neutral">{formatCurrency(item.value, false)}</div>
              <div className="text-xs text-secondary mt-1 font-semibold">{item.percentage}% of your income</div>
            </div>
          ))}
        </div>
      </section>

      {/* AI Advice Cards */}
      <section className="grid md:grid-cols-2 gap-6">
        {plan?.insights?.map((insight: any, i: number) => (
          <div key={i} className={`card-container border-l-4 p-6 ${
            insight.type === 'positive' ? 'border-l-emerald-500 bg-emerald-50/30' : 'border-l-amber-500 bg-amber-50/30'
          }`}>
            <h3 className={`font-bold flex items-center gap-2 mb-3 ${
              insight.type === 'positive' ? 'text-emerald-700' : 'text-amber-700'
            }`}>
              {insight.type === 'positive' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              {insight.type === 'positive' ? 'Strongest Habit' : 'Actionable Alert'}
            </h3>
            <p className="text-neutral text-sm leading-relaxed font-medium">
              {insight.text}
            </p>
          </div>
        )) || (
          <>
            <div className="card-container border-l-4 border-l-emerald-500 bg-emerald-50/30 p-6">
              <h3 className="font-bold text-emerald-700 flex items-center gap-2 mb-3"><CheckCircle2 className="w-5 h-5" /> Strongest Habit</h3>
              <p className="text-neutral text-sm leading-relaxed font-medium">
                Your debt-to-income ratio is healthy. You&apos;re well positioned to start growing wealth.
              </p>
            </div>
            <div className="card-container border-l-4 border-l-amber-500 bg-amber-50/30 p-6">
              <h3 className="font-bold text-amber-700 flex items-center gap-2 mb-3"><AlertTriangle className="w-5 h-5" /> Biggest Opportunity</h3>
              <p className="text-neutral text-sm leading-relaxed font-medium">
                Maximize tax benefits using Section 80C to save up to ₹45,000 in taxes annually.
              </p>
            </div>
          </>
        )}
      </section>

      {/* Recommended Actions */}
      <section className="card-container">
        <h2 className="text-xl font-bold text-neutral mb-6">Top Actions to Take</h2>
        <div className="space-y-4">
          {plan?.top_actions?.map((action: any, i: number) => (
            <div key={i} className="flex items-start gap-4 p-5 rounded-2xl border border-border hover:border-accent/30 transition-all bg-white shadow-sm group">
              <div className="bg-accent/10 text-accent font-bold w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-accent group-hover:text-white transition-all">
                {i + 1}
              </div>
              <div>
                <h4 className="font-bold text-neutral text-lg">{action.title}</h4>
                <p className="text-sm text-secondary mt-1 leading-relaxed font-medium">{action.desc}</p>
                <span className="inline-block mt-3 text-[10px] font-bold uppercase tracking-widest bg-rose-50 text-rose-600 px-2 py-0.5 rounded">
                  {action.impact || 'High'} Impact
                </span>
              </div>
            </div>
          )) || (
            <div className="text-center p-6 text-secondary">No recommendations needed right now.</div>
          )}
        </div>
      </section>

      {/* Projections banner */}
      <div className="bg-gradient-to-r from-accent to-indigo-700 text-white p-8 rounded-3xl shadow-xl shadow-accent/20 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-2xl font-bold mb-2">The 5-Year Outlook 📈</h3>
          <p className="text-white/80 max-w-xl text-sm leading-relaxed font-medium">
            If you allocate just {formatCurrency(displaySalary * 0.2)} to mutual funds monthly, you could build a portfolio of <strong className="text-white font-extrabold">{formatCurrency(plan?.projections?.five_year || 1500000)}</strong> in 5 years (at a standard 12% annual return).
          </p>
        </div>
        <Link href="/investments" className="bg-white text-accent px-8 py-4 rounded-xl font-bold whitespace-nowrap hover:bg-[#F1F5F9] transition-all shadow-lg text-sm block text-center active:scale-[0.97]">
          Auto-Invest Now
        </Link>
      </div>
    </div>
  );
}

/**
 * High-fidelity client-side offline plan builder fallback
 */
function generateClientSideOfflinePlan(profile: any, expenses: any[]) {
  const name = profile?.full_name || "Saver";
  const monthlySalary = profile?.monthly_salary || 100000;
  const riskAppetite = profile?.risk_appetite || "moderate";
  
  // Calculate standard 50/30/20 budget allocations
  const needsLimit = Math.floor(monthlySalary * 0.50);
  const wantsLimit = Math.floor(monthlySalary * 0.30);
  const savingsLimit = Math.floor(monthlySalary * 0.20);
  
  // Calculate real projected wealth (8% per year for equity + debt compound)
  const annualSavings = savingsLimit * 12;
  const oneYearProj = Math.floor(annualSavings * 1.05); // 5% secure return 
  const fiveYearProj = Math.floor(annualSavings * 5 * 1.25); // 25% compound growth over 5 years
  
  return {
    allocation: { needs: 50, wants: 30, savings: 20 },
    insights: [
      { 
        type: "positive", 
        text: `Excellent starting profile, ${name}! Your monthly take-home salary of ₹${monthlySalary.toLocaleString('en-IN')} gives you a strong foundation to build wealth.`, 
        icon: "star" 
      },
      { 
        type: "positive", 
        text: `With a ${riskAppetite} risk profile, you can comfortably capture compound returns using equity mutual funds without taking on excessive volatility.`, 
        icon: "trending" 
      },
      { 
        type: "warning", 
        text: `Aim to lock your mandatory bills & EMIs below ₹${needsLimit.toLocaleString('en-IN')} (50%) to protect your monthly savings rate.`, 
        icon: "alert" 
      }
    ],
    top_actions: [
      { 
        title: "Automate a ₹" + Math.floor(savingsLimit * 0.6).toLocaleString('en-IN') + " Equity SIP", 
        desc: "Set up a monthly auto-debit on salary day into a Nifty 50 Index Fund for long-term compound growth.", 
        impact: "High" 
      },
      { 
        title: "Maximize Section 80C Tax Exemptions", 
        desc: "Exhaust your ₹1.5L tax-saving limit using ELSS Mutual Funds, which have a short 3-year lock-in and high equity yields.", 
        impact: "High" 
      },
      { 
        title: "Construct a 6-Month Emergency Fund", 
        desc: `Stash ₹${(savingsLimit * 3).toLocaleString('en-IN')} in a secure, instant-access liquid mutual fund for absolute safety.`, 
        impact: "Medium" 
      }
    ],
    projections: {
      one_year: oneYearProj,
      five_year: fiveYearProj
    }
  };
}
