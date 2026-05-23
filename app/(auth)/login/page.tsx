"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Wallet, Loader2 } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { getFriendlyErrorMessage } from "@/lib/errors";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    !isSupabaseConfigured
      ? "⚠️ Environment Config Missing:\nYour Supabase credentials are missing on Netlify!\n\nTo fix this:\n1. Open your Netlify Dashboard.\n2. Navigate to 'Site Settings' > 'Environment variables'.\n3. Add 'NEXT_PUBLIC_SUPABASE_URL' and 'NEXT_PUBLIC_SUPABASE_ANON_KEY' with your Supabase values.\n4. Re-deploy your Netlify site for changes to take effect!"
      : null
  );
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;

      if (data.user) {
        // Check if onboarding is done
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_done')
          .eq('id', data.user.id)
          .single();

        if (profile?.onboarding_done) {
          router.push("/dashboard");
        } else {
          router.push("/onboarding");
        }
      }
    } catch (err: any) {
      if (err.message?.toLowerCase().includes("email not confirmed") || err.code === "email_not_confirmed") {
        setError(
          "🔒 Email not confirmed!\n\n" +
          "To log in to your account without email validation:\n" +
          "1. Open your Supabase Dashboard (https://supabase.com/dashboard)\n" +
          "2. Click on 'Authentication' 🔑 -> 'Settings' or 'Providers' -> 'Email'\n" +
          "3. Toggle 'Confirm email' to OFF and save changes.\n\n" +
          "Once disabled, you can sign in here instantly!"
        );
      } else {
        setError(getFriendlyErrorMessage(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first so we can send a password recovery link.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });
      if (error) throw error;
      alert("Password reset email sent successfully! Please check your inbox.");
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md card-container">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center mb-4">
            <Wallet className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-neutral">Welcome back</h1>
          <p className="text-secondary text-sm">Sign in to your FinanceAI account</p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-lg text-sm mb-6 whitespace-pre-line font-medium leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="label-text">Email Address</label>
            <input 
              type="email" 
              className="input-field" 
              placeholder="you@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <label className="label-text">Password</label>
              <button type="button" onClick={handleForgotPassword} className="text-[10px] text-accent font-bold uppercase tracking-wider hover:underline">Forgot?</button>
            </div>
            <input 
              type="password" 
              className="input-field" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="primary-btn w-full flex items-center justify-center gap-2 mt-6 disabled:opacity-70"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>Sign In <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-secondary">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-accent hover:underline font-medium">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
