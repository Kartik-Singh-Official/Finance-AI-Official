"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Calculator, 
  TrendingUp, 
  ShieldCheck, 
  Lightbulb,
  ArrowRight
} from "lucide-react";

const quickPrompts = [
  { text: "How much should I invest this month?", icon: <TrendingUp className="w-4 h-4" /> },
  { text: "Am I spending too much on food?", icon: <Lightbulb className="w-4 h-4" /> },
  { text: "What stocks should I buy for ₹5000?", icon: <Sparkles className="w-4 h-4" /> },
  { text: "How do I save tax before March 31?", icon: <Calculator className="w-4 h-4" /> },
  { text: "Should I prepay my home loan?", icon: <ShieldCheck className="w-4 h-4" /> },
];

export default function AIAdvisorPage() {
  const [messages, setMessages] = useState([
    { 
      role: 'ai', 
      content: "Namaste! I'm your FinanceAI assistant. I've analyzed your financial profile. How can I help you optimize your money today?" 
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data) setProfile(data);
          });
      } else {
        const isMock = typeof window !== 'undefined' && document.cookie.includes("mock-session");
        if (isMock) {
          const cached = localStorage.getItem("mock-profile");
          if (cached) {
            try {
              setProfile(JSON.parse(cached));
            } catch (e) {
              // Ignore
            }
          }
        }
      }
    });

    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const queryPrompt = searchParams.get("prompt");
      if (queryPrompt) {
        setInput(queryPrompt);
      }
    }
  }, []);

  const simulateClientSideTyping = (fullText: string, baseMessages: any[]) => {
    // Split by words to simulate typing smoothly
    const words = fullText.split(' ');
    let currentText = '';
    let wordIndex = 0;
    
    // Add initial empty AI message
    setMessages([...baseMessages, { role: 'ai', content: '' }]);
    
    const interval = setInterval(() => {
      if (wordIndex < words.length) {
        currentText += (wordIndex === 0 ? '' : ' ') + words[wordIndex];
        wordIndex++;
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0 && updated[updated.length - 1].role === 'ai') {
            updated[updated.length - 1] = { role: 'ai', content: currentText };
          }
          return updated;
        });
      } else {
        clearInterval(interval);
        setIsLoading(false);
      }
    }, 25); // 25ms per word is highly fluid and fast!
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const query = input; // Capture the query immediately before clearing it (BUG-05)
    const userMsg = { role: 'user', content: query };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const reqHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        reqHeaders['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({ 
          messages: newMessages,
          profile: profile || { name: 'Saver', city: 'India', salary: 100000 }
        }),
      });
      
      if (!response.ok) throw new Error("API Route offline or 404");
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/event-stream')) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error("No reader available");

        // Add empty AI message that we will stream into
        setMessages([...newMessages, { role: 'ai', content: '' }]);

        let done = false;
        let streamedText = '';

        try {
          while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            if (value) {
              const chunk = decoder.decode(value, { stream: !done });
              streamedText += chunk;
              setMessages(prev => {
                const updated = [...prev];
                if (updated.length > 0 && updated[updated.length - 1].role === 'ai') {
                  updated[updated.length - 1] = { role: 'ai', content: streamedText };
                }
                return updated;
              });
            }
          }
        } finally {
          reader.releaseLock();
        }
        setIsLoading(false);
      } else {
        const data = await response.json();
        setMessages([...newMessages, { role: 'ai', content: data.text }]);
        setIsLoading(false);
      }
    } catch (error) {
      console.warn("AI Chat API route failed or 404. Running high-fidelity offline advisor fallback...", error);
      try {
        const text = generateClientSideOfflineResponse(query, profile);
        simulateClientSideTyping(text, newMessages);
      } catch (fallbackError) {
        console.error("Offline advisor fallback failed:", fallbackError);
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px-64px)] md:h-[calc(100vh-140px)] gap-6">
      
      {/* Sidebar - Quick Prompts */}
      <div className="hidden lg:flex flex-col w-72 space-y-4 overflow-y-auto pr-2">
        <h3 className="text-sm font-bold text-neutral uppercase tracking-wider mb-2">Quick Prompts</h3>
        {quickPrompts.map((prompt, i) => (
          <button 
            key={i} 
            onClick={() => setInput(prompt.text)}
            className="flex items-center gap-3 p-4 bg-white border border-border rounded-xl text-left text-sm hover:border-accent hover:text-accent transition-all group shadow-sm"
          >
            <div className="p-2 bg-page rounded-lg group-hover:bg-accent/5 transition-colors">
              {prompt.icon}
            </div>
            <span className="font-medium">{prompt.text}</span>
          </button>
        ))}
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white border border-border rounded-2xl shadow-sm overflow-hidden relative">
        
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-border bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent text-white rounded-full flex items-center justify-center shadow-lg shadow-accent/20">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-neutral flex items-center gap-2">
                FinanceAI Advisor <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Online</span>
              </h2>
              <p className="text-xs text-secondary">Expert Indian Finance Advice</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                  msg.role === 'user' ? 'bg-indigo-100 text-accent' : 'bg-accent text-white'
                }`}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-accent text-white rounded-tr-none' 
                    : 'bg-page text-neutral border border-border rounded-tl-none shadow-sm'
                }`}>
                  {renderFormattedContent(msg.content, msg.role === 'user')}
                </div>
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== 'ai' && (
            <div className="flex justify-start">
              <div className="flex gap-3 max-w-[80%]">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 bg-accent text-white animate-pulse">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-4 bg-page text-neutral border border-border rounded-2xl rounded-tl-none shadow-sm flex flex-col gap-2 min-w-[150px]">
                  <div className="flex items-center gap-1.5 py-1">
                    <span className="w-2.5 h-2.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.8s' }} />
                    <span className="w-2.5 h-2.5 bg-accent/70 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '0.8s' }} />
                    <span className="w-2.5 h-2.5 bg-accent/40 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '0.8s' }} />
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 tracking-wide animate-pulse">FinanceAI is thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-slate-50 border-t border-border">
          <div className="relative flex items-center gap-2 max-w-4xl mx-auto">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask anything about your money..." 
              className="flex-1 bg-white border border-border rounded-xl px-4 py-4 pr-12 text-sm focus:outline-none focus:border-accent shadow-sm" 
            />
            <button 
              onClick={handleSend}
              disabled={isLoading}
              className={`absolute right-2 p-2 rounded-lg transition-all shadow-md ${
                isLoading ? 'bg-muted text-secondary cursor-not-allowed' : 'bg-accent text-white hover:bg-accent-hover'
              }`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-center text-muted mt-3 italic">
            AI can make mistakes. Always consult a professional for serious financial decisions.
          </p>
        </div>

      </div>
    </div>
  );
}

