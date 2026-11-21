/* ===========================================================
   Babu Banarasi · interactions
   Everything here responds to the visitor: cursor, scroll,
   hover, drag, tap. It respects "reduce motion" settings and
   leaves touch screens free of hover-only effects.
   =========================================================== */
(function () {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fancy = fine && !reduce;
  const wa = (t) => `https://wa.me/${SITE.WHATSAPP_NUMBER}?text=${encodeURIComponent(t)}`;
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
  };

  /* ---------- 1. Scroll progress + header that tucks away ---------- */
  const header = $(".site-header");
  const bar = document.createElement("div");
  bar.className = "progress";
  header.appendChild(bar);

  const hero = $(".hero"), heroImg = $(".hero-img"), heroContent = $(".hero-content");
  let lastY = scrollY, ticking = false;
  const onScroll = () => {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    header.classList.toggle("scrolled", y > 160);
    if (Math.abs(y - lastY) > 8) {
      const down = y > lastY;
      if (!header.classList.contains("menu-open")) header.classList.toggle("hide", down && y > 700);
      lastY = y;
    }
    // Hero text drifts up and fades as you leave it
    if (heroContent && !reduce && y < innerHeight) {
      heroContent.style.transform = `translateY(${y * 0.3}px)`;
      heroContent.style.opacity = String(Math.max(0, 1 - y / (innerHeight * 0.75)));
    }
  };
  addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; onScroll(); }); }
  }, { passive: true });
  onScroll();

  /* ---------- 2. Menu links light up for the section you're in ---------- */
  const navLinks = $$('.nav a[href^="#"]');
  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const id = "#" + en.target.id;
        navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$("main > section").forEach((s) => s.id && spy.observe(s));
  }

  /* ---------- 3. Hero: entrance and gentle mouse parallax ---------- */
  if (fancy && hero) {
    hero.addEventListener("pointermove", (e) => {
      const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
      heroImg.style.translate = `${x * -26}px ${y * -18}px`;
      $(".hero-ctas").style.translate = `${x * 10}px ${y * 8}px`;
    });
    hero.addEventListener("pointerleave", () => {
      heroImg.style.translate = "";
      $(".hero-ctas").style.translate = "";
    });
  }

  /* ---------- 4. A custom gold cursor (mouse only) ---------- */
  let ring;
  if (fancy) {
    document.documentElement.classList.add("has-cursor");
    const dot = document.createElement("div"); dot.className = "cursor-dot";
    ring = document.createElement("div"); ring.className = "cursor-ring"; ring.innerHTML = "<span></span>";
    document.body.append(dot, ring);
    let mx = -100, my = -100, rx = -100, ry = -100;
    addEventListener("pointermove", (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px)`;
    }, { passive: true });
    const follow = () => {
      rx += (mx - rx) * 0.2; ry += (my - ry) * 0.2;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(follow);
    };
    follow();
    document.addEventListener("pointerover", (e) => {
      const t = e.target.closest("a, button, label, summary, input, textarea, select, [data-cursor]");
      ring.classList.remove("is-link", "is-label", "is-text");
      dot.classList.remove("is-hidden");
      if (!t) return;
      if (t.matches("input, textarea, select")) { ring.classList.add("is-text"); dot.classList.add("is-hidden"); }
      else if (t.dataset.cursor) { ring.classList.add("is-label"); ring.firstChild.textContent = t.dataset.cursor; }
      else ring.classList.add("is-link");
    });
    document.documentElement.addEventListener("mouseleave", () => { dot.style.opacity = ring.style.opacity = "0"; });
    document.documentElement.addEventListener("mouseenter", () => { dot.style.opacity = ring.style.opacity = ""; });
    addEventListener("pointerdown", () => ring.classList.add("is-down"));
    addEventListener("pointerup", () => ring.classList.remove("is-down"));
  }

  /* ---------- 5. Buttons lean towards the cursor ---------- */
  if (fancy) {
    $$(".btn, .fest-btn, .wa-float").forEach((b) => {
      b.addEventListener("pointermove", (e) => {
        const r = b.getBoundingClientRect();
        b.style.translate = `${(e.clientX - r.left - r.width / 2) * 0.2}px ${(e.clientY - r.top - r.height / 2) * 0.3}px`;
      });
      b.addEventListener("pointerleave", () => (b.style.translate = ""));
    });
  }

  /* ---------- 6. Cards tilt in 3D with a soft gold sheen ---------- */
  if (fancy) {
    $$(".pillar, .fest, .craft-grid li, .pantry-products li, .stay figure, .motif").forEach((c) => {
      c.classList.add("tilt");
      c.addEventListener("pointermove", (e) => {
        const r = c.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        c.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 6}deg) rotateY(${(px - 0.5) * 7}deg)`;
        c.style.setProperty("--mx", `${px * 100}%`);
        c.style.setProperty("--my", `${py * 100}%`);
      });
      c.addEventListener("pointerleave", () => (c.style.transform = ""));
    });
  }

  /* ---------- 7. Motif drawings trace themselves, like thread on a loom ---------- */
  if (!reduce && "IntersectionObserver" in window) {
    const drawCards = [];
    $$(".motif svg, .craft-grid svg").forEach((svg) => {
      $$("path, circle, rect", svg).forEach((p) => {
        if (p.getAttribute("stroke-dasharray") || !p.getTotalLength) return;
        p.style.setProperty("--len", Math.ceil(p.getTotalLength()) + 1);
        p.classList.add("draw");
      });
      const card = svg.parentElement;
      drawCards.push(card);
      card.addEventListener("pointerenter", () => {
        card.classList.remove("drawn"); void card.offsetWidth; card.classList.add("drawn");
      });
    });
    const dio = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { setTimeout(() => en.target.classList.add("drawn"), 200); dio.unobserve(en.target); }
      });
    }, { threshold: 0.4 });
    drawCards.forEach((c) => dio.observe(c));
  }

  /* ---------- 8. A Day in Kashi: tap an hour to jump to it ---------- */
  const visual = $(".day-visual"), moments = $$(".moment");
  if (visual && moments.length) {
    visual.removeAttribute("aria-hidden");
    $(".day-frame").setAttribute("aria-hidden", "true");
    $(".day-clock").setAttribute("aria-hidden", "true");
    const rail = document.createElement("div");
    rail.className = "day-rail";
    rail.setAttribute("aria-label", "Jump to a time of day");
    const btns = moments.map((m, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = m.dataset.t === "Dusk" ? "Dusk" : `${m.dataset.t}${m.dataset.m ? " " + m.dataset.m : ""}`;
      b.addEventListener("click", () => {
        const top = m.getBoundingClientRect().top + scrollY - (innerHeight - m.offsetHeight) / 2;
        scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
      });
      rail.appendChild(b);
      return b;
    });
    visual.appendChild(rail);
    if ("IntersectionObserver" in window) {
      const rio = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const i = moments.indexOf(en.target);
          btns.forEach((b, j) => b.classList.toggle("active", i === j));
        });
      }, { rootMargin: "-45% 0px -45% 0px" });
      moments.forEach((m) => rio.observe(m));
    }
  }

  /* ---------- 9. Photo viewer ---------- */
  const lbImgs = $$(".letter-img img, .weave-main img, .weave-duo img, .tech-img img, .khana-photos img, .cook-img img, .stay img, .sarnath-img img");
  if (lbImgs.length) {
    const lb = document.createElement("div");
    lb.className = "lb";
    lb.hidden = true;
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "Photo viewer");
    lb.innerHTML = `
      <button class="lb-close" type="button" aria-label="Close photo viewer">×</button>
      <button class="lb-prev" type="button" aria-label="Previous photo">←</button>
      <figure><img alt="" /><figcaption></figcaption></figure>
      <button class="lb-next" type="button" aria-label="Next photo">→</button>
      <p class="lb-count"></p>`;
    document.body.appendChild(lb);
    const lbImg = $("img", lb);
    let idx = 0, opener = null;
    const caption = (im) =>
      im.closest("figure")?.querySelector("figcaption")?.textContent ||
      im.closest(".stay")?.querySelector("h3")?.textContent || im.alt;
    const show = (i) => {
      idx = (i + lbImgs.length) % lbImgs.length;
      const src = lbImgs[idx];
      lbImg.classList.remove("in");
      lbImg.onload = () => lbImg.classList.add("in");
      lbImg.src = src.currentSrc || src.src;
      lbImg.alt = src.alt;
      if (lbImg.complete) requestAnimationFrame(() => lbImg.classList.add("in"));
      $("figcaption", lb).textContent = caption(src);
      $(".lb-count", lb).textContent = `${idx + 1} / ${lbImgs.length}`;
    };
    const open = (i) => {
      opener = document.activeElement;
      show(i);
      lb.hidden = false;
      document.documentElement.classList.add("lb-lock");
      requestAnimationFrame(() => lb.classList.add("open"));
      $(".lb-close", lb).focus();
    };
    const close = () => {
      lb.classList.remove("open");
      document.documentElement.classList.remove("lb-lock");
      setTimeout(() => (lb.hidden = true), 400);
      opener?.focus?.({ preventScroll: true });
    };
    lbImgs.forEach((im, i) => {
      im.dataset.cursor = "View";
      im.tabIndex = 0;
      im.setAttribute("role", "button");
      im.setAttribute("aria-label", `View photo: ${im.alt}`);
      im.addEventListener("click", () => open(i));
      im.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(i); } });
    });
    lb.addEventListener("click", (e) => {
      if (e.target.closest(".lb-prev")) show(idx - 1);
      else if (e.target.closest(".lb-next")) show(idx + 1);
      else if (e.target === lb || e.target.closest(".lb-close")) close();
    });
    addEventListener("keydown", (e) => {
      if (lb.hidden) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(idx - 1);
      else if (e.key === "ArrowRight") show(idx + 1);
      else if (e.key === "Tab") {
        // keep focus inside the viewer
        const f = $$("button", lb), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    let sx = 0;
    lb.addEventListener("touchstart", (e) => (sx = e.touches[0].clientX), { passive: true });
    lb.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
    });
  }

  /* ---------- 10. Experience cards open a WhatsApp enquiry ---------- */
  $$(".exp").forEach((c) => {
    const title = c.querySelector("h3").textContent;
    const go = () => window.open(wa(`Namaste Babu Banarasi! I'd like to know more about: ${title}`), "_blank", "noopener");
    c.dataset.cursor = "Enquire";
    c.tabIndex = 0;
    c.setAttribute("role", "link");
    c.setAttribute("aria-label", `${title}: enquire on WhatsApp`);
    c.addEventListener("click", go);
    c.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    const more = document.createElement("span");
    more.className = "exp-more";
    more.textContent = "Enquire on WhatsApp →";
    c.querySelector(".exp-body").appendChild(more);
  });

  /* ---------- 11. Festival and ghat strips: drag with the mouse ---------- */
  $$(".fest-track, .ghat-track").forEach((tr) => {
    tr.dataset.cursor = "Drag";
    let down = false, sx = 0, sl = 0, moved = false;
    tr.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = true; moved = false; sx = e.clientX; sl = tr.scrollLeft;
      tr.classList.add("dragging");
    });
    addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 5) moved = true;
      tr.scrollLeft = sl - dx;
    });
    addEventListener("pointerup", () => {
      if (!down) return;
      down = false;
      tr.classList.remove("dragging");
    });
    tr.addEventListener("click", (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    tr.addEventListener("dragstart", (e) => e.preventDefault());
  });

  /* ---------- 12. A little boat rows along the ghats as you scroll them ---------- */
  const ghats = $(".ghats"), gTrack = $(".ghat-track");
  if (ghats && gTrack) {
    const boat = document.createElement("div");
    boat.className = "ghat-boat";
    boat.setAttribute("aria-hidden", "true");
    boat.innerHTML = `<svg viewBox="0 0 64 30"><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18h58l-7 8H12z" fill="rgba(217,192,138,.18)"/><path d="M18 18v-9h22v9M15 9h28"/><path d="M50 18l8-14"/><path d="M4 28c4-2 8 2 12 0s8 2 12 0 8 2 12 0 8 2 12 0 6 1 8 0" opacity=".6"/></g></svg>`;
    ghats.appendChild(boat);
    const moveBoat = () => {
      const max = gTrack.scrollWidth - gTrack.clientWidth;
      const p = max > 0 ? gTrack.scrollLeft / max : 0;
      const span = ghats.clientWidth - boat.offsetWidth - 32;
      boat.style.top = `${gTrack.offsetTop - boat.offsetHeight + 4}px`;
      boat.style.translate = `${16 + p * span}px 0`;
      boat.classList.toggle("flip", p > 0.98);
    };
    gTrack.addEventListener("scroll", () => requestAnimationFrame(moveBoat), { passive: true });
    addEventListener("resize", moveBoat);
    addEventListener("load", moveBoat);
    moveBoat();
  }

  /* ---------- 13. Float a diya on the Ganga ---------- */
  const qb = $(".quote-band");
  if (qb) {
    let floated = Number(store.get("bb-diyas") || 0);
    qb.dataset.cursor = "Float a diya";
    const hint = document.createElement("p");
    hint.className = "diya-hint";
    hint.innerHTML = `<span>Tap the river to float a diya</span><em></em>`;
    $(".quote-content", qb).appendChild(hint);
    const count = () => {
      hint.querySelector("em").textContent = floated ? `${floated} ${floated === 1 ? "diya" : "diyas"} floated by you` : "";
    };
    count();
    const DIYA = `<svg viewBox="0 0 40 36"><ellipse cx="20" cy="13" rx="13" ry="13" fill="#ffb347" opacity=".22"/><path class="diya-flame" d="M20 3c3.4 5 4.6 8 4.6 10.4a4.6 4.6 0 0 1-9.2 0C15.4 11 16.6 8 20 3z" fill="#ffc94d"/><path class="diya-flame" d="M20 8c1.6 2.6 2.2 4 2.2 5.4a2.2 2.2 0 0 1-4.4 0c0-1.4.6-2.8 2.2-5.4z" fill="#fff4cf"/><path d="M3 21h34c-1.2 7.5-7.6 12-17 12S4.2 28.5 3 21z" fill="#a8562a"/><path d="M3 21h34" stroke="#e8a560" stroke-width="1.6" stroke-linecap="round"/><path d="M9 26c3 2 7 3 11 3s8-1 11-3" stroke="#7d3b1b" stroke-width="1" fill="none"/></svg>`;
    const spawn = (x, y) => {
      if (qb.querySelectorAll(".diya").length > 40) return;
      const d = document.createElement("span");
      d.className = "diya";
      d.innerHTML = DIYA;
      d.style.left = `${x}px`;
      d.style.top = `${y}px`;
      qb.appendChild(d);
      const dist = 180 + Math.random() * 280, rise = -(15 + Math.random() * 45);
      const dur = reduce ? 3000 : 10000 + Math.random() * 5000;
      const anim = d.animate([
        { transform: "translate(-50%, -50%) scale(.2)", opacity: 0 },
        { transform: "translate(-50%, -50%) scale(1)", opacity: 1, offset: 0.06 },
        { transform: `translate(calc(-50% + ${dist * 0.8}px), calc(-50% + ${rise * 0.8}px)) scale(.85)`, opacity: 1, offset: 0.8 },
        { transform: `translate(calc(-50% + ${dist}px), calc(-50% + ${rise}px)) scale(.7)`, opacity: 0 },
      ], { duration: dur, easing: "cubic-bezier(.25,.6,.4,1)", fill: "forwards" });
      anim.onfinish = () => d.remove();
    };
    qb.addEventListener("click", (e) => {
      const r = qb.getBoundingClientRect();
      spawn(e.clientX - r.left, e.clientY - r.top);
      floated += 1;
      store.set("bb-diyas", String(floated));
      count();
      hint.classList.add("used");
    });
  }
})();
