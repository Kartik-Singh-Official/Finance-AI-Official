"use client";

import { useState } from "react";
import { Download, FileText, Calendar, PieChart, TrendingUp, ChevronRight, FileCheck, Loader2 } from "lucide-react";

const reports = [
  { 
    id: 1, 
    title: "Financial Map", 
    description: "Your complete personalized life plan including salary allocation, goal timeline, and tax strategy.", 
    type: "Full Plan", 
    icon: <PieChart className="w-6 h-6" />,
    color: "bg-accent"
  },
  { 
    id: 2, 
    title: "Monthly Spending Report", 
    description: "Detailed breakdown of your May 2026 transactions, budget performance, and AI spending insights.", 
    type: "Monthly", 
    icon: <Calendar className="w-6 h-6" />,
    color: "bg-emerald-500"
  },
  { 
    id: 3, 
    title: "Tax Summary FY 25-26", 
    description: "Ready-to-use summary of your projected income, deductions, and tax liability for filing.", 
    type: "Tax", 
    icon: <FileCheck className="w-6 h-6" />,
    color: "bg-indigo-600"
  },
  { 
    id: 4, 
    title: "Investment Portfolio Audit", 
    description: "Comprehensive audit of your holdings, XIRR performance, and suggested rebalancing.", 
    type: "Portfolio", 
    icon: <TrendingUp className="w-6 h-6" />,
    color: "bg-amber-500"
  },
];

export default function ReportsPage() {
  const [generatingId, setGeneratingId] = useState<number | null>(null);

  const handleGenerate = (id: number, title: string) => {
    setGeneratingId(id);

    setTimeout(async () => {
      try {
        const { default: jsPDF } = await import("jspdf");
        const doc = new jsPDF();
        
        // Premium PDF Styling
        doc.setFillColor(15, 23, 42); // Navy primary background
        doc.rect(0, 0, 210, 40, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("FinanceAI India", 15, 20);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("YOUR SMART MONEY BLUEPRINT", 15, 30);

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(title, 15, 60);

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text("Generated securely on your device on " + new Date().toLocaleDateString('en-IN'), 15, 70);

        // Grid/Plan mockup content in PDF
        doc.setFont("helvetica", "bold");
        doc.text("1. RECOMMENDED ALLOCATION", 15, 90);
        doc.setFont("helvetica", "normal");
        doc.text("- Fixed Essentials: 50% (Rent, Utilities, Food)", 20, 100);
        doc.text("- Variable Wants: 30% (Shopping, Travel, Dine out)", 20, 110);
        doc.text("- Savings & Investments: 20% (Mutual Funds, Equity SIP)", 20, 120);

        doc.setFont("helvetica", "bold");
        doc.text("2. CORE WEALTH STRATEGY", 15, 140);
        doc.setFont("helvetica", "normal");
        doc.text("- Start a monthly index SIP of at least ₹15,000", 20, 150);
        doc.text("- Maximize tax benefits under Section 80C & 80D", 20, 160);
        doc.text("- Build emergency buffer of 6x monthly expenses", 20, 170);

        // Save PDF
        doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
      } catch (error) {
        console.error(error);
      } finally {
        setGeneratingId(null);
      }
    }, 1500);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-neutral">Reports & Downloads</h1>
        <p className="text-secondary text-sm mt-1">Export your financial data in beautiful PDF reports.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {reports.map((report) => (
          <div 
            key={report.id} 
            onClick={() => generatingId === null && handleGenerate(report.id, report.title)}
            className="card-container flex items-center gap-6 p-6 hover:border-accent transition-all group cursor-pointer"
          >
            <div className={`w-16 h-16 ${report.color} text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
              {report.icon}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted">{report.type}</span>
                <span className="w-1 h-1 bg-border rounded-full" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted">PDF</span>
              </div>
              <h3 className="text-xl font-bold text-neutral group-hover:text-accent transition-colors">{report.title}</h3>
              <p className="text-sm text-secondary mt-1 max-w-xl">{report.description}</p>
            </div>

            <button 
              onClick={(e) => { e.stopPropagation(); handleGenerate(report.id, report.title); }}
              disabled={generatingId !== null}
              className="primary-btn flex items-center gap-2 py-3 px-6 shadow-sm group-hover:shadow-accent/20 transition-all disabled:opacity-75"
            >
              {generatingId === report.id ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" /> Generate
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="card-container bg-slate-900 border-none p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-2">Quarterly Financial Review</h2>
          <p className="text-secondary text-sm max-w-md mb-6">Our most comprehensive audit. We compare your last 3 months against your long-term goals and suggest major pivots if needed.</p>
          <button className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-page transition-all">
            Schedule Review <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="absolute top-0 right-0 w-64 h-full bg-accent/20 skew-x-12 -mr-16" />
      </div>

      <div className="flex items-center gap-2 text-xs text-secondary italic">
        <FileText className="w-4 h-4" />
        All reports are generated securely on your device. We never store your cleartext data.
      </div>
    </div>
  );
}