/**
 * Premium structured text formatter supporting custom bullet points,
 * numbered list grids, and tokenized bold decorators.
 */
function renderFormattedContent(content: string, isUser: boolean) {
  if (!content) return null;
  const lines = content.split('\n');
  
  return (
    <div className="space-y-2.5">
      {lines.map((line, lineIndex) => {
        let trimmed = line.trim();
        if (!trimmed) return <div key={lineIndex} className="h-1.5" />;
        
        // Handle Bullet Lists (* item or - item)
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          const text = trimmed.substring(2);
          return (
            <ul key={lineIndex} className={`list-disc pl-5 my-1.5 space-y-1.5 ${isUser ? 'text-white' : 'text-[#334155]'}`}>
              <li className="leading-relaxed">{parseBoldText(text, isUser)}</li>
            </ul>
          );
        }
        
        // Handle Numbered List Elements (1. item)
        const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
        if (numMatch) {
          const num = numMatch[1];
          const text = numMatch[2];
          return (
            <div key={lineIndex} className="flex gap-2.5 pl-2.5 my-1.5">
              <span className={`font-extrabold ${isUser ? 'text-white/90' : 'text-accent'}`}>{num}.</span>
              <span className={`flex-1 leading-relaxed ${isUser ? 'text-white' : 'text-[#334155]'}`}>{parseBoldText(text, isUser)}</span>
            </div>
          );
        }
        
        // Plain text lines & paragraphs
        return (
          <p key={lineIndex} className={`text-sm leading-relaxed ${isUser ? 'text-white' : 'text-[#334155]'}`}>
            {parseBoldText(trimmed, isUser)}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Sub-parser transforming **text** instances into styled React tokens.
 */
function parseBoldText(text: string, isUser: boolean) {
  const parts = text.split(/\*\*([\s\S]*?)\*\*/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return (
        <strong 
          key={i} 
          className={`font-bold ${
            isUser 
              ? 'text-white underline decoration-white/35 decoration-2 underline-offset-2' 
              : 'text-slate-900 bg-accent/5 px-2 py-0.5 rounded-lg border border-accent/15 text-[12px] font-semibold tracking-wide'
          }`}
        >
          {part}
        </strong>
      );
    }
    return part;
  });
}

/**
 * High-fidelity client-side offline Financial Advisor response generator
 */
function generateClientSideOfflineResponse(message: string, profile: any): string {
  const msg = message.toLowerCase();
  const name = profile?.full_name || "there";
  const monthlySalary = profile?.monthly_salary || 125000;
  const riskAppetite = profile?.risk_profile || "moderate";

  if (msg.includes("invest") || msg.includes("mutual fund") || msg.includes("sip") || msg.includes("portfolio") || msg.includes("where should i put")) {
    return `Namaste ${name}! For a **${riskAppetite}** investor earning **₹${monthlySalary.toLocaleString('en-IN')}/month**, I recommend a diversified monthly asset allocation:

1. **Equity Mutual Funds (60%)**: 
   * Allocate ₹${Math.floor(monthlySalary * 0.12).toLocaleString('en-IN')} (12%) into a **Nifty 50 Index Fund** for stable large-cap growth.
   * Allocate ₹${Math.floor(monthlySalary * 0.08).toLocaleString('en-IN')} (8%) into an **Active Midcap/Smallcap Fund** for high growth potential.
2. **Tax Savings (ELSS/PPF) (20%)**:
   * Put ₹${Math.floor(monthlySalary * 0.05).toLocaleString('en-IN')} into an **ELSS Mutual Fund** to save tax under Section 80C while earning compounding market returns.
3. **Debt & Emergency Fund (20%)**:
   * Stash remaining capital into a **High-Yield Liquid Mutual Fund** or a **Public Provident Fund (PPF)** for absolute capital safety.

Would you like me to walk you through starting a monthly Auto-SIP? 📈`;
  }

  if (msg.includes("tax") || msg.includes("regime") || msg.includes("deduction") || msg.includes("80c") || msg.includes("80d")) {
    return `Great question, ${name}! Optimizing your taxes can boost your net savings significantly.

Here's an expert tax diagnostic:
1. **Old vs New Regime**: Under FY 2024-25 budget rules, the New Tax Regime is the default and offers a **₹75,000 standard deduction** with zero tax up to ₹7 Lakhs net income. 
2. **Old Regime Benefits**: If your annual deductions (80C, 80D, HRA) exceed ₹3,75,000, the **Old Regime** will save you more money.
3. **Action Items**:
   * **Section 80C**: Exhaust the max ₹1,50,000 limit using **ELSS Funds**, **PPF**, or **EPF**.
   * **Section 80D**: Get medical health insurance for yourself and your parents to deduct up to ₹25,000 (or ₹50,000 for senior citizens).

Let's do a complete regime comparison on our **Tax Planner** page! 📑`;
  }

  if (msg.includes("budget") || msg.includes("expense") || msg.includes("spend") || msg.includes("save") || msg.includes("cost")) {
    const budgetNeeds = Math.floor(monthlySalary * 0.50);
    const budgetWants = Math.floor(monthlySalary * 0.30);
    const budgetSavings = Math.floor(monthlySalary * 0.20);
    
    return `Namaste ${name}! Let's optimize your monthly cash flow using the golden **50/30/20 Rule**:

* **Needs (50%)**: Limit your essential bills (Rent, Groceries, Utilities, EMIs) to **₹${budgetNeeds.toLocaleString('en-IN')}**.
* **Wants (30%)**: Limit lifestyle spending (Dining out, shopping, Netflix) to **₹${budgetWants.toLocaleString('en-IN')}**.
* **Savings (20%)**: Put a minimum of **₹${budgetSavings.toLocaleString('en-IN')}** directly into high-yield mutual fund SIPs on the very day you get your salary!

I recommend setting up monthly budget thresholds in our **Budget Tracker** to auto-alert you when you hit 80% limits! 🚀`;
  }

  if (msg.includes("loan") || msg.includes("emi") || msg.includes("debt") || msg.includes("credit card")) {
    return `Managing liabilities is crucial for compounding wealth, ${name}. Here is my expert framework:

1. **Debt Avalanche**: Focus on paying off high-interest loans (like credit cards at 36%+ or personal loans) first. They act as "anti-investments."
2. **The 40% Rule**: Ensure your total monthly EMIs across all loans (Home, Car, Personal) do not exceed **40% of your take-home monthly salary** (which is ₹${Math.floor(monthlySalary * 0.40).toLocaleString('en-IN')}).
3. **Emergency Cushion**: Keep at least 6 months of absolute EMI commitments in a secure liquid fund so you never default during brief income gaps.

Let's audit your active commitments on our **Loans & EMIs** calculator! 🧮`;
  }

  return `Namaste ${name}! I am your personal **FinanceAI Advisor** 🤖.

How can I help you optimize your money today? You can ask me about:
* **"Where should I invest my monthly salary?"** (SIPs, Equity, Mutual Funds)
* **"How do I maximize my tax deductions under 80C & 80D?"**
* **"What is the best budget model for my monthly cash flow?"**
* **"How do I clear my active home/personal loan EMIs faster?"**`;
}

