import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const NetPosition = () => {
  const { user } = useAuth();
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const sum = (data || []).reduce((acc, tx) => acc + Number(tx.amount), 0);
        setTotal(sum);
        setLoading(false);
      });
  }, [user]);

  if (loading) return <section><p className="text-sm text-muted-foreground">Loading...</p></section>;

  return (
    <section>
      <p className="text-sm font-body text-muted-foreground tracking-wide uppercase mb-2">
        Net Position
      </p>
      <p className="font-heading text-5xl md:text-6xl font-bold tracking-tight text-foreground">
        ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
      </p>
    </section>
  );
};

export default NetPosition;
