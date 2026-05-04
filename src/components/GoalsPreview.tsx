import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

export default function GoalsPreview() {
  const { user } = useAuth();
  const [goal, setGoal] = useState<any>(null);
  const [loading, setLoading] = useState(true);

      useEffect(() => {
        if (!user) {
          setLoading(false);
          return;
        }
    
        const fetchGoal = async () => {
          setLoading(true);
    
          const { data, error } = await supabase
            .from("goals")
            .select(`
              id,
              name,
              target_amount,
              saved_amount,
              created_at,
              goal_members!left(user_id)
            `)
            .or(`user_id.eq.${user.id},goal_members.user_id.eq.${user.id}`)
            .order("created_at", { ascending: false })
            .limit(1);
    
          if (error) {
            console.error("Goals preview error:", error);
            setGoal(null);
            setLoading(false);
            return;
          }
    
          if (data && data.length > 0) {
            setGoal({
              id: data[0].id,
              name: data[0].name,
              saved: data[0].saved_amount,
              target: data[0].target_amount,
            });
          } else {
            setGoal(null);
          }
    
          setLoading(false);
        };
    
        fetchGoal();
      }, [user]);

  if (loading) return <div className="border rounded-lg p-4"><p className="text-sm text-muted-foreground">Loading...</p></div>;
  
  if (!goal) {
    return (
      <div className="border rounded-lg p-4">
        <p className="text-sm text-muted-foreground">No goals yet</p>

        <Link
          to="/goals"
          className="text-sm text-primary hover:underline"
        >
          Create one →
        </Link>
      </div>
    );
  }

  const percent = goal.target > 0 ? Math.min(Math.round((goal.saved / goal.target) * 100), 100) : 0;

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-medium text-muted-foreground">
          Goals
        </h2>

        <Link
          to="/goals"
          className="text-sm text-primary hover:underline"
        >
          View →
        </Link>
      </div>

      <p className="font-semibold">{goal.name}</p>

      <p className="text-sm">
        ${goal.saved} / ${goal.target}
      </p>

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {percent}% complete
      </p>
    </div>
  );
}
