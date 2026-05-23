"use client";

import { useState, useEffect } from "react";
import { User, Bell, Shield, Database, Smartphone, LogOut, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { getFriendlyErrorMessage } from "@/lib/errors";

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Modal and Form States
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [tempName, setTempName] = useState("");
  const [tempCity, setTempCity] = useState("");
  const [tempCtc, setTempCtc] = useState("1800000");
  const [tempRisk, setTempRisk] = useState("moderate");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setEmail(user.email || "");
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(data);
      if (data) {
        setTempName(data.full_name || "");
        setTempCity(data.city || "");
        setTempCtc(String(data.annual_ctc || 1800000));
        setTempRisk(data.risk_appetite || "moderate");
      }
    }
    setIsLoading(false);
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: tempName,
          city: tempCity,
          annual_ctc: Number(tempCtc),
          monthly_salary: Math.floor(Number(tempCtc) / 12),
          risk_appetite: tempRisk
        })
        .eq('id', user.id);

      if (error) throw error;

      // Invalidate the AI Plan cache so it automatically regenerates based on new parameters!
      localStorage.removeItem(`financeai_plan_state_${user.id}`);
      localStorage.removeItem(`financeai_plan_data_${user.id}`);

      alert("Settings successfully synchronized! AI profiles and monthly dashboard metrics have been updated.");
      await fetchProfile();
      setActiveSection(null);
    } catch (err: any) {
      console.error(err);
      alert("Error saving settings: " + getFriendlyErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    // Clear mock cookies and storage (BUG-02)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const projectRef = supabaseUrl.includes('supabase.co') 
      ? supabaseUrl.split('//')[1].split('.')[0] 
      : 'placeholder';
    const cookieKey = `sb-${projectRef}-auth-token`;
    document.cookie = `${cookieKey}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    localStorage.removeItem("mock-profile");
    localStorage.removeItem("mock-expenses");
    localStorage.removeItem("mock-goals");
    localStorage.removeItem("mock-loans");
    localStorage.removeItem("mock-transactions");

    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleDeleteAccount = async () => {
    const isMock = typeof window !== 'undefined' && document.cookie.includes("mock-session");

    const password = prompt("To confirm deleting your account, please enter your password:");
    if (password === null) return; // User cancelled the prompt
    if (!password.trim()) {
      alert("Password is required to delete your account.");
      return;
    }

    if (confirm("Are you absolutely sure you want to delete your account? This will permanently erase your profile, transactions, budgets, goals, and liabilities from our database. This action is irreversible.")) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || (isMock ? "mock-session" : "");

        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch("/api/account/delete", {
          method: "POST",
          headers,
          body: JSON.stringify({ password })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to delete account");
        }

        // Clean up session, cookies, and localStorage mock keys (BUG-02, SEC-03)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const projectRef = supabaseUrl.includes('supabase.co') 
          ? supabaseUrl.split('//')[1].split('.')[0] 
          : 'placeholder';
        const cookieKey = `sb-${projectRef}-auth-token`;
        document.cookie = `${cookieKey}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        localStorage.removeItem("mock-profile");
        localStorage.removeItem("mock-expenses");
        localStorage.removeItem("mock-goals");
        localStorage.removeItem("mock-loans");
        localStorage.removeItem("mock-transactions");

        await supabase.auth.signOut();
        alert("Account deleted successfully.");
        router.push("/signup");
      } catch (err: any) {
        alert("Error deleting account: " + getFriendlyErrorMessage(err));
      }
    }
  };

  const sections = [
    { name: "Profile Settings", desc: "Update your name, city, and location", icon: <User className="w-5 h-5" /> },
    { name: "Income & Expenses", desc: "Change your salary and annual take-home CTC", icon: <Database className="w-5 h-5" /> },
    { name: "Risk Profile", desc: "Adjust your investment risk appetite", icon: <Shield className="w-5 h-5" /> },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const fullName = profile?.full_name || "Indian Saver";
  const userCity = profile?.city || "India";
  const initials = fullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "IS";

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-neutral">Settings</h1>
        <p className="text-secondary text-sm mt-1">Manage your account and preferences</p>
      </div>

      <div className="card-container p-0 overflow-hidden relative">
        <div className="p-6 bg-slate-50 border-b border-border flex items-center gap-6">
          <div className="w-20 h-20 bg-accent text-white rounded-full flex items-center justify-center text-3xl font-bold shadow-xl shadow-accent/20">
            {initials}
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral">{fullName}</h2>
            <p className="text-sm text-secondary">{email} • {userCity}</p>
            <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded">
              Verified Indian Saver Profile
            </span>
          </div>
        </div>

        <div className="divide-y divide-border">
          {sections.map((section, i) => (
            <button 
              key={i} 
              onClick={() => setActiveSection(section.name)}
              className="w-full flex items-center justify-between p-6 hover:bg-[#F8FAFC] transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-input text-secondary rounded-xl flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all shadow-sm">
                  {section.icon}
                </div>
                <div>
                  <h3 className="font-bold text-neutral group-hover:text-accent transition-colors">{section.name}</h3>
                  <p className="text-xs text-secondary">{section.desc}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted group-hover:text-accent transition-all" />
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <button onClick={handleSignOut} className="flex-1 card-container p-4 flex items-center justify-center gap-2 text-rose-600 font-bold hover:bg-rose-50 transition-all border-rose-100 active:scale-95">
          <LogOut className="w-5 h-5" /> Sign Out
        </button>
        <button onClick={handleDeleteAccount} className="flex-1 card-container p-4 flex items-center justify-center gap-2 text-rose-600 font-bold hover:bg-rose-50 transition-all border-rose-100 active:scale-95">
          Delete Account
        </button>
      </div>

      {/* Dynamic Slide-Over Settings Panel */}
      {activeSection && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setActiveSection(null)} />
          <div className="absolute top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col p-8 overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-neutral">{activeSection}</h2>
              <button onClick={() => setActiveSection(null)} className="text-muted hover:text-neutral text-sm font-bold">Close</button>
            </div>

            <div className="space-y-6 flex-1">
              {activeSection === "Profile Settings" && (
                <>
                  <div>
                    <label className="label-text">Full Name</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={tempName} 
                      onChange={(e) => setTempName(e.target.value)} 
                      placeholder="e.g. Rahul Sharma" 
                    />
                  </div>
                  <div>
                    <label className="label-text">City / State</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={tempCity} 
                      onChange={(e) => setTempCity(e.target.value)} 
                      placeholder="e.g. Mumbai, Maharashtra" 
                    />
                  </div>
                </>
              )}

              {activeSection === "Income & Expenses" && (
                <div>
                  <label className="label-text">Annual CTC Salary (₹)</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={tempCtc} 
                    onChange={(e) => setTempCtc(e.target.value)} 
                    placeholder="e.g. 1800000" 
                  />
                  <p className="text-xs text-secondary mt-1">This will update your monthly budget allocations and AI saving recommendations.</p>
                </div>
              )}

              {activeSection === "Risk Profile" && (
                <div>
                  <label className="label-text">Investment Risk Appetite</label>
                  <select 
                    className="input-field" 
                    value={tempRisk} 
                    onChange={(e) => setTempRisk(e.target.value)}
                  >
                    <option value="conservative">Conservative (Low Risk, Safe Returns)</option>
                    <option value="moderate">Moderate (Balanced Risk & Equity SIP)</option>
                    <option value="aggressive">Aggressive (High Equity, Mutual Fund Focused)</option>
                  </select>
                  <p className="text-xs text-secondary mt-1">Directly alters your AI Suggested Portfolio Asset Allocations.</p>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-border mt-auto">
              <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="primary-btn w-full py-3.5 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-center">
        <p className="text-[10px] text-muted uppercase tracking-widest font-bold">FinanceAI India v1.0.0</p>
        <p className="text-[10px] text-muted mt-1">Made with ❤️ for Indian Savers</p>
      </div>
    </div>
  );
}
