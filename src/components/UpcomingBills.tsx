import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type Bill = {
  id: string;
  name: string;
  amount: number;
  due_date: string;
};

const UpcomingBills = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bills, setBills] = useState<Bill[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchBills = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("bills")
      .select("id, name, amount, due_date")
      .eq("user_id", user.id)
      .gte("due_date", new Date().toISOString().split("T")[0])
      .order("due_date", { ascending: true })
      .limit(10);
    if (data) setBills(data);
  };

  useEffect(() => {
    fetchBills();
  }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const { error } = await supabase.from("bills").insert({
      user_id: user.id,
      name: name.trim(),
      amount: parseFloat(amount),
      due_date: dueDate,
    });

    if (error) {
      toast({ title: "Error adding bill", description: error.message, variant: "destructive" });
    } else {
      setName("");
      setAmount("");
      setDueDate("");
      setOpen(false);
      fetchBills();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("bills").delete().eq("id", id);
    fetchBills();
  };

  const total = bills.reduce((s, b) => s + Number(b.amount), 0);

  return (
    <section className="bg-card rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-body text-muted-foreground tracking-wide uppercase">
          Upcoming Bills
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button className="w-7 h-7 rounded-full bg-primary flex items-center justify-center hover:opacity-90 transition-opacity">
              <Plus className="w-3.5 h-3.5 text-primary-foreground" />
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a Bill</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <Input placeholder="Bill name" value={name} onChange={(e) => setName(e.target.value)} required />
              <Input type="number" step="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Adding…" : "Add Bill"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {bills.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No upcoming bills. Add one!</p>
      ) : (
        <>
          <ul className="space-y-4">
            {bills.map((bill) => (
              <li key={bill.id} className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-sm font-medium truncate">{bill.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(bill.due_date + "T00:00:00"), "MMM d")}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className="font-heading text-base text-primary whitespace-nowrap">
                    ${Number(bill.amount).toFixed(2)}
                  </span>
                  <button onClick={() => handleDelete(bill.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 pt-4 border-t border-border flex justify-between items-baseline">
            <span className="text-sm text-muted-foreground">Total due</span>
            <span className="font-heading text-lg text-foreground">
              ${total.toFixed(2)}
            </span>
          </div>
        </>
      )}
    </section>
  );
};

export default UpcomingBills;
