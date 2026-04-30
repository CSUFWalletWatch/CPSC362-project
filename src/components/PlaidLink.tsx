import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Landmark } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PlaidLink = ({ onSuccess }: { onSuccess?: () => void }) => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleLink = async () => {
    if (!user || !session) return;
    setLoading(true);

    try {
      // 1. Get link token from edge function
      const { data: linkData, error: linkError } = await supabase.functions.invoke("plaid-create-link-token", {
        body: { user_id: user.id },
      });

      if (linkError || !linkData?.link_token) {
        throw new Error(linkError?.message || "Failed to create link token");
      }

      // 2. Open Plaid Link
      const handler = (window as any).Plaid.create({
        token: linkData.link_token,
        onSuccess: async (publicToken: string, metadata: any) => {
          // 3. Exchange public token
          const { error: exchangeError } = await supabase.functions.invoke("plaid-exchange-token", {
            body: {
              public_token: publicToken,
              institution_name: metadata.institution?.name,
              accounts: metadata.accounts,
            },
          });

          if (exchangeError) {
            toast({ title: "Error linking account", description: exchangeError.message, variant: "destructive" });
          } else {
            toast({ title: "Account linked!", description: `${metadata.institution?.name} connected successfully.` });
            onSuccess?.();
          }
        },
        onExit: () => setLoading(false),
      });

      handler.open();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleLink} disabled={loading} variant="outline" className="gap-2">
      <Landmark className="w-4 h-4" />
      {loading ? "Connecting…" : "Link Bank Account"}
    </Button>
  );
};

export default PlaidLink;
