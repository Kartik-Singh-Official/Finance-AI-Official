export interface Profile {
  id: string;
  full_name: string | null;
  age: number | null;
  city: string | null;
  occupation: string | null;
  monthly_salary: number;
  annual_ctc: number;
  other_income: number | null;
  risk_appetite: "conservative" | "moderate" | "aggressive" | string;
  onboarding_done: boolean;
  created_at?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: "income" | "expense" | string;
  category: string;
  note: string | null;
  payment_method: string | null;
  date: string;
  created_at?: string;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount?: number;
  deadline: string | null;
  created_at?: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  limit_amount: number;
  period: "monthly" | string;
  created_at?: string;
}

export interface Loan {
  id: string;
  user_id: string;
  loan_name: string;
  principal: number;
  outstanding: number;
  emi_amount: number;
  interest_rate: number;
  start_date?: string;
  end_date?: string;
  created_at?: string;
}

export interface Investment {
  id: string;
  user_id: string;
  name: string;
  type: string;
  amount: number;
  current_value: number;
  date: string;
  created_at?: string;
}

export interface ExpenseProfile {
  id?: string;
  user_id?: string;
  category: string;
  monthly_amount: number;
  created_at?: string;
}
