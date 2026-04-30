import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type DataPoint = {
  date: string;
  total: number;
};

const NetWorthChart = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);

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

        txs.forEach((tx) => {
          running += Number(tx.amount);
          grouped[tx.date] = running;
        });

        const points = Object.entries(grouped).map(([date, total]) => ({
          date,
          total,
        }));

        setData(points);
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return (
      <section className="bg-card rounded-lg p-6">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </section>
    );
  }

  if (data.length === 0) {
    return (
      <section className="bg-card rounded-lg p-6">
        <p className="text-sm font-body text-muted-foreground tracking-wide uppercase mb-4">
          Net Worth Over Time
        </p>
        <p className="text-sm text-muted-foreground text-center py-4">
          No transaction data yet.
        </p>
      </section>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.total));
  const minVal = Math.min(...data.map((d) => d.total));
  const range = maxVal - minVal || 1;
  const chartHeight = 200;
  const chartWidth = 600;
  const padding = 40;

  const points = data
    .map((d, i) => {
      const x = padding + (i / (data.length - 1 || 1)) * (chartWidth - padding * 2);
      const y = chartHeight - padding - ((d.total - minVal) / range) * (chartHeight - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `${padding},${chartHeight - padding} ${points} ${chartWidth - padding},${chartHeight - padding}`;

  return (
    <section className="bg-card rounded-lg p-6">
      <p className="text-sm font-body text-muted-foreground tracking-wide uppercase mb-4">
        Net Worth Over Time
      </p>
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = chartHeight - padding - pct * (chartHeight - padding * 2);
          const val = minVal + pct * range;
          return (
            <g key={pct}>
              <line
                x1={padding}
                y1={y}
                x2={chartWidth - padding}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.1}
              />
              <text
                x={padding - 5}
                y={y + 4}
                textAnchor="end"
                fill="currentColor"
                fillOpacity={0.4}
                fontSize="10"
              >
                ${Math.round(val)}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <polygon points={areaPoints} fill="currentColor" fillOpacity={0.05} />

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {data.map((d, i) => {
          const x = padding + (i / (data.length - 1 || 1)) * (chartWidth - padding * 2);
          const y = chartHeight - padding - ((d.total - minVal) / range) * (chartHeight - padding * 2);
          return <circle key={i} cx={x} cy={y} r="3" fill="currentColor" />;
        })}

        {/* Date labels */}
        {data.map((d, i) => {
          if (data.length > 7 && i % Math.ceil(data.length / 5) !== 0 && i !== data.length - 1) return null;
          const x = padding + (i / (data.length - 1 || 1)) * (chartWidth - padding * 2);
          const parts = d.date.split("-");
          const label = `${parts[1]}/${parts[2]}`;
          return (
            <text
              key={i}
              x={x}
              y={chartHeight - padding + 15}
              textAnchor="middle"
              fill="currentColor"
              fillOpacity={0.4}
              fontSize="10"
            >
              {label}
            </text>
          );
        })}
      </svg>
    </section>
  );
};

export default NetWorthChart;
