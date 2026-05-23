"use client";

import { useState, useEffect } from "react";
import { Wallet, Plus, Zap, TrendingUp, AlertCircle, Edit2, Trash2, Loader2, X } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { supabase } from "@/lib/supabase";

import Link from "next/link";

export default function BudgetPage() {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [category, setCategory] = useState("Food & Dining");
  const [limit, setLimit] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const isMock = typeof window !== 'undefined' && document.cookie.includes("mock-session");
    const userId = user?.id || (isMock ? "test-user-id" : null);
    if (!userId) return setIsLoading(false);

    let bData: any[] = [];
    let tData: any[] = [];

    if (userId === "test-user-id") {
      const cachedBudgets = localStorage.getItem("mock-budgets");
      const cachedTxs = localStorage.getItem("mock-transactions");
      
      tData = cachedTxs ? JSON.parse(cachedTxs).filter((t: any) => t.type === 'expense') : [];

      if (cachedBudgets) {
        bData = JSON.parse(cachedBudgets);
      } else {
        const cachedProfile = localStorage.getItem("mock-profile");
        const salary = cachedProfile ? JSON.parse(cachedProfile).monthly_salary : 125000;
        bData = [
          { id: "mock-b-1", category: "Food & Dining", limit_amount: Math.floor(salary * 0.15), period: 'monthly' },
          { id: "mock-b-2", category: "Transport", limit_amount: Math.floor(salary * 0.10), period: 'monthly' },
          { id: "mock-b-3", category: "Shopping", limit_amount: Math.floor(salary * 0.15), period: 'monthly' },
          { id: "mock-b-4", category: "Utilities", limit_amount: Math.floor(salary * 0.10), period: 'monthly' }
        ];
        localStorage.setItem("mock-budgets", JSON.stringify(bData));
      }
    } else {
      // Fetch Budgets from Supabase
      const { data } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId);
      bData = data || [];

      // If budgets are empty, auto-inject standard 50/30/20 default categories
      if (bData.length === 0) {
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('monthly_salary')
            .eq('id', userId)
            .single();

          const salary = profileData?.monthly_salary || 100000;
          
          const defaultBudgets = [
            { category: "Food & Dining", limit_amount: Math.floor(salary * 0.15), period: 'monthly', user_id: userId },
            { category: "Transport", limit_amount: Math.floor(salary * 0.10), period: 'monthly', user_id: userId },
            { category: "Shopping", limit_amount: Math.floor(salary * 0.15), period: 'monthly', user_id: userId },
            { category: "Utilities", limit_amount: Math.floor(salary * 0.10), period: 'monthly', user_id: userId }
          ];

          const { data: insertedBudgets, error: insertError } = await supabase
            .from('budgets')
            .insert(defaultBudgets)
            .select();

          if (!insertError && insertedBudgets) {
            bData = insertedBudgets;
          }
        } catch (err) {
          console.error("Error auto-injecting default budgets:", err);
        }
      }
      
      const now = new Date();
      const startOfMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('category, amount, type')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .gte('date', startOfMonthStr);
      tData = transactionsData || [];
    }

    setBudgets(bData || []);
    setTransactions(tData || []);
    setIsLoading(false);
  }

  const handleSave = async () => {
    if (!limit || isSaving) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const isMock = typeof window !== 'undefined' && document.cookie.includes("mock-session");
      const userId = user?.id || (isMock ? "test-user-id" : null);
      if (!userId) {
        alert("You must be logged in to save budgets. If you just signed up, please check your email to confirm your account.");
        setIsSaving(false);
        return;
      }

      if (userId === "test-user-id") {
        const newBudget = {
          id: `mock-b-${Date.now()}`,
          category,
          limit_amount: parseFloat(limit),
          period: 'monthly'
        };
        const updated = [...budgets, newBudget];
        setBudgets(updated);
        localStorage.setItem("mock-budgets", JSON.stringify(updated));

        setLimit("");
        setIsSlideOverOpen(false);
        setIsSaving(false);
        return;
      }

      const { data: savedBudget, error } = await supabase
        .from('budgets')
        .insert({
          user_id: userId,
          category,
          limit_amount: parseFloat(limit),
          period: 'monthly'
        })
        .select()
        .single();

      if (error) throw error;
      
      setLimit("");
      setIsSlideOverOpen(false);

      if (savedBudget) {
        setBudgets(prev => [...prev, savedBudget]);
      }
    } catch (e: any) {
      console.error(e);
      alert("Error saving budget: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteBudget = async (id: string) => {
    if (!confirm("Delete this budget?")) return;
    const isMock = typeof window !== 'undefined' && document.cookie.includes("mock-session");
    if (isMock || String(id).startsWith("mock-")) {
      const updated = budgets.filter(b => b.id !== id);
      setBudgets(updated);
      localStorage.setItem("mock-budgets", JSON.stringify(updated));
      return;
    }
    try {
      const { error } = await supabase.from('budgets').delete().eq('id', id);
      if (error) throw error;
      setBudgets(prev => prev.filter(b => b.id !== id));
    } catch (e: any) {
      console.error(e);
      alert("Error deleting budget: " + e.message);
    }
  };

  // Calculate Aggregates
  const totalBudgeted = budgets.reduce((acc, b) => acc + b.limit_amount, 0);
  
  // Map budgets to include spent amounts
  const enrichedBudgets = budgets.map(b => {
    const spent = transactions
      .filter(t => {
        const tCat = (t.category || '').toLowerCase().trim();
        const bCat = (b.category || '').toLowerCase().trim();
        return tCat === bCat || tCat.includes(bCat) || bCat.includes(tCat);
      })
      .reduce((acc, t) => acc + t.amount, 0);
    
    return { ...b, spent, emoji: b.category.includes('Food') ? '🍔' : b.category.includes('Transport') ? '🚗' : b.category.includes('Shopping') ? '🛍️' : b.category.includes('Utilities') ? '🔌' : b.category.includes('Entertainment') ? '🎬' : b.category.includes('Health') ? '🏥' : b.category.includes('Education') ? '📚' : b.category.includes('Investment') ? '📈' : '💡' };
  });

  const totalSpent = enrichedBudgets.reduce((acc, b) => acc + b.spent, 0);
  const remaining = totalBudgeted - totalSpent;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral">Budget Tracker</h1>
          <p className="text-secondary text-sm mt-1">Manage your spending limits for the current month</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/advisor?prompt=Analyze my current monthly budget categories and spending patterns, and provide personalized cost-cutting recommendations." className="secondary-btn flex items-center gap-2 border-accent text-accent bg-accent/5">
            <Zap className="w-4 h-4" /> Smart AI Suggestions
          </Link>
          <button onClick={() => setIsSlideOverOpen(true)} className="primary-btn flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Budget
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
      ) : budgets.length === 0 ? (
        <div className="card-container flex flex-col items-center justify-center p-12 text-center">
           <Wallet className="w-16 h-16 text-muted mb-4" />
           <h3 className="font-bold text-neutral">No budgets set</h3>
           <p className="text-sm text-secondary mt-1">Take control of your spending by creating a budget.</p>
           <button onClick={() => setIsSlideOverOpen(true)} className="primary-btn mt-6">Create First Budget</button>
        </div>
      ) : (
        <>
          {/* Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card-container bg-white p-5">
              <div className="label-text">Total Budgeted</div>
              <div className="text-2xl font-bold tabular-nums-style text-neutral mt-1">{formatCurrency(totalBudgeted, false)}</div>
            </div>
            <div className="card-container bg-white p-5">
              <div className="label-text">Total Tracked Spent</div>
              <div className="text-2xl font-bold tabular-nums-style text-neutral mt-1">{formatCurrency(totalSpent, false)}</div>
            </div>
            <div className="card-container bg-white p-5">
              <div className="label-text">Remaining</div>
              <div className={`text-2xl font-bold tabular-nums-style mt-1 ${remaining < 0 ? 'text-rose-600' : 'text-accent'}`}>{formatCurrency(remaining, false)}</div>
            </div>
            <div className="card-container bg-white p-5">
              <div className="label-text">On Track</div>
              <div className="text-2xl font-bold tabular-nums-style text-emerald-600 mt-1">
                {enrichedBudgets.filter(b => b.spent <= b.limit_amount).length} / {enrichedBudgets.length}
              </div>
            </div>
          </div>

          {/* Budget Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrichedBudgets.map((budget) => {
              const percentage = budget.limit_amount > 0 ? Math.min((budget.spent / budget.limit_amount) * 100, 100) : 0;
              const isOver = budget.spent > budget.limit_amount;
              const statusColor = percentage > 90 ? 'bg-rose-500' : percentage > 75 ? 'bg-amber-500' : 'bg-emerald-500';

              return (
                <div key={budget.id} className="card-container flex flex-col hover:border-accent/30 transition-colors group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl p-2 bg-page rounded-xl">{budget.emoji}</div>
                      <div>
                        <h3 className="font-bold text-neutral">{budget.category}</h3>
                        <p className="text-[10px] text-muted uppercase font-bold tracking-wider">Monthly</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => deleteBudget(budget.id)} className="p-1.5 text-muted hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>

                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <span className={`text-lg font-bold tabular-nums-style ${isOver ? 'text-rose-600' : 'text-neutral'}`}>
                        {formatCurrency(budget.spent, false)}
                      </span>
                      <span className="text-secondary text-sm ml-1">of {formatCurrency(budget.limit_amount, false)}</span>
                    </div>
                    <span className={`text-xs font-bold ${isOver ? 'text-rose-600' : 'text-secondary'}`}>
                      {percentage.toFixed(0)}%
                    </span>
                  </div>

                  <div className="h-2 w-full bg-page rounded-full overflow-hidden mb-6">
                    <div 
                      className={`h-full transition-all duration-500 ${statusColor}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <div className="mt-auto pt-4 border-t border-border flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-secondary">
                      <TrendingUp className="w-3 h-3" />
                      <span>{budget.spent === 0 ? "No expenses yet" : "Tracking"}</span>
                    </div>
                    {isOver && (
                      <div className="flex items-center gap-1 text-rose-600 font-bold">
                        <AlertCircle className="w-3 h-3" /> Overbudget
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Add Budget Slide-over */}
      {isSlideOverOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsSlideOverOpen(false)} />
          <div className="absolute top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col p-8 overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-neutral">Set Budget</h2>
              <button onClick={() => setIsSlideOverOpen(false)} className="text-muted hover:text-neutral"><X className="w-6 h-6" /></button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="label-text">Monthly Limit (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted">₹</span>
                  <input type="number" className="input-field pl-10 text-3xl font-bold" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="0" />
                </div>
              </div>

              <div>
                <label className="label-text">Category</label>
                <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
                   {['Food & Dining', 'Shopping', 'Transport', 'Utilities', 'Entertainment', 'Health', 'Education', 'Investment', 'Other'].map(cat => (
                     <option key={cat} value={cat}>{cat}</option>
                   ))}
                </select>
                <p className="text-xs text-secondary mt-1">Expenses matching this category will automatically track against this budget.</p>
              </div>

              <div className="pt-4">
                <button 
                  onClick={handleSave} 
                  disabled={isSaving || !limit}
                  className="primary-btn w-full py-4 text-lg flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Budget"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
