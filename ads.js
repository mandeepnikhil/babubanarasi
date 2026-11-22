/* ===========================================================
   BABU BANARASI · AD MEASUREMENT (Meta Pixel + Google tag)
   Does nothing until META_PIXEL_ID or GOOGLE_TAG_ID is filled in,
   in config.js. Then it asks each visitor once, and only loads
   Meta's or Google's script if they choose "Allow".
   Never runs on the sign-in and account pages.

   Other scripts report what happened with window.BB_TRACK(name, data):
     ViewContent, AddToCart, InitiateCheckout, Purchase, Lead, Contact
   =========================================================== */
(function () {
  const cfg = window.BB_CONFIG || {};
  const PIXEL = /^\d{6,20}$/.test(cfg.META_PIXEL_ID || "") ? cfg.META_PIXEL_ID : "";
  const GTAG = /^(G|AW)-[A-Z0-9]{4,20}$/.test(cfg.GOOGLE_TAG_ID || "") ? cfg.GOOGLE_TAG_ID : "";
  const KEY = "bb-consent";
  const page = document.body?.dataset.page || "";
  const off = !(PIXEL || GTAG) || page === "login" || page === "account";

  const queue = [];
  const seen = new Set();
  let ready = false;
  window.BB_TRACK = (name, data = {}) => {
    if (off) return;
    // Pages can re-render; count a product view, checkout start or order once per page load
    if (["ViewContent", "InitiateCheckout", "Purchase", "Lead"].includes(name) && (data.ids || data.orderId)) {
      const k = `${name}|${data.orderId || ""}|${(data.ids || []).join(",")}`;
      if (seen.has(k)) return;
      seen.add(k);
    }
    if (ready) send(name, data); else queue.push([name, data]);
  };
  if (off) return;

  const get = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const set = (v) => { try { localStorage.setItem(KEY, v); } catch (e) {} };

  // Google's own names for the same moments
  const G_EVENT = { ViewContent: "view_item", AddToCart: "add_to_cart", InitiateCheckout: "begin_checkout", Purchase: "purchase", Lead: "generate_lead", Contact: "contact" };

  function send(name, d) {
    const value = Number(d.value) || undefined;
    if (PIXEL && window.fbq) {
      window.fbq("track", name, {
        ...(d.ids ? { content_ids: d.ids, content_type: "product" } : {}),
        ...(d.name ? { content_name: d.name } : {}),
        ...(value ? { value, currency: "INR" } : {}),
      }, d.orderId ? { eventID: d.orderId } : undefined);
    }
    if (GTAG && window.gtag) {
      window.gtag("event", G_EVENT[name] || name, {
        ...(value ? { value, currency: "INR" } : {}),
        ...(d.orderId ? { transaction_id: d.orderId } : {}),
        ...(d.ids ? { items: d.ids.map((id) => ({ item_id: id })) } : {}),
      });
    }
  }

  function load() {
    if (ready) return;
    if (PIXEL) {
      /* Meta's standard loader */
      const f = (window.fbq = function () { f.callMethod ? f.callMethod.apply(f, arguments) : f.queue.push(arguments); });
      if (!window._fbq) window._fbq = f;
      f.push = f; f.loaded = true; f.version = "2.0"; f.queue = [];
      const s = document.createElement("script");
      s.async = true; s.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(s);
      window.fbq("init", PIXEL);
      window.fbq("track", "PageView");
    }
    if (GTAG) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      const s = document.createElement("script");
      s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GTAG)}`;
      document.head.appendChild(s);
      window.gtag("js", new Date());
      window.gtag("config", GTAG);
    }
    ready = true;
    queue.splice(0).forEach(([n, d]) => send(n, d));
  }

  // Any tap on a WhatsApp link counts as someone getting in touch
  document.addEventListener("click", (e) => {
    const a = e.target.closest?.('a[href^="https://wa.me/"]');
    if (a) window.BB_TRACK("Contact");
  }, true);

  /* ---------- The one-time question ---------- */
  function banner() {
    if (document.querySelector(".consent")) return;
    const box = document.createElement("div");
    box.className = "consent";
    box.setAttribute("role", "region");
    box.setAttribute("aria-label", "Cookie choice");
    box.innerHTML = `
      <p>We'd like to use Meta and Google cookies to see which of our ads bring you here. Nothing loads unless you allow it. <a href="policies.html#privacy">Privacy</a></p>
      <div class="consent-btns">
        <button type="button" class="btn btn-line" data-c="no">Only essential</button>
        <button type="button" class="btn btn-maroon" data-c="yes">Allow</button>
      </div>`;
    box.addEventListener("click", (e) => {
      const b = e.target.closest("[data-c]");
      if (!b) return;
      set(b.dataset.c);
      box.remove();
      if (b.dataset.c === "yes") load();
    });
    document.body.appendChild(box);
  }

  // "Cookie settings" links anywhere on the site reopen the question
  document.addEventListener("click", (e) => {
    if (!e.target.closest?.("[data-consent-open]")) return;
    e.preventDefault();
    banner();
  });

  const choice = get();
  if (choice === "yes") load();
  else if (choice !== "no") banner();
})();
