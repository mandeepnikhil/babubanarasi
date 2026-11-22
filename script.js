/* ===========================================================
   EDIT YOUR DETAILS HERE
   WHATSAPP_NUMBER: country code + number, digits only.
   =========================================================== */
const SITE = {
  WHATSAPP_NUMBER: "919260984531",
  DISPLAY_PHONE: "+91 92609 84531",
};

(function () {
  const waLink = (text) =>
    `https://wa.me/${SITE.WHATSAPP_NUMBER}?text=${encodeURIComponent(text || "Namaste Babu Banarasi!")}`;

  // Wire every [data-wa] link to WhatsApp
  document.querySelectorAll("[data-wa]").forEach((el) => {
    el.href = waLink(el.dataset.wa);
    el.target = "_blank";
    el.rel = "noopener";
  });
  document.querySelectorAll(".js-phone").forEach((el) => (el.textContent = SITE.DISPLAY_PHONE));

  // Mobile menu
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const setMenu = (open) => {
    header.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  };
  toggle?.addEventListener("click", () => setMenu(!header.classList.contains("menu-open")));
  document.querySelectorAll(".mobile-nav a").forEach((a) => a.addEventListener("click", () => setMenu(false)));

  // Enquiry form → WhatsApp
  const form = document.getElementById("enquiry-form");
  // Each vertical page opens the form on its own topic
  if (form?.dataset.interest) {
    const want = form.dataset.interest, opt = [...form.elements.interest.options].find((o) => o.text === want);
    if (opt) form.elements.interest.value = opt.value;
  }
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = form.elements.name.value.trim();
    form.elements.name.classList.toggle("invalid", !name);
    if (!name) { form.elements.name.focus(); return; }
    const lines = [`Namaste Babu Banarasi! I'm ${name}.`, `Interested in: ${form.elements.interest.value}`];
    const msg = form.elements.message.value.trim();
    if (msg) lines.push(`Details: ${msg}`);
    const link = waLink(lines.join("\n"));
    window.BB_TRACK?.("Lead", { name: form.elements.interest.value });
    window.open(link, "_blank", "noopener");
    let note = form.querySelector(".form-sent");
    if (!note) { note = document.createElement("p"); note.className = "form-sent"; note.setAttribute("role", "status"); form.appendChild(note); }
    note.innerHTML = `WhatsApp has opened with your note. Press send there and we'll reply soon. <a href="${link}" target="_blank" rel="noopener">Didn't open? Tap here.</a>`;
  });

  // Reveal on scroll
  const targets = document.querySelectorAll(
    ".sec-head, .letter-text, .letter-img, .pillar, .fabrics li, .weave-main, .weave-duo figure, .marks, .tech-img, .tech-list, .exp, .stay, .included, .pantry-text, .journal, .contact-grid > *, .craft blockquote, .motif, .finder, .woven-intro, .mohallas li, .woven-stats, .craft-grid li, .khana-photos figure, .menu, .cook, .sarnath-text, .doha, .voice-grid li, .twain, .pantry-products li, .phrases"
  );
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    targets.forEach((t) => { t.classList.add("reveal"); io.observe(t); });
  }

  // Gentle parallax on the loom band
  const craft = document.querySelector(".craft");
  const craftImg = document.querySelector(".craft-img");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (craft && craftImg && !reduce) {
    const onScroll = () => {
      const r = craft.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const p = (r.top + r.height) / (innerHeight + r.height); // 1 → 0 as it scrolls past
      craftImg.style.transform = `translateY(${(p - 1) * 12}%)`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  const yearEl = document.getElementById("year"); if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Shared: today's date in Banaras (IST) ---------- */
  const IST = "Asia/Kolkata";
  const istMonth = Number(new Intl.DateTimeFormat("en-IN", { timeZone: IST, month: "numeric" }).format(new Date()));
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  /* ---------- Banaras right now: time, weather, sunrise/sunset ---------- */
  const LAT = 25.3176, LON = 82.9739;
  const fmtTime = (d) => new Intl.DateTimeFormat("en-IN", { timeZone: IST, hour: "numeric", minute: "2-digit", hour12: true }).format(d).replace(/\s?(am|pm)/i, (m) => " " + m.trim().toLowerCase());
  const timeEl = document.getElementById("now-time");
  const tick = () => { if (timeEl) timeEl.textContent = fmtTime(new Date()); };
  tick(); setInterval(tick, 30000);

  // NOAA solar calculation, accurate to about a minute
  function sunTimes(date) {
    const rad = Math.PI / 180;
    const start = Date.UTC(date.getUTCFullYear(), 0, 0);
    const doy = Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start) / 864e5);
    const g = (2 * Math.PI / 365) * (doy - 1);
    const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    const ha = Math.acos(Math.cos(90.833 * rad) / (Math.cos(LAT * rad) * Math.cos(decl)) - Math.tan(LAT * rad) * Math.tan(decl)) / rad;
    const base = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    const toDate = (mins) => new Date(base + mins * 60000);
    return { rise: toDate(720 - 4 * (LON + ha) - eqt), set: toDate(720 - 4 * (LON - ha) - eqt) };
  }
  const sun = sunTimes(new Date());
  const sunEl = document.getElementById("now-sun");
  const nowMs = Date.now();
  if (sunEl) sunEl.textContent = nowMs < sun.rise.getTime() ? `Sunrise ${fmtTime(sun.rise)}` : nowMs < sun.set.getTime() ? `Sunset ${fmtTime(sun.set)}` : `Sunrise ${fmtTime(sunTimes(new Date(nowMs + 864e5)).rise)}`;
  document.querySelectorAll(".js-sunset").forEach((el) => (el.textContent = fmtTime(sun.set)));

  const WEATHER = (c) => c === 0 ? "clear skies" : c <= 2 ? "a few clouds" : c === 3 ? "overcast" : c <= 48 ? "misty" : c <= 57 ? "drizzle" : c <= 67 ? "rain" : c <= 77 ? "cold" : c <= 82 ? "showers" : "thunderstorms";
  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code&timezone=Asia%2FKolkata`)
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((d) => {
      const el = document.getElementById("now-weather");
      if (el && d.current) el.textContent = `${Math.round(d.current.temperature_2m)}°C, ${WEATHER(d.current.weather_code)}`;
    })
    .catch(() => {});

  /* ---------- Hindi / English switch ---------- */
  const hiEls = document.querySelectorAll("[data-hi]");
  const setLang = (lang) => {
    document.documentElement.lang = lang;
    hiEls.forEach((el) => {
      if (el.dataset.en === undefined) el.dataset.en = el.innerHTML;
      el.innerHTML = lang === "hi" ? el.dataset.hi : el.dataset.en;
    });
    try { localStorage.setItem("bb-lang", lang); } catch (e) {}
  };
  document.querySelector(".lang-toggle")?.addEventListener("click", () => setLang(document.documentElement.lang === "hi" ? "en" : "hi"));
  try { if (localStorage.getItem("bb-lang") === "hi") setLang("hi"); } catch (e) {}

  /* ---------- Temple bells (made in the browser, off by default) ---------- */
  const soundBtn = document.querySelector(".sound-toggle");
  let ctx, master, bellTimer, droneNodes = [];
  const strike = (freq, when, vol) => {
    // A bronze bell: a few inharmonic partials, each fading at its own rate
    [[1, 1, 7], [2.0, .55, 5], [2.76, .4, 3.6], [5.4, .22, 2], [8.9, .1, 1.2]].forEach(([ratio, amp, decay]) => {
      [0, 1.8].forEach((detune) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = freq * ratio + detune;
        g.gain.setValueAtTime(0, when);
        g.gain.linearRampToValueAtTime(vol * amp * .5, when + .005);
        g.gain.exponentialRampToValueAtTime(.0001, when + decay);
        o.connect(g).connect(master);
        o.start(when); o.stop(when + decay + .1);
      });
    });
  };
  const ringLoop = () => {
    const notes = [220, 293.66, 329.63, 440];
    const t = ctx.currentTime + .05;
    strike(notes[Math.floor(Math.random() * notes.length)], t, .9);
    if (Math.random() < .4) strike(notes[Math.floor(Math.random() * notes.length)] * 2, t + .35 + Math.random() * .4, .45);
    bellTimer = setTimeout(ringLoop, 4500 + Math.random() * 6000);
  };
  const startSound = () => {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    ctx.resume();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    master.gain.linearRampToValueAtTime(.22, ctx.currentTime + 1.5);
    // A soft drone on Sa and Pa, like a distant tanpura
    droneNodes = [110, 165, 220.5].map((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = "sine"; o.frequency.value = f; g.gain.value = [.06, .035, .02][i];
      lfo.frequency.value = .1 + i * .07; lg.gain.value = g.gain.value * .6;
      lfo.connect(lg).connect(g.gain); o.connect(g).connect(master); o.start(); lfo.start();
      return [o, lfo];
    }).flat();
    ringLoop();
  };
  const stopSound = () => {
    clearTimeout(bellTimer);
    if (!ctx || !master) return;
    const m = master, nodes = droneNodes;
    m.gain.cancelScheduledValues(ctx.currentTime);
    m.gain.setValueAtTime(m.gain.value, ctx.currentTime);
    m.gain.linearRampToValueAtTime(0, ctx.currentTime + .8);
    setTimeout(() => { nodes.forEach((n) => { try { n.stop(); } catch (e) {} }); m.disconnect(); }, 900);
  };
  // One soft bell for deliberate moments (e.g. floating a diya), only when sound is on
  window.BBSound = {
    isOn: () => soundBtn?.getAttribute("aria-pressed") === "true" && !!ctx && !!master,
    chime: () => { if (window.BBSound.isOn()) strike(440, ctx.currentTime + 0.02, 0.7); },
  };
  soundBtn?.addEventListener("click", () => {
    const on = soundBtn.getAttribute("aria-pressed") !== "true";
    soundBtn.setAttribute("aria-pressed", String(on));
    soundBtn.setAttribute("aria-label", on ? "Stop temple bells" : "Play temple bells");
    on ? startSound() : stopSound();
    syncMenuBells();
  });
  // Phone: the sound switch lives in the menu, labelled in words
  const menuBells = document.querySelector(".mn-bells");
  function syncMenuBells() {
    if (!menuBells || !soundBtn) return;
    const on = soundBtn.getAttribute("aria-pressed") === "true";
    menuBells.setAttribute("aria-pressed", String(on));
    menuBells.querySelector("span").textContent = on ? "on" : "off";
  }
  menuBells?.addEventListener("click", () => soundBtn?.click());

  /* ---------- A Day in Kashi: colour and image follow the hour ---------- */
  const day = document.querySelector(".day");
  const moments = document.querySelectorAll(".moment");
  const dayImgs = document.querySelectorAll(".day-img");
  const clockT = document.querySelector(".day-clock-t"), clockM = document.querySelector(".day-clock-m");
  let activeImg = 0, currentSrc = dayImgs[0]?.getAttribute("src");
  const activate = (m) => {
    day.style.setProperty("--day-bg", m.dataset.bg);
    day.classList.toggle("is-dark", m.dataset.dark === "1");
    if (clockT) { clockT.textContent = m.dataset.t; clockM.textContent = m.dataset.m; }
    if (dayImgs.length === 2 && m.dataset.img !== currentSrc) {
      const next = dayImgs[1 - activeImg];
      next.src = m.dataset.img;
      next.classList.add("is-on"); dayImgs[activeImg].classList.remove("is-on");
      activeImg = 1 - activeImg; currentSrc = m.dataset.img;
    }
  };
  if (day && "IntersectionObserver" in window) {
    const dio = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) activate(en.target); });
    }, { rootMargin: "-45% 0px -45% 0px" });
    moments.forEach((m) => dio.observe(m));
    // Back to ivory when the reader scrolls above the first moment
    const head = day.querySelector(".sec-head");
    new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting && en.boundingClientRect.top > 0) { day.style.removeProperty("--day-bg"); day.classList.remove("is-dark"); }
      });
    }, { rootMargin: "0px 0px -40% 0px" }).observe(head);
  }

  /* ---------- Saree finder ---------- */
  const finder = document.getElementById("finder-form");
  const SUGGEST = {
    "My wedding": {
      "Rich and regal": ["Katan silk with Kadwa brocade", "Dense gold zari, a jaal or shikargah pallu, and a saree heavy enough to be handed down."],
      "Somewhere in between": ["Katan silk with meenakari buttis", "Coloured silk set into the gold, with a broad bel border. Grand, but not weighty."],
      "Light and airy": ["Kadwa organza with a zari border", "Sheer and luminous, so you can wear it comfortably through long ceremonies."],
    },
    "A wedding I'm attending": {
      "Rich and regal": ["Katan silk with a brocade pallu", "Rich, but leaves the full jaal to the bride."],
      "Somewhere in between": ["Tanchoi silk", "Layered, many-coloured patterns that look festive without shouting."],
      "Light and airy": ["Georgette with zari buttis", "A fluid drape that's easy to dance in."],
    },
    "Festivals & pujas": {
      "Rich and regal": ["Katan silk with a zari bel border", "Classic and bright, the saree for Diwali and the big pujas."],
      "Somewhere in between": ["Tussar with Banarasi motifs", "A natural golden sheen and a warm, earthy feel."],
      "Light and airy": ["Georgette with small buttis", "Light enough for a long day of visits and prayers."],
    },
    "A gift": {
      "Rich and regal": ["Katan silk with Kadwa buttis", "The gift a family remembers, and keeps for the next generation."],
      "Somewhere in between": ["Tanchoi silk", "Elegant at any age, and right for almost any occasion."],
      "Light and airy": ["Organza in a soft shade", "Light, graceful, and easy to love."],
    },
    "Everyday elegance": {
      "Rich and regal": ["Tussar with a zari border", "Rich in texture, simple to wear."],
      "Somewhere in between": ["Georgette with a Banarasi border", "Easy to drape for work or lunch, with a little gold."],
      "Light and airy": ["Light organza with scattered buttis", "Barely there, and quietly special."],
    },
  };
  const updateFinder = () => {
    if (!finder) return;
    const occ = finder.elements.occasion.value, col = finder.elements.colour.value, feel = finder.elements.feel.value;
    const [title, text] = (SUGGEST[occ] || SUGGEST["My wedding"])[feel];
    const colourNote = col === "Help me choose" ? " We'll suggest colours that suit you." : ` In ${col.toLowerCase()}.`;
    document.getElementById("finder-title").textContent = title;
    document.getElementById("finder-text").textContent = text + colourNote;
    document.getElementById("finder-wa").href = waLink(
      `Namaste Babu Banarasi! I used the saree finder on your website.\nOccasion: ${occ}\nColours: ${col}\nFeel: ${feel}\nSuggested: ${title}\nCould you show me some pieces on video?`
    );
  };
  finder?.addEventListener("change", updateFinder);
  updateFinder();

  /* ---------- Banarasi Khana: what's in season this month ---------- */
  const inSeason = [];
  document.querySelectorAll(".dish").forEach((d) => {
    const s = d.dataset.season;
    if (s !== "all" && s.split(",").map(Number).includes(istMonth)) {
      d.classList.add("in-season");
      inSeason.push(d.querySelector("h3").textContent);
    }
  });
  const seasonLine = document.getElementById("season-line");
  if (seasonLine) {
    const list = inSeason.length ? inSeason.join(" and ") : "kachori, chaat and paan, as always";
    seasonLine.innerHTML = `It's ${MONTHS[istMonth - 1]} in Banaras. In season now: <strong>${list}</strong>.`;
  }

  /* ---------- Festivals: start the year from the next one ---------- */
  const track = document.getElementById("fest-track");
  if (track) {
    const cards = [...track.children];
    const maxMonth = (c) => Math.max(...c.dataset.months.split(",").map(Number));
    let first = cards.findIndex((c) => maxMonth(c) >= istMonth);
    if (first < 0) first = 0;
    [...cards.slice(first), ...cards.slice(0, first)].forEach((c) => track.appendChild(c));
    // Snapping would otherwise keep the old first card in view
    track.style.scrollSnapType = "none"; track.scrollLeft = 0;
    requestAnimationFrame(() => { track.scrollLeft = 0; track.style.scrollSnapType = ""; });
    cards.forEach((c) => {
      if (c.dataset.months.split(",").map(Number).includes(istMonth)) {
        const b = document.createElement("span");
        b.className = "fest-badge"; b.textContent = "This month";
        c.prepend(b);
      }
    });
    document.querySelectorAll(".fest-btn").forEach((btn) =>
      btn.addEventListener("click", () => track.scrollBy({ left: Number(btn.dataset.dir) * (track.children[0].offsetWidth + 26), behavior: "smooth" }))
    );
  }
})();
