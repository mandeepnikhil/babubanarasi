// create-order: prices the bag on the server, records the order, and (for online
// payment) creates a Razorpay order. The browser never decides the amount.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { cors, json, rateLimited } from "../_shared/http.ts";

const SITE_URL = Deno.env.get("SITE_URL") ?? "https://babubanarasi.com";
const SHIPPING_INDIA = Number(Deno.env.get("SHIPPING_INDIA") ?? "0");
const GIFT_WRAP = Number(Deno.env.get("GIFT_WRAP") ?? "0");
// Only for testing with rzp_test_ keys. Never turn on with live keys.
const ALLOW_SAMPLE_PAYMENTS = Deno.env.get("ALLOW_SAMPLE_PAYMENTS") === "true";

type Product = { id: string; name: string; price: number; stock: number; madeToOrder?: boolean; sample?: boolean };

const clean = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

function newOrderId(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const rand = [...crypto.getRandomValues(new Uint8Array(4))].map((b) => (b % 36).toString(36)).join("").toUpperCase();
  return `BB${String(d.getUTCFullYear()).slice(2)}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${rand}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  try {
    const body = await req.json();
    const method: "razorpay" | "whatsapp" = body.method === "razorpay" ? "razorpay" : "whatsapp";
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    // At most 10 orders per visitor every 10 minutes: stops someone flooding the order list
    if (await rateLimited(admin, req, "create-order", 10, 600)) {
      return json(req, { error: "You've placed several orders in a few minutes. Please wait a little, or message us on WhatsApp." }, 429);
    }

    // Signed-in customer (optional: guests can order too)
    let userId: string | null = null;
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (token && token !== Deno.env.get("SUPABASE_ANON_KEY")) {
      const { data } = await admin.auth.getUser(token);
      userId = data?.user?.id ?? null;
    }

    // Customer details
    const c = body.customer ?? {};
    const customer = {
      name: clean(c.name, 100), phone: clean(c.phone, 20), email: clean(c.email, 120),
      address1: clean(c.address1), address2: clean(c.address2), city: clean(c.city, 80),
      state: clean(c.state, 80), pincode: clean(c.pincode, 12), country: clean(c.country, 40) || "India",
    };
    if (customer.name.length < 2 || customer.phone.length < 7 || customer.address1.length < 5 ||
        customer.city.length < 2 || customer.pincode.length < 3) {
      return json(req, { error: "Please check your name, phone number and address." }, 400);
    }
    const india = customer.country === "India";
    if (method === "razorpay" && !india) {
      return json(req, { error: "For orders outside India, please order on WhatsApp so we can quote shipping first." }, 400);
    }

    // Price everything from the live catalogue, never from the browser
    const res = await fetch(`${SITE_URL}/products.json?ts=${Date.now()}`);
    if (!res.ok) return json(req, { error: "We couldn't load the collection. Please try again." }, 502);
    const products: Product[] = (await res.json()).products ?? [];
    const byId = new Map(products.map((p) => [p.id, p]));

    const lines = Array.isArray(body.items) ? body.items.slice(0, 20) : [];
    const items: Array<Record<string, unknown>> = [];
    for (const line of lines) {
      const p = byId.get(String(line?.id));
      const qty = Math.floor(Number(line?.qty));
      if (!p || !(qty >= 1)) return json(req, { error: "Something in your bag is no longer available. Please refresh the page." }, 400);
      const max = p.stock > 0 ? p.stock : p.madeToOrder ? 3 : 0;
      if (qty > max) return json(req, { error: `${p.name} isn't available in that quantity any more.` }, 409);
      if (method === "razorpay" && p.sample && !ALLOW_SAMPLE_PAYMENTS) {
        return json(req, { error: "Sample pieces can't be paid for online. Please order on WhatsApp and we'll show you what's on the loom." }, 400);
      }
      items.push({ id: p.id, name: p.name, price: p.price, qty, madeToOrder: p.stock === 0 && !!p.madeToOrder, sample: !!p.sample });
    }
    if (!items.length) return json(req, { error: "Your bag is empty." }, 400);

    const subtotal = items.reduce((s, i) => s + (i.price as number) * (i.qty as number), 0);
    const shipping = india ? SHIPPING_INDIA : null;
    const giftWrap = body.gift ? GIFT_WRAP : 0;
    const total = subtotal + (shipping ?? 0) + giftWrap;
    const id = newOrderId();

    const row: Record<string, unknown> = {
      id, user_id: userId, payment_method: method,
      status: method === "razorpay" ? "created" : "whatsapp",
      items, subtotal, shipping, gift_wrap: giftWrap, total, currency: "INR",
      customer, notes: clean(body.notes, 500),
    };

    if (method === "razorpay") {
      const keyId = Deno.env.get("RAZORPAY_KEY_ID");
      const secret = Deno.env.get("RAZORPAY_KEY_SECRET");
      if (!keyId || !secret) return json(req, { error: "Online payment isn't switched on yet. Please order on WhatsApp." }, 503);

      const r = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Basic " + btoa(`${keyId}:${secret}`) },
        body: JSON.stringify({
          amount: total * 100, // paise
          currency: "INR",
          receipt: id,
          notes: { order: id, customer: customer.name, phone: customer.phone },
        }),
      });
      const rzp = await r.json();
      if (!r.ok) {
        console.error("Razorpay order failed", rzp);
        return json(req, { error: "We couldn't start the payment. Please try again, or order on WhatsApp." }, 502);
      }
      row.razorpay_order_id = rzp.id;
      const { error } = await admin.from("orders").insert(row);
      if (error) {
        console.error("Order insert failed", error);
        return json(req, { error: "We couldn't save your order. Please try again." }, 500);
      }
      return json(req, { orderId: id, razorpayOrderId: rzp.id, amount: rzp.amount, currency: rzp.currency, keyId, total });
    }

    const { error } = await admin.from("orders").insert(row);
    if (error) console.error("Order insert failed", error);
    return json(req, { orderId: id, total });
  } catch (e) {
    console.error(e);
    return json(req, { error: "Something went wrong. Please try again." }, 500);
  }
});
