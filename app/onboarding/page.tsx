"use client";

import { useState, useEffect } from "react";
import { ArrowRight, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // Step 1: Basic Info
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [occupation, setOccupation] = useState("Salaried");

  // Step 2: Income
  const [monthlySalary, setMonthlySalary] = useState("");
  const [annualCtc, setAnnualCtc] = useState("");
  const [otherIncome, setOtherIncome] = useState("");

  // Step 3: Monthly Expenses (Fixed & Essential)
  const [rent, setRent] = useState("");
  const [food, setFood] = useState("");
  const [utilities, setUtilities] = useState("");
  const [shopping, setShopping] = useState("");

  // Step 4: Goals
  const [goalName, setGoalName] = useState("Emergency Fund");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalDeadline, setGoalDeadline] = useState("");

  // Step 5: EMIs / Loans
  const [hasLoan, setHasLoan] = useState(false);
  const [loanName, setLoanName] = useState("");
  const [loanOutstanding, setLoanOutstanding] = useState("");
  const [emiAmount, setEmiAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");

  // Step 6: Risk Profile
  const [riskProfile, setRiskProfile] = useState("moderate");

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (process.env.NODE_ENV === 'development') {
          // Mock a test user session in dev environment for easy testing
          setUser({ id: "test-user-id" });
        } else {
          // Unauthenticated users in production are redirected to signup page (M-5)
          router.push("/signup");
        }
      } else {
        setUser(user);
      }
    }
    checkUser();
  }, [router]);

  const handleNext = () => {
    if (step < 6) setStep(step + 1);
    else handleOnboardingComplete();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleOnboardingComplete = async () => {
    setIsLoading(true);
    try {
      const profileData = {
        id: user.id,
        full_name: fullName,
        age: parseInt(age) || 0,
        city,
        occupation,
        monthly_salary: parseFloat(monthlySalary) || 0,
        annual_ctc: parseFloat(annualCtc) || 0,
        other_income: parseFloat(otherIncome) || 0,
        risk_appetite: riskProfile,
        onboarding_done: true,
      };

      const expenses = [
        { category: "Rent", monthly_amount: parseFloat(rent) || 0 },
        { category: "Food", monthly_amount: parseFloat(food) || 0 },
        { category: "Utilities", monthly_amount: parseFloat(utilities) || 0 },
        { category: "Shopping", monthly_amount: parseFloat(shopping) || 0 },
      ].filter(e => e.monthly_amount > 0);

      // Save to Supabase (if real user)
      if (user.id !== "test-user-id") {
        // Upsert profile
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert(profileData);
        if (profileError) throw profileError;

        // Save expenses
        if (expenses.length > 0) {
          const { error: expError } = await supabase
            .from("expense_profile")
            .insert(expenses.map(e => ({ ...e, user_id: user.id })));
          if (expError) throw expError;
        }

        // Save Goal
        if (goalTarget) {
          const { error: goalError } = await supabase
            .from("goals")
            .insert({
              user_id: user.id,
              name: goalName,
              target_amount: parseFloat(goalTarget),
              deadline: goalDeadline || null,
            });
          if (goalError) throw goalError;
        }

        // Save Loan
        if (hasLoan && emiAmount) {
          const { error: loanError } = await supabase
            .from("emis_loans")
            .insert({
              user_id: user.id,
              loan_name: loanName || "Personal Loan",
              principal: parseFloat(loanOutstanding) || 0,
              outstanding: parseFloat(loanOutstanding) || 0,
              emi_amount: parseFloat(emiAmount),
              interest_rate: parseFloat(interestRate) || 0,
              start_date: new Date().toISOString().split('T')[0],
              end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 3).toISOString().split('T')[0], // 3 years mock
            });
          if (loanError) throw loanError;
        }

        // Trigger AI Plan Pre-generation
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const reqHeaders: Record<string, string> = { "Content-Type": "application/json" };
        if (token) {
          reqHeaders["Authorization"] = `Bearer ${token}`;
        }

        await fetch("/api/ai/plan", {
          method: "POST",
          headers: reqHeaders,
          body: JSON.stringify({ profile: profileData, expenses }),
        });
      } else {
        // Mock User Session: set mock cookie & populate local storage
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const projectRef = supabaseUrl.includes('supabase.co') 
          ? supabaseUrl.split('//')[1].split('.')[0] 
          : 'placeholder';
        const cookieKey = `sb-${projectRef}-auth-token`;
        const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
        const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        document.cookie = `${cookieKey}=${encodeURIComponent("mock-session")}; path=/; expires=${expires}; SameSite=Lax${isLocal ? '' : '; Secure'}`;

        localStorage.setItem("mock-profile", JSON.stringify(profileData));
        localStorage.setItem("mock-expenses", JSON.stringify(expenses));
        if (goalTarget) {
          localStorage.setItem("mock-goals", JSON.stringify([{
            name: goalName,
            target_amount: parseFloat(goalTarget),
            deadline: goalDeadline || null,
          }]));
        }
        if (hasLoan && emiAmount) {
          localStorage.setItem("mock-loans", JSON.stringify([{
            loan_name: loanName || "Personal Loan",
            principal: parseFloat(loanOutstanding) || 0,
            outstanding: parseFloat(loanOutstanding) || 0,
            emi_amount: parseFloat(emiAmount),
            interest_rate: parseFloat(interestRate) || 0,
          }]));
        }
      }

      router.push("/dashboard");
    } catch (error: any) {
      console.error("Onboarding saving error:", error);
      
      if (process.env.NODE_ENV === 'development') {
        // Offline fallback: set mock cookie & populate local storage (Dev Only)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const projectRef = supabaseUrl.includes('supabase.co') 
          ? supabaseUrl.split('//')[1].split('.')[0] 
          : 'placeholder';
        const cookieKey = `sb-${projectRef}-auth-token`;
        const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
        const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        document.cookie = `${cookieKey}=${encodeURIComponent("mock-session")}; path=/; expires=${expires}; SameSite=Lax${isLocal ? '' : '; Secure'}`;

        const fallbackProfile = {
          id: "test-user-id",
          full_name: fullName || "Saver",
          age: parseInt(age) || 30,
          city: city || "Mumbai",
          occupation: occupation || "Salaried",
          monthly_salary: parseFloat(monthlySalary) || 125000,
          annual_ctc: parseFloat(annualCtc) || 1500000,
          other_income: parseFloat(otherIncome) || 0,
          risk_appetite: riskProfile || "moderate",
          onboarding_done: true,
        };
        
        localStorage.setItem("mock-profile", JSON.stringify(fallbackProfile));
        
        const fallbackExpenses = [
          { category: "Rent", monthly_amount: parseFloat(rent) || 0 },
          { category: "Food", monthly_amount: parseFloat(food) || 0 },
          { category: "Utilities", monthly_amount: parseFloat(utilities) || 0 },
          { category: "Shopping", monthly_amount: parseFloat(shopping) || 0 },
        ].filter(e => e.monthly_amount > 0);
        localStorage.setItem("mock-expenses", JSON.stringify(fallbackExpenses));
        
        if (goalTarget) {
          localStorage.setItem("mock-goals", JSON.stringify([{
            name: goalName,
            target_amount: parseFloat(goalTarget),
            deadline: goalDeadline || null,
          }]));
        }
        
        if (hasLoan && emiAmount) {
          localStorage.setItem("mock-loans", JSON.stringify([{
            loan_name: loanName || "Personal Loan",
            principal: parseFloat(loanOutstanding) || 0,
            outstanding: parseFloat(loanOutstanding) || 0,
            emi_amount: parseFloat(emiAmount),
            interest_rate: parseFloat(interestRate) || 0,
          }]));
        }

        alert("Note: Your onboarding profile is set up! However, we couldn't synchronize all records with Supabase (perhaps due to default RLS policies or environment configuration).\n\nWe are logging you in under a robust client-side session so you can explore all FinanceAI dashboards immediately!");
        router.push("/dashboard");
      } else {
        // Production fallback: show a high-quality user-friendly error message without letting them bypass auth
        alert("We encountered an issue saving your onboarding details. Please try again. If the issue persists, please check your network connection or contact support.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-page p-4 md:p-8 flex flex-col items-center justify-center">
      {/* Progress Bar */}
      <div className="w-full max-w-2xl mb-8">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-secondary">Step {step} of 6</span>
          <span className="text-sm font-medium text-accent">
            {Math.round((step / 6) * 100)}% Completed
          </span>
        </div>
        <div className="h-2 w-full bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${(step / 6) * 100}%` }}
          />
        </div>
      </div>

      <div className="w-full max-w-2xl card-container">
        {step === 1 && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-neutral">Let&apos;s get to know you</h1>
            <p className="text-secondary">Tell us a bit about yourself so we can personalize your experience.</p>
            <div className="grid gap-4">
              <div>
                <label className="label-text">Full Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="E.g., Rahul Sharma" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Age</label>
                  <input 
                    type="number" 
                    min="0"
                    max="150"
                    className="input-field" 
                    placeholder="28" 
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label-text">City</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="Mumbai" 
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="label-text">Occupation</label>
                <select 
                  className="input-field bg-white"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                >
                  <option>Salaried</option>
                  <option>Self-Employed</option>
                  <option>Business Owner</option>
                  <option>Student</option>
                  <option>Retired</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-neutral">Your Income</h1>
            <p className="text-secondary">Let&apos;s start with what you bring home.</p>
            <div className="grid gap-4">
              <div>
                <label className="label-text">Monthly Take-Home Salary (₹)</label>
                <input 
                  type="number" 
                  min="0"
                  max="999999999"
                  className="input-field text-2xl font-bold" 
                  placeholder="0" 
                  value={monthlySalary}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMonthlySalary(val);
                    if (val && !annualCtc) {
                      setAnnualCtc(String(parseFloat(val) * 12));
                    }
                  }}
                />
                <p className="text-xs text-muted mt-1">What lands in your bank account after TDS?</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Annual CTC (₹)</label>
                  <input 
                    type="number" 
                    min="0"
                    max="999999999"
                    className="input-field" 
                    placeholder="0" 
                    value={annualCtc}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAnnualCtc(val);
                      if (val) {
                        setMonthlySalary(String(Math.floor(parseFloat(val) / 12)));
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="label-text">Other Income (₹)</label>
                  <input 
                    type="number" 
                    min="0"
                    max="999999999"
                    className="input-field" 
                    placeholder="0" 
                    value={otherIncome}
                    onChange={(e) => setOtherIncome(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-neutral">Your Monthly Expenses</h1>
            <p className="text-secondary">Estimate your key recurring expenses.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-text">Rent / Home EMI (₹)</label>
                <input 
                  type="number" 
                  min="0"
                  max="999999999"
                  className="input-field" 
                  placeholder="0" 
                  value={rent}
                  onChange={(e) => setRent(e.target.value)}
                />
              </div>
              <div>
                <label className="label-text">Food & Dining (₹)</label>
                <input 
                  type="number" 
                  min="0"
                  max="999999999"
                  className="input-field" 
                  placeholder="0" 
                  value={food}
                  onChange={(e) => setFood(e.target.value)}
                />
              </div>
              <div>
                <label className="label-text">Utilities & Bills (₹)</label>
                <input 
                  type="number" 
                  min="0"
                  max="999999999"
                  className="input-field" 
                  placeholder="0" 
                  value={utilities}
                  onChange={(e) => setUtilities(e.target.value)}
                />
              </div>
              <div>
                <label className="label-text">Shopping & Wants (₹)</label>
                <input 
                  type="number" 
                  min="0"
                  max="999999999"
                  className="input-field" 
                  placeholder="0" 
                  value={shopping}
                  onChange={(e) => setShopping(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-neutral">Primary Goal</h1>
            <p className="text-secondary">What is your immediate focus for saving?</p>
            <div className="grid gap-4">
              <div>
                <label className="label-text">Goal Name</label>
                <select 
                  className="input-field bg-white"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                >
                  <option>Emergency Fund</option>
                  <option>New Car</option>
                  <option>Home Downpayment</option>
                  <option>Marriage</option>
                  <option>Higher Education</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Target Amount (₹)</label>
                  <input 
                    type="number" 
                    min="0"
                    max="999999999"
                    className="input-field" 
                    placeholder="E.g., 3,00,000" 
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label-text">Target Date</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={goalDeadline}
                    onChange={(e) => setGoalDeadline(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-neutral">EMIs & Liabilities</h1>
            <p className="text-secondary">Do you have any active loans or credit card debt?</p>
            <div className="flex gap-4 mb-4">
              <button 
                type="button"
                onClick={() => setHasLoan(true)}
                className={`flex-1 py-4 border-2 rounded-xl font-bold text-sm transition-all ${
                  hasLoan ? 'border-accent bg-accent/5 text-accent' : 'border-border text-secondary'
                }`}
              >
                Yes, I have loans
              </button>
              <button 
                type="button"
                onClick={() => setHasLoan(false)}
                className={`flex-1 py-4 border-2 rounded-xl font-bold text-sm transition-all ${
                  !hasLoan ? 'border-accent bg-accent/5 text-accent' : 'border-border text-secondary'
                }`}
              >
                No active loans
              </button>
            </div>

            {hasLoan && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
                <div>
                  <label className="label-text">Loan Type</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="E.g., Car Loan, HDFC Card" 
                    value={loanName}
                    onChange={(e) => setLoanName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label-text">Outstanding Amount (₹)</label>
                  <input 
                    type="number" 
                    min="0"
                    max="999999999"
                    className="input-field" 
                    placeholder="0" 
                    value={loanOutstanding}
                    onChange={(e) => setLoanOutstanding(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label-text">Monthly EMI (₹)</label>
                  <input 
                    type="number" 
                    min="0"
                    max="999999999"
                    className="input-field" 
                    placeholder="0" 
                    value={emiAmount}
                    onChange={(e) => setEmiAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label-text">Interest Rate (% APR)</label>
                  <input 
                    type="number" 
                    min="0"
                    max="100"
                    className="input-field" 
                    placeholder="E.g., 9.5" 
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-neutral">Risk Profile</h1>
            <p className="text-secondary">How do you prefer to invest?</p>
            <div className="grid gap-4 md:grid-cols-3">
              <button 
                onClick={() => setRiskProfile("conservative")}
                className={`p-4 border-2 rounded-xl text-left transition-all ${
                  riskProfile === "conservative" ? "border-accent bg-accent/5" : "border-border hover:border-accent"
                }`}
              >
                <div className="text-2xl mb-2">🛡️</div>
                <h3 className="font-bold text-neutral mb-1">Conservative</h3>
                <p className="text-sm text-secondary">I prefer safety. FDs, PPF, Bonds.</p>
              </button>
              <button 
                onClick={() => setRiskProfile("moderate")}
                className={`p-4 border-2 rounded-xl text-left transition-all ${
                  riskProfile === "moderate" ? "border-accent bg-accent/5" : "border-border hover:border-accent"
                }`}
              >
                <div className="text-2xl mb-2">⚖️</div>
                <h3 className="font-bold text-neutral mb-1">Moderate</h3>
                <p className="text-sm text-secondary">Balanced approach. Mix of equity & debt.</p>
              </button>
              <button 
                onClick={() => setRiskProfile("aggressive")}
                className={`p-4 border-2 rounded-xl text-left transition-all ${
                  riskProfile === "aggressive" ? "border-accent bg-accent/5" : "border-border hover:border-accent"
                }`}
              >
                <div className="text-2xl mb-2">🚀</div>
                <h3 className="font-bold text-neutral mb-1">Aggressive</h3>
                <p className="text-sm text-secondary">Mostly equity & stocks.</p>
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8 pt-6 border-t border-border">
          <button
            onClick={handleBack}
            disabled={step === 1 || isLoading}
            className={`secondary-btn flex items-center gap-2 ${step === 1 || isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <button 
            onClick={handleNext} 
            disabled={isLoading}
            className="primary-btn flex items-center gap-2 disabled:opacity-75"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Generating Plan...
              </>
            ) : (
              <>
                {step === 6 ? (
                  <>
                    Build My Plan <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
                  </>
                ) : "Continue"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
