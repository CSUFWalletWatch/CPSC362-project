import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const MonthlyPace = () => {
  const { user } = useAuth();
  const [income, setIncome] = useState(0);
  const [spending, setSpending] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const endOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

    supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", user.id)
      .gte("date", startOfMonth)
      .lte("date", endOfMonth)
      .then(({ data }) => {
        let inc = 0;
        let spend = 0;
        (data || []).forEach((tx) => {
          if (tx.amount > 0) inc += Number(tx.amount);
          else spend += Math.abs(Number(tx.amount));
        });
        setIncome(inc);
        setSpending(spend);
        setLoading(false);
      });
  }, [user]);
    if (loading) return <section className="bg-card rounded-lg p-6"><p className="text-sm text-muted-foreground">Loading...</p></section>;

const ratio = income > 0 ? Math.min(spending / income, 1) : 0;
  const remaining = income - spending;

  return (
    <section className="bg-card rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm font-body text-muted-foreground tracking-wide uppercase">
          This Month's Pace
        </p>
        <Link to="/budget" className="text-sm text-primary hover:underline">
          View →
        </Link>
      </div>

      <div className="flex justify-between items-baseline mb-3">
        <span className="text-sm text-muted-foreground">Spent</span>
        <span className="font-heading text-lg text-foreground">
          ${spending.toLocaleString()}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${ratio > 0.85 ? "bg-primary" : "bg-foreground"}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>

      <div className="flex justify-between items-baseline mt-3">
        <span className="text-sm text-muted-foreground">Income</span>
        <span className="font-heading text-lg text-foreground">
          ${income.toLocaleString()}
        </span>
      </div>

      <div className="mt-5 pt-4 border-t border-border">
        <div className="flex justify-between items-baseline">
          <span className="text-sm text-muted-foreground">Remaining</span>
          <span className="font-heading text-xl text-foreground">
            ${remaining.toLocaleString()}
          </span>
        </div>
      </div>
    </section>
  );
};

export default MonthlyPace;
