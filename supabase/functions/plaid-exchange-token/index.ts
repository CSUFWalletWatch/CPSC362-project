import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PLAID_CLIENT_ID = Deno.env.get("PLAID_CLIENT_ID");
    const PLAID_SECRET = Deno.env.get("PLAID_SECRET");
    const PLAID_ENV = Deno.env.get("PLAID_ENV") || "sandbox";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
      throw new Error("Plaid credentials not configured");
    }

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { public_token, institution_name, accounts } = await req.json();

    const baseUrl = PLAID_ENV === "production"
      ? "https://production.plaid.com"
      : PLAID_ENV === "development"
      ? "https://development.plaid.com"
      : "https://sandbox.plaid.com";

    // Exchange public token for access token
    const exchangeRes = await fetch(`${baseUrl}/item/public_token/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        public_token,
      }),
    });

    const exchangeData = await exchangeRes.json();
    if (!exchangeRes.ok) throw new Error(`Plaid exchange error: ${JSON.stringify(exchangeData)}`);

    const accessToken = exchangeData.access_token;
    const itemId = exchangeData.item_id;

    // Save linked account
    for (const account of (accounts || [])) {
      await supabase.from("linked_accounts").insert({
        user_id: user.id,
        plaid_item_id: itemId,
        plaid_access_token: accessToken,
        institution_name: institution_name || "Unknown",
        account_name: account.name,
        account_type: account.type,
      });
    }

    // Fetch recent transactions
    const txRes = await fetch(`${baseUrl}/transactions/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        access_token: accessToken,
      }),
    });

    const txData = await txRes.json();

    if (txData.added && txData.added.length > 0) {
      const txRows = txData.added.map((tx: any) => ({
        user_id: user.id,
        plaid_transaction_id: tx.transaction_id,
        name: tx.name || tx.merchant_name || "Unknown",
        category: tx.personal_finance_category?.primary || tx.category?.[0] || null,
        amount: -tx.amount, // Plaid uses positive for debits
        date: tx.date,
        is_manual: false,
      }));

      await supabase.from("transactions").insert(txRows);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Plaid exchange error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
