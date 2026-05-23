# 🤖 FinanceAI India — Smart AI Personal Finance Manager

[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Upstash Redis](https://img.shields.io/badge/Upstash_Redis-Rate_Limiter-FF4433?style=for-the-badge&logo=redis&logoColor=white)](https://upstash.com/)

**FinanceAI India** is a premium personal finance tracking and AI advisory application designed specifically for Indian savers. Built with a modern tech stack (Next.js 14, Supabase, Tailwind, Gemini AI), it helps users optimize their monthly budget, visualize active commitments, plan taxes (Old vs. New regime), and interact with an elite AI advisor powered by Google's Gemini SDK.

---

## ⚡ Key Features

*   **🤖 Real-Time Streaming AI Advisor:** Ask complex Indian financial questions (ELSS vs PPF, Section 80C optimizations, HRA claims) and watch the AI stream answers word-by-word with bouncing thinking indicators and smooth auto-scrolling conversation containers.
*   **📊 Dynamic Financial Blueprints:** Auto-generates detailed personal finance charts and projections (Needs/Wants/Savings splits based on the golden 50/30/20 budget rule).
*   **💳 RLS-Secured Transaction Book:** Add, view, filter, and delete transactions. The note text is auto-categorized by local high-fidelity fallback arrays or Gemini classification APIs.
*   **📈 Multi-Commitment Dashboards:** Tracks active goals (e.g., home downpayment, higher education) and active loans/EMIs with exact outstanding interest metrics.
*   **📑 Regime-Adjusted Tax Planner:** Evaluates Old vs. New tax regimes for FY 24-25, advising on standard deduction limits (₹75k vs ₹50k) and investment opportunities.
*   **🌐 Dual-Mode Resilience:** Operates in a hybrid state. If external Gemini APIs or database keys are offline, it activates **high-fidelity local client-side diagnostics and typing loops** to guarantee 100% application uptime.

---

## 🏗️ System Architecture

```mermaid
graph TD
  Client[Client Browser: Tailwind + React] -->|HTTPS Requests + Bearer Token| Middleware[Next.js Auth Middleware]
  Middleware -->|Authentication Verification| Supabase[Supabase PostgreSQL DB]
  Client -->|Stream API Post| ChatRoute[/api/ai/chat]
  ChatRoute -->|IP Rate Limit Check| Redis[Upstash Redis Rest pipeline]
  ChatRoute -->|CSRF Check & Profile Sanitization| Gemini[Google Gemini AI Engine]
  Client -->|Account Deletion Request| DeleteRoute[/api/account/delete]
  DeleteRoute -->|Password Re-authentication| SupabaseAuth[Supabase Auth Client]
  DeleteRoute -->|Cascade Wipe Trigger| Supabase
```

---

## 🛡️ Enterprise-Grade Security & Production Hardening

This project underwent a comprehensive **19-point security audit** and code hardening cycle to achieve a state of production deployment readiness:

*   **🔒 Strict Content Security Policy (CSP):** Employs strict security headers protecting user assets against Clickjacking, MIME-sniffing, and Cross-Site Scripting (XSS).
*   **🛡️ Multi-Tier CSRF Protection:** Actively validates HTTP `Origin` and `Referer` values against environment-defined hosts to isolate backend handlers.
*   **⚡ Serverless-Safe Rate Limiting:** Utilizes Upstash Redis pipelines connected to spoof-resistant connecting client IP extractions to block DDOS attempts.
*   **🔄 Safe Account Deletion & Re-Auth:** Gated behind client-side prompts, requiring password confirmations validated directly on the backend before completing transactional cascade data purges.
*   **🧹 Leak-Free Cookies & Environment:** All dev-mode mock configurations are explicitly gated to non-production blocks, sign-out loops cleanly wipe all cookie clusters, and internal database details are safely normalized via friendly error formatting.

---

## 🚀 Getting Started Locally

### 1. Prerequisites
*   Node.js (v20+ recommended)
*   A Supabase Project
*   A Google Gemini AI API Key
*   An Upstash Redis Database (Optional for dev, required in production)

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/yourusername/financeai-india.git
cd financeai-india
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
GEMINI_API_KEY=your-gemini-api-key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional locally (defaults to in-memory rate limiting), required in production:
UPSTASH_REDIS_REST_URL=your-upstash-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-token
```

### 4. Running the Dev Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to explore!

---

## 📦 Deployment Guide

### Deploying to Netlify (Via CLI - Serverless Enabled)
To build, package, and deploy all live Gemini AI streaming APIs and Supabase delete routes securely without exposing files:

1.  Install the CLI globally: `npm install -g netlify-cli`
2.  Login: `netlify login`
3.  Link & Init: `netlify init` (Follow prompts to create a new site)
4.  Push Build & Deploy: `netlify deploy --build --prod`
5.  Go to the Netlify Web Settings ➔ **Environment variables** and paste your `.env.local` keys.

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
