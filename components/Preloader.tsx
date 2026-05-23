"use client";

import { useEffect, useState } from "react";
import { Sparkles, Wallet } from "lucide-react";

export default function Preloader() {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Securing connection...");
  const [isVisible, setIsVisible] = useState(true);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    // Only show preloader once per session to maintain an optimal user flow
    if (typeof window !== "undefined") {
      const shown = sessionStorage.getItem("financeai_preloader_shown");
      if (shown) {
        setIsVisible(false);
        return;
      }
      document.body.classList.add("preloader-active");
      setIsRendered(true);
    }
  }, []);

  useEffect(() => {
    if (!isRendered) return;

    // Elegant multi-stage loading bar sequence
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsVisible(false);
            document.body.classList.remove("preloader-active");
            sessionStorage.setItem("financeai_preloader_shown", "true");
          }, 600);
          return 100;
        }

        const nextProgress = prev + Math.floor(Math.random() * 15) + 5;
        const boundedProgress = Math.min(nextProgress, 100);

        // Update status text based on progress stage
        if (boundedProgress < 30) {
          setStatusText("Initializing secure auth...");
        } else if (boundedProgress < 60) {
          setStatusText("Analyzing transaction metrics...");
        } else if (boundedProgress < 85) {
          setStatusText("Optimizing AI recommendations...");
        } else {
          setStatusText("Namaste! Welcome back.");
        }

        return boundedProgress;
      });
    }, 180);

    return () => clearInterval(interval);
  }, [isRendered]);

  if (!isVisible || !isRendered) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-[#0F172A] flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${
        progress === 100 ? "opacity-0 translate-y-[-100%]" : "opacity-100"
      }`}
    >
      {/* Decorative ambient glowing circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse duration-4000" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse duration-3000" />

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full px-6">
        {/* Glowing Logo Icon Wrapper */}
        <div className="relative mb-6 animate-bounce duration-2000">
          <div className="absolute inset-0 bg-accent/30 rounded-2xl blur-xl scale-125" />
          <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center relative border border-white/10 shadow-2xl">
            <Wallet className="text-white w-8 h-8" />
          </div>
          <Sparkles className="absolute -top-1 -right-1 text-amber-400 w-5 h-5 animate-pulse" />
        </div>

        {/* Brand Header */}
        <h1 className="text-2xl font-bold text-white tracking-wide mb-1 flex items-center gap-2">
          FinanceAI <span className="text-accent">India</span>
        </h1>
        <p className="text-xs text-[#94A3B8] font-medium uppercase tracking-widest mb-8">
          Smart Wealth Platform
        </p>

        {/* Shimmer Glass Progress Container */}
        <div className="w-full bg-[#1E293B] border border-white/5 h-2.5 rounded-full overflow-hidden relative shadow-inner backdrop-blur-md">
          <div
            className="h-full bg-gradient-to-r from-accent to-emerald-500 rounded-full transition-all duration-300 ease-out shadow-[0_0_12px_rgba(99,102,241,0.5)] relative overflow-hidden"
            style={{ width: `${progress}%` }}
          >
            {/* Glossy overlay effect */}
            <div className="absolute inset-0 bg-white/20 skew-x-[-20deg] animate-pulse" />
          </div>
        </div>

        {/* Dynamic Status and Percentage Counter */}
        <div className="w-full flex items-center justify-between mt-4">
          <span className="text-xs font-semibold text-secondary animate-pulse">{statusText}</span>
          <span className="text-xs font-bold text-accent tabular-nums-style">{progress}%</span>
        </div>
      </div>
    </div>
  );
}
