import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Tx = { amount: number; date: string; category: string | null };

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

// Last N calendar months as "YYYY-MM" strings, oldest first
function lastNMonths(n: number): string[] {
  const months: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const t = new Date(d.getFullYear(), d.getMonth() - i, 1);
    months.push(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleString("en-US", { month: "short", year: "2-digit" });
}

const BarTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; fill: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-lg space-y-1">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

const Insights = () => {
  const { user } = useAuth();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    // Fetch 6 months of transactions
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 6);
    const cutoffStr = cutoff.toISOString().split("T")[0];

    supabase
      .from("transactions")
      .select("amount, date, category")
      .eq("user_id", user.id)
      .gte("date", cutoffStr)
      .order("date", { ascending: true })
      .then(({ data }) => {
        setTxs((data || []) as Tx[]);
        setLoading(false);
      });
  }, [user]);

  // Monthly income vs spending
  const monthlyData = useMemo(() => {
    const months = lastNMonths(6);
    const map: Record<string, { income: number; spending: number }> = {};
    months.forEach((m) => (map[m] = { income: 0, spending: 0 }));

    txs.forEach((tx) => {
      const ym = tx.date.slice(0, 7);
      if (!map[ym]) return;
      if (tx.amount > 0) map[ym].income += Number(tx.amount);
      else map[ym].spending += Math.abs(Number(tx.amount));
    });

    return months.map((ym) => ({
      month: monthLabel(ym),
      Income: Math.round(map[ym].income),
      Spending: Math.round(map[ym].spending),
    }));
  }, [txs]);

  // Spending by category (current month)
  const categoryData = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const map: Record<string, number> = {};

    txs.forEach((tx) => {
      if (tx.amount >= 0) return;
      if (tx.date.slice(0, 7) !== ym) return;
      const cat = tx.category || "Uncategorized";
      map[cat] = (map[cat] || 0) + Math.abs(Number(tx.amount));
    });

    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [txs]);

  // Current month summary
  const { income, spending, remaining } = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    let inc = 0, spend = 0;
    txs.forEach((tx) => {
      if (tx.date.slice(0, 7) !== ym) return;
      if (tx.amount > 0) inc += Number(tx.amount);
      else spend += Math.abs(Number(tx.amount));
    });
    return { income: inc, spending: spend, remaining: inc - spend };
  }, [txs]);

  // Hardcoded values matching theme vars: --foreground: 0 0% 16%, --primary: 19 100% 50%
  const FOREGROUND = "hsl(0,0%,16%)";
  const PRIMARY = "hsl(19,100%,50%)";
  const BAR_COLORS = [
    PRIMARY, "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
    "#f97316", "#eab308", "#22c55e",
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <h1 className="font-heading text-lg tracking-tight text-foreground">Wallet Watch</h1>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <p className="text-sm font-body text-muted-foreground tracking-wide uppercase">Insights</p>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Income this month", value: income, color: "text-foreground" },
            { label: "Spent this month", value: spending, color: spending > income ? "text-red-500" : "text-foreground" },
            { label: "Remaining", value: remaining, color: remaining < 0 ? "text-red-500" : "text-green-500" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-card rounded-lg p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
              <p className={`font-heading text-2xl font-bold ${color}`}>{fmt(value)}</p>
            </div>
          ))}
        </div>

        {/* Income vs Spending — 6-month bar chart */}
        <section className="bg-card rounded-lg p-6">
          <p className="text-sm font-body text-muted-foreground tracking-wide uppercase mb-6">
            Income vs Spending — Last 6 Months
          </p>
          {monthlyData.every((d) => d.Income === 0 && d.Spending === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-10">No data for this period.</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} barGap={4} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "currentColor", opacity: 0.4 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    width={44}
                  />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: "currentColor", fillOpacity: 0.04 }} />
                  <Bar dataKey="Income" fill={FOREGROUND} radius={[3, 3, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="Spending" fill={PRIMARY} radius={[3, 3, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {/* Legend */}
          <div className="flex gap-5 mt-4 justify-center">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: FOREGROUND }} /> Income
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: PRIMARY }} /> Spending
            </span>
          </div>
        </section>

        {/* Spending by category — current month */}
        <section className="bg-card rounded-lg p-6">
          <p className="text-sm font-body text-muted-foreground tracking-wide uppercase mb-6">
            Spending by Category — This Month
          </p>
          {categoryData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No spending recorded this month.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={categoryData}
                  margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: "currentColor", opacity: 0.4 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "currentColor", opacity: 0.7 }}
                    tickLine={false}
                    axisLine={false}
                    width={100}
                  />
                  <Tooltip
                    cursor={{ fill: "currentColor", fillOpacity: 0.04 }}
                    formatter={(value: number) => [fmt(value), "Spent"]}
                  />
                  <Bar dataKey="value" radius={[0, 3, 3, 0]} maxBarSize={20}>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Insights;
