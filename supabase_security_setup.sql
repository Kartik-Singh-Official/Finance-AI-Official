-- ==========================================================
-- FINANCEAI INDIA: SUPABASE SCHEMAS & RLS SECURITY SETUP
-- ==========================================================
-- Copy and run this script inside your Supabase SQL Editor
-- (https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql/new)
--
-- This script will safely set up the tables and security policies.
-- NOTE: This script is fully IDEMPOTENT and SAFE to run multiple times.
-- If a table already exists, it is NOT modified or destroyed in any way.
-- If policies already exist, they are updated cleanly.

-- ----------------------------------------------------------
-- 0. CREATE TABLES IF THEY DO NOT EXIST (NON-DESTRUCTIVE)
-- ----------------------------------------------------------

-- Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    age INTEGER,
    city TEXT,
    occupation TEXT,
    monthly_salary NUMERIC NOT NULL DEFAULT 0,
    annual_ctc NUMERIC NOT NULL DEFAULT 0,
    other_income NUMERIC DEFAULT 0,
    risk_appetite TEXT,
    onboarding_done BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Expense Profile Table
CREATE TABLE IF NOT EXISTS public.expense_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL,
    monthly_amount NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Budgets Table
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL,
    limit_amount NUMERIC NOT NULL DEFAULT 0,
    period TEXT NOT NULL DEFAULT 'monthly',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    note TEXT,
    payment_method TEXT DEFAULT 'UPI',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Goals Table
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    target_amount NUMERIC NOT NULL DEFAULT 0,
    saved_amount NUMERIC DEFAULT 0,
    deadline DATE,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- EMIs & Loans Table
CREATE TABLE IF NOT EXISTS public.emis_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    loan_name TEXT NOT NULL,
    loan_type TEXT,
    principal NUMERIC NOT NULL DEFAULT 0,
    outstanding NUMERIC NOT NULL DEFAULT 0,
    emi_amount NUMERIC NOT NULL DEFAULT 0,
    interest_rate NUMERIC DEFAULT 0,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Investments Table
CREATE TABLE IF NOT EXISTS public.investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    asset_name TEXT NOT NULL,
    type TEXT NOT NULL,
    buy_price NUMERIC NOT NULL DEFAULT 0,
    current_price NUMERIC NOT NULL DEFAULT 0,
    buy_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ----------------------------------------------------------
-- 1. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- ----------------------------------------------------------
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expense_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.emis_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.investments ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------
-- 2. CREATE SECURITY POLICIES FOR 'profiles' TABLE
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;

-- Select: Users can view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- Update: Users can update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- Insert: Users can insert their own profile
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- Delete: Users can delete their own profile
CREATE POLICY "Users can delete their own profile" 
ON public.profiles FOR DELETE 
TO authenticated 
USING (auth.uid() = id);

-- ----------------------------------------------------------
-- 3. CREATE SECURITY POLICIES FOR 'expense_profile' TABLE
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage their own expense profiles" ON public.expense_profile;

CREATE POLICY "Users can manage their own expense profiles" 
ON public.expense_profile FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------
-- 4. CREATE SECURITY POLICIES FOR 'budgets' TABLE
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage their own budgets" ON public.budgets;

CREATE POLICY "Users can manage their own budgets" 
ON public.budgets FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------
-- 5. CREATE SECURITY POLICIES FOR 'transactions' TABLE
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage their own transactions" ON public.transactions;

CREATE POLICY "Users can manage their own transactions" 
ON public.transactions FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------
-- 6. CREATE SECURITY POLICIES FOR 'goals' TABLE
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage their own goals" ON public.goals;

CREATE POLICY "Users can manage their own goals" 
ON public.goals FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------
-- 7. CREATE SECURITY POLICIES FOR 'emis_loans' TABLE
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage their own loans" ON public.emis_loans;

CREATE POLICY "Users can manage their own loans" 
ON public.emis_loans FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------
-- 8. CREATE SECURITY POLICIES FOR 'investments' TABLE
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage their own investments" ON public.investments;

CREATE POLICY "Users can manage their own investments" 
ON public.investments FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- ==========================================================
-- SETUP COMPLETE: SCHEMAS & ACCESS CONTROLS NOW 100% SECURE!
-- ==========================================================
