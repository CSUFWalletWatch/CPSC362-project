import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
type Transaction = {
  id: string;
  name: string;
  category: string | null;
  amount: number;
  date: string;
};
const PAGE_SIZE = 7;
const RecentTransactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  useEffect(() => {
    if (!user) return;
    const fetchTransactions = async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, count } = await supabase
        .from("transactions")
        .select("id, name, category, amount, date", { count: "exact" })
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .range(from, to);
      if (data) setTransactions(data);
      if (count !== null) setTotalCount(count);
    };
    fetchTransactions();
  }, [user, page]);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  if (transactions.length === 0 && page === 0) {
    return (
      <section className="bg-card rounded-lg p-6">
        <p className="text-sm text-muted-foreground py-4 text-center">
          No transactions yet. Link a bank account to get started!
        </p>
      </section>
    );
  }
  return (
    <section className="bg-card rounded-lg p-6">
      <ul className="divide-y divide-border">
        {transactions.map((tx) => (
          <li key={tx.id} className="flex items-center justify-between py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground font-medium truncate">{tx.name}</p>
              <p className="text-xs text-muted-foreground">
                {tx.category || "Uncategorized"} · {format(new Date(tx.date + "T00:00:00"), "MMM d")}
              </p>
            </div>
            <span className="font-heading text-base ml-4 whitespace-nowrap text-foreground">
              {tx.amount > 0 ? "+" : "−"}${Math.abs(tx.amount).toFixed(2)}
            </span>
          </li>
        ))}
      </ul>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            ← Previous
          </button>
          <span className="text-xs text-muted-foreground">
            {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </section>
  );
};
export default RecentTransactions;
