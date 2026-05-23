"use client";

import { useState, useEffect } from "react";
import { Target, Plus, TrendingUp, CheckCircle2, Loader2, X, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { supabase } from "@/lib/supabase";

export default function GoalsPage() {
  const [goals, setGoals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [savedAmount, setSavedAmount] = useState("");
  const [deadline, setDeadline] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const isMock = process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && document.cookie.includes("mock-session");
    const userId = user?.id || (isMock ? "test-user-id" : null);
    if (!userId) return setIsLoading(false);

    if (userId === "test-user-id") {
      const cached = localStorage.getItem("mock-goals");
      const defaultGoals = [
        { id: "mock-goal-1", name: "Emergency Fund", target_amount: 500000, saved_amount: 250000, deadline: "2027-12-31", icon: "🛡️" },
        { id: "mock-goal-2", name: "Buy Tesla 🚗", target_amount: 6000000, saved_amount: 1200000, deadline: "2030-06-30", icon: "🚗" }
      ];
      if (!cached) {
        localStorage.setItem("mock-goals", JSON.stringify(defaultGoals));
        setGoals(defaultGoals);
      } else {
        setGoals(JSON.parse(cached));
      }
      setIsLoading(false);
      return;
    }

    const { data } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    
    setGoals(data || []);
    setIsLoading(false);
  }

  const handleSave = async () => {
    if (!name || !targetAmount || isSaving) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const isMock = process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && document.cookie.includes("mock-session");
      const userId = user?.id || (isMock ? "test-user-id" : null);
      if (!userId) {
        alert("You must be logged in to save goals. If you just signed up, please check your email to confirm your account.");
        setIsSaving(false);
        return;
      }

      const icon = name.includes('Car') ? '🚗' : name.includes('Home') ? '🏠' : name.includes('Emergency') ? '🛡️' : '🎯';

      if (userId === "test-user-id") {
        const newGoal = {
          id: `mock-goal-${Date.now()}`,
          name,
          target_amount: parseFloat(targetAmount),
          saved_amount: parseFloat(savedAmount) || 0,
          deadline: deadline || null,
          icon
        };
        const cached = localStorage.getItem("mock-goals");
        const existing = cached ? JSON.parse(cached) : [];
        const updated = [...existing, newGoal];
        localStorage.setItem("mock-goals", JSON.stringify(updated));
        setGoals(updated);

        setName("");
        setTargetAmount("");
        setSavedAmount("");
        setDeadline("");
        setIsSlideOverOpen(false);
        setIsSaving(false);
        return;
      }

      const { data: savedGoal, error } = await supabase
        .from('goals')
        .insert({
          user_id: userId,
          name,
          target_amount: parseFloat(targetAmount),
          saved_amount: parseFloat(savedAmount) || 0,
          deadline: deadline || null,
          icon
        })
        .select()
        .single();

      if (error) throw error;
      
      setName("");
      setTargetAmount("");
      setSavedAmount("");
      setDeadline("");
      setIsSlideOverOpen(false);
      
      if (savedGoal) {
        setGoals(prev => [...prev, savedGoal]);
      }
    } catch (e: any) {
      console.error(e);
      alert("Error saving goal: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteGoal = async (id: string) => {
    if (!confirm("Delete this goal?")) return;
    try {
      const isMock = process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && document.cookie.includes("mock-session");
      if (isMock || String(id).startsWith("mock-")) {
        const cached = localStorage.getItem("mock-goals");
        if (cached) {
          const existing = JSON.parse(cached);
          const updated = existing.filter((g: any) => g.id !== id);
          localStorage.setItem("mock-goals", JSON.stringify(updated));
          setGoals(updated);
        }
        return;
      }
      const { error } = await supabase.from('goals').delete().eq('id', id);
      if (error) throw error;
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch (e: any) {
      console.error(e);
      alert("Error deleting goal: " + e.message);
    }
  };

  const updateGoalProgress = async (id: string, currentSaved: number, target: number) => {
    const inputAmount = prompt(`Enter total saved amount so far (Target: ₹${target.toLocaleString('en-IN')}):`, String(currentSaved));
    if (inputAmount === null) return;
    const parsed = parseFloat(inputAmount);
    if (isNaN(parsed) || parsed < 0) {
      alert("Please enter a valid positive number.");
      return;
    }
    try {
      const isMock = process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && document.cookie.includes("mock-session");
      if (isMock || String(id).startsWith("mock-")) {
        const cached = localStorage.getItem("mock-goals");
        if (cached) {
          const existing = JSON.parse(cached);
          const updated = existing.map((g: any) => g.id === id ? { ...g, saved_amount: parsed } : g);
          localStorage.setItem("mock-goals", JSON.stringify(updated));
          setGoals(updated);
        }
        return;
      }
      const { error } = await supabase
        .from('goals')
        .update({ saved_amount: parsed })
        .eq('id', id);

      if (error) throw error;

      // Update locally
      setGoals(prev => prev.map(g => g.id === id ? { ...g, saved_amount: parsed } : g));
    } catch (e: any) {
      console.error(e);
      alert("Error updating goal progress: " + e.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral">Financial Goals</h1>
          <p className="text-secondary text-sm mt-1">Track your progress towards life milestones</p>
        </div>
        <button onClick={() => setIsSlideOverOpen(true)} className="primary-btn flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create Goal
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
      ) : goals.length === 0 ? (
        <div className="card-container flex flex-col items-center justify-center p-12 text-center">
           <Target className="w-16 h-16 text-muted mb-4" />
           <h3 className="font-bold text-neutral">No goals tracked</h3>
           <p className="text-sm text-secondary mt-1">Set a target to start saving towards it.</p>
           <button onClick={() => setIsSlideOverOpen(true)} className="primary-btn mt-6">Create First Goal</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => {
            const percentage = Math.min((goal.saved_amount / goal.target_amount) * 100, 100);
            const isCompleted = percentage >= 100;
            
            return (
              <div key={goal.id} className="card-container flex flex-col group">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-page rounded-xl flex items-center justify-center text-2xl">
                      {goal.icon || '🎯'}
                    </div>
                    <div>
                      <h3 className="font-bold text-neutral">{goal.name}</h3>
                      <p className="text-xs text-secondary mt-0.5">{goal.deadline ? new Date(goal.deadline).toLocaleDateString() : 'No deadline'}</p>
                    </div>
                  </div>
                  <button onClick={() => deleteGoal(goal.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-muted hover:text-rose-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>

                <div className="flex justify-between items-end mb-2">
                  <div className="text-2xl font-bold tabular-nums-style text-neutral">
                    {formatCurrency(goal.saved_amount, false)}
                  </div>
                  <span className="text-xs font-bold text-secondary">{percentage.toFixed(0)}%</span>
                </div>
                <div className="text-sm text-secondary mb-4">
                  of {formatCurrency(goal.target_amount, false)}
                </div>

                <div className="h-3 w-full bg-page rounded-full overflow-hidden mb-6">
                  <div 
                    className={`h-full transition-all duration-1000 ease-out ${isCompleted ? 'bg-emerald-500' : 'bg-accent'}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <div className="mt-auto border-t border-border pt-4">
                  {isCompleted ? (
                    <div className="flex items-center gap-2 text-emerald-600 text-sm font-bold bg-emerald-50 p-2 rounded-lg justify-center">
                      <CheckCircle2 className="w-4 h-4" /> Goal Achieved!
                    </div>
                  ) : (
                    <button 
                      onClick={() => updateGoalProgress(goal.id, goal.saved_amount, goal.target_amount)}
                      className="w-full flex items-center gap-2 text-accent text-sm font-bold bg-accent/5 p-2 rounded-lg justify-center hover:bg-accent/10 transition-colors"
                    >
                      <TrendingUp className="w-4 h-4" /> Update Progress
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isSlideOverOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsSlideOverOpen(false)} />
          <div className="absolute top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col p-8 overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-neutral">Create New Goal</h2>
              <button onClick={() => setIsSlideOverOpen(false)} className="text-muted hover:text-neutral"><X className="w-6 h-6" /></button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="label-text">Goal Name</label>
                <input type="text" className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dream Car, Emergency Fund" />
              </div>
              <div>
                <label className="label-text">Target Amount (₹)</label>
                <input type="number" className="input-field" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="label-text">Already Saved (₹) (Optional)</label>
                <input type="number" className="input-field" value={savedAmount} onChange={(e) => setSavedAmount(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="label-text">Target Date</label>
                <input type="date" className="input-field" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>

              <div className="pt-4">
                <button onClick={handleSave} disabled={isSaving || !name || !targetAmount} className="primary-btn w-full py-4 text-lg flex items-center justify-center gap-2">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Goal"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
