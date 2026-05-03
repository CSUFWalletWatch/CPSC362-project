import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type Goal = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  saved_amount: number;
  deadline?: string | null;
}; 

export default function Goals() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");

  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [contributionAmount, setContributionAmount] = useState("");
  const [contributing, setContributing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [invitingGoalId, setInvitingGoalId] = useState<string | null>(null);
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) fetchGoals();
  }, [user]);

  async function fetchGoals() {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("goals")
      .select("id, user_id, name, target_amount, saved_amount, deadline")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading goals", description: error.message, variant: "destructive" });
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
    if (!user || !name.trim() || !targetAmount) return;

    const parsedTargetAmount = Number(targetAmount);
    if (Number.isNaN(parsedTargetAmount) || parsedTargetAmount <= 0) return;

    setSubmitting(true);

    if (editingGoalId) {
      const { error } = await supabase
        .from("goals")
        .update({ name: name.trim(), target_amount: parsedTargetAmount, deadline: deadline || null })
        .eq("id", editingGoalId)
        .eq("user_id", user.id);

      if (error) {
        toast({ title: "Error updating goal", description: error.message, variant: "destructive" });
        setSubmitting(false);
        return;
      }
      toast({ title: "Goal updated" });
    } else {
      const { data, error } = await supabase
  .from("goals")
  .insert([{
    user_id: user.id,
    name: name.trim(),
    target_amount: parsedTargetAmount,
    saved_amount: 0,
    deadline: deadline || null,
  }])
  .select()
  .single();

if (error) {
  toast({ title: "Error creating goal", description: error.message, variant: "destructive" });
  setSubmitting(false);
  return;
}

const { error: memberError } = await supabase.from("goal_members").insert({
  goal_id: data.id,
  user_id: user.id,
  role: "owner",
});

if (memberError) {
  console.error("Goal member insert failed:", memberError);

  toast({
    title: "Goal created, but member link failed",
    description: memberError.message,
    variant: "destructive",
  });

  setSubmitting(false);
  return;
}

toast({ title: "Goal created" });
    }

    setSubmitting(false);
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

const handleInviteUser = async (goalId: string) => {
  if (!user || !inviteEmail.trim()) return;

  setSendingInvite(true);

  const { error } = await supabase.from("goal_invites").insert({
    goal_id: goalId,
    inviter_id: user.id,
    invitee_email: inviteEmail.trim().toLowerCase(),
    status: "pending",
  });

  if (error) {
    toast({
      title: "Error sending invite",
      description: error.message,
      variant: "destructive",
    });
    setSendingInvite(false);
    return;
  }

  toast({ title: "Invite sent" });
  setInviteEmail("");
  setInvitingGoalId(null);
  setSendingInvite(false);
};
  
  const handleDeleteGoal = async (goalId: string) => {
    if (!user) return;
    const { error } = await supabase.from("goals").delete().eq("id", goalId).eq("user_id", user.id);
    if (error) {
      toast({ title: "Error deleting goal", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Goal deleted" });
    if (selectedGoalId === goalId) setSelectedGoalId("");
    if (editingGoalId === goalId) resetForm();
    await fetchGoals();
  };

  const handleAddContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedGoalId || !contributionAmount) return;

    const amount = Number(contributionAmount);
    if (Number.isNaN(amount) || amount <= 0) return;

    const selectedGoal = goals.find((g) => g.id === selectedGoalId);
    if (!selectedGoal) return;

    setContributing(true);

    const { error } = await supabase
      .from("goals")
      .update({ saved_amount: selectedGoal.saved_amount + amount })
      .eq("id", selectedGoalId)
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Error adding contribution", description: error.message, variant: "destructive" });
      setContributing(false);
      return;
    }

    // Debit transaction so net worth reflects the contribution
    const { error: txError } = await supabase.from("transactions").insert({
      user_id: user.id,
      name: `Goal: ${selectedGoal.name}`,
      amount: -amount,
      category: "Savings",
      date: new Date().toISOString().split("T")[0],
      is_manual: true,
    });
    if (txError) {
      console.error("Contribution transaction error:", txError);
    }

    toast({ title: "Contribution added", description: `$${amount.toFixed(2)} added to "${selectedGoal.name}"` });
    setContributionAmount("");
    setSelectedGoalId("");
    setContributing(false);
    await fetchGoals();
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Dashboard
          </Link>
          <h1 className="font-heading text-lg tracking-tight text-foreground">Goals</h1>
          <button
            onClick={() => { resetForm(); setShowCreateForm(true); }}
            className="px-4 py-2 rounded-md bg-foreground text-background text-sm hover:opacity-90 transition-opacity"
          >
            + New Goal
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* Contribution form */}
        <section className="bg-card rounded-lg p-6">
          <p className="text-sm font-body text-muted-foreground tracking-wide uppercase mb-4">Add Contribution</p>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading goals…</p>
          ) : goals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No goals yet. Create a goal first.</p>
          ) : (
            <form onSubmit={handleAddContribution} className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[160px]">
                <label className="text-xs text-muted-foreground mb-1 block">Goal</label>
                <select
                  value={selectedGoalId}
                  onChange={(e) => setSelectedGoalId(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select a goal</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[120px]">
                <label className="text-xs text-muted-foreground mb-1 block">Amount</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={contributing}
                className="rounded-md bg-foreground text-background px-4 py-2 text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {contributing ? "Adding…" : "Add"}
              </button>
            </form>
          )}
        </section>

        {/* Create / edit goal form */}
        {showCreateForm && (
          <section className="bg-card rounded-lg p-6">
            <p className="text-sm font-body text-muted-foreground tracking-wide uppercase mb-4">
              {editingGoalId ? "Edit Goal" : "New Goal"}
            </p>

            <form onSubmit={handleAddOrUpdateGoal} className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Name</label>
                <input
                  type="text"
                  placeholder="e.g. Emergency Fund"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Target amount</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Deadline (optional)</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-foreground text-background px-4 py-2 text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submitting ? "Saving…" : editingGoalId ? "Save Changes" : "Create Goal"}
                </button>
                <button type="button" onClick={resetForm} className="rounded-md border border-border px-4 py-2 text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Goals list */}
        <section className="space-y-4">
          <p className="text-sm font-body text-muted-foreground tracking-wide uppercase">Your Goals</p>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : goals.length === 0 ? (
            <div className="bg-card rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">You have no goals yet.</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="text-sm text-primary hover:underline"
              >
                Create your first goal →
              </button>
            </div>
          ) : (
            goals.map((goal) => {
              const percent = goal.target_amount > 0
                ? Math.min(Math.round((goal.saved_amount / goal.target_amount) * 100), 100)
                : 0;

              return (
                <div key={goal.id} className="bg-card rounded-lg p-6 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-foreground">{goal.name}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        ${Number(goal.saved_amount).toFixed(2)} / ${Number(goal.target_amount).toFixed(2)}
                      </p>
                      {goal.deadline && (
                        <p className="text-xs text-muted-foreground mt-0.5">Deadline: {goal.deadline}</p>
                      )}
                    </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setInvitingGoalId(goal.id)}
                      className="px-3 py-1 text-xs rounded-md border border-border hover:bg-muted transition-colors"
                    >
                      Invite
                    </button>
                  
                    <button
                      onClick={() => handleEditGoal(goal)}
                      className="px-3 py-1 text-xs rounded-md border border-border hover:bg-muted transition-colors"
                    >
                      Edit
                    </button>
                  
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="px-3 py-1 text-xs rounded-md border border-border hover:bg-muted transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                  </div>

                  <div>
                    <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-foreground rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{percent}% complete</p>

                    {invitingGoalId === goal.id && (
                      <div className="flex gap-2 pt-2">
                        <input
                          type="email"
                          placeholder="Contributor email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                        />
                    
                        <button
                          onClick={() => handleInviteUser(goal.id)}
                          disabled={sendingInvite}
                          className="rounded-md bg-foreground text-background px-4 py-2 text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {sendingInvite ? "Sending…" : "Send"}
                        </button>
                    
                        <button
                          onClick={() => {
                            setInvitingGoalId(null);
                            setInviteEmail("");
                          }}
                          className="rounded-md border border-border px-4 py-2 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}
