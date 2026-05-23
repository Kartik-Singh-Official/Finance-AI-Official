"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Plus, ShieldCheck, Download, Loader2, X, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { supabase } from "@/lib/supabase";

export default function LoansPage() {
  const [loans, setLoans] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [loanName, setLoanName] = useState("");
  const [loanType, setLoanType] = useState("Personal Loan");
  const [outstanding, setOutstanding] = useState("");
  const [emiAmount, setEmiAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");

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
      const cached = localStorage.getItem("mock-loans");
      const defaultLoans = [
        { id: "mock-loan-1", loan_name: "HDFC Car Loan", loan_type: "Car Loan", principal: 800000, outstanding: 650000, emi_amount: 18500, interest_rate: 8.75 }
      ];
      const cachedProfile = localStorage.getItem("mock-profile");
      const prof = cachedProfile ? JSON.parse(cachedProfile) : { monthly_salary: 150000 };

      if (!cached) {
        localStorage.setItem("mock-loans", JSON.stringify(defaultLoans));
        setLoans(defaultLoans);
      } else {
        setLoans(JSON.parse(cached));
      }
      setProfile(prof);
      setIsLoading(false);
      return;
    }

    // Fetch Loans
    const { data: lData } = await supabase
      .from('emis_loans')
      .select('*')
      .eq('user_id', userId);
    
    // Fetch Profile for DTI calculation
    const { data: pData } = await supabase
      .from('profiles')
      .select('monthly_salary')
      .eq('id', userId)
      .single();

    setLoans(lData || []);
    setProfile(pData || { monthly_salary: 100000 });
    setIsLoading(false);
  }

  const handleSave = async () => {
    if (!loanName || !outstanding || !emiAmount || isSaving) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const isMock = process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && document.cookie.includes("mock-session");
      const userId = user?.id || (isMock ? "test-user-id" : null);
      if (!userId) {
        alert("You must be logged in to save liabilities. If you just signed up, please check your email to confirm your account.");
        setIsSaving(false);
        return;
      }

      // Calculate a default end date (e.g., 3 years from today) to satisfy NOT NULL constraints
      const defaultEndDate = new Date();
      defaultEndDate.setFullYear(defaultEndDate.getFullYear() + 3);

      if (userId === "test-user-id") {
        const newLoan = {
          id: `mock-loan-${Date.now()}`,
          loan_name: loanName,
          loan_type: loanType,
          principal: parseFloat(outstanding),
          outstanding: parseFloat(outstanding),
          emi_amount: parseFloat(emiAmount),
          interest_rate: parseFloat(interestRate) || 0,
        };
        const cached = localStorage.getItem("mock-loans");
        const existing = cached ? JSON.parse(cached) : [];
        const updated = [...existing, newLoan];
        localStorage.setItem("mock-loans", JSON.stringify(updated));
        setLoans(updated);

        setLoanName("");
        setOutstanding("");
        setEmiAmount("");
        setInterestRate("");
        setIsSlideOverOpen(false);
        setIsSaving(false);
        return;
      }

      const { data: savedLoan, error } = await supabase
        .from('emis_loans')
        .insert({
          user_id: userId,
          loan_name: loanName,
          loan_type: loanType,
          principal: parseFloat(outstanding),
          outstanding: parseFloat(outstanding),
          emi_amount: parseFloat(emiAmount),
          interest_rate: parseFloat(interestRate) || 0,
          start_date: new Date().toISOString().split('T')[0],
          end_date: defaultEndDate.toISOString().split('T')[0]
        })
        .select()
        .single();

      if (error) throw error;
      
      setLoanName("");
      setOutstanding("");
      setEmiAmount("");
      setInterestRate("");
      setIsSlideOverOpen(false);
      
      if (savedLoan) {
        setLoans(prev => [...prev, savedLoan]);
      }
    } catch (e: any) {
      console.error(e);
      alert("Error saving loan: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteLoan = async (id: string) => {
    if (!confirm("Delete this loan record?")) return;
    try {
      const isMock = process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && document.cookie.includes("mock-session");
      if (isMock || String(id).startsWith("mock-")) {
        const cached = localStorage.getItem("mock-loans");
        if (cached) {
          const existing = JSON.parse(cached);
          const updated = existing.filter((l: any) => l.id !== id);
          localStorage.setItem("mock-loans", JSON.stringify(updated));
          setLoans(updated);
        }
        return;
      }
      const { error } = await supabase.from('emis_loans').delete().eq('id', id);
      if (error) throw error;
      setLoans(prev => prev.filter(l => l.id !== id));
    } catch (e: any) {
      console.error(e);
      alert("Error deleting loan: " + e.message);
    }
  };

  const handleDownloadPlan = () => {
    if (loans.length === 0) {
      alert("No active loans to download.");
      return;
    }

    const headers = ["Loan Name", "Type", "Outstanding Amount", "EMI Amount", "Interest Rate (%)", "Tenure Remaining (Months)"];
    const rows = loans.map(l => [
      `"${(l.name || '').replace(/"/g, '""')}"`,
      l.type || 'Other',
      l.outstanding || 0,
      l.emi_amount || 0,
      l.interest_rate || 0,
      l.tenure_months || 0
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `financeai_debt_plan_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalOutstanding = loans.reduce((sum, l) => sum + l.outstanding, 0);
  const totalEmi = loans.reduce((sum, l) => sum + l.emi_amount, 0);
  const monthlyIncome = profile?.monthly_salary || 1;
  const dti = (totalEmi / monthlyIncome) * 100;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral">Debt & Loans Dashboard</h1>
          <p className="text-secondary text-sm mt-1">Track and eliminate your liabilities faster</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleDownloadPlan}
            className="secondary-btn flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Download Plan
          </button>
          <button onClick={() => setIsSlideOverOpen(true)} className="primary-btn flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Liability
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
      ) : loans.length === 0 ? (
        <div className="card-container flex flex-col items-center justify-center p-12 text-center">
           <ShieldCheck className="w-16 h-16 text-emerald-500 mb-4" />
           <h3 className="font-bold text-neutral">Zero Debt</h3>
           <p className="text-sm text-secondary mt-1">You currently have no active loans or debts. Great job!</p>
           <button onClick={() => setIsSlideOverOpen(true)} className="primary-btn mt-6">Add Loan</button>
        </div>
      ) : (
        <>
          {/* Summary Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card-container p-6 bg-rose-50 border border-rose-100">
              <div className="label-text text-rose-800">Total Outstanding Debt</div>
              <div className="text-3xl font-bold tabular-nums-style text-rose-600 mt-2">{formatCurrency(totalOutstanding, false)}</div>
            </div>
            <div className="card-container p-6 bg-white">
              <div className="label-text">Total Monthly EMI</div>
              <div className="text-3xl font-bold tabular-nums-style text-neutral mt-2">{formatCurrency(totalEmi, false)}</div>
              <div className="text-xs text-secondary mt-2">Drains {dti.toFixed(1)}% of your monthly income</div>
            </div>
            <div className="card-container p-6 bg-white">
              <div className="label-text">Debt-to-Income (DTI) Ratio</div>
              <div className={`text-3xl font-bold tabular-nums-style mt-2 ${dti > 40 ? 'text-rose-600' : dti > 20 ? 'text-amber-500' : 'text-emerald-600'}`}>
                {dti.toFixed(1)}%
              </div>
              <div className="text-xs text-secondary mt-2 flex items-center gap-1">
                {dti > 40 ? (
                  <><AlertTriangle className="w-3 h-3 text-rose-600" /> <span className="text-rose-600 font-bold">High Risk</span></>
                ) : (
                  <><ShieldCheck className="w-3 h-3 text-emerald-600" /> <span className="text-emerald-600 font-bold">Healthy</span></>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Loans Table */}
            <div className="lg:col-span-2 card-container">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-neutral">Active Liabilities</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] text-muted uppercase bg-input rounded-t-lg font-bold tracking-wider">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg">Loan Name</th>
                      <th className="px-4 py-3 text-right">Outstanding</th>
                      <th className="px-4 py-3 text-right">EMI</th>
                      <th className="px-4 py-3 text-center">Interest Rate</th>
                      <th className="px-4 py-3 rounded-tr-lg"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loans.map((loan) => (
                      <tr key={loan.id} className="hover:bg-page transition-colors group">
                        <td className="px-4 py-4">
                          <div className="font-bold text-neutral">{loan.loan_name}</div>
                          <div className="text-[10px] text-secondary uppercase font-bold tracking-wider mt-1">{loan.loan_type}</div>
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-rose-600 tabular-nums-style">{formatCurrency(loan.outstanding, false)}</td>
                        <td className="px-4 py-4 text-right font-bold text-neutral tabular-nums-style">{formatCurrency(loan.emi_amount, false)}</td>
                        <td className="px-4 py-4 text-center text-secondary font-medium">{loan.interest_rate}%</td>
                        <td className="px-4 py-4 text-right">
                          <button onClick={() => deleteLoan(loan.id)} className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AI Advisor Card */}
            <div className="space-y-6">
              <div className="card-container bg-slate-900 text-white border-none shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
                <h3 className="font-bold mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-400" /> AI Payoff Strategy</h3>
                
                <div className="space-y-4 relative z-10">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-amber-400 mb-1">Avalanche Method Focus</div>
                    <div className="text-sm font-medium">Target the <strong className="text-white">Credit Card (14% APR)</strong> first. Pay minimums on others and direct all extra cash here.</div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 mb-1">Potential Savings</div>
                    <div className="text-sm font-medium">Adding just ₹5,000 extra to your highest interest EMI will save you ₹45,000 in interest over 3 years.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Slide-over */}
      {isSlideOverOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsSlideOverOpen(false)} />
          <div className="absolute top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col p-8 overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-neutral">Add Liability</h2>
              <button onClick={() => setIsSlideOverOpen(false)} className="text-muted hover:text-neutral"><X className="w-6 h-6" /></button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="label-text">Loan Name / Lender</label>
                <input type="text" className="input-field" value={loanName} onChange={(e) => setLoanName(e.target.value)} placeholder="e.g. HDFC Personal Loan, SBI Credit Card" />
              </div>
              <div>
                <label className="label-text">Loan Type</label>
                <select className="input-field" value={loanType} onChange={(e) => setLoanType(e.target.value)}>
                   {['Personal Loan', 'Home Loan', 'Car Loan', 'Credit Card Debt', 'Education Loan', 'Other'].map(cat => (
                     <option key={cat} value={cat}>{cat}</option>
                   ))}
                </select>
              </div>
              <div>
                <label className="label-text">Outstanding Principal (₹)</label>
                <input type="number" className="input-field" value={outstanding} onChange={(e) => setOutstanding(e.target.value)} placeholder="0" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Monthly EMI (₹)</label>
                  <input type="number" className="input-field" value={emiAmount} onChange={(e) => setEmiAmount(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="label-text">Interest Rate (%)</label>
                  <input type="number" className="input-field" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} placeholder="0" />
                </div>
              </div>

              <div className="pt-4">
                <button onClick={handleSave} disabled={isSaving || !loanName || !outstanding || !emiAmount} className="primary-btn w-full py-4 text-lg flex items-center justify-center gap-2">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Liability"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
