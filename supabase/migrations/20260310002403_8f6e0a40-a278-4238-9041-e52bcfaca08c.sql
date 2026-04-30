
-- Create update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Bills table
CREATE TABLE public.bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bills" ON public.bills FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bills" ON public.bills FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bills" ON public.bills FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bills" ON public.bills FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON public.bills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Linked bank accounts (Plaid)
CREATE TABLE public.linked_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plaid_item_id TEXT NOT NULL,
  plaid_access_token TEXT NOT NULL,
  institution_name TEXT,
  account_name TEXT,
  account_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.linked_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own linked accounts" ON public.linked_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own linked accounts" ON public.linked_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own linked accounts" ON public.linked_accounts FOR DELETE USING (auth.uid() = user_id);

-- Transactions (from Plaid or manual)
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_account_id UUID REFERENCES public.linked_accounts(id) ON DELETE SET NULL,
  plaid_transaction_id TEXT,
  name TEXT NOT NULL,
  category TEXT,
  amount NUMERIC(10,2) NOT NULL,
  date DATE NOT NULL,
  is_manual BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON public.transactions FOR DELETE USING (auth.uid() = user_id);
