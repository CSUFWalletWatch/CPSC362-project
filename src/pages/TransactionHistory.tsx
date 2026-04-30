import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { TRANSACTION_CATEGORIES } from "@/lib/categories";

type Transaction = {
  id: string;
  user_id: string;
  date: string;
  name: string;
  amount: number;
  category: string | null;
  is_manual: boolean | null;
};

export default function TransactionHistory() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formType, setFormType] = useState<"income" | "expense">("expense");
  const [formDate, setFormDate] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) fetchTransactions();
  }, [user]);

  async function fetchTransactions() {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("transactions")
      .select("id, user_id, date, name, amount, category, is_manual")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (error) {
      toast({ title: "Error loading transactions", description: error.message, variant: "destructive" });
    } else {
      setTransactions((data as Transaction[]) || []);
    }
    setLoading(false);
  }

  const filteredTransactions = transactions.filter((t) => {
    if (startDate && t.date < startDate) return false;
    if (endDate && t.date > endDate) return false;
    return true;
  });

  function clearForm() {
    setFormName("");
    setFormAmount("");
    setFormCategory("");
    setFormType("expense");
    setFormDate("");
    setEditingId(null);
  }

  function handleAddClick() {
    clearForm();
    setIsEditMode(false);
    setShowForm(true);
  }

  function handleEditToggle() {
    setIsEditMode((prev) => !prev);
    setShowForm(false);
    clearForm();
  }

  async function handleSubmitTransaction() {
    if (!user || !formName || !formAmount || !formDate) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    const parsedAmount = Number(formAmount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({ title: "Enter a valid amount greater than 0", variant: "destructive" });
      return;
    }

    const resolvedCategory = formCategory || (formType === "income" ? "Income" : "Other");
    const signedAmount = formType === "expense" ? -parsedAmount : parsedAmount;
    setSubmitting(true);

    if (editingId) {
      const existing = transactions.find((t) => t.id === editingId);
      if (!existing?.is_manual) {
        toast({ title: "Only manual transactions can be edited", variant: "destructive" });
        setSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from("transactions")
        .update({ name: formName, amount: signedAmount, category: resolvedCategory, date: formDate })
        .eq("id", editingId)
        .eq("user_id", user.id);

      if (error) {
        toast({ title: "Error updating transaction", description: error.message, variant: "destructive" });
        setSubmitting(false);
        return;
      }
      toast({ title: "Transaction updated" });
    } else {
      const { error } = await supabase.from("transactions").insert([{
        user_id: user.id,
        name: formName,
        amount: signedAmount,
        category: resolvedCategory,
        date: formDate,
        is_manual: true,
      }]);

      if (error) {
        toast({ title: "Error adding transaction", description: error.message, variant: "destructive" });
        setSubmitting(false);
        return;
      }
      toast({ title: "Transaction added" });
    }

    setSubmitting(false);
    await fetchTransactions();
    clearForm();
    setShowForm(false);
    setIsEditMode(false);
  }

  function selectTransactionForEditing(transaction: Transaction) {
    if (!isEditMode || !transaction.is_manual) return;
    setEditingId(transaction.id);
    setFormName(transaction.name);
    setFormAmount(Math.abs(transaction.amount).toString());
    setFormCategory(transaction.category || "");
    setFormType(transaction.amount < 0 ? "expense" : "income");
    setFormDate(transaction.date);
    setShowForm(true);
  }

  async function removeTransaction(id: string) {
    if (!user) return;
    const target = transactions.find((t) => t.id === id);
    if (!target?.is_manual) {
      toast({ title: "Only manual transactions can be deleted", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id);
    if (error) {
      toast({ title: "Error deleting transaction", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Transaction deleted" });
    if (editingId === id) { clearForm(); setShowForm(false); }
    await fetchTransactions();
  }

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Dashboard
          </Link>
          <h1 className="font-heading text-lg tracking-tight text-foreground">Transaction History</h1>
          <div className="flex gap-2">
            <button
              onClick={() => { if (showForm && !editingId) { setShowForm(false); clearForm(); } else { handleAddClick(); } }}
              className="px-3 py-1.5 rounded-md border border-border text-sm hover:bg-muted transition-colors"
            >
              {showForm && !editingId ? "Cancel" : "+ Add"}
            </button>
            <button
              onClick={handleEditToggle}
              className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${isEditMode ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"}`}
            >
              {isEditMode ? "Done" : "Edit"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">

        {/* Add / edit form */}
        {showForm && (
          <section className="bg-card rounded-lg p-6">
            <p className="text-sm font-body text-muted-foreground tracking-wide uppercase mb-4">
              {editingId ? "Edit Transaction" : "Add Transaction"}
            </p>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[140px]">
                <label className="text-xs text-muted-foreground mb-1 block">Name</label>
                <input
                  type="text"
                  placeholder="e.g. Grocery run"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="min-w-[140px]">
                <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select category</option>
                  {TRANSACTION_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="min-w-[110px]">
                <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                <select
                  value={formType}
                  onChange={(e) => {
                    const newType = e.target.value as "income" | "expense";
                    setFormType(newType);
                    if (newType === "income" && !formCategory) setFormCategory("Income");
                  }}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>

              <div className="min-w-[110px]">
                <label className="text-xs text-muted-foreground mb-1 block">Amount</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="min-w-[130px]">
                <label className="text-xs text-muted-foreground mb-1 block">Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <button
                onClick={handleSubmitTransaction}
                disabled={submitting}
                className="rounded-md bg-foreground text-background px-4 py-2 text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? "Saving…" : editingId ? "Save" : "Add"}
              </button>
            </div>
          </section>
        )}

        {/* Date filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">From</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">To</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          {(startDate || endDate) && (
            <button onClick={() => { setStartDate(""); setEndDate(""); }}
              className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted transition-colors">
              Clear
            </button>
          )}
          {(startDate || endDate) && (
            <p className="text-xs text-muted-foreground self-end pb-2">
              {filteredTransactions.length} result{filteredTransactions.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {isEditMode && (
          <p className="text-xs text-muted-foreground">Click a manual transaction to edit it, or press × to delete.</p>
        )}

        {/* Transaction list */}
        <section className="bg-card rounded-lg divide-y divide-border">
          {loading ? (
            <p className="text-sm text-muted-foreground p-6">Loading…</p>
          ) : filteredTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">
              {startDate || endDate ? "No transactions in this date range." : "No transactions yet. Add one to get started!"}
            </p>
          ) : (
            filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                onClick={() => selectTransactionForEditing(tx)}
                className={`flex items-center justify-between px-6 py-4 ${
                  isEditMode && tx.is_manual ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{tx.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {tx.category || "Uncategorized"} · {tx.date}
                    {tx.is_manual ? " · Manual" : " · Bank"}
                  </p>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <span className={`font-mono text-sm font-medium ${tx.amount < 0 ? "text-red-500" : "text-green-600"}`}>
                    {tx.amount < 0 ? "−" : "+"}${Math.abs(tx.amount).toFixed(2)}
                  </span>

                  {isEditMode && tx.is_manual && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeTransaction(tx.id); }}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-muted transition-colors text-xs"
                      aria-label="Delete"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
