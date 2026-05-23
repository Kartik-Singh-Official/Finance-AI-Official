import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0F172A",
        card: "#FFFFFF",
        sidebar: "#1E293B",
        accent: {
          DEFAULT: "#6366F1",
          hover: "#4F46E5",
        },
        positive: "#10B981",
        negative: "#F43F5E",
        warning: "#F59E0B",
        neutral: "#1E293B",
        secondary: "#64748B",
        muted: "#94A3B8",
        border: "#E2E8F0",
        input: "#F8FAFC",
        page: "#F1F5F9",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
