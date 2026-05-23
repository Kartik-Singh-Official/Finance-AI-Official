"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Plus, PieChart as PieChartIcon, Zap, Download, Target, Loader2, X, Trash2 } from "lucide-react";
import { formatCurrency, formatCurrencyCompact } from "@/lib/formatters";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { supabase } from "@/lib/supabase";

const COLORS = ['#10B981', '#6366F1', '#F59E0B', '#8B5CF6', '#F43F5E'];

import AnimatedCounter from "@/components/AnimatedCounter";

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [assetName, setAssetName] = useState("");
  const [type, setType] = useState("Mutual Fund");
  const [investedAmount, setInvestedAmount] = useState("");
  const [currentValue, setCurrentValue] = useState("");

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
      const cached = localStorage.getItem("mock-investments");
      const defaultAssets = [
        { id: "mock-inv-1", asset_name: "HDFC Top 100 Fund", type: "Mutual Fund", buy_price: 50000, current_price: 62000, buy_date: "2024-01-15" },
        { id: "mock-inv-2", asset_name: "Reliance Industries Shares", type: "Stocks", buy_price: 30000, current_price: 35500, buy_date: "2024-03-10" },
        { id: "mock-inv-3", asset_name: "SBI 1-Year Fixed Deposit", type: "FD", buy_price: 100000, current_price: 106800, buy_date: "2025-05-15" },
        { id: "mock-inv-4", asset_name: "Sovereign Gold Bonds", type: "Gold", buy_price: 25000, current_price: 29200, buy_date: "2023-11-20" }
      ];
      if (!cached) {
        localStorage.setItem("mock-investments", JSON.stringify(defaultAssets));
        setInvestments(defaultAssets);
      } else {
        setInvestments(JSON.parse(cached));
      }
      setIsLoading(false);
      return;
    }

    const { data } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', userId);
    
    setInvestments(data || []);
    setIsLoading(false);
  }

  const handleSave = async () => {
    if (!assetName || !investedAmount || isSaving) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const isMock = process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && document.cookie.includes("mock-session");
      const userId = user?.id || (isMock ? "test-user-id" : null);
      if (!userId) {
        alert("You must be logged in to save assets. If you just signed up, please check your email to confirm your account.");
        setIsSaving(false);
        return;
      }

      if (userId === "test-user-id") {
        const newAsset = {
          id: `mock-inv-${Date.now()}`,
          asset_name: assetName,
          type,
          buy_price: parseFloat(investedAmount),
          current_price: parseFloat(currentValue) || parseFloat(investedAmount),
          buy_date: new Date().toISOString().split('T')[0],
        };
        const cached = localStorage.getItem("mock-investments");
        const existing = cached ? JSON.parse(cached) : [];
        const updated = [...existing, newAsset];
        localStorage.setItem("mock-investments", JSON.stringify(updated));
        setInvestments(updated);

        setAssetName("");
        setInvestedAmount("");
        setCurrentValue("");
        setIsSlideOverOpen(false);
        setIsSaving(false);
        return;
      }

      const { data: savedAsset, error } = await supabase
        .from('investments')
        .insert({
          user_id: userId,
          asset_name: assetName,
          type,
          buy_price: parseFloat(investedAmount),
          current_price: parseFloat(currentValue) || parseFloat(investedAmount),
          buy_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) throw error;
      
      setAssetName("");
      setInvestedAmount("");
      setCurrentValue("");
      setIsSlideOverOpen(false);
      
      if (savedAsset) {
        setInvestments(prev => [...prev, savedAsset]);
      }
    } catch (e: any) {
      console.error(e);
      alert("Error saving investment: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteInvestment = async (id: string) => {
    if (!confirm("Delete this investment?")) return;
    try {
      const isMock = process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && document.cookie.includes("mock-session");
      if (isMock || String(id).startsWith("mock-")) {
        const cached = localStorage.getItem("mock-investments");
        if (cached) {
          const existing = JSON.parse(cached);
          const updated = existing.filter((i: any) => i.id !== id);
          localStorage.setItem("mock-investments", JSON.stringify(updated));
          setInvestments(updated);
        }
        return;
      }
      const { error } = await supabase.from('investments').delete().eq('id', id);
      if (error) throw error;
      setInvestments(prev => prev.filter(i => i.id !== id));
    } catch (e: any) {
      console.error(e);
      alert("Error deleting investment: " + e.message);
    }
  };

  const handleExportReport = () => {
    if (investments.length === 0) {
      alert("No active investments to export.");
      return;
    }

    const headers = ["Asset Name", "Category / Type", "Invested Amount", "Current Value", "Profit / Loss", "Gain / Loss (%)"];
    const rows = investments.map(i => {
      const profitLoss = (i.current_price || 0) - (i.buy_price || 0);
      const percentage = (i.buy_price || 0) > 0 ? (profitLoss / i.buy_price) * 100 : 0;
      return [
        `"${(i.asset_name || '').replace(/"/g, '""')}"`,
        i.type || 'Other',
        i.buy_price || 0,
        i.current_price || 0,
        profitLoss,
        percentage.toFixed(2)
      ];
    });

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `financeai_investment_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalInvested = investments.reduce((sum, item) => sum + item.buy_price, 0);
  const totalCurrent = investments.reduce((sum, item) => sum + item.current_price, 0);
  const totalReturns = totalCurrent - totalInvested;
  const returnPercentage = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

  // Group for pie chart
  const portfolioData = Object.values(investments.reduce((acc: any, item: any) => {
    if (!acc[item.type]) acc[item.type] = { name: item.type, value: 0 };
    acc[item.type].value += item.current_price;
    return acc;
  }, {})) as any[];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral">Portfolio & Investments</h1>
          <p className="text-secondary text-sm mt-1">Track your assets and net worth growth</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportReport}
            className="secondary-btn flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Export Report
          </button>
          <button onClick={() => setIsSlideOverOpen(true)} className="primary-btn flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Asset
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
      ) : investments.length === 0 ? (
        <div className="card-container flex flex-col items-center justify-center p-12 text-center">
           <TrendingUp className="w-16 h-16 text-muted mb-4" />
           <h3 className="font-bold text-neutral">No investments tracked</h3>
           <p className="text-sm text-secondary mt-1">Start tracking your net worth by adding your assets.</p>
           <button onClick={() => setIsSlideOverOpen(true)} className="primary-btn mt-6">Add First Asset</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Summary Strip */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card-container p-5 bg-white hover:-translate-y-1 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-accent/5 rounded-full blur-xl group-hover:scale-150 transition-all duration-500" />
                  <div className="label-text">Current Value</div>
                  <div className="text-2xl font-bold tabular-nums-style text-neutral mt-1">
                    <AnimatedCounter value={totalCurrent} />
                  </div>
                </div>
                <div className="card-container p-5 bg-white hover:-translate-y-1 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-accent/5 rounded-full blur-xl group-hover:scale-150 transition-all duration-500" />
                  <div className="label-text">Invested Amount</div>
                  <div className="text-2xl font-bold tabular-nums-style text-neutral mt-1">
                    <AnimatedCounter value={totalInvested} />
                  </div>
                </div>
                <div className="card-container p-5 bg-white hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 relative overflow-hidden group">
                  <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-xl group-hover:scale-150 transition-all duration-500 ${totalReturns >= 0 ? 'bg-emerald-500/5' : 'bg-rose-500/5'}`} />
                  <div className="label-text">Overall Returns</div>
                  <div className={`text-2xl font-bold tabular-nums-style mt-1 ${totalReturns >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {totalReturns >= 0 ? '+' : '-'}
                    <AnimatedCounter value={Math.abs(totalReturns)} />
                  </div>
                  <div className={`text-xs font-bold mt-1 ${returnPercentage >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{returnPercentage >= 0 ? '+' : ''}{returnPercentage.toFixed(2)}% Absolute</div>
                </div>
              </div>

              {/* Asset List */}
              <div className="card-container">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-neutral">Your Holdings</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-[10px] text-muted uppercase bg-input rounded-t-lg font-bold tracking-wider">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-lg">Asset</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3 text-right">Invested</th>
                        <th className="px-4 py-3 text-right">Current Value</th>
                        <th className="px-4 py-3 text-right">Returns</th>
                        <th className="px-4 py-3 rounded-tr-lg"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {investments.map((inv) => {
                        const ret = inv.current_price - inv.buy_price;
                        const pct = inv.buy_price > 0 ? (ret / inv.buy_price) * 100 : 0;
                        return (
                          <tr key={inv.id} className="hover:bg-page transition-colors">
                            <td className="px-4 py-4 font-bold text-neutral">{inv.asset_name}</td>
                            <td className="px-4 py-4">
                              <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">{inv.type}</span>
                            </td>
                            <td className="px-4 py-4 text-right text-secondary tabular-nums-style font-medium">{formatCurrencyCompact(inv.buy_price)}</td>
                            <td className="px-4 py-4 text-right font-bold text-neutral tabular-nums-style">{formatCurrencyCompact(inv.current_price)}</td>
                            <td className={`px-4 py-4 text-right font-bold tabular-nums-style ${ret >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {ret >= 0 ? '+' : '-'}{pct.toFixed(2)}%
                            </td>
                            <td className="px-4 py-4 text-right">
                              <button onClick={() => deleteInvestment(inv.id)} className="text-muted hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              <div className="card-container p-6 flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-neutral">Allocation</h3>
                  <PieChartIcon className="w-5 h-5 text-muted" />
                </div>
                <div className="h-48 w-full mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={portfolioData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {portfolioData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatCurrency(Number(value), false)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full space-y-2">
                  {portfolioData.map((entry: any, index: number) => (
                    <div key={entry.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-secondary">{entry.name}</span>
                      </div>
                      <span className="font-bold text-neutral">{((entry.value / totalCurrent) * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card-container bg-gradient-to-br from-indigo-900 to-slate-900 text-white border-none shadow-xl">
                <div className="flex items-center gap-2 mb-4 text-amber-400">
                  <Zap className="w-5 h-5" />
                  <span className="text-xs uppercase tracking-wider font-bold">AI Suggestion</span>
                </div>
                <h3 className="font-bold mb-2">Rebalance Needed</h3>
                <p className="text-sm text-white/80 mb-4 leading-relaxed">Your Equity exposure is currently {totalCurrent > 0 ? ((portfolioData.find((d: any) => d.name === 'Mutual Fund' || d.name === 'Stocks')?.value || 0) / totalCurrent * 100).toFixed(0) : '0'}%. Consider increasing Fixed Income to match your moderate risk profile.</p>
                <button className="text-amber-400 text-sm font-bold hover:text-white transition-colors">See Safe Assets →</button>
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
              <h2 className="text-xl font-bold text-neutral">Add Asset</h2>
              <button onClick={() => setIsSlideOverOpen(false)} className="text-muted hover:text-neutral"><X className="w-6 h-6" /></button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="label-text">Asset Name</label>
                <input type="text" className="input-field" value={assetName} onChange={(e) => setAssetName(e.target.value)} placeholder="e.g. Parag Parikh Flexi Cap" />
              </div>
              <div>
                <label className="label-text">Asset Type</label>
                <select className="input-field" value={type} onChange={(e) => setType(e.target.value)}>
                   {['Mutual Fund', 'Stocks', 'Fixed Deposit', 'Gold', 'Real Estate', 'Crypto'].map(cat => (
                     <option key={cat} value={cat}>{cat}</option>
                   ))}
                </select>
              </div>
              <div>
                <label className="label-text">Total Invested Amount (₹)</label>
                <input type="number" className="input-field" value={investedAmount} onChange={(e) => setInvestedAmount(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="label-text">Current Value (₹)</label>
                <input type="number" className="input-field" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} placeholder="0" />
              </div>

              <div className="pt-4">
                <button onClick={handleSave} disabled={isSaving || !assetName || !investedAmount} className="primary-btn w-full py-4 text-lg flex items-center justify-center gap-2">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Asset"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
