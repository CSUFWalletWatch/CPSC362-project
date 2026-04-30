import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
        setChecking(false);
      }
    });

    // Check existing session as fallback (user may have already been authed by the recovery link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
      }
      setChecking(false);
    });

    // Timeout so user never gets stuck
    const timeout = setTimeout(() => setChecking(false), 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({ title: "Reset failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated", description: "Your password has been reset successfully." });
      navigate("/auth");
    }
    setLoading(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-heading text-3xl font-bold text-foreground mb-4">Wallet Watch</h1>
          <p className="text-muted-foreground">Verifying your reset link…</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-heading text-3xl font-bold text-foreground mb-4">Wallet Watch</h1>
          <p className="text-muted-foreground mb-4">This reset link is invalid or has expired.</p>
          <Button variant="outline" onClick={() => navigate("/auth")}>
            Back to login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-heading text-3xl font-bold text-foreground text-center mb-8">
          Wallet Watch
        </h1>

        <div className="bg-card rounded-lg p-6">
          <p className="text-sm font-body text-muted-foreground tracking-wide uppercase mb-4">
            Set New Password
          </p>

          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Updating…" : "Update Password"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => navigate("/auth")}
            className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-center"
          >
            Back to login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
