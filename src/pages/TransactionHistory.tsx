import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

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
    fetchTransactions();
  }, []);

  async function fetchTransactions() {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("User fetch error:", userError);
      setTransactions([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("transactions")
      .select("id, user_id, date, name, amount, category, is_manual")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (error) {
      console.error("Fetch error:", error);
    } else {
      setTransactions((data as Transaction[]) || []);
    }

    setLoading(false);
  }

  const sortedTransactions = [...transactions].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  const filteredTransactions = sortedTransactions.filter((transaction) => {
    if (startDate && transaction.date < startDate) return false;
    if (endDate && transaction.date > endDate) return false;
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
    const nextEditMode = !isEditMode;
    setIsEditMode(nextEditMode);
    setShowForm(false);
    clearForm();
  }

  async function handleSubmitTransaction() {
    if (!formName || !formAmount || !formCategory || !formDate) return;

    const parsedAmount = Number(formAmount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) return;

    const signedAmount = formType === "expense" ? -parsedAmount : parsedAmount;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("User fetch error:", userError);
      return;
    }

    if (editingId) {
      const existingTransaction = transactions.find((t) => t.id === editingId);
      if (!existingTransaction || !existingTransaction.is_manual) return;

      const { error } = await supabase
        .from("transactions")
        .update({
          name: formName,
          amount: signedAmount,
          category: formCategory,
          date: formDate,
        })
        .eq("id", editingId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Update error:", error);
        return;
      }
    } else {
      const { error } = await supabase.from("transactions").insert([
        {
          user_id: user.id,
          name: formName,
          amount: signedAmount,
          category: formCategory,
          date: formDate,
          is_manual: true,
        },
      ]);

      if (error) {
        console.error("Insert error:", error);
        return;
      }
    }

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
    const transactionToRemove = transactions.find((t) => t.id === id);
    if (!transactionToRemove || !transactionToRemove.is_manual) return;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("User fetch error:", userError);
      return;
    }

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Delete error:", error);
      return;
    }

    await fetchTransactions();

    if (editingId === id) {
      clearForm();
      setShowForm(false);
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center justify-between mb-2">
        <Link
          to="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Dashboard
        </Link>

        <h1 className="text-3xl font-bold">Transaction History</h1>

        <div className="w-[100px]" />
      </div>

      <p className="text-muted-foreground">View all income and expenses.</p>

      <div className="mt-4 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col">
          <label className="text-sm">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded-md px-3 py-2"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded-md px-3 py-2"
          />
        </div>

        <button
          onClick={() => {
            setStartDate("");
            setEndDate("");
          }}
          className="border rounded-md px-4 py-2"
        >
          Reset
        </button>

        <button
          onClick={() => {
            if (showForm && !editingId) {
              setShowForm(false);
              clearForm();
            } else {
              handleAddClick();
            }
          }}
          className="border rounded-md px-4 py-2"
        >
          {showForm && !editingId ? "Cancel" : "Add"}
        </button>

        <button
          onClick={handleEditToggle}
          className="border rounded-md px-4 py-2"
        >
          {isEditMode ? "Done" : "Edit"}
        </button>
      </div>

      {isEditMode && (
        <p className="mt-3 text-sm text-muted-foreground">
          Click a custom transaction to edit it, or use X to remove it.
        </p>
      )}

      {showForm && (
        <div className="mt-6 border rounded-lg p-4 space-y-4">
          <h2 className="text-lg font-semibold">
            {editingId ? "Edit Custom Transaction" : "Add Custom Transaction"}
          </h2>

          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="border rounded-md px-3 py-2"
            />

            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="border rounded-md px-3 py-2"
            >
              <option value="">Select Category</option>
              {TRANSACTION_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select
              value={formType}
              onChange={(e) =>
                setFormType(e.target.value as "income" | "expense")
              }
              className="border rounded-md px-3 py-2"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>

            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              className="border rounded-md px-3 py-2"
            />

            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="border rounded-md px-3 py-2"
            />

            <button
              onClick={handleSubmitTransaction}
              className="border rounded-md px-4 py-2"
            >
              {editingId ? "Save Changes" : "Submit"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 border rounded-lg p-4 space-y-4">
        {loading ? (
          <p>Loading transactions...</p>
        ) : filteredTransactions.length === 0 ? (
          <p>No transactions in this date range.</p>
        ) : (
          filteredTransactions.map((transaction) => (
            <div
              key={transaction.id}
              onClick={() => selectTransactionForEditing(transaction)}
              className={`flex justify-between items-center border-b pb-2 ${
                isEditMode && transaction.is_manual
                  ? "cursor-pointer hover:bg-muted/50 rounded-md px-2 py-2"
                  : ""
              }`}
            >
              <div>
                <p className="font-medium">{transaction.name}</p>
                <p className="text-sm text-muted-foreground">
                  {transaction.category} • {transaction.date}
                  {transaction.is_manual ? " • Custom" : " • Bank"}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <p
                  className={`font-semibold ${
                    transaction.amount < 0 ? "text-red-500" : "text-green-500"
                  }`}
                >
                  {transaction.amount < 0
                    ? `-$${Math.abs(transaction.amount).toFixed(2)}`
                    : `+$${transaction.amount.toFixed(2)}`}
                </p>

                {isEditMode && transaction.is_manual && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTransaction(transaction.id);
                    }}
                    className="border rounded-md px-2 py-1 text-sm"
                  >
                    X
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
