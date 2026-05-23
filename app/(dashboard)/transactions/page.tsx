"use client";

import { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  ArrowUpRight, 
  ArrowDownLeft, 
  X,
  CreditCard,
  Smartphone,
  Banknote,
  MoreVertical,
  Trash2,
  Loader2,
  Sparkles
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

export default function TransactionsPage() {
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoCategorising, setIsAutoCategorising] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  
  // Form State
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("Food & Dining");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState("UPI");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  async function fetchTransactions() {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const isMock = process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && document.cookie.includes("mock-session");
    const userId = user?.id || (isMock ? "test-user-id" : null);
    if (!userId) {
      setIsLoading(false);
      return;
    }

    if (userId === "test-user-id") {
      const cached = localStorage.getItem("mock-transactions");
      const defaultTxs = [
        { id: "mock-tx-1", date: new Date().toISOString().split('T')[0], type: "expense", category: "Food & Dining", note: "Swiggy Delivery", amount: 649, payment_method: "UPI" },
        { id: "mock-tx-2", date: new Date(Date.now() - 86400000).toISOString().split('T')[0], type: "income", category: "Salary", note: "Salary Credit", amount: 125000, payment_method: "Bank Transfer" },
        { id: "mock-tx-3", date: new Date(Date.now() - 172800000).toISOString().split('T')[0], type: "expense", category: "Shopping", note: "Grocery at DMart", amount: 4500, payment_method: "Credit Card" },
      ];
      if (!cached) {
        localStorage.setItem("mock-transactions", JSON.stringify(defaultTxs));
        setTransactions(defaultTxs);
      } else {
        setTransactions(JSON.parse(cached));
      }
      setIsLoading(false);
      return;
    }

    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    setTransactions(data || []);
    setIsLoading(false);
  }

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      alert("No transactions to export.");
      return;
    }

    const sanitizeForCSV = (val: any) => {
      let str = val === null || val === undefined ? '' : String(val);
      // Excel/CSV Injection prevention: escape characters starting with =, +, -, @
      if (str.startsWith('=') || str.startsWith('+') || str.startsWith('-') || str.startsWith('@')) {
        str = `'${str}`;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = ["Date", "Type", "Category", "Note", "Amount", "Payment Method"];
    const rows = transactions.map(t => [
      sanitizeForCSV(t.date),
      sanitizeForCSV(t.type),
      sanitizeForCSV(t.category),
      sanitizeForCSV(t.note || ''),
      sanitizeForCSV(t.amount),
      sanitizeForCSV(t.payment_method || 'UPI')
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `financeai_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNoteBlur = async () => {
    if (!note.trim()) return;
    setIsAutoCategorising(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const reqHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        reqHeaders['Authorization'] = `Bearer ${token}`;
      }

      const aiRes = await fetch('/api/ai/categorise', {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({ note })
      });
      if (!aiRes.ok) throw new Error("API Route 404 or unavailable");
      const aiData = await aiRes.json();
      if (aiData.category) {
        setCategory(aiData.category);
      }
    } catch (e) {
      console.warn("AI categorisation API route offline or 404. Falling back to high-fidelity client-side dictionary categoriser.");
      const cleanNote = note.toLowerCase().trim();
      let matchedCategory = "Other";
      
      if (cleanNote.includes("zomato") || cleanNote.includes("swiggy") || cleanNote.includes("food") || cleanNote.includes("dining") || cleanNote.includes("restaurant") || cleanNote.includes("cafe") || cleanNote.includes("tea") || cleanNote.includes("coffee") || cleanNote.includes("starbucks") || cleanNote.includes("biryani") || cleanNote.includes("maggi")) {
        matchedCategory = "Food & Dining";
      } else if (cleanNote.includes("uber") || cleanNote.includes("ola") || cleanNote.includes("metro") || cleanNote.includes("auto") || cleanNote.includes("taxi") || cleanNote.includes("petrol") || cleanNote.includes("diesel") || cleanNote.includes("fuel") || cleanNote.includes("cng") || cleanNote.includes("rapido")) {
        matchedCategory = "Transport";
      } else if (cleanNote.includes("amazon") || cleanNote.includes("flipkart") || cleanNote.includes("myntra") || cleanNote.includes("shopp") || cleanNote.includes("clothing") || cleanNote.includes("grocer") || cleanNote.includes("blinkit") || cleanNote.includes("instamart") || cleanNote.includes("zepto") || cleanNote.includes("shoes") || cleanNote.includes("watch")) {
        matchedCategory = "Shopping";
      } else if (cleanNote.includes("electric") || cleanNote.includes("power") || cleanNote.includes("water") || cleanNote.includes("wifi") || cleanNote.includes("broadband") || cleanNote.includes("recharge") || cleanNote.includes("jio") || cleanNote.includes("airtel") || cleanNote.includes("gas") || cleanNote.includes("indane") || cleanNote.includes("bill")) {
        matchedCategory = "Utilities";
      } else if (cleanNote.includes("netflix") || cleanNote.includes("prime") || cleanNote.includes("hotstar") || cleanNote.includes("movie") || cleanNote.includes("cinema") || cleanNote.includes("concert") || cleanNote.includes("game") || cleanNote.includes("booking") || cleanNote.includes("bookmyshow") || cleanNote.includes("spotify")) {
        matchedCategory = "Entertainment";
      } else if (cleanNote.includes("doctor") || cleanNote.includes("hospital") || cleanNote.includes("medicine") || cleanNote.includes("pharmacy") || cleanNote.includes("apollo") || cleanNote.includes("dental") || cleanNote.includes("clinic") || cleanNote.includes("health") || cleanNote.includes("insurance")) {
        matchedCategory = "Health";
      } else if (cleanNote.includes("fee") || cleanNote.includes("school") || cleanNote.includes("college") || cleanNote.includes("book") || cleanNote.includes("course") || cleanNote.includes("udemy" ) || cleanNote.includes("coursera") || cleanNote.includes("coaching") || cleanNote.includes("tutor")) {
        matchedCategory = "Education";
      } else if (cleanNote.includes("sip") || cleanNote.includes("mutual") || cleanNote.includes("stock") || cleanNote.includes("groww") || cleanNote.includes("zerodha") || cleanNote.includes("invest") || cleanNote.includes("nps") || cleanNote.includes("ppf") || cleanNote.includes("fd") || cleanNote.includes("share")) {
        matchedCategory = "Investment";
      } else if (cleanNote.includes("salary") || cleanNote.includes("bonus") || cleanNote.includes("dividend") || cleanNote.includes("interest") || cleanNote.includes("cashback") || cleanNote.includes("refund") || cleanNote.includes("income")) {
        matchedCategory = "Income";
      }
      
      setCategory(matchedCategory);
    } finally {
      setIsAutoCategorising(false);
    }
  };

  const handleSave = async () => {
    if (!amount || isSaving) return;
    setIsSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const isMock = process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && document.cookie.includes("mock-session");
      const userId = user?.id || (isMock ? "test-user-id" : null);
      if (!userId) {
        alert("You are not logged in! Please sign up or log in to save transactions.");
        setIsSaving(false);
        return;
      }

      if (userId === "test-user-id") {
        const newTx = {
          id: `mock-tx-${Date.now()}`,
          date,
          type,
          category,
          note: note || "Transaction",
          amount: parseFloat(amount),
          payment_method: method
        };
        const updated = [newTx, ...transactions];
        setTransactions(updated);
        localStorage.setItem("mock-transactions", JSON.stringify(updated));
        
        setAmount("");
        setNote("");
        setIsSlideOverOpen(false);
        setIsSaving(false);
        return;
      }

      // Save to Supabase and return the inserted row
      const { data: savedData, error } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          amount: parseFloat(amount),
          type,
          category,
          note,
          payment_method: method,
          date
        })
        .select()
        .single();

      if (error) throw error;

      // Reset & close slideover instantly
      setAmount("");
      setNote("");
      setIsSlideOverOpen(false);

      // Prepend optimistically
      if (savedData) {
        setTransactions(prev => [savedData, ...prev]);
      }
    } catch (err: any) {
      console.error(err);
      alert("Error saving transaction: " + getFriendlyErrorMessage(err) + "\n\nIf this is a permission error, make sure your Supabase RLS policies are created.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    const isMock = process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && document.cookie.includes("mock-session");
    if (isMock || String(id).startsWith("mock-")) {
      const updated = transactions.filter(t => t.id !== id);
      setTransactions(updated);
      localStorage.setItem("mock-transactions", JSON.stringify(updated));
      return;
    }
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update local state optimistically
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      console.error(err);
      alert("Error deleting transaction: " + (err.message || JSON.stringify(err)));
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = (t.note || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (t.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All Categories" || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-neutral">Transactions</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV} className="secondary-btn flex items-center gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button 
            onClick={() => setIsSlideOverOpen(true)}
            className="primary-btn flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Transaction
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-container p-4 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-muted tracking-wider">Total Income</div>
              <div className="text-xl font-bold tabular-nums-style text-emerald-600">{formatCurrency(totalIncome)}</div>
            </div>
          </div>
        </div>
        <div className="card-container p-4 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-muted tracking-wider">Total Expenses</div>
              <div className="text-xl font-bold tabular-nums-style text-rose-600">{formatCurrency(totalExpense)}</div>
            </div>
          </div>
        </div>
        <div className="card-container p-4 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-muted tracking-wider">Net Surplus</div>
              <div className="text-xl font-bold tabular-nums-style text-indigo-600">{formatCurrency(totalIncome - totalExpense)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card-container flex flex-wrap items-center gap-4 py-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input 
            type="text" 
            placeholder="Search by note..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10" 
          />
        </div>
        <select 
          className="input-field w-auto min-w-[150px] bg-white cursor-pointer"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="All Categories">All Categories</option>
          {['Food & Dining', 'Shopping', 'Transport', 'Utilities', 'Entertainment', 'Health', 'Education', 'Investment', 'Other'].map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="card-container overflow-hidden min-h-[400px] flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-secondary">
             <Loader2 className="w-8 h-8 animate-spin mb-2" />
             <p className="text-sm">Fetching transactions...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
             <div className="w-16 h-16 bg-page rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-muted" />
             </div>
             <h3 className="font-bold text-neutral">No matching transactions</h3>
             <p className="text-sm text-secondary mt-1">Try adjusting your search query or category filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-page text-muted uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Note</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-page transition-colors">
                    <td className="px-6 py-4 text-secondary whitespace-nowrap">{new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="px-6 py-4">
                      <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-[11px] font-bold uppercase">
                        {tx.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-neutral">{tx.note || tx.merchant || '-'}</td>
                    <td className={`px-6 py-4 text-right font-bold tabular-nums-style ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(tx.id)}
                        className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                        title="Delete Transaction"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isSlideOverOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsSlideOverOpen(false)} />
          <div className="absolute top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col p-8 overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-neutral">Add Transaction</h2>
              <button onClick={() => setIsSlideOverOpen(false)} className="text-muted hover:text-neutral"><X className="w-6 h-6" /></button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="label-text">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted">₹</span>
                  <input type="number" min="0" max="999999999" className="input-field pl-10 text-3xl font-bold" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
                </div>
              </div>

              <div>
                <label className="label-text">Type</label>
                <div className="flex gap-2">
                  <button onClick={() => setType('expense')} className={`flex-1 py-3 font-bold text-sm rounded-lg border transition-all ${type === 'expense' ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-input text-secondary border-border'}`}>Expense</button>
                  <button onClick={() => setType('income')} className={`flex-1 py-3 font-bold text-sm rounded-lg border transition-all ${type === 'income' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-input text-secondary border-border'}`}>Income</button>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="label-text">Note</label>
                  {isAutoCategorising && (
                    <span className="text-[10px] text-accent font-bold uppercase tracking-wider flex items-center gap-1 animate-pulse">
                      <Sparkles className="w-3.5 h-3.5 animate-spin text-accent" /> AI Classifying...
                    </span>
                  )}
                </div>
                <input 
                  type="text" 
                  className="input-field" 
                  value={note} 
                  onChange={(e) => setNote(e.target.value)} 
                  onBlur={handleNoteBlur}
                  placeholder="E.g. Zomato Biryani" 
                />
              </div>

              <div>
                <label className="label-text text-accent flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-accent fill-accent/30" /> Category
                </label>
                <select className="input-field bg-white" value={category} onChange={(e) => setCategory(e.target.value)}>
                   {['Food & Dining', 'Shopping', 'Transport', 'Utilities', 'Entertainment', 'Health', 'Education', 'Investment', 'Income', 'Other'].map(cat => (
                     <option key={cat} value={cat}>{cat}</option>
                   ))}
                </select>
              </div>

              <div>
                <label className="label-text">Date</label>
                <input type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>

              <div className="pt-4">
                <button 
                  onClick={handleSave} 
                  disabled={isSaving || !amount}
                  className="primary-btn w-full py-4 text-lg flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Transaction"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
