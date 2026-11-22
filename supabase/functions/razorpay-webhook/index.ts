// razorpay-webhook: Razorpay calls this directly when a payment is captured or fails.
// It's the safety net if a customer closes the browser before verify-payment runs.
// Set the webhook URL in Razorpay → Settings → Webhooks, with events
// payment.captured, order.paid and payment.failed, and the same secret as RAZORPAY_WEBHOOK_SECRET.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { hmacHex, safeEqual } from "../_shared/http.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
  if (!secret) return new Response("Webhook not configured", { status: 503 });

  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const expected = await hmacHex(secret, raw);
  if (!safeEqual(expected, signature)) return new Response("Invalid signature", { status: 401 });

  let evt: any;
  try { evt = JSON.parse(raw); } catch { return new Response("Bad payload", { status: 400 }); }

  const payment = evt?.payload?.payment?.entity;
  const rzpOrderId: string | undefined = payment?.order_id ?? evt?.payload?.order?.entity?.id;
  if (!rzpOrderId) return new Response(JSON.stringify({ ok: true, ignored: true }), { status: 200 });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const now = new Date().toISOString();

  if (evt.event === "payment.captured" || evt.event === "order.paid") {
    await admin.from("orders")
      .update({ status: "paid", razorpay_payment_id: payment?.id ?? null, updated_at: now })
      .eq("razorpay_order_id", rzpOrderId).in("status", ["created", "failed"]);
  } else if (evt.event === "payment.failed") {
    await admin.from("orders")
      .update({ status: "failed", updated_at: now })
      .eq("razorpay_order_id", rzpOrderId).eq("status", "created");
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
});
