import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";

interface CategorySpending {
  category: string;
  amount: number;
}

interface BudgetSubcategory {
  id: number;
  name: string;
  amount: number;
  isCustom?: boolean;
}

interface BudgetCategory {
  id: number;
  name: string;
  subcategories: BudgetSubcategory[];
}

const defaultBudgetCategories: BudgetCategory[] = [
  {
    id: 1,
    name: "Needs",
    subcategories: [
      { id: 1, name: "Rent", amount: 0 },
      { id: 2, name: "Groceries", amount: 0 },
      { id: 3, name: "Utilities", amount: 0 },
      { id: 4, name: "Transportation", amount: 0 },
    ],
  },
  {
    id: 2,
    name: "Wants",
    subcategories: [
      { id: 5, name: "Eating Out", amount: 0 },
      { id: 6, name: "Entertainment", amount: 0 },
      { id: 7, name: "Shopping", amount: 0 },
    ],
  },
  {
    id: 3,
    name: "Savings / Investing",
    subcategories: [
      { id: 8, name: "Emergency Fund", amount: 0 },
      { id: 9, name: "Investments", amount: 0 },
    ],
  },
];

const Budget = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [income, setIncome] = useState(0);
  const [spending, setSpending] = useState(0);
  const [categories, setCategories] = useState<CategorySpending[]>([]);
  const [loading, setLoading] = useState(true);

  // Saved budget shown by default
  const [savedBudgetCategories, setSavedBudgetCategories] =
    useState<BudgetCategory[]>([]);

  // Draft budget used while editing
  const [draftBudgetCategories, setDraftBudgetCategories] =
    useState<BudgetCategory[]>([]);

  const [customInputs, setCustomInputs] = useState<Record<number, string>>({});
  const [hasBudget, setHasBudget] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-01`;
    const endOfMonth = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).getDate()}`;

    supabase
      .from("transactions")
      .select("amount, category")
      .eq("user_id", user.id)
      .gte("date", startOfMonth)
      .lte("date", endOfMonth)
      .then(({ data }) => {
        let inc = 0;
        let spend = 0;
        const catMap: Record<string, number> = {};

        (data || []).forEach((tx) => {
          if (tx.amount > 0) {
            inc += Number(tx.amount);
          } else {
            const amt = Math.abs(Number(tx.amount));
            spend += amt;
            const cat = tx.category || "Uncategorized";
            catMap[cat] = (catMap[cat] || 0) + amt;
          }
        });

        setIncome(inc);
        setSpending(spend);
        setCategories(
          Object.entries(catMap)
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount)
        );
      });

    // Barebones local example:
    // pretend we loaded a saved budget
    const fakeSavedBudget = localStorage.getItem("budgetData");

    if (fakeSavedBudget) {
      const parsedBudget: BudgetCategory[] = JSON.parse(fakeSavedBudget);
      setSavedBudgetCategories(parsedBudget);
      setDraftBudgetCategories(parsedBudget);
      setHasBudget(true);
      setIsEditing(false);
    } else {
      setSavedBudgetCategories(defaultBudgetCategories);
      setDraftBudgetCategories(defaultBudgetCategories);
      setHasBudget(false);
      setIsEditing(true);
    }

    setLoading(false);
  }, [user]);

  if (authLoading || !user) return null;

  const remaining = income - spending;
  const ratio = income > 0 ? Math.min(spending / income, 1) : 0;
  const monthName = new Date().toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const updateSubcategoryAmount = (
    categoryId: number,
    subcategoryId: number,
    value: string
  ) => {
    const numericValue = Number(value) || 0;

    setDraftBudgetCategories((prev) =>
      prev.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              subcategories: category.subcategories.map((sub) =>
                sub.id === subcategoryId ? { ...sub, amount: numericValue } : sub
              ),
            }
          : category
      )
    );
  };

  const updateCustomInput = (categoryId: number, value: string) => {
    setCustomInputs((prev) => ({
      ...prev,
      [categoryId]: value,
    }));
  };

  const addCustomSubcategory = (categoryId: number) => {
    const inputValue = customInputs[categoryId]?.trim();
    if (!inputValue) return;

    setDraftBudgetCategories((prev) =>
      prev.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              subcategories: [
                ...category.subcategories,
                {
                  id: Date.now(),
                  name: inputValue,
                  amount: 0,
                  isCustom: true,
                },
              ],
            }
          : category
      )
    );

    setCustomInputs((prev) => ({
      ...prev,
      [categoryId]: "",
    }));
  };

  const startEditing = () => {
    setDraftBudgetCategories(JSON.parse(JSON.stringify(savedBudgetCategories)));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraftBudgetCategories(JSON.parse(JSON.stringify(savedBudgetCategories)));
    setIsEditing(false);
  };

  const confirmBudget = () => {
    setSavedBudgetCategories(JSON.parse(JSON.stringify(draftBudgetCategories)));
    localStorage.setItem("budgetData", JSON.stringify(draftBudgetCategories));
    setHasBudget(true);
    setIsEditing(false);
  };

  const activeBudget = isEditing ? draftBudgetCategories : savedBudgetCategories;

  const totalBudget = activeBudget.reduce((sum, category) => {
    return (
      sum +
      category.subcategories.reduce((subSum, sub) => subSum + sub.amount, 0)
    );
  }, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center gap-4">
          <Link
            to="/"
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Link>
          <h1 className="font-heading text-lg tracking-tight text-foreground">
            Budget - {monthName}
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-card rounded-lg p-6">
                <p className="text-sm text-muted-foreground mb-1">Income</p>
                <p className="font-heading text-2xl text-foreground">
                  ${income.toLocaleString()}
                </p>
              </div>
              <div className="bg-card rounded-lg p-6">
                <p className="text-sm text-muted-foreground mb-1">Spent</p>
                <p className="font-heading text-2xl text-foreground">
                  ${spending.toLocaleString()}
                </p>
              </div>
              <div className="bg-card rounded-lg p-6">
                <p className="text-sm text-muted-foreground mb-1">Remaining</p>
                <p
                  className={`font-heading text-2xl ${
                    remaining >= 0 ? "text-foreground" : "text-primary"
                  }`}
                >
                  ${remaining.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="bg-card rounded-lg p-6">
              <div className="flex justify-between items-baseline mb-3">
                <span className="text-sm text-muted-foreground">
                  {Math.round(ratio * 100)}% of income spent
                </span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    ratio > 0.85 ? "bg-primary" : "bg-foreground"
                  }`}
                  style={{ width: `${ratio * 100}%` }}
                />
              </div>
            </div>

            <div className="bg-card rounded-lg p-6">
              <p className="text-sm font-body text-muted-foreground tracking-wide uppercase mb-4">
                Spending by Category
              </p>
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No spending this month.
                </p>
              ) : (
                <div className="space-y-4">
                  {categories.map((cat) => {
                    const catRatio = spending > 0 ? cat.amount / spending : 0;
                    return (
                      <div key={cat.category}>
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-sm text-foreground">
                            {cat.category}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            ${cat.amount.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-foreground/60 transition-all duration-500"
                            style={{ width: `${catRatio * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-card rounded-lg p-6 space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-body text-muted-foreground tracking-wide uppercase">
                  {hasBudget ? "View Budget" : "Create Budget"}
                </p>
                <p className="text-sm text-foreground font-medium">
                  Total Budgeted: ${totalBudget.toLocaleString()}
                </p>
              </div>

              {hasBudget && !isEditing && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={startEditing}
                    className="rounded-md bg-foreground text-background px-4 py-2 text-sm hover:opacity-90"
                  >
                    Edit Budget
                  </button>
                </div>
              )}

              {activeBudget.map((category) => {
                const categoryTotal = category.subcategories.reduce(
                  (sum, sub) => sum + sub.amount,
                  0
                );

                return (
                  <div
                    key={category.id}
                    className="border border-border rounded-lg p-4 space-y-4"
                  >
                    <div className="flex justify-between items-center">
                      <h2 className="text-base font-semibold text-foreground">
                        {category.name}
                      </h2>
                      <span className="text-sm text-muted-foreground">
                        ${categoryTotal.toLocaleString()}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {category.subcategories.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
                        >
                          <label className="text-sm text-foreground min-w-[140px]">
                            {sub.name}
                          </label>

                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              value={sub.amount}
                              onChange={(e) =>
                                updateSubcategoryAmount(
                                  category.id,
                                  sub.id,
                                  e.target.value
                                )
                              }
                              className="w-full sm:w-40 rounded-md border border-border bg-background px-3 py-2 text-sm"
                              placeholder="0"
                            />
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              ${sub.amount.toLocaleString()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {isEditing && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={customInputs[category.id] || ""}
                          onChange={(e) =>
                            updateCustomInput(category.id, e.target.value)
                          }
                          placeholder={`Add custom ${category.name.toLowerCase()} item`}
                          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => addCustomSubcategory(category.id)}
                          className="rounded-md bg-muted px-4 py-2 text-sm hover:opacity-90"
                        >
                          Add Custom
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {isEditing && (
                <div className="flex gap-3 justify-end">
                  {hasBudget && (
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="rounded-md border border-border px-4 py-2 text-sm"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={confirmBudget}
                    className="rounded-md bg-foreground text-background px-4 py-2 text-sm hover:opacity-90"
                  >
                    Confirm
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Budget;
