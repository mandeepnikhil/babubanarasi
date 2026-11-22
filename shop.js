/* ===========================================================
   BABU BANARASI · SHOP
   Edit the settings below. Products live in products.json.
   =========================================================== */
const SHOP = {
  WHATSAPP_NUMBER: "919260984531",      // orders arrive here
  // Razorpay and accounts are configured in config.js (public keys) and Supabase (secret key)
  SHIPPING_INDIA: 0,                    // flat shipping within India in ₹ (0 = free)
  GIFT_WRAP: 0,                         // gift wrap price in ₹ (0 = free)
  POLICY: {
    shipping: "Shipped within India by insured courier, usually in 3–7 working days after your order is confirmed. Outside India, we quote shipping on WhatsApp before you pay.",
    returns: "Every piece is checked and shown to you on video before it leaves us. If something isn't right when it arrives, write to us within 48 hours of delivery and we'll make it right.",
  },
};

(function () {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");
  const wa = (t) => `https://wa.me/${SHOP.WHATSAPP_NUMBER}?text=${encodeURIComponent(t)}`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const page = document.body.dataset.page;
  const CFG = window.BB_CONFIG || {};
  const AUTH = window.BB_AUTH || null;
  const backendReady = () => !!(AUTH && AUTH.state.configured);
  const onlineReady = () => backendReady() && !!CFG.RAZORPAY_KEY_ID;
  let PRODUCTS = [];
  const byId = (id) => PRODUCTS.find((p) => p.id === id);
  const canBuy = (p) => p.stock > 0 || p.madeToOrder;
  const maxQty = (p) => (p.stock > 0 ? p.stock : p.madeToOrder ? 3 : 0);
  const availability = (p) =>
    p.stock > 1 ? { label: "In stock · ready to ship", cls: "ok" } :
    p.stock === 1 ? { label: "Only one piece · every handloom saree is one of a kind", cls: "one" } :
    p.madeToOrder ? { label: "Made to order · we confirm the timeline with you", cls: "mto" } :
    { label: "Sold out", cls: "out" };

  /* ---------- Toast ---------- */
  const toast = (msg) => {
    let t = $(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove("show"), 2600);
  };

  /* ---------- Cart ---------- */
  let cart = store.get("bb-cart", []);
  const saveCart = () => { store.set("bb-cart", cart); renderBag(); };
  const cartItems = () => cart.map((c) => ({ ...c, p: byId(c.id) })).filter((c) => c.p);
  const subtotal = () => cartItems().reduce((s, c) => s + c.p.price * c.qty, 0);
  const count = () => cartItems().reduce((s, c) => s + c.qty, 0);
  const addToCart = (id, qty = 1, open = true) => {
    const p = byId(id);
    if (!p || !canBuy(p)) return;
    const line = cart.find((c) => c.id === id);
    const want = (line ? line.qty : 0) + qty;
    const capped = Math.min(want, maxQty(p));
    if (line) line.qty = capped; else cart.push({ id, qty: capped });
    saveCart();
    if (capped < want) toast(`Only ${maxQty(p)} available, so your bag has the most we can offer.`);
    else toast("Added to your bag");
    if (open) openBag();
  };
  const setQty = (id, qty) => {
    const p = byId(id);
    const line = cart.find((c) => c.id === id);
    if (!line || !p) return;
    line.qty = Math.max(1, Math.min(qty, maxQty(p)));
    saveCart();
  };
  const removeLine = (id) => { cart = cart.filter((c) => c.id !== id); saveCart(); };

  /* ---------- Bag drawer ---------- */
  const bag = document.createElement("aside");
  bag.className = "bag";
  bag.setAttribute("aria-label", "Your bag");
  bag.setAttribute("aria-hidden", "true");
  bag.innerHTML = `
    <div class="bag-panel" role="dialog" aria-modal="true" aria-labelledby="bag-title">
      <header class="bag-head"><h2 id="bag-title">Your bag</h2><button type="button" class="bag-close" aria-label="Close bag">×</button></header>
      <div class="bag-body"></div>
      <footer class="bag-foot"></footer>
    </div>`;
  document.body.appendChild(bag);
  let lastFocus = null;
  const openBag = () => {
    lastFocus = document.activeElement;
    bag.classList.add("open"); bag.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("bag-lock");
    $(".bag-close", bag).focus();
  };
  const closeBag = () => {
    bag.classList.remove("open"); bag.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("bag-lock");
    lastFocus?.focus?.({ preventScroll: true });
  };
  bag.addEventListener("click", (e) => {
    if (e.target === bag || e.target.closest(".bag-close") || e.target.closest(".bag-continue")) closeBag();
    const line = e.target.closest("[data-line]");
    if (!line) return;
    const id = line.dataset.line, c = cart.find((x) => x.id === id);
    if (e.target.closest(".q-minus")) setQty(id, c.qty - 1);
    if (e.target.closest(".q-plus")) setQty(id, c.qty + 1);
    if (e.target.closest(".line-remove")) removeLine(id);
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && bag.classList.contains("open")) closeBag(); });
  document.addEventListener("click", (e) => { if (e.target.closest(".bag-btn")) { e.preventDefault(); openBag(); } });

  function renderBag() {
    $$(".bag-count").forEach((el) => { el.textContent = count(); el.hidden = count() === 0; });
    const items = cartItems();
    $("#bag-title").textContent = `Your bag${items.length ? ` (${count()})` : ""}`;
    const body = $(".bag-body", bag), foot = $(".bag-foot", bag);
    if (!items.length) {
      body.innerHTML = `<div class="bag-empty"><p class="be-hi" lang="hi">थैला ख़ाली है</p><p>Your bag is empty.</p><a class="btn btn-maroon" href="shop.html">Browse the sarees</a></div>`;
      foot.innerHTML = "";
      return;
    }
    body.innerHTML = items.map(({ p, qty }) => `
      <div class="line" data-line="${p.id}">
        <a href="product.html?id=${p.id}" class="line-img"><img src="${p.images[0]}" alt="" /></a>
        <div class="line-info">
          <a href="product.html?id=${p.id}" class="line-name">${esc(p.name)}</a>
          <p class="line-meta">${esc(p.fabric)} · ${esc(p.technique)}${p.stock === 0 && p.madeToOrder ? " · made to order" : ""}</p>
          <div class="line-row">
            <div class="qty" aria-label="Quantity">
              <button type="button" class="q-minus" aria-label="Fewer" ${qty <= 1 ? "disabled" : ""}>−</button>
              <span>${qty}</span>
              <button type="button" class="q-plus" aria-label="More" ${qty >= maxQty(p) ? "disabled" : ""}>+</button>
            </div>
            <p class="line-price">${inr(p.price * qty)}</p>
          </div>
          <button type="button" class="line-remove">Remove</button>
        </div>
      </div>`).join("");
    foot.innerHTML = `
      <div class="bag-sub"><span>Subtotal</span><strong>${inr(subtotal())}</strong></div>
      <p class="bag-note">${SHOP.SHIPPING_INDIA === 0 ? "Free shipping within India." : `Shipping within India: ${inr(SHOP.SHIPPING_INDIA)}.`} International shipping quoted on WhatsApp.</p>
      <a class="btn btn-maroon btn-full" href="checkout.html">Checkout</a>
      <button type="button" class="bag-continue">Continue shopping</button>`;
  }

  /* ---------- Shared header bits ---------- */
  // Pages that load script.js (home and the four verticals) have their menu run there.
  // Checked on click: when this file runs, later <script> tags aren't parsed yet.
  const header = $(".site-header"), toggle = $(".nav-toggle");
  toggle?.addEventListener("click", () => {
    if (document.querySelector('script[src^="script.js"]')) return;
    const open = !header.classList.contains("menu-open");
    header.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  });
  $$("[data-wa]").forEach((el) => { el.href = wa(el.dataset.wa); el.target = "_blank"; el.rel = "noopener"; });
  const yr = $("#year"); if (yr) yr.textContent = new Date().getFullYear();

  // Footer: social links appear only once they're filled in, in config.js
  const social = Object.entries(CFG.SOCIAL || {}).filter(([, u]) => /^https:\/\//.test(u || ""));
  const socBox = $(".footer-social");
  if (socBox && social.length) {
    $(".social-links", socBox).innerHTML = social.map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener me">${esc(n[0].toUpperCase() + n.slice(1))}</a>`).join("");
    socBox.hidden = false;
  }

  /* ---------- Product card ---------- */
  const card = (p) => {
    const a = availability(p);
    const badge = p.stock === 0 && !p.madeToOrder ? `<span class="pc-badge out">Sold out</span>`
      : p.stock === 0 ? `<span class="pc-badge">Made to order</span>`
      : p.stock === 1 ? `<span class="pc-badge">One of a kind</span>`
      : p.compareAt ? `<span class="pc-badge">Special price</span>` : "";
    return `
      <article class="pc ${a.cls === "out" ? "is-out" : ""}">
        <a class="pc-media" href="product.html?id=${p.id}" aria-label="${esc(p.name)}">
          <img src="${p.images[0]}" alt="${esc(p.name)}" loading="lazy" />
          ${p.images[1] ? `<img class="pc-alt" src="${p.images[1]}" alt="" loading="lazy" />` : ""}
          ${badge}
          ${p.sample ? `<span class="pc-sample">Sample</span>` : ""}
        </a>
        <div class="pc-body">
          <p class="pc-kicker">${esc(p.fabric)} · ${esc(p.technique)}</p>
          <h3 class="pc-name"><a href="product.html?id=${p.id}">${esc(p.name)}</a></h3>
          <p class="pc-price">${inr(p.price)}${p.compareAt ? ` <s>${inr(p.compareAt)}</s>` : ""}</p>
          ${canBuy(p)
            ? `<button type="button" class="pc-add" data-add="${p.id}">${p.stock === 0 ? "Order to make" : "Add to bag"}</button>`
            : `<a class="pc-add pc-ask" data-wa="Namaste! The ${p.name} is sold out. Is anything similar on the loom?" href="#">Ask for one like it</a>`}
        </div>
      </article>`;
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-add]");
    if (b) { e.preventDefault(); addToCart(b.dataset.add, 1); }
  });
  const wireWa = (root) => $$("[data-wa]", root).forEach((el) => { el.href = wa(el.dataset.wa); el.target = "_blank"; el.rel = "noopener"; });

  /* ---------- Homepage strip: a few pieces you can buy, near the top ---------- */
  function initHome() {
    const grid = $("#home-shop-grid");
    if (!grid) return;
    const pick = PRODUCTS.filter(canBuy).slice(0, 4);
    if (!pick.length) { grid.closest(".home-shop").hidden = true; return; }
    grid.innerHTML = pick.map(card).join("");
    wireWa(grid);
  }

  /* ---------- Shop page ---------- */
  function initShop() {
    const grid = $("#grid"), countEl = $("#result-count"), form = $("#filters");
    const uniq = (arr) => [...new Set(arr)];
    const groups = {
      occasion: uniq(PRODUCTS.flatMap((p) => p.occasions)),
      fabric: uniq(PRODUCTS.map((p) => p.fabric)),
      colour: uniq(PRODUCTS.map((p) => p.colour)),
    };
    const SW = { "Reds & maroons": "#8e1b2c", "Pinks & peaches": "#e3a49a", "Golds & ivories": "#d9c08a", "Blues & greens": "#1f4e5f", "Purples & wines": "#4b1f4a" };
    const PRICES = [["0-15000", "Under ₹15,000"], ["15000-30000", "₹15,000 – ₹30,000"], ["30000-50000", "₹30,000 – ₹50,000"], ["50000-9999999", "Above ₹50,000"]];
    const fs = (name, title, opts) => `
      <fieldset><legend>${title}</legend>
        ${opts.map(([v, l, sw]) => `<label class="chk"><input type="checkbox" name="${name}" value="${esc(v)}" /><span>${sw ? `<i class="sw" style="--c:${sw}"></i>` : ""}${esc(l)}</span><em>${countFor(name, v)}</em></label>`).join("")}
      </fieldset>`;
    function countFor(name, v) {
      return PRODUCTS.filter((p) =>
        name === "occasion" ? p.occasions.includes(v) :
        name === "fabric" ? p.fabric === v :
        name === "colour" ? p.colour === v :
        name === "price" ? (() => { const [a, b] = v.split("-").map(Number); return p.price >= a && p.price < b; })() : true).length;
    }
    $("#filter-groups").innerHTML =
      fs("occasion", "Occasion", groups.occasion.map((v) => [v, v])) +
      fs("fabric", "Fabric", groups.fabric.map((v) => [v, v])) +
      fs("colour", "Colour", groups.colour.map((v) => [v, v, SW[v]])) +
      fs("price", "Price", PRICES.map(([v, l]) => [v, l])) +
      `<fieldset><legend>Availability</legend><label class="chk"><input type="checkbox" name="instock" value="1" /><span>Ready to ship only</span></label></fieldset>`;

    // Pre-select from the URL, e.g. shop.html?occasion=Bridal
    const params = new URLSearchParams(location.search);
    ["occasion", "fabric", "colour"].forEach((k) => params.getAll(k).forEach((v) => {
      const box = $$(`input[name="${k}"]`, form).find((i) => i.value === v);
      if (box) box.checked = true;
    }));
    if (params.get("sort")) $("#sort").value = params.get("sort");

    const apply = () => {
      const fd = new FormData(form);
      const sel = (k) => fd.getAll(k);
      const occ = sel("occasion"), fab = sel("fabric"), col = sel("colour"), pr = sel("price"), inStock = fd.get("instock");
      let list = PRODUCTS.filter((p) =>
        (!occ.length || p.occasions.some((o) => occ.includes(o))) &&
        (!fab.length || fab.includes(p.fabric)) &&
        (!col.length || col.includes(p.colour)) &&
        (!pr.length || pr.some((r) => { const [a, b] = r.split("-").map(Number); return p.price >= a && p.price < b; })) &&
        (!inStock || p.stock > 0));
      const sort = $("#sort").value;
      if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
      else if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
      else list.sort((a, b) => Number(canBuy(b)) - Number(canBuy(a)));
      grid.innerHTML = list.length ? list.map(card).join("") :
        `<div class="no-results"><p>No sarees match these choices yet.</p><button type="button" class="btn btn-maroon" id="clear-2">Clear filters</button></div>`;
      wireWa(grid);
      countEl.textContent = `${list.length} ${list.length === 1 ? "saree" : "sarees"}`;
      const active = [...occ, ...fab, ...col, ...pr.map((r) => PRICES.find(([v]) => v === r)[1]), ...(inStock ? ["Ready to ship"] : [])];
      $("#active-filters").innerHTML = active.map((a) => `<span class="chip">${esc(a)}</span>`).join("") + (active.length ? `<button type="button" class="chip-clear" id="clear-1">Clear all</button>` : "");
      $("#filter-count").textContent = active.length ? `(${active.length})` : "";
      // Keep the URL shareable
      const q = new URLSearchParams();
      occ.forEach((v) => q.append("occasion", v)); fab.forEach((v) => q.append("fabric", v)); col.forEach((v) => q.append("colour", v));
      if (sort !== "featured") q.set("sort", sort);
      history.replaceState(null, "", q.toString() ? `?${q}` : location.pathname);
    };
    form.addEventListener("change", apply);
    $("#sort").addEventListener("change", apply);
    document.addEventListener("click", (e) => {
      if (e.target.id === "clear-1" || e.target.id === "clear-2") { form.reset(); apply(); }
    });
    // Mobile filter panel
    const panel = $(".shop-filters");
    $("#open-filters").addEventListener("click", () => { panel.classList.add("open"); document.documentElement.classList.add("bag-lock"); });
    $$(".close-filters").forEach((b) => b.addEventListener("click", () => { panel.classList.remove("open"); document.documentElement.classList.remove("bag-lock"); }));
    apply();
  }

  /* ---------- Product page ---------- */
  function initProduct() {
    const id = new URLSearchParams(location.search).get("id");
    const p = byId(id);
    const root = $("#product");
    if (!p) {
      root.innerHTML = `<div class="no-results"><p>We couldn't find that saree. It may have found a home already.</p><a class="btn btn-maroon" href="shop.html">See all sarees</a></div>`;
      $("#crumb-name").textContent = "Not found";
      const picks = PRODUCTS.filter(canBuy).slice(0, 4);
      $(".related h2").textContent = "Pieces available now";
      $("#related-grid").innerHTML = picks.map(card).join("");
      wireWa($("#related-grid"));
      return;
    }
    const a = availability(p);
    document.title = `${p.name} | Handloom Banarasi Saree | Babu Banarasi`;
    $('meta[name="description"]').setAttribute("content", `${p.short} ${p.fabric}, hand-woven in Varanasi. ${inr(p.price)}.`);
    $("#crumb-name").textContent = p.name;

    // Structured data for search engines
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org", "@type": "Product",
      name: p.name, description: p.description,
      image: p.images.map((i) => `https://babubanarasi.com/${i}`),
      sku: p.id, brand: { "@type": "Brand", name: "Babu Banarasi" }, material: p.fabric, color: p.colour,
      offers: {
        "@type": "Offer", url: `https://babubanarasi.com/product.html?id=${p.id}`, priceCurrency: "INR", price: p.price,
        availability: p.stock > 0 ? "https://schema.org/InStock" : p.madeToOrder ? "https://schema.org/PreOrder" : "https://schema.org/SoldOut",
        itemCondition: "https://schema.org/NewCondition", seller: { "@type": "Organization", name: "Babu Banarasi" },
      },
    });
    document.head.appendChild(ld);

    const trust = [
      ["Handloom, from the weaver's home", "No middlemen, no powerloom."],
      [SHOP.SHIPPING_INDIA === 0 ? "Free shipping in India" : `Shipping in India ${inr(SHOP.SHIPPING_INDIA)}`, "Insured, tracked courier."],
      ["Live video before it ships", "See the real piece, in daylight."],
      [onlineReady() ? "Secure online payment" : "Pay by UPI link", onlineReady() ? "UPI, cards and netbanking." : "Confirmed with you on WhatsApp."],
    ];
    root.innerHTML = `
      <div class="pd-gallery">
        <div class="pd-main" tabindex="0" aria-label="Product photo. Move over it to zoom.">
          <img id="pd-img" src="${p.images[0]}" alt="${esc(p.name)}" />
          ${p.sample ? `<span class="pc-sample">Sample product</span>` : ""}
        </div>
        <div class="pd-thumbs" role="list">
          ${p.images.map((src, i) => `<button type="button" class="pd-thumb ${i === 0 ? "on" : ""}" data-src="${src}" aria-label="Photo ${i + 1}"><img src="${src}" alt="" /></button>`).join("")}
        </div>
      </div>
      <div class="pd-info">
        <p class="kicker">${esc(p.fabric)} · ${esc(p.technique)}</p>
        <h1 class="pd-name">${esc(p.name)}</h1>
        <p class="pd-price">${inr(p.price)}${p.compareAt ? ` <s>${inr(p.compareAt)}</s> <span class="pd-save">Save ${inr(p.compareAt - p.price)}</span>` : ""}</p>
        <p class="pd-short">${esc(p.short)}</p>
        <p class="pd-stock ${a.cls}"><i></i>${a.label}</p>
        ${canBuy(p) ? `
          <div class="pd-buy">
            ${maxQty(p) > 1 ? `<div class="qty pd-qty" aria-label="Quantity"><button type="button" class="q-minus" aria-label="Fewer">−</button><span id="pd-q">1</span><button type="button" class="q-plus" aria-label="More">+</button></div>` : ""}
            <button type="button" class="btn btn-maroon" id="pd-add">${p.stock === 0 ? "Order to make" : "Add to bag"}</button>
            <button type="button" class="btn btn-gold" id="pd-now">Buy now</button>
          </div>` : `
          <div class="pd-buy"><a class="btn btn-maroon" data-wa="Namaste! The ${esc(p.name)} is sold out. Is anything similar on the loom?" href="#">Ask for one like it</a></div>`}
        ${canBuy(p) ? `<ul class="pd-assure">
          <li>Shown to you on video before it ships</li>
          <li>${SHOP.SHIPPING_INDIA === 0 ? "Free insured shipping in India" : "Insured, tracked shipping"}</li>
          <li>${onlineReady() ? "Secure payment by Razorpay · UPI, cards, netbanking" : "Pay by UPI link after we confirm"}</li>
          <li>Damaged or not as shown? Replacement or refund</li>
        </ul>` : ""}
        <a class="pd-video" data-wa="Namaste! Could I see the ${esc(p.name)} on a live video call?" href="#">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h12v10H3zM15 10l6-3v10l-6-3" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>
          See it on a live video call first
        </a>
        <ul class="pd-trust">${trust.map(([t, s]) => `<li><strong>${t}</strong><span>${s}</span></li>`).join("")}</ul>
        <div class="pd-acc">
          <details open><summary>The story</summary><p>${esc(p.description)}</p></details>
          <details><summary>Details</summary><dl class="pd-dl">${p.details.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl></details>
          <details><summary>Care</summary><p>Dry-clean only. Wrap it in soft muslin, never plastic, and refold it along new lines every few months so the zari doesn't crack. Keep it away from perfume and direct sun.</p></details>
          <details><summary>Shipping &amp; returns</summary><p>${esc(SHOP.POLICY.shipping)}</p><p>${esc(SHOP.POLICY.returns)}</p><p><a class="pd-policy" href="policies.html#shipping">Read our full shipping, returns and payment policies →</a></p></details>
        </div>
      </div>`;
    wireWa(root);

    // Gallery + hover zoom
    const main = $(".pd-main"), img = $("#pd-img");
    $$(".pd-thumb").forEach((t) => t.addEventListener("click", () => {
      $$(".pd-thumb").forEach((x) => x.classList.toggle("on", x === t));
      img.classList.add("swap");
      setTimeout(() => { img.src = t.dataset.src; img.classList.remove("swap"); }, 180);
    }));
    if (matchMedia("(hover: hover)").matches) {
      main.addEventListener("pointermove", (e) => {
        const r = main.getBoundingClientRect();
        img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
        main.classList.add("zoom");
      });
      main.addEventListener("pointerleave", () => main.classList.remove("zoom"));
    }

    // Quantity + buttons
    let q = 1;
    const qEl = $("#pd-q");
    $(".pd-qty .q-minus")?.addEventListener("click", () => { q = Math.max(1, q - 1); qEl.textContent = q; });
    $(".pd-qty .q-plus")?.addEventListener("click", () => { q = Math.min(maxQty(p), q + 1); qEl.textContent = q; });
    $("#pd-add")?.addEventListener("click", () => addToCart(p.id, q));
    $("#pd-now")?.addEventListener("click", () => { addToCart(p.id, q, false); location.href = "checkout.html"; });

    // Phone: keep the price and the main action in reach whenever the buttons are off-screen
    const buy = $(".pd-buy");
    if (buy && canBuy(p) && "IntersectionObserver" in window) {
      const bar = document.createElement("div");
      bar.className = "pd-sticky";
      bar.setAttribute("aria-hidden", "true");
      bar.innerHTML = `<div class="ps-info"><span class="ps-name">${esc(p.name)}</span><strong class="ps-price">${inr(p.price)}</strong></div>
        <button type="button" class="btn btn-maroon ps-add" tabindex="-1">${p.stock === 0 ? "Order to make" : "Add to bag"}</button>`;
      document.body.appendChild(bar);
      $(".ps-add", bar).addEventListener("click", () => addToCart(p.id, q));
      new IntersectionObserver(([en]) => {
        const show = !en.isIntersecting;
        bar.classList.toggle("on", show);
        document.body.classList.toggle("pd-sticky-on", show);
      }).observe(buy);
    }

    // Related pieces
    const rel = PRODUCTS.filter((x) => x.id !== p.id).map((x) => ({ x, s: (x.fabric === p.fabric) + x.occasions.filter((o) => p.occasions.includes(o)).length }))
      .sort((a, b) => b.s - a.s).slice(0, 4).map(({ x }) => x);
    $("#related-grid").innerHTML = rel.map(card).join("");
    wireWa($("#related-grid"));
  }

  /* ---------- Checkout ---------- */
  const STATES = ["Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"];
  async function initCheckout() {
    const form = $("#checkout-form"), summary = $("#summary");
    const stateSel = $("#state");
    stateSel.innerHTML = `<option value="">Select state</option>` + STATES.map((s) => `<option>${s}</option>`).join("");
    const setField = (k, v) => { const el = form.elements[k]; if (el && v && el.type !== "radio" && el.type !== "checkbox") el.value = v; };
    const saved = store.get("bb-customer", null);
    if (saved) Object.entries(saved).forEach(([k, v]) => setField(k, v));

    // Accounts: optional sign-in, prefill from the saved profile
    const auth = AUTH ? await AUTH.ready : null;
    const user = auth?.user || null;
    if (backendReady()) {
      const bar = document.createElement("div");
      bar.className = "co-account";
      if (user) {
        const p = auth.profile || {}, a = p.address || {};
        setField("name", p.full_name || user.user_metadata?.full_name || user.user_metadata?.name);
        setField("phone", (p.phone || user.phone || "").replace(/^\+91/, ""));
        setField("email", user.email || p.email);
        ["address1", "address2", "city", "state", "pincode"].forEach((k) => setField(k, a[k]));
        bar.innerHTML = `<span>Signed in as <strong>${esc(AUTH.firstName() || user.email || user.phone || "you")}</strong></span>
          <label class="co-check"><input type="checkbox" name="saveaddr" checked /> <span>Save these details to my account</span></label>`;
      } else {
        bar.innerHTML = `<span>Have an account? <a href="login.html?next=checkout.html">Sign in</a> for saved details and order tracking, or carry on as a guest.</span>`;
      }
      form.prepend(bar);
    }

    const online = $("#pay-online");
    const hasSample = () => cartItems().some(({ p }) => p.sample);
    const isIndia = () => form.elements.country.value === "India";
    const onlineBlock = () =>
      !onlineReady() ? "soon" : hasSample() ? "sample" : !isIndia() ? "intl" : "";
    const BLOCK_MSG = {
      soon: "Online payment is coming soon. Order on WhatsApp and we'll send a secure payment link.",
      sample: "Sample pieces can't be paid for online. Order on WhatsApp and we'll show you what's on the loom.",
      intl: "For orders outside India, we confirm shipping on WhatsApp first.",
    };
    const syncOnline = () => {
      const b = onlineBlock();
      online.disabled = !!b;
      online.closest(".pay-opt").classList.toggle("is-off", !!b);
      $("#pay-online-note").textContent = b ? BLOCK_MSG[b] : "UPI, cards and netbanking via Razorpay. Your payment is verified before we confirm.";
      if (b && online.checked) $("#pay-wa").checked = true;
      if (!b) preferOnline();
    };
    // When paying online is possible, list it first and choose it; WhatsApp stays as the "talk first" option
    let payTouched = false;
    $$('input[name="pay"]').forEach((r) => r.addEventListener("change", () => { payTouched = true; }));
    const preferOnline = () => {
      if (onlineBlock()) return;
      const onl = online.closest(".pay-opt"), waOpt = $("#pay-wa").closest(".pay-opt");
      if (onl.nextElementSibling !== waOpt) waOpt.before(onl);
      $("strong", waOpt).textContent = "Prefer to talk first? Order on WhatsApp";
      if (!payTouched) online.checked = true;
    };
    online.closest(".pay-opt").addEventListener("click", () => {
      if (!online.disabled) return;
      toast(BLOCK_MSG[onlineBlock()] || BLOCK_MSG.soon);
      $("#pay-wa").focus();
    });

    const totals = () => {
      const sub = subtotal();
      const ship = isIndia() ? SHOP.SHIPPING_INDIA : null;
      const gift = form.elements.gift.checked ? SHOP.GIFT_WRAP : 0;
      return { sub, ship, gift, total: sub + (ship || 0) + gift };
    };
    const renderSummary = () => {
      const items = cartItems();
      if (!items.length) {
        $(".co-grid").innerHTML = `<div class="no-results"><p>Your bag is empty.</p><a class="btn btn-maroon" href="shop.html">Browse the sarees</a></div>`;
        return false;
      }
      const t = totals();
      const narrow = matchMedia("(max-width: 860px)").matches;
      const wasOpen = !!summary.querySelector("details[open]");
      const head = narrow
        ? `<details class="sum-fold" ${wasOpen ? "open" : ""}><summary class="sum-toggle"><span>Order summary · ${count()} ${count() === 1 ? "item" : "items"}</span><strong>${inr(t.total)}</strong></summary>`
        : `<h2>Order summary</h2>`;
      summary.innerHTML = head + `
        <ul class="sum-lines">${items.map(({ p, qty }) => `
          <li><span class="sum-img"><img src="${p.images[0]}" alt="" /><b>${qty}</b></span>
            <span class="sum-name">${esc(p.name)}<small>${esc(p.fabric)}${p.stock === 0 && p.madeToOrder ? " · made to order" : ""}${p.sample ? " · sample" : ""}</small></span>
            <span class="sum-price">${inr(p.price * qty)}</span></li>`).join("")}
        </ul>
        <dl class="sum-totals">
          <div><dt>Subtotal</dt><dd>${inr(t.sub)}</dd></div>
          <div><dt>Shipping</dt><dd>${t.ship === null ? "Quoted on WhatsApp" : t.ship === 0 ? "Free" : inr(t.ship)}</dd></div>
          ${form.elements.gift.checked ? `<div><dt>Gift wrap</dt><dd>${t.gift ? inr(t.gift) : "Free"}</dd></div>` : ""}
          <div class="sum-total"><dt>Total</dt><dd>${inr(t.total)}${t.ship === null ? "<small>+ shipping</small>" : ""}</dd></div>
        </dl>
        <p class="sum-note">Every piece is shown to you on video before it ships.</p>` + (narrow ? `</details>` : "");
      return true;
    };
    const syncCountry = () => {
      const india = isIndia();
      $("#state-wrap").hidden = !india;
      $("#region-wrap").hidden = india;
      form.elements.pincode.placeholder = india ? "6-digit PIN code" : "Postal code";
      $("#intl-note").hidden = india;
      syncOnline();
      syncButton();
      renderSummary();
    };
    const syncButton = () => {
      const method = form.elements.pay.value;
      $("#place").textContent = method === "online" ? `Pay ${inr(totals().total)} securely` : "Place order on WhatsApp";
    };
    form.elements.country.addEventListener("change", syncCountry);
    form.elements.gift.addEventListener("change", () => { renderSummary(); syncButton(); });
    $$('input[name="pay"]').forEach((r) => r.addEventListener("change", syncButton));
    if (!renderSummary()) return;
    syncCountry();

    // Validation
    const rules = {
      name: (v) => v.trim().length >= 2 || "Please enter your full name.",
      phone: (v) => (isIndia() ? /^(\+?91[\s-]?)?[6-9]\d{9}$/.test(v.replace(/\s/g, "")) : /^\+?[\d\s-]{7,16}$/.test(v)) || (isIndia() ? "Please enter a 10-digit mobile number." : "Please enter a phone number with country code."),
      email: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || "That email doesn't look right.",
      address1: (v) => v.trim().length >= 5 || "Please enter your house and street.",
      city: (v) => v.trim().length >= 2 || "Please enter your city.",
      state: (v) => !isIndia() || !!v || "Please choose your state.",
      pincode: (v) => (isIndia() ? /^[1-9]\d{5}$/.test(v.trim()) : v.trim().length >= 3) || (isIndia() ? "PIN codes have 6 digits." : "Please enter your postal code."),
    };
    const check = (name) => {
      const el = form.elements[name];
      const res = rules[name](el.value);
      const msg = res === true ? "" : res;
      el.classList.toggle("invalid", !!msg);
      el.setAttribute("aria-invalid", msg ? "true" : "false");
      const err = el.closest("label").querySelector(".err");
      if (err) err.textContent = msg;
      return !msg;
    };
    Object.keys(rules).forEach((n) => form.elements[n].addEventListener("blur", () => form.elements[n].value && check(n)));

    const localOrderId = () => {
      const d = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      return `BB${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    };
    const message = (id, f, t, paymentLine) => {
      const lines = cartItems().map(({ p, qty }) => `• ${p.name} × ${qty} = ${inr(p.price * qty)}${p.stock === 0 && p.madeToOrder ? " (made to order)" : ""}`);
      return [
        `Namaste Babu Banarasi! I'd like to place an order.`,
        ``,
        `Order: ${id}`,
        ...lines,
        `Subtotal: ${inr(t.sub)}`,
        `Shipping: ${t.ship === null ? "please quote" : t.ship === 0 ? "free" : inr(t.ship)}`,
        ...(f.gift ? [`Gift wrap: yes`] : []),
        `Total: ${inr(t.total)}${t.ship === null ? " + shipping" : ""}`,
        ``,
        `Name: ${f.name}`,
        `Phone: ${f.phone}`,
        ...(f.email ? [`Email: ${f.email}`] : []),
        `Address: ${[f.address1, f.address2, f.city, f.state || f.region, f.pincode, f.country].filter(Boolean).join(", ")}`,
        ...(f.notes ? [`Notes: ${f.notes}`] : []),
        ``,
        paymentLine,
      ].join("\n");
    };
    const confirmScreen = (id, link, kind) => {
      // kind: "whatsapp" | "paid" | "check"
      store.set("bb-last-order", { id, at: Date.now() });
      cart = []; saveCart();
      const copy = {
        whatsapp: ["Almost done", "Press send in WhatsApp to place your order.",
          "We've opened WhatsApp with your order ready to send. Once we receive it, we'll confirm availability, show you the piece on video, and send a secure UPI/payment link.",
          "Open WhatsApp again"],
        paid: ["Payment received", "Thank you. Your order is confirmed.",
          "Your payment is verified. We'll share a video of your saree before it ships, and message you the tracking number on WhatsApp.",
          "Message us on WhatsApp"],
        check: ["Payment received", "Thank you. We're confirming your payment.",
          "Razorpay has your payment, but we couldn't confirm it automatically just now. We'll check it and message you shortly. Nothing more to pay.",
          "Message us on WhatsApp"],
      }[kind];
      $(".co-grid").innerHTML = `
        <div class="co-done">
          <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M20 33l8 8 16-18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <p class="kicker">${copy[0]}</p>
          <h2>${copy[1]}</h2>
          <p class="co-id">Order <strong>${esc(id)}</strong></p>
          <p>${copy[2]}</p>
          <a class="btn btn-maroon" href="${link}" target="_blank" rel="noopener">${copy[3]}</a>
          ${user ? `<a class="co-back" href="account.html">See your orders</a>` : ""}
          <a class="co-back" href="index.html">Back to Babu Banarasi</a>
        </div>`;
      scrollTo({ top: 0, behavior: "smooth" });
    };

    const loadRazorpay = () => new Promise((res, rej) => {
      if (window.Razorpay) return res();
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const ok = Object.keys(rules).map(check).every(Boolean);
      if (!ok) { form.querySelector(".invalid")?.focus(); toast("Please check the highlighted details."); return; }
      const f = Object.fromEntries(new FormData(form));
      f.gift = form.elements.gift.checked;
      const { pay, notes, gift, saveaddr, ...keep } = f;
      store.set("bb-customer", keep);
      const t = totals();
      const btn = $("#place");
      const payload = {
        items: cart.map((c) => ({ id: c.id, qty: c.qty })),
        customer: { name: f.name, phone: f.phone, email: f.email || "", address1: f.address1, address2: f.address2 || "", city: f.city, state: f.state || f.region || "", pincode: f.pincode, country: f.country },
        gift: f.gift,
        notes: f.notes || "",
      };

      if (user && saveaddr) {
        AUTH.saveProfile({
          full_name: f.name, phone: f.phone, ...(user.email ? {} : { email: f.email || null }),
          address: { address1: f.address1, address2: f.address2 || "", city: f.city, state: f.state || "", pincode: f.pincode, country: f.country },
        }).catch(() => {});
      }

      /* ----- Pay online: server creates the order, Razorpay takes payment, server verifies ----- */
      if (f.pay === "online" && !onlineBlock()) {
        btn.disabled = true; btn.textContent = "Opening secure payment…";
        try {
          const o = await AUTH.callFunction("create-order", { ...payload, method: "razorpay" });
          await loadRazorpay();
          const rzp = new Razorpay({
            key: o.keyId || CFG.RAZORPAY_KEY_ID,
            order_id: o.razorpayOrderId,
            amount: o.amount,
            currency: o.currency || "INR",
            name: "Babu Banarasi",
            description: `Order ${o.orderId}`,
            image: "https://babubanarasi.com/brand/app-icon-512.png",
            prefill: { name: f.name, email: f.email || "", contact: f.phone },
            notes: { order: o.orderId },
            theme: { color: "#4a1020" },
            handler: async (resp) => {
              btn.textContent = "Confirming your payment…";
              const link = wa(`Namaste Babu Banarasi! I've just paid online for order ${o.orderId} (Razorpay payment ${resp.razorpay_payment_id}).`);
              try {
                await AUTH.callFunction("verify-payment", { orderId: o.orderId, ...resp });
                confirmScreen(o.orderId, link, "paid");
              } catch (err) {
                confirmScreen(o.orderId, link, "check");
              }
            },
            modal: { ondismiss: () => { btn.disabled = false; syncButton(); toast("Payment cancelled. Your bag is saved."); } },
          });
          rzp.on("payment.failed", (r) => { toast(`Payment didn't go through: ${r.error.description}`); btn.disabled = false; syncButton(); });
          rzp.open();
        } catch (err) {
          toast(err.message || "Couldn't start online payment. Please order on WhatsApp instead.");
          btn.disabled = false; syncButton();
        }
        return;
      }

      /* ----- Order on WhatsApp (recorded in your orders when accounts are on) ----- */
      let id = localOrderId();
      if (backendReady()) {
        const win = window.open("about:blank", "_blank"); // keep the popup allowed while we save the order
        btn.disabled = true; btn.textContent = "Placing your order…";
        try { const o = await AUTH.callFunction("create-order", { ...payload, method: "whatsapp" }); id = o.orderId || id; } catch (err) { /* still send it on WhatsApp */ }
        const link = wa(message(id, f, t, "Payment: please send me a UPI/payment link."));
        if (win) win.location.href = link; else window.open(link, "_blank", "noopener");
        btn.disabled = false;
        confirmScreen(id, link, "whatsapp");
        return;
      }
      const link = wa(message(id, f, t, "Payment: please send me a UPI/payment link."));
      window.open(link, "_blank", "noopener");
      confirmScreen(id, link, "whatsapp");
    });
  }

  /* ---------- Start ---------- */
  fetch("products.json")
    .then((r) => r.json())
    .then((d) => {
      PRODUCTS = d.products || [];
      cart = cart.filter((c) => byId(c.id));
      renderBag();
      if (PRODUCTS.some((p) => p.sample)) $$(".sample-banner").forEach((b) => (b.hidden = false));
      if (page === "home") initHome();
      if (page === "shop") initShop();
      if (page === "product") initProduct();
      if (page === "checkout") initCheckout();
    })
    .catch(() => {
      const m = $("main");
      if (m) m.insertAdjacentHTML("afterbegin", `<p class="no-results">The collection couldn't load. Please refresh, or message us on WhatsApp.</p>`);
    });
})();
