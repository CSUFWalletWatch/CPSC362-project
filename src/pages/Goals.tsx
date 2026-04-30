import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Goal = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  saved_amount: number;
  deadline?: string | null;
};

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");

  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [contributionAmount, setContributionAmount] = useState("");

  useEffect(() => {
    fetchGoals();
  }, []);

  async function fetchGoals() {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("User fetch error:", userError);
      setGoals([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("goals")
      .select("id, user_id, name, target_amount, saved_amount, deadline")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch goals error:", error);
    } else {
      setGoals((data as Goal[]) || []);
    }

    setLoading(false);
  }

  const resetForm = () => {
    setName("");
    setTargetAmount("");
    setDeadline("");
    setEditingGoalId(null);
    setShowCreateForm(false);
  };

  const handleAddOrUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !targetAmount) return;

    const parsedTargetAmount = Number(targetAmount);
    if (Number.isNaN(parsedTargetAmount) || parsedTargetAmount <= 0) return;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("User fetch error:", userError);
      return;
    }

    if (editingGoalId) {
      const existingGoal = goals.find((goal) => goal.id === editingGoalId);
      if (!existingGoal) return;

      const { error } = await supabase
        .from("goals")
        .update({
          name: name.trim(),
          target_amount: parsedTargetAmount,
          deadline: deadline || null,
        })
        .eq("id", editingGoalId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Update goal error:", error);
        return;
      }
    } else {
      const { error } = await supabase.from("goals").insert([
        {
          user_id: user.id,
          name: name.trim(),
          target_amount: parsedTargetAmount,
          saved_amount: 0,
          deadline: deadline || null,
        },
      ]);

      if (error) {
        console.error("Insert goal error:", error);
        return;
      }
    }

    await fetchGoals();
    resetForm();
  };

  const handleEditGoal = (goal: Goal) => {
    setName(goal.name);
    setTargetAmount(String(goal.target_amount));
    setDeadline(goal.deadline || "");
    setEditingGoalId(goal.id);
    setShowCreateForm(true);
  };

  const handleDeleteGoal = async (goalId: string) => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("User fetch error:", userError);
      return;
    }

    const { error } = await supabase
      .from("goals")
      .delete()
      .eq("id", goalId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Delete goal error:", error);
      return;
    }

    if (selectedGoalId === goalId) setSelectedGoalId("");
    if (editingGoalId === goalId) resetForm();

    await fetchGoals();
  };

  const handleAddContribution = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedGoalId || !contributionAmount) return;

    const amount = Number(contributionAmount);
    if (Number.isNaN(amount) || amount <= 0) return;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("User fetch error:", userError);
      return;
    }

    const selectedGoal = goals.find((goal) => goal.id === selectedGoalId);
    if (!selectedGoal) return;

    const newSavedAmount = selectedGoal.saved_amount + amount;

    const { error } = await supabase
      .from("goals")
      .update({
        saved_amount: newSavedAmount,
      })
      .eq("id", selectedGoalId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Add contribution error:", error);
      return;
    }

    // Record a debit transaction so net worth reflects the contribution
    const { error: txError } = await supabase.from("transactions").insert({
      user_id: user.id,
      name: `Goal: ${selectedGoal.name}`,
      amount: -amount,
      category: "Savings",
      date: new Date().toISOString().split("T")[0],
      is_manual: true,
    });
    if (txError) {
      console.error("Insert contribution transaction error:", txError);
    }

    setContributionAmount("");
    setSelectedGoalId("");
    await fetchGoals();
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Dashboard
          </Link>

          <h1 className="text-2xl font-bold">My Goals</h1>

          {!showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 rounded bg-black text-white"
            >
              + New Goal
            </button>
          )}
        </div>

        <div className="border rounded-lg p-4 space-y-4">
          <h2 className="text-lg font-semibold">Add Contribution</h2>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading goals...</p>
          ) : goals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No goals yet. Create a goal first.
            </p>
          ) : (
            <form onSubmit={handleAddContribution} className="space-y-3">
              <select
                value={selectedGoalId}
                onChange={(e) => setSelectedGoalId(e.target.value)}
                className="w-full border p-2 rounded bg-background"
              >
                <option value="">Select a goal</option>
                {goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.name}
                  </option>
                ))}
              </select>

              <input
                type="number"
                placeholder="Contribution amount"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                className="w-full border p-2 rounded"
              />

              <button
                type="submit"
                className="px-4 py-2 rounded bg-black text-white"
              >
                Add Contribution
              </button>
            </form>
          )}
        </div>

        {showCreateForm && (
          <div className="border rounded-lg p-4 space-y-4">
            <h2 className="text-lg font-semibold">
              {editingGoalId ? "Edit Goal" : "Create New Goal"}
            </h2>

            <form onSubmit={handleAddOrUpdateGoal} className="space-y-3">
              <input
                type="text"
                placeholder="Goal name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border p-2 rounded"
              />

              <input
                type="number"
                placeholder="Target amount"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full border p-2 rounded"
              />

              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full border p-2 rounded"
              />

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-black text-white"
                >
                  {editingGoalId ? "Save Changes" : "Add Goal"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded border"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Your Goals</h2>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading goals...</p>
          ) : goals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You have no goals yet.
            </p>
          ) : (
            goals.map((goal) => {
              const percent =
                goal.target_amount > 0
                  ? Math.min((goal.saved_amount / goal.target_amount) * 100, 100)
                  : 0;

              return (
                <div key={goal.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{goal.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ${goal.saved_amount.toFixed(2)} / ${goal.target_amount.toFixed(2)}
                      </p>
                      {goal.deadline && (
                        <p className="text-sm text-muted-foreground">
                          Deadline: {goal.deadline}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditGoal(goal)}
                        className="px-3 py-1 text-sm border rounded"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="px-3 py-1 text-sm border rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="w-full bg-muted h-2 rounded-full">
                      <div
                        className="h-2 bg-black rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {percent.toFixed(0)}% complete
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
