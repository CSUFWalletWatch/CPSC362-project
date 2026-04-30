import { useEffect } from "react";
import NetWorthChart from "@/components/NetWorthChart";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import NetPosition from "@/components/NetPosition";
import MonthlyPace from "@/components/MonthlyPace";
import UpcomingBills from "@/components/UpcomingBills";
import RecentTransactions from "@/components/RecentTransactions";
import PlaidLink from "@/components/PlaidLink";
import { LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import GoalsPreview from "@/components/GoalsPreview";
const Index = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }
  if (!user) return null;
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <h1 className="font-heading text-lg tracking-tight text-foreground">Wallet Watch</h1>
          <div className="flex items-center gap-3">
            <Link
              to="/goals"
              className="text-sm text-primary hover:underline"
            >
              Goals
            </Link>
            <Link
              to="/insights"
              className="text-sm text-primary hover:underline"
            >
              Insights
            </Link>
          
            <PlaidLink />
            <span className="text-sm text-muted-foreground">{user.email}</span>
          
            <button
              onClick={signOut}
              className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              <LogOut className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <NetPosition />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MonthlyPace />
          <GoalsPreview />
        </div>
        <UpcomingBills />
        <NetWorthChart />
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-medium text-muted-foreground">
            Recent Transactions
          </h2>
        <Link
          to="/transactions"
          className="text-sm text-primary hover:underline"
        >
          View All →
        </Link>
      </div>
      <RecentTransactions />
        <footer className="text-center py-8">
          <p className="text-xs text-muted-foreground">
All figures are current as of today.
          </p>
        </footer>
      </main>
    </div>
  );
};
export default Index;
