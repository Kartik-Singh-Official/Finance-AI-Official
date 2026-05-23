"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TrendingUp, IndianRupee, Target, Activity, AlertCircle, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from "@/lib/supabase";

import AnimatedCounter from "@/components/AnimatedCounter";

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#F43F5E'];

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const isMock = process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && document.cookie.includes("mock-session");
      const userId = user?.id || (isMock ? "test-user-id" : null);
      if (!userId) {
        setIsLoading(false);
        return;
      }

      if (userId === "test-user-id") {
        const cachedProfile = localStorage.getItem("mock-profile");
        if (cachedProfile) {
          setProfile(JSON.parse(cachedProfile));
        } else {
          setProfile({
            full_name: "Demo User",
            age: 30,
            city: "Mumbai",
            occupation: "Salaried",
            monthly_salary: 125000,
            annual_ctc: 1500000,
            other_income: 0,
            risk_appetite: "moderate",
          });
        }

        const cachedTx = localStorage.getItem("mock-transactions");
        if (cachedTx) {
          setTransactions(JSON.parse(cachedTx).slice(0, 5));
        } else {
          const defaultTxs = [
            { id: "mock-tx-1", date: "Today", type: "expense", category: "Food & Dining", note: "Swiggy Delivery", amount: 649, payment_method: "UPI" },
            { id: "mock-tx-2", date: "Yesterday", type: "income", category: "Salary", note: "Salary Credit", amount: 125000, payment_method: "Bank Transfer" },
            { id: "mock-tx-3", date: "14 May", type: "expense", category: "Shopping", note: "Grocery at DMart", amount: 4500, payment_method: "Credit Card" },
          ];
          localStorage.setItem("mock-transactions", JSON.stringify(defaultTxs));
          setTransactions(defaultTxs);
        }

        setInsights([
          {
            title: "Watch your dining",
            content: "Your food spending is up by 15% this month. Try to cut back on Zomato/Swiggy.",
          }
        ]);
        setIsLoading(false);
        return;
      }

      // Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      setProfile(profileData);

      // Fetch Recent Transactions
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(5);
      setTransactions(txData || []);

      // Fetch AI Insights (table may not exist for all users, so handle gracefully)
      try {
        const { data: insightData } = await supabase
          .from('ai_insights')
          .select('*')
          .eq('user_id', userId)
          .limit(1);
        setInsights(insightData || []);
      } catch {
        // Table may not exist yet — fail silently
        setInsights([]);
      }

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-secondary">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-accent" />
        <p className="font-medium">Calculating your wealth...</p>
      </div>
    );
  }

  // Fallback to mock data for display if empty
  const displayProfile = profile || { monthly_salary: 125000, savings_target_pct: 20 };
  const displayTransactions = transactions.length > 0 ? transactions : [
    { id: 1, note: "Netflix", category: "Entertainment", amount: 649, type: "expense", date: "Today", icon: "🎬" },
    { id: 2, note: "Salary", category: "Income", amount: 125000, type: "income", date: "Yesterday", icon: "💼" },
    { id: 3, note: "Dmart", category: "Food", amount: 4500, type: "expense", date: "14 May", icon: "🛒" },
  ];
  
  const chartData = [
    { name: 'Mar', income: 150000, expense: 88000 },
    { name: 'Apr', income: 125000, expense: 95000 },
    { name: 'May', income: displayProfile.monthly_salary, expense: transactions.filter(t => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0) || 45000 },
  ];

  // Dynamically calculate Health Score based on live financial ratios
  const monthlyExpenses = transactions.filter(t => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0);
  const surplus = displayProfile.monthly_salary - monthlyExpenses;
  const savingsRate = displayProfile.monthly_salary > 0 ? (surplus / displayProfile.monthly_salary) * 100 : 0;
  
  let calculatedScore = 60; // base score
  if (savingsRate >= 20) {
    calculatedScore += 25;
  } else if (savingsRate > 0) {
    calculatedScore += Math.floor(savingsRate);
  } else {
    calculatedScore -= 15; // penalty for overspending
  }
  
  // Cap score between 30 and 100
  const finalHealthScore = Math.max(30, Math.min(100, calculatedScore));
  const healthRating = finalHealthScore >= 80 ? "Excellent" : finalHealthScore >= 60 ? "Good" : "Needs Review";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-neutral">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-container p-5 hover:-translate-y-1 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl group-hover:scale-150 transition-all duration-500" />
          <div className="label-text">Monthly Salary</div>
          <div className="text-3xl font-bold tabular-nums-style text-neutral my-2">
            <AnimatedCounter value={displayProfile.monthly_salary} />
          </div>
          <div className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full">
            <TrendingUp className="w-3 h-3" /> Credited
          </div>
        </div>
        <div className="card-container p-5 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:scale-150 transition-all duration-500" />
          <div className="label-text">Monthly Surplus</div>
          <div className={`text-3xl font-bold tabular-nums-style my-2 ${surplus >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            <AnimatedCounter value={surplus} />
          </div>
          <div className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${surplus >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            <TrendingUp className="w-3 h-3" /> {surplus >= 0 ? 'On track' : 'Overspending'}
          </div>
        </div>
        <div className="card-container p-5 hover:-translate-y-1 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:scale-150 transition-all duration-500" />
          <div className="label-text">Savings Target</div>
          <div className="text-3xl font-bold tabular-nums-style text-neutral my-2">
            <AnimatedCounter value={displayProfile.savings_target_pct} isCurrency={false} />%
          </div>
          <div className="inline-flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-600 px-2 py-1 rounded-full">
            <Target className="w-3 h-3" /> Rule: 50/30/20
          </div>
        </div>
        <div className="card-container p-5 hover:-translate-y-1 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl group-hover:scale-150 transition-all duration-500" />
          <div className="label-text">Health Score</div>
          <div className="text-3xl font-bold tabular-nums-style text-neutral my-2 flex items-baseline gap-2">
            <AnimatedCounter value={finalHealthScore} isCurrency={false} /> <span className="text-sm text-secondary font-normal">/ 100</span>
          </div>
          <div className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${finalHealthScore >= 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            <Activity className="w-3 h-3" /> {healthRating}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-container">
          <h3 className="font-semibold text-neutral mb-6">Income vs Expense</h3>
          <div className="h-72 w-full">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} tickFormatter={(v) => `₹${v/1000}k`} />
                  <Tooltip 
                    cursor={{fill: '#f1f5f9'}}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    formatter={(value: any, name: any) => [formatCurrency(Number(value), false), name === 'income' ? 'Income' : 'Expense']}
                  />
                  <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="space-y-6">
          <div className="card-container bg-slate-900 text-white border-none shadow-xl">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center">
                <AlertCircle className="text-accent w-6 h-6" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted font-bold">AI Insight</span>
            </div>
            <h3 className="font-bold mb-2">{insights[0]?.title || "Watch your dining"}</h3>
            <p className="text-sm text-secondary mb-4">{insights[0]?.content || "Your food spending is up by 15% this month. Try to cut back on Zomato/Swiggy."}</p>
            <button className="text-accent text-sm font-medium hover:text-white transition-colors">Get Fresh Insight →</button>
          </div>

          <div className="card-container p-5 text-center">
             <h3 className="font-semibold text-neutral mb-2">Portfolio Mix</h3>
             <div className="text-xs text-secondary">Balanced allocation</div>
             <div className="mt-4 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full border-8 border-accent border-t-emerald-500 border-r-amber-400" />
             </div>
          </div>
        </div>
      </div>

      <div className="card-container">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-neutral">Recent Transactions</h3>
          <Link href="/transactions" className="text-accent text-sm font-medium hover:underline">View All</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted uppercase bg-input rounded-t-lg">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg">Transaction</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right rounded-tr-lg">Amount</th>
              </tr>
            </thead>
            <tbody>
              {displayTransactions.map((tx: any, i: number) => (
                <tr key={tx.id || i} className="border-b border-border last:border-none">
                  <td className="px-4 py-3 font-medium text-neutral flex items-center gap-3">
                    <span className="text-xl bg-input w-10 h-10 flex items-center justify-center rounded-xl">{tx.icon || '💸'}</span>
                    {tx.note || tx.merchant}
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-page px-2 py-1 rounded-md text-secondary text-xs uppercase font-bold tracking-wider">{tx.category}</span>
                  </td>
                  <td className="px-4 py-3 text-secondary">
                    {(() => {
                      if (tx.date === "Today") return "Today";
                      if (tx.date === "Yesterday") return "Yesterday";
                      const parsed = Date.parse(tx.date);
                      if (isNaN(parsed)) return tx.date || "Today";
                      return new Date(parsed).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                    })()}
                  </td>
                  <td className={`px-4 py-3 text-right font-bold tabular-nums-style ${tx.type === 'income' ? 'text-emerald-600' : 'text-neutral'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
