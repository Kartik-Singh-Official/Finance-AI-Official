import Link from "next/link";
import { ArrowRight, Shield, TrendingUp, Download, PieChart } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-neutral">
      {/* Navbar */}
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <PieChart className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl text-white">FinanceAI</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-white hover:text-accent transition-colors font-medium">
            Login
          </Link>
          <Link href="/signup" className="primary-btn">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center">
        <div className="inline-block bg-accent/20 text-accent font-semibold px-4 py-1.5 rounded-full mb-6 border border-accent/30 text-sm">
          Made for India 🇮🇳
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 tracking-tight">
          India ka sabse smart <br />
          <span className="text-accent">money manager</span>
        </h1>
        <p className="text-lg md:text-xl text-secondary max-w-2xl mb-10">
          Tell us your salary. We&apos;ll tell you exactly where every rupee should go. 
          Stop guessing and start building wealth with AI-powered financial planning.
        </p>
        <Link href="/signup" className="primary-btn text-lg px-8 py-4 flex items-center gap-2 mb-16 shadow-lg shadow-accent/20 hover:shadow-accent/40">
          Get Started Free — takes 3 minutes <ArrowRight />
        </Link>

        {/* Feature Highlights */}
        <div className="grid md:grid-cols-4 gap-6 w-full max-w-5xl text-left">
          <div className="card-container bg-sidebar border-none shadow-xl transform hover:-translate-y-1 transition-all">
            <PieChart className="text-accent w-8 h-8 mb-4" />
            <h3 className="text-white font-semibold mb-2">Smart Budget Planner</h3>
            <p className="text-secondary text-sm">AI-driven budgets based on your city and income.</p>
          </div>
          <div className="card-container bg-sidebar border-none shadow-xl transform hover:-translate-y-1 transition-all">
            <Shield className="text-positive w-8 h-8 mb-4" />
            <h3 className="text-white font-semibold mb-2">AI Tax Advisor</h3>
            <p className="text-secondary text-sm">Maximize 80C, 80D, and find hidden deductions instantly.</p>
          </div>
          <div className="card-container bg-sidebar border-none shadow-xl transform hover:-translate-y-1 transition-all">
            <TrendingUp className="text-warning w-8 h-8 mb-4" />
            <h3 className="text-white font-semibold mb-2">Investment Picker</h3>
            <p className="text-secondary text-sm">Personalised mutual fund and SIP recommendations.</p>
          </div>
          <div className="card-container bg-sidebar border-none shadow-xl transform hover:-translate-y-1 transition-all">
            <Download className="text-accent w-8 h-8 mb-4" />
            <h3 className="text-white font-semibold mb-2">Financial Map</h3>
            <p className="text-secondary text-sm">Download your complete life plan in a beautiful PDF.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-secondary mt-12 bg-transparent">
        <p>© 2026 FinanceAI India. All rights reserved.</p>
        <p className="font-bold text-accent/95 tracking-wider uppercase text-[10px] bg-accent/5 border border-accent/20 px-3 py-1 rounded-full">
          Founded by Kartik Singh
        </p>
      </footer>
    </div>
  );
}
