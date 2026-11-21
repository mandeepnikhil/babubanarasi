// verify-payment: checks Razorpay's signature after checkout and marks the order paid.
// A payment only counts if the signature matches, so it can't be faked from the browser.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { cors, json, hmacHex, safeEqual } from "../_shared/http.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return json(req, { error: "Missing payment details." }, 400);
    }

    const secret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!secret) return json(req, { error: "Online payment isn't configured." }, 503);

    const expected = await hmacHex(secret, `${razorpay_order_id}|${razorpay_payment_id}`);
    if (!safeEqual(expected, String(razorpay_signature))) {
      return json(req, { error: "We couldn't verify this payment." }, 400);
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    const { data: order, error } = await admin
      .from("orders").select("id, status, razorpay_order_id")
      .eq("id", String(orderId)).eq("razorpay_order_id", String(razorpay_order_id)).maybeSingle();
    if (error || !order) return json(req, { error: "Order not found." }, 404);

    if (order.status !== "paid") {
      const { error: upd } = await admin.from("orders")
        .update({ status: "paid", razorpay_payment_id, updated_at: new Date().toISOString() })
        .eq("id", order.id);
      if (upd) {
        console.error("Order update failed", upd);
        return json(req, { error: "Payment verified but we couldn't update your order. We'll fix it and message you." }, 500);
      }
    }
    return json(req, { ok: true, orderId: order.id, status: "paid" });
  } catch (e) {
    console.error(e);
    return json(req, { error: "Something went wrong while confirming your payment." }, 500);
  }
});
