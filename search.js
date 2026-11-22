/* ===========================================================
   One search box for the whole site (homepage)
   Finds sarees (products.json) and the cards on the Stays,
   Experiences and Pantry pages (anything marked data-search),
   plus the guides. The index is built the first time someone
   uses the box, so the homepage stays light.
   =========================================================== */
(function () {
  const form = document.getElementById("site-search");
  if (!form) return;
  const input = form.querySelector("input"), panel = document.getElementById("ss-panel");
  const list = document.getElementById("ss-results"), status = document.getElementById("ss-status");

  const ORDER = ["Sarees", "Stays", "Experiences", "Pantry"];
  // Always-there entries: each vertical's own page, and the long guides
  const BASE = [
    { v: "Sarees", t: "All handloom sarees", d: "Katan, Kadwa, Organza, Tanchoi, Tussar, Georgette", k: "saree sari silk banarasi handloom shop buy katan kadwa kadhua organza tanchoi tussar georgette bridal wedding festive gift", u: "shop.html", base: true },
    { v: "Sarees", t: "How to identify a pure Banarasi silk saree", d: "Guide", k: "real fake pure silk mark test zari handloom powerloom", u: "banarasi-saree-guide.html" },
    { v: "Sarees", t: "The weaves of Banaras", d: "Fabrics, motifs and techniques", k: "weave weaving motif technique loom weaver craft", u: "shop.html#weaves" },
    { v: "Stays", t: "All stays", d: "By the ghats in Varanasi, and in Sarnath", k: "stay hotel room homestay guest house accommodation book booking ghat sarnath night", u: "stays.html", base: true },
    { v: "Experiences", t: "All experiences", d: "Boats, aarti, food, music, festivals, Sarnath", k: "experience tour things to do activity trip plan itinerary guide", u: "experiences.html", base: true },
    { v: "Experiences", t: "Things to do in Varanasi", d: "Guide", k: "things to do itinerary sightseeing ghats temples", u: "things-to-do-in-varanasi.html" },
    { v: "Experiences", t: "What to eat in Varanasi, and when", d: "Guide", k: "food eat street food kachori chaat lassi paan malaiyo", u: "varanasi-food-guide.html" },
    { v: "Experiences", t: "Festivals of Varanasi, month by month", d: "Guide", k: "festival calendar dev deepawali diwali holi mahashivratri chhath", u: "varanasi-festivals.html" },
    { v: "Pantry", t: "The Pantry", d: "Staples from our own fields", k: "pantry food farm organic grocery mango achaar pickle atta flour thandai masala spices", u: "pantry.html", base: true },
  ];
  const PAGES = [["stays.html", "Stays"], ["experiences.html", "Experiences"], ["pantry.html", "Pantry"]];

  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/&/g, " and ");
  const clean = (s) => String(s || "").replace(/\s+/g, " ").trim();
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");

  let index = null, loading = null, results = [], active = -1;

  function build() {
    if (index) return Promise.resolve(index);
    if (loading) return loading;
    const items = BASE.slice();
    const products = fetch("products.json").then((r) => r.json()).then((data) => {
      (Array.isArray(data) ? data : data.products || []).forEach((p) => items.push({
        v: "Sarees", t: p.name, d: [p.fabric, p.technique, p.price ? inr(p.price) : ""].filter(Boolean).join(" · "),
        k: [p.colour, (p.occasions || []).join(" "), "saree"].join(" "), u: `product.html?id=${encodeURIComponent(p.id)}`,
      }));
    }).catch(() => {});
    const pages = PAGES.map(([url, v]) => fetch(url).then((r) => r.text()).then((txt) => {
      const doc = new DOMParser().parseFromString(txt, "text/html");
      doc.querySelectorAll("[data-search]").forEach((el) => {
        const h = el.querySelector("h3");
        if (!h) return;
        const tag = el.querySelector(".exp-tag, .stay-loc, .pp-when, .fest-when, .dish-when");
        const p = [...el.querySelectorAll("p")].find((x) => !x.matches(".stay-loc, .fest-when"));
        items.push({ v, t: clean(h.textContent), d: clean(tag?.textContent), k: clean(p?.textContent), u: el.id ? `${url}#${el.id}` : url });
      });
    }).catch(() => {}));
    loading = Promise.all([products, ...pages]).then(() => {
      index = items.map((it) => ({ ...it, nt: norm(it.t), hay: norm(`${it.t} ${it.d} ${it.k} ${it.v}`) }));
      return index;
    });
    return loading;
  }

  function search(q) {
    const words = norm(q).split(/[^a-z0-9₹]+/).filter(Boolean).map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w));
    if (!words.length) return [];
    // Every word must match; if nothing does, fall back to anything matching some of the words
    let pool = index.filter((it) => words.every((w) => it.hay.includes(w)));
    if (!pool.length && words.length > 1) pool = index.filter((it) => words.some((w) => it.hay.includes(w)));
    return pool
      .map((it) => {
        let score = 0;
        words.forEach((w) => {
          if (it.nt.includes(w)) score += 3;
          if (new RegExp(`(^|\\s)${w}`).test(it.nt)) score += 2;
          if (norm(it.v).startsWith(w)) score += it.base ? 6 : 1;
        });
        return { it, score };
      })
      .sort((a, b) => b.score - a.score || ORDER.indexOf(a.it.v) - ORDER.indexOf(b.it.v))
      .slice(0, 8)
      .map((x) => x.it);
  }

  function setActive(i) {
    const opts = list.querySelectorAll("[role=option]");
    opts.forEach((o, n) => o.setAttribute("aria-selected", String(n === i)));
    active = i;
    if (i >= 0 && opts[i]) { input.setAttribute("aria-activedescendant", opts[i].id); opts[i].scrollIntoView({ block: "nearest" }); }
    else input.removeAttribute("aria-activedescendant");
  }

  function show(open) {
    panel.hidden = !open;
    input.setAttribute("aria-expanded", String(open));
    if (!open) setActive(-1);
  }

  function render(q) {
    if (!q.trim()) { results = []; list.innerHTML = ""; show(false); return; }
    results = search(q);
    active = -1;
    list.innerHTML = results.map((it, n) => `<li role="option" id="ss-opt-${n}" aria-selected="false">
        <a href="${esc(it.u)}" tabindex="-1"><span class="ss-tag">${esc(it.v)}</span><span class="ss-title">${esc(it.t)}</span>${it.d ? `<span class="ss-desc">${esc(it.d)}</span>` : ""}</a></li>`).join("");
    const num = (typeof SITE !== "undefined" && SITE.WHATSAPP_NUMBER) || "919260984531";
    const ask = `https://wa.me/${num}?text=${encodeURIComponent(`Namaste Babu Banarasi! I was looking for: ${q.trim()}`)}`;
    status.innerHTML = results.length
      ? `${results.length} ${results.length === 1 ? "match" : "matches"}`
      : `Nothing found for “${esc(q.trim())}”. <a href="${ask}" target="_blank" rel="noopener">Ask us on WhatsApp</a>`;
    show(true);
  }

  let typed = 0;
  input.addEventListener("focus", () => { build(); });
  input.addEventListener("input", () => {
    const q = input.value, n = ++typed;
    if (index) render(q);
    else { status.textContent = "Searching…"; show(!!q.trim()); build().then(() => { if (n === typed) render(input.value); }); }
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" && results.length) { e.preventDefault(); show(true); setActive((active + 1) % results.length); }
    else if (e.key === "ArrowUp" && results.length) { e.preventDefault(); setActive(active <= 0 ? results.length - 1 : active - 1); }
    else if (e.key === "Escape") { if (!panel.hidden) { e.preventDefault(); show(false); } else input.value = ""; }
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const go = () => {
      if (!results.length) render(input.value);
      const pick = results[active >= 0 ? active : 0];
      if (pick) location.href = pick.u;
    };
    index ? go() : build().then(() => { render(input.value); go(); });
  });
  list.addEventListener("mousemove", (e) => {
    const li = e.target.closest("[role=option]");
    if (li) setActive([...list.children].indexOf(li));
  });
  document.addEventListener("click", (e) => { if (!form.contains(e.target)) show(false); });
})();
