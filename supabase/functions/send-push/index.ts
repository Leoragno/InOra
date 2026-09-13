import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import WebPush from "https://esm.sh/web-push@3.6.6";

// Le tue chiavi VAPID
const VAPID_PUBLIC_KEY = "BNjv6Z8q4i2w3U7exY3BuEcAOjt67PR9YAy-PsrUKj67gQ-a-CjwmG_CK91fBYeGHuIMkjRAWx0sfjXKt6mJN3M";
// 🔐 IMPORTANTE: La chiave PRIVATA deve essere salvata come variabile d'ambiente, non scritta qui!
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;

WebPush.setVapidDetails(
  "mailto:admin@example.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Necessario perché il browser (dominio Vercel) chiama una funzione su un dominio diverso
// (supabase.co): senza questi header la richiesta preflight/risposta viene bloccata dal
// browser e il fetch lato client fallisce silenziosamente.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { title, body, url, target_type, target_value } = await req.json();

    // Crea un client Supabase con la Service Role Key per bypassare le RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SB_SERVICE_KEY")!
    );

    // Costruisce la query delle subscription da notificare in base al destinatario.
    let query = supabase.from("push_subscriptions").select("subscription_json, user_id");

    if (target_type === "single" && target_value) {
      query = query.eq("user_id", target_value);
    } else if (target_type === "oratory" && target_value) {
      // push_subscriptions non ha la colonna "oratory_id": bisogna prima recuperare
      // gli id degli utenti di quell'oratorio dalla tabella profiles.
      const { data: users, error: usersError } = await supabase
        .from("profiles")
        .select("id")
        .eq("oratory_id", target_value);

      if (usersError) {
        return new Response(JSON.stringify({ error: usersError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ids = (users || []).map((u: any) => u.id);
      if (ids.length === 0) {
        return new Response(JSON.stringify({ success: true, sent: 0, reason: "Nessun utente in questo oratorio", debug: { target_type, target_value } }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      query = query.in("user_id", ids);
    }
    // target_type === "all" (o assente) → nessun filtro, manda a tutte le subscription.

    const { data: subscriptions, error } = await query;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        sent: 0,
        reason: "Nessuna subscription trovata per il destinatario",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = await Promise.allSettled(
      subscriptions.map((sub: any) =>
        WebPush.sendNotification(sub.subscription_json, JSON.stringify({ title, body, url })).catch(
          async (err: any) => {
            if (err.statusCode === 404 || err.statusCode === 410) {
              // Subscription scaduta/non più valida: la rimuoviamo dal database.
              await supabase
                .from("push_subscriptions")
                .delete()
                .eq("subscription_json->>endpoint", sub.subscription_json.endpoint);
            }
            throw err;
          }
        )
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - sent;
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => ({
        message: r.reason?.message || String(r.reason),
        statusCode: r.reason?.statusCode ?? null,
        body: r.reason?.body ?? null,
      }));

    return new Response(JSON.stringify({ success: true, sent, failed, total: subscriptions.length, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
