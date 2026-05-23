"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  LayoutDashboard, 
  FileText, 
  ArrowRightLeft, 
  Wallet, 
  TrendingUp, 
  Target, 
  CreditCard, 
  Calculator, 
  MessageSquare, 
  Download, 
  Settings, 
  LogOut,
  PieChart,
  Loader2,
  Menu,
  X
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [initials, setInitials] = useState("IS");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        const isMock = process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && document.cookie.includes("mock-session");
        if (isMock) {
          setCheckingAuth(false);
          // Try to get initials from mock-profile
          const cached = localStorage.getItem("mock-profile");
          if (cached) {
            try {
              const profileData = JSON.parse(cached);
              if (profileData.full_name) {
                const parts = profileData.full_name.split(" ");
                const init = parts.map((p: string) => p[0]).join("").toUpperCase().slice(0, 2);
                setInitials(init || "DM");
                return;
              }
            } catch (e) {
              // Ignore
            }
          }
          setInitials("DM");
        } else {
          router.push("/login");
        }
      } else {
        setCheckingAuth(false);
        // Get initials from profile name
        supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data?.full_name) {
              const parts = data.full_name.split(" ");
              const init = parts.map((p: string) => p[0]).join("").toUpperCase().slice(0, 2);
              setInitials(init || "IS");
            } else if (user.email) {
              setInitials(user.email.slice(0, 2).toUpperCase());
            }
          });
      }
    });
  }, [router]);

  const handleSignOut = async () => {
    // Clear mock cookies and storage
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

  const mainNav = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "My Financial Plan", href: "/plan", icon: FileText, highlight: true },
    { name: "Transactions", href: "/transactions", icon: ArrowRightLeft },
  ];

  const moneyNav = [
    { name: "Budget", href: "/budget", icon: Wallet },
    { name: "Investments", href: "/investments", icon: TrendingUp },
    { name: "Goals", href: "/goals", icon: Target },
    { name: "Loans & EMIs", href: "/loans", icon: CreditCard },
  ];

  const planningNav = [
    { name: "Tax Planner", href: "/tax", icon: Calculator },
    { name: "AI Advisor", href: "/advisor", icon: MessageSquare, badge: "AI" },
    { name: "Reports & Downloads", href: "/reports", icon: Download },
  ];

  const renderLinks = (links: any[]) => (
    <ul className="space-y-1">
      {links.map((link) => {
        const isActive = pathname === link.href;
        return (
          <li key={link.name}>
            <Link
              href={link.href}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? "bg-accent/10 text-accent" 
                  : link.highlight
                    ? "text-accent hover:bg-sidebar-hover"
                    : "text-secondary hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <link.icon className="w-5 h-5" />
                {link.name}
              </div>
              {link.badge && (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-accent text-white px-1.5 py-0.5 rounded">
                  {link.badge}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  if (checkingAuth) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-page text-secondary">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-accent" />
        <p className="font-medium">Securing your session...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC] relative">
      {/* Decorative ambient glowing blur elements */}
      <div className="fixed -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-accent/5 blur-[100px] pointer-events-none z-0" />
      <div className="fixed -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none z-0" />

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar flex-shrink-0 border-r border-border/10 relative z-10">
        <div className="h-16 flex items-center px-6 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shadow-lg shadow-accent/20">
              <PieChart className="text-white w-5 h-5 animate-pulse" />
            </div>
            <span className="font-bold text-lg text-white">FinanceAI</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-hide">
          <div>
            <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2 px-3 opacity-60">Main</div>
            {renderLinks(mainNav)}
          </div>
          <div>
            <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2 px-3 opacity-60">Money</div>
            {renderLinks(moneyNav)}
          </div>
          <div>
            <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2 px-3 opacity-60">Planning</div>
            {renderLinks(planningNav)}
          </div>
        </div>

        <div className="p-3 border-t border-white/5">
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === "/settings"
                ? "bg-accent/10 text-accent"
                : "text-secondary hover:text-white hover:bg-white/5"
            }`}
          >
            <Settings className="w-5 h-5" />
            Settings
          </Link>
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-secondary hover:text-white hover:bg-white/5 transition-colors mt-1">
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Topbar */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 md:px-6 flex-shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {/* Hamburger Menu Trigger for Mobile */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 -ml-1 text-secondary hover:text-neutral hover:bg-page rounded-lg md:hidden transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2 text-sm font-semibold text-neutral">
              <span className="capitalize">{pathname.split('/')[1] || 'Dashboard'}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-accent/20 text-accent rounded-full flex items-center justify-center font-bold text-sm shadow-inner">
              {initials}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 relative">
          {children}
        </main>
      </div>

      {/* Mobile Sidebar Slide-over Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop blur */}
          <div 
            className="absolute inset-0 bg-background/50 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Drawer contents */}
          <aside className="relative flex flex-col w-72 max-w-[80vw] bg-sidebar h-full shadow-2xl animate-in slide-in-from-left duration-300 z-50">
            <div className="h-16 flex items-center justify-between px-5 border-b border-white/5 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                  <PieChart className="text-white w-5 h-5" />
                </div>
                <span className="font-bold text-lg text-white">FinanceAI</span>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 text-secondary hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-5 px-3 space-y-6 scrollbar-hide">
              <div>
                <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-3">Main</div>
                {renderLinks(mainNav)}
              </div>
              <div>
                <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-3">Money</div>
                {renderLinks(moneyNav)}
              </div>
              <div>
                <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-3">Planning</div>
                {renderLinks(planningNav)}
              </div>
            </div>

            <div className="p-3 border-t border-white/5 space-y-1 flex-shrink-0">
              <Link
                href="/settings"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === "/settings"
                    ? "bg-accent/10 text-accent"
                    : "text-secondary hover:text-white hover:bg-white/5"
                }`}
              >
                <Settings className="w-5 h-5" />
                Settings
              </Link>
              <button 
                onClick={handleSignOut} 
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-secondary hover:text-white hover:bg-white/5 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Mobile Tab Bar (<768px) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-border flex justify-around items-center px-2 z-40">
        <Link href="/dashboard" className="flex flex-col items-center justify-center w-full h-full text-secondary hover:text-accent">
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-semibold">Home</span>
        </Link>
        <Link href="/transactions" className="flex flex-col items-center justify-center w-full h-full text-secondary hover:text-accent">
          <ArrowRightLeft className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-semibold">Txns</span>
        </Link>
        <Link href="/plan" className="flex flex-col items-center justify-center w-full h-full text-secondary hover:text-accent">
          <FileText className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-semibold">Plan</span>
        </Link>
        <Link href="/advisor" className="flex flex-col items-center justify-center w-full h-full text-secondary hover:text-accent">
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-semibold">Advisor</span>
        </Link>
      </div>
    </div>
  );
}
