import { useState, useEffect, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type DataPoint = {
  date: string;
  total: number;
};

type Period = "30d" | "90d" | "6m" | "1y" | "all";

const PERIODS: { label: string; value: Period }[] = [
  { label: "30D", value: "30d" },
  { label: "90D", value: "90d" },
  { label: "6M", value: "6m" },
  { label: "1Y", value: "1y" },
  { label: "All", value: "all" },
];

function cutoffDate(period: Period): Date | null {
  const now = new Date();
  if (period === "30d") return new Date(now.setDate(now.getDate() - 30));
  if (period === "90d") return new Date(now.setDate(now.getDate() - 90));
  if (period === "6m") return new Date(now.setMonth(now.getMonth() - 6));
  if (period === "1y") return new Date(now.setFullYear(now.getFullYear() - 1));
  return null;
}

function formatCurrency(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y.slice(2)}`;
}

// Reduce daily points to ~60 for chart readability
function downsample(points: DataPoint[], max = 60): DataPoint[] {
  if (points.length <= max) return points;
  const step = Math.ceil(points.length / max);
  return points.filter((_, i) => i % step === 0 || i === points.length - 1);
}

// Build monthly rows from daily snapshots for the table
function toMonthlyRows(points: DataPoint[]) {
  const byMonth: Record<string, number> = {};
  for (const p of points) {
    const key = p.date.slice(0, 7); // YYYY-MM
    byMonth[key] = p.total;        // last value in month wins
  }
  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total], i, arr) => {
      const prev = i > 0 ? arr[i - 1][1] : null;
      const change = prev !== null ? total - prev : null;
      const pct = prev !== null && prev !== 0 ? (change! / Math.abs(prev)) * 100 : null;
      const [yr, mo] = month.split("-");
      const label = new Date(Number(yr), Number(mo) - 1).toLocaleString("en-US", {
        month: "short",
        year: "numeric",
      });
      return { label, total, change, pct };
    })
    .reverse();
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p className="font-medium text-foreground">{formatCurrency(payload[0].value)}</p>
    </div>
  );
};

const NetWorthChart = () => {
  const { user } = useAuth();
  const [allPoints, setAllPoints] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("1y");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("transactions")
      .select("amount, date")
      .eq("user_id", user.id)
      .order("date", { ascending: true })
      .then(({ data: txs }) => {
        if (!txs || txs.length === 0) {
          setLoading(false);
          return;
        }
        let running = 0;
        const grouped: Record<string, number> = {};
        for (const tx of txs) {
          running += Number(tx.amount);
          grouped[tx.date] = running;
        }
        setAllPoints(
          Object.entries(grouped).map(([date, total]) => ({ date, total }))
        );
        setLoading(false);
      });
  }, [user]);

  const filtered = useMemo(() => {
    const cutoff = cutoffDate(period);
    if (!cutoff) return allPoints;
    return allPoints.filter((p) => new Date(p.date) >= cutoff);
  }, [allPoints, period]);

  const chartData = useMemo(
    () => downsample(filtered).map((p) => ({ date: formatDate(p.date), total: p.total })),
    [filtered]
  );

  const monthlyRows = useMemo(() => toMonthlyRows(filtered), [filtered]);

  if (loading) {
    return (
      <section className="bg-card rounded-lg p-6">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </section>
    );
  }

  if (allPoints.length === 0) {
    return (
      <section className="bg-card rounded-lg p-6">
        <p className="text-sm font-body text-muted-foreground tracking-wide uppercase mb-4">
          Net Worth Over Time
        </p>
        <p className="text-sm text-muted-foreground text-center py-4">No transaction data yet.</p>
      </section>
    );
  }

  const currentTotal = filtered.length ? filtered[filtered.length - 1].total : 0;
  const startTotal = filtered.length ? filtered[0].total : 0;
  const totalChange = currentTotal - startTotal;
  const totalPct = startTotal !== 0 ? (totalChange / Math.abs(startTotal)) * 100 : null;
  const isPositive = totalChange >= 0;

  return (
    <section className="bg-card rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-body text-muted-foreground tracking-wide uppercase mb-1">
            Net Worth Over Time
          </p>
          <p className="font-heading text-2xl font-bold text-foreground">{formatCurrency(currentTotal)}</p>
          {filtered.length > 1 && (
            <p className={`text-sm mt-0.5 ${isPositive ? "text-green-500" : "text-red-500"}`}>
              {isPositive ? "+" : ""}{formatCurrency(totalChange)}
              {totalPct !== null && ` (${isPositive ? "+" : ""}${totalPct.toFixed(1)}%)`}
              <span className="text-muted-foreground ml-1">this period</span>
            </p>
          )}
        </div>

        {/* Period filter */}
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                period === p.value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-52">
        {chartData.length < 2 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            Not enough data for the selected period.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="currentColor" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "currentColor", opacity: 0.4 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "currentColor", opacity: 0.4 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `$${v >= 1000 || v <= -1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                width={48}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="currentColor"
                strokeWidth={2}
                fill="url(#netWorthGradient)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Monthly breakdown table */}
      {monthlyRows.length > 0 && (
        <div>
          <p className="text-xs font-body text-muted-foreground tracking-wide uppercase mb-3">
            Monthly Breakdown
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs text-muted-foreground font-normal pb-2">Month</th>
                  <th className="text-right text-xs text-muted-foreground font-normal pb-2">Net Worth</th>
                  <th className="text-right text-xs text-muted-foreground font-normal pb-2">Change</th>
                  <th className="text-right text-xs text-muted-foreground font-normal pb-2">%</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRows.map((row) => (
                  <tr key={row.label} className="border-b border-border/40 last:border-0">
                    <td className="py-2 text-foreground">{row.label}</td>
                    <td className="py-2 text-right font-mono text-foreground">{formatCurrency(row.total)}</td>
                    <td className={`py-2 text-right font-mono ${row.change === null ? "text-muted-foreground" : row.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {row.change === null ? "—" : `${row.change >= 0 ? "+" : ""}${formatCurrency(row.change)}`}
                    </td>
                    <td className={`py-2 text-right font-mono ${row.pct === null ? "text-muted-foreground" : row.pct >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {row.pct === null ? "—" : `${row.pct >= 0 ? "+" : ""}${row.pct.toFixed(1)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};

export default NetWorthChart;
