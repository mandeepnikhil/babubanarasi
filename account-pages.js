/* ===========================================================
   BABU BANARASI · LOGIN, SIGNUP & ACCOUNT PAGES
   =========================================================== */
(function () {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const page = document.body.dataset.page;
  const cfg = window.BB_CONFIG || {};
  const methods = cfg.AUTH_METHODS || {};
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const inr = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

  // Only ever send people back to a page on this site
  const safeNext = () => {
    const n = new URLSearchParams(location.search).get("next") || "account.html";
    return /^[a-z0-9\-]+\.html(\?[^#]*)?$/i.test(n) ? n : "account.html";
  };

  const friendly = (err) => {
    const m = (err && (err.message || err.error_description || err)) + "";
    if (/invalid login credentials/i.test(m)) return "That email and password don't match. Try again, or use 'Forgot password?'.";
    if (/email not confirmed/i.test(m)) return "Please confirm your email first. We've sent you a link.";
    if (/user already registered/i.test(m)) return "An account with this email already exists. Sign in instead.";
    if (/token has expired|otp.*expired|invalid.*otp|token.*invalid/i.test(m)) return "That code is wrong or has expired. Request a new one.";
    if (/rate limit|too many/i.test(m)) return "Too many attempts. Please wait a minute and try again.";
    if (/password should be at least/i.test(m)) return "Your password needs at least 8 characters.";
    if (/phone.*provider|sms/i.test(m)) return "Mobile codes aren't available right now. Please use email or Google.";
    if (/provider is not enabled|unsupported provider/i.test(m)) return "This sign-in option isn't switched on yet. Please choose another.";
    if (/failed to fetch|networkerror|load failed|network request failed/i.test(m)) return "We couldn't reach our server. Please check your connection and try again.";
    return m || "Something went wrong. Please try again.";
  };

  const say = (el, msg, ok) => { el.textContent = msg; el.className = "auth-msg" + (ok ? " ok" : msg ? " err" : ""); };
  const busy = (btn, on, label) => { btn.disabled = on; if (label) btn.textContent = label; };

  const notConfigured = (root) => {
    root.innerHTML = `
      <div class="auth-soon">
        <p class="kicker">Accounts</p>
        <h1>Customer accounts<br/><em>are coming soon.</em></h1>
        <p>You'll soon be able to save your address and see your orders here. For now, everything works through WhatsApp: choose your saree and check out, and we'll take it from there.</p>
        <div class="auth-soon-ctas"><a class="btn btn-maroon" href="shop.html">Browse the sarees</a><a class="btn btn-line" data-wa="Namaste Babu Banarasi! I have a question about an order." href="#">Ask on WhatsApp</a></div>
      </div>`;
    $$("[data-wa]", root).forEach((a) => { a.href = `https://wa.me/919260984531?text=${encodeURIComponent(a.dataset.wa)}`; a.target = "_blank"; a.rel = "noopener"; });
  };

  /* ================= LOGIN / SIGNUP ================= */
  async function initLogin() {
    const root = $("#auth-root");
    const st = await window.BB_AUTH.ready;
    if (!st.configured) return notConfigured(root);
    if (st.user) { location.replace(safeNext()); return; }
    const sb = st.client;
    const next = safeNext();
    const redirectTo = `${location.origin}/${next}`;
    const startMode = new URLSearchParams(location.search).get("mode") === "signup" ? "signup" : "signin";

    const tabs = [
      methods.emailCode && ["code", "Email link"],
      methods.phone && ["phone", "Mobile OTP"],
      methods.password && ["password", "Password"],
    ].filter(Boolean);

    root.innerHTML = `
      <div class="auth-card">
        <div class="auth-mode" role="tablist">
          <button type="button" role="tab" data-mode="signin">Sign in</button>
          <button type="button" role="tab" data-mode="signup">Create account</button>
        </div>
        <h1 class="auth-title"></h1>
        <p class="auth-sub"></p>
        ${methods.google ? `<button type="button" class="auth-google" id="google-btn">
          <svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
          Continue with Google</button>` : ""}
        ${methods.microsoft ? `<button type="button" class="auth-google auth-ms" id="ms-btn">
          <svg viewBox="0 0 23 23" aria-hidden="true"><path fill="#f25022" d="M1 1h10v10H1z"/><path fill="#7fba00" d="M12 1h10v10H12z"/><path fill="#00a4ef" d="M1 12h10v10H1z"/><path fill="#ffb900" d="M12 12h10v10H12z"/></svg>
          Continue with Microsoft (Outlook)</button>` : ""}
        ${methods.google || methods.microsoft ? `<p class="auth-or"><span>or</span></p>` : ""}
        <div class="auth-tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" data-tab="${k}">${l}</button>`).join("")}</div>

        <form class="auth-form" data-form="code" novalidate>
          <div class="step-1"><label>Email<input type="email" name="email" autocomplete="email" required /></label>
            <button class="btn btn-maroon btn-full" type="submit">Email me a sign-in link</button></div>
          <div class="step-2" hidden><p class="auth-note">Check your inbox at <strong class="sent-to"></strong>. Tap the sign-in link in the email, or type the 6-digit code here if the email shows one.</p>
            <label>Code<input name="token" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" /></label>
            <button class="btn btn-maroon btn-full verify" type="button">Verify and continue</button>
            <button class="auth-link resend" type="button">Send a new code</button></div>
          <p class="auth-msg" role="status"></p>
        </form>

        <form class="auth-form" data-form="phone" novalidate>
          <div class="step-1"><label>Mobile number
              <span class="phone-row"><select name="cc" aria-label="Country code"><option value="+91">+91 India</option><option value="+1">+1</option><option value="+44">+44</option><option value="+971">+971</option><option value="+65">+65</option><option value="+61">+61</option><option value="+66">+66</option><option value="+81">+81</option></select>
              <input type="tel" name="phone" inputmode="tel" autocomplete="tel-national" placeholder="10-digit mobile" required /></span></label>
            <button class="btn btn-maroon btn-full" type="submit">Send OTP</button></div>
          <div class="step-2" hidden><p class="auth-note">We've sent a code by SMS to <strong class="sent-to"></strong>.</p>
            <label>OTP<input name="token" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" /></label>
            <button class="btn btn-maroon btn-full verify" type="button">Verify and continue</button>
            <button class="auth-link resend" type="button">Send a new OTP</button></div>
          <p class="auth-msg" role="status"></p>
        </form>

        <form class="auth-form" data-form="password" novalidate>
          <label class="only-signup">Full name<input name="name" autocomplete="name" /></label>
          <label>Email<input type="email" name="email" autocomplete="email" required /></label>
          <label>Password<input type="password" name="password" autocomplete="current-password" minlength="8" required /></label>
          <label class="only-signup">Confirm password<input type="password" name="password2" autocomplete="new-password" minlength="8" /></label>
          <button class="btn btn-maroon btn-full" type="submit"></button>
          <button class="auth-link forgot only-signin" type="button">Forgot password?</button>
          <p class="auth-msg" role="status"></p>
        </form>

        <p class="auth-fine">By continuing you agree to our <a href="policies.html#terms">terms</a> and <a href="policies.html#privacy">privacy policy</a>. Guests can always check out without an account.</p>
      </div>`;

    let mode = startMode;
    const setMode = (m) => {
      mode = m;
      $$(".auth-mode button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.mode === m)));
      $(".auth-title").innerHTML = m === "signup" ? "Create your<br/><em>Babu Banarasi account.</em>" : "Welcome back<br/><em>to Babu Banarasi.</em>";
      $(".auth-sub").textContent = m === "signup" ? "Save your address, track orders and check out faster." : "Sign in to see your orders and check out faster.";
      $$(".only-signup").forEach((el) => (el.hidden = m !== "signup"));
      $$(".only-signin").forEach((el) => (el.hidden = m !== "signin"));
      const pf = $('[data-form="password"]');
      $("button[type=submit]", pf).textContent = m === "signup" ? "Create account" : "Sign in";
      pf.elements.password.autocomplete = m === "signup" ? "new-password" : "current-password";
    };
    const setTab = (t) => {
      $$(".auth-tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === t)));
      $$(".auth-form").forEach((f) => (f.hidden = f.dataset.form !== t));
    };
    $$(".auth-mode button").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
    $$(".auth-tabs button").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
    setMode(mode);
    setTab(tabs[0]?.[0] || "password");
    if (tabs.length < 2) $(".auth-tabs").hidden = true;

    const done = () => { location.replace(next); };

    // Google
    $("#google-btn")?.addEventListener("click", async () => {
      const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
      if (error) say($('.auth-form:not([hidden]) .auth-msg') || $(".auth-msg"), friendly(error));
    });
    // Microsoft: Outlook, Hotmail, Live and work/school accounts
    $("#ms-btn")?.addEventListener("click", async () => {
      const { error } = await sb.auth.signInWithOAuth({ provider: "azure", options: { redirectTo, scopes: "email openid profile" } });
      if (error) say($('.auth-form:not([hidden]) .auth-msg') || $(".auth-msg"), friendly(error));
    });

    // One-time codes: email and phone share the same flow
    const otpFlow = (form, kind) => {
      const msg = $(".auth-msg", form);
      let target = "";
      let cooldown = 0;
      const send = async () => {
        if (kind === "email") {
          target = form.elements.email.value.trim().toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) return say(msg, "Please enter a valid email address.");
        } else {
          const raw = form.elements.phone.value.replace(/[\s-]/g, "").replace(/^0+/, "");
          const cc = form.elements.cc.value;
          if (cc === "+91" ? !/^[6-9]\d{9}$/.test(raw) : !/^\d{6,14}$/.test(raw)) return say(msg, cc === "+91" ? "Please enter a 10-digit Indian mobile number." : "Please enter a valid mobile number.");
          target = cc + raw;
        }
        if (cooldown > Date.now()) return say(msg, `Please wait ${Math.ceil((cooldown - Date.now()) / 1000)} seconds before asking for a new code.`);
        const btn = $(".step-1 button", form) ;
        busy(btn, true, "Sending…");
        const { error } = kind === "email"
          ? await sb.auth.signInWithOtp({ email: target, options: { shouldCreateUser: true, emailRedirectTo: redirectTo } })
          : await sb.auth.signInWithOtp({ phone: target, options: { shouldCreateUser: true } });
        busy(btn, false, kind === "email" ? "Email me a sign-in link" : "Send OTP");
        if (error) return say(msg, friendly(error));
        cooldown = Date.now() + 30000;
        $(".sent-to", form).textContent = target;
        $(".step-1", form).hidden = true;
        $(".step-2", form).hidden = false;
        form.elements.token.focus();
        say(msg, kind === "email" ? "Sent. It can take a minute to arrive; check your spam folder too." : "Code sent. It can take a minute to arrive.", true);
      };
      const verify = async () => {
        const token = form.elements.token.value.trim();
        if (!/^\d{6}$/.test(token)) return say(msg, "Please enter the 6-digit code.");
        const btn = $(".verify", form);
        busy(btn, true, "Checking…");
        const { error } = kind === "email"
          ? await sb.auth.verifyOtp({ email: target, token, type: "email" })
          : await sb.auth.verifyOtp({ phone: target, token, type: "sms" });
        busy(btn, false, "Verify and continue");
        if (error) return say(msg, friendly(error));
        if (kind === "phone") await window.BB_AUTH.saveProfile({ phone: target });
        done();
      };
      form.addEventListener("submit", (e) => { e.preventDefault(); send(); });
      $(".verify", form).addEventListener("click", verify);
      form.elements.token.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); verify(); } });
      form.elements.token.addEventListener("input", () => { if (/^\d{6}$/.test(form.elements.token.value)) verify(); });
      $(".resend", form).addEventListener("click", () => { $(".step-1", form).hidden = false; $(".step-2", form).hidden = true; send(); });
    };
    if (methods.emailCode) otpFlow($('[data-form="code"]'), "email");
    if (methods.phone) otpFlow($('[data-form="phone"]'), "phone");

    // Email + password
    const pf = $('[data-form="password"]');
    const pmsg = $(".auth-msg", pf);
    pf.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = pf.elements.email.value.trim().toLowerCase();
      const password = pf.elements.password.value;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return say(pmsg, "Please enter a valid email address.");
      if (password.length < 8) return say(pmsg, "Your password needs at least 8 characters.");
      const btn = $("button[type=submit]", pf);
      if (mode === "signup") {
        const name = pf.elements.name.value.trim();
        if (name.length < 2) return say(pmsg, "Please enter your full name.");
        if (password !== pf.elements.password2.value) return say(pmsg, "The two passwords don't match.");
        busy(btn, true, "Creating your account…");
        const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: redirectTo } });
        busy(btn, false, "Create account");
        if (error) return say(pmsg, friendly(error));
        if (!data.session) return say(pmsg, `Almost there. We've emailed a confirmation link to ${email}. Open it to finish creating your account.`, true);
        done();
      } else {
        busy(btn, true, "Signing in…");
        const { error } = await sb.auth.signInWithPassword({ email, password });
        busy(btn, false, "Sign in");
        if (error) return say(pmsg, friendly(error));
        done();
      }
    });
    $(".forgot", pf).addEventListener("click", async () => {
      const email = pf.elements.email.value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { pf.elements.email.focus(); return say(pmsg, "Enter your email above, then tap 'Forgot password?' again."); }
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/account.html#reset` });
      if (error) return say(pmsg, friendly(error));
      say(pmsg, `If an account exists for ${email}, we've sent a link to reset the password.`, true);
    });
  }

  /* ================= ACCOUNT ================= */
  const STATES = ["Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"];
  const STATUS = { paid: ["Paid", "ok"], whatsapp: ["Placed on WhatsApp", "wa"], created: ["Awaiting payment", "wait"], failed: ["Payment failed", "bad"], cancelled: ["Cancelled", "bad"], shipped: ["Shipped", "ok"], delivered: ["Delivered", "ok"] };

  async function initAccount() {
    const root = $("#auth-root");
    const st = await window.BB_AUTH.ready;
    if (!st.configured) return notConfigured(root);
    const sb = st.client;
    const recovering = location.hash.includes("reset") || location.hash.includes("type=recovery") || st.lastEvent === "PASSWORD_RECOVERY";
    if (!st.user) { location.replace("login.html?next=account.html"); return; }

    const u = st.user, p = st.profile || {};
    const a = p.address || {};
    const isEmailUser = (u.app_metadata?.providers || [u.app_metadata?.provider]).includes("email");
    root.innerHTML = `
      <header class="acct-head">
        <p class="kicker">Your account</p>
        <h1>Namaste${window.BB_AUTH.firstName() ? `, <em>${esc(window.BB_AUTH.firstName())}</em>` : ""}.</h1>
        <p class="acct-who">Signed in as ${esc(u.email || u.phone || "")}</p>
      </header>
      <div class="acct-grid">
        <div class="acct-main">
          <section class="acct-card" id="set-password" ${recovering ? "" : "hidden"}>
            <h2>Set a new password</h2>
            <form class="acct-form" id="pw-form" novalidate>
              <label>New password<input type="password" name="pw" autocomplete="new-password" minlength="8" /></label>
              <label>Confirm new password<input type="password" name="pw2" autocomplete="new-password" minlength="8" /></label>
              <button class="btn btn-maroon" type="submit">Save new password</button>
              <p class="auth-msg" role="status"></p>
            </form>
          </section>
          <section class="acct-card">
            <h2>Your orders</h2>
            <div id="orders"><div class="butti-loader" role="status" aria-label="Loading your orders"><i></i><i></i><i></i></div></div>
          </section>
        </div>
        <aside class="acct-side">
          <section class="acct-card">
            <h2>Your details</h2>
            <form class="acct-form" id="profile-form" novalidate>
              <label>Full name<input name="full_name" autocomplete="name" value="${esc(p.full_name || u.user_metadata?.full_name || u.user_metadata?.name || "")}" /></label>
              <label>Mobile<input name="phone" type="tel" autocomplete="tel" value="${esc(p.phone || u.phone || "")}" /></label>
              <label>Email<input name="email" type="email" value="${esc(u.email || p.email || "")}" ${u.email ? "readonly" : ""} /></label>
              <h3>Delivery address</h3>
              <label>House, building and street<input name="address1" autocomplete="address-line1" value="${esc(a.address1)}" /></label>
              <label>Area or landmark<input name="address2" autocomplete="address-line2" value="${esc(a.address2)}" /></label>
              <label>City<input name="city" autocomplete="address-level2" value="${esc(a.city)}" /></label>
              <label>State<select name="state"><option value="">Select state</option>${STATES.map((s) => `<option ${a.state === s ? "selected" : ""}>${s}</option>`).join("")}</select></label>
              <label>PIN code<input name="pincode" inputmode="numeric" autocomplete="postal-code" value="${esc(a.pincode)}" /></label>
              <button class="btn btn-maroon btn-full" type="submit">Save details</button>
              <p class="auth-msg" role="status"></p>
            </form>
          </section>
          <section class="acct-card acct-actions">
            ${isEmailUser && !recovering ? `<button type="button" class="auth-link" id="change-pw">Change password</button>` : ""}
            <a class="auth-link" href="shop.html">Continue shopping</a>
            <button type="button" class="btn btn-line btn-full" id="sign-out">Sign out</button>
          </section>
        </aside>
      </div>`;

    // Orders
    const { data: orders, error } = await sb.from("orders").select("*").order("created_at", { ascending: false }).limit(50);
    const box = $("#orders");
    if (error) box.innerHTML = `<p class="acct-empty">We couldn't load your orders just now. Please refresh.</p>`;
    else if (!orders.length) box.innerHTML = `<div class="acct-empty"><p>No orders yet.</p><a class="btn btn-maroon" href="shop.html">Browse the sarees</a></div>`;
    else box.innerHTML = `<ul class="orders">${orders.map((o) => {
      const [label, cls] = STATUS[o.status] || [o.status, "wait"];
      const items = (o.items || []).map((i) => `${esc(i.name)} × ${i.qty}`).join(", ");
      const when = new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      const wa = `https://wa.me/919260984531?text=${encodeURIComponent(`Namaste! I'd like an update on my order ${o.id}.`)}`;
      return `<li class="order">
        <div class="order-top"><strong>${esc(o.id)}</strong><span class="order-status ${cls}">${label}</span></div>
        <p class="order-items">${items}</p>
        <div class="order-bottom"><span>${when} · ${inr(o.total)}${o.payment_method === "razorpay" ? " · paid online" : ""}</span><a href="${wa}" target="_blank" rel="noopener">Ask about this order →</a></div>
      </li>`;
    }).join("")}</ul>`;

    // Profile save
    const pf = $("#profile-form"), pmsg = $(".auth-msg", pf);
    pf.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(pf));
      if (f.pincode && !/^[1-9]\d{5}$/.test(f.pincode.trim())) return say(pmsg, "PIN codes have 6 digits.");
      const btn = $("button[type=submit]", pf); busy(btn, true, "Saving…");
      const { error } = await window.BB_AUTH.saveProfile({
        full_name: f.full_name.trim(), phone: f.phone.trim(), email: u.email || f.email.trim(),
        address: { address1: f.address1.trim(), address2: f.address2.trim(), city: f.city.trim(), state: f.state, pincode: f.pincode.trim(), country: "India" },
      });
      busy(btn, false, "Save details");
      say(pmsg, error ? friendly(error) : "Saved. We'll use these at checkout.", !error);
    });

    // Passwords
    $("#change-pw")?.addEventListener("click", () => { $("#set-password").hidden = false; $("#set-password").scrollIntoView({ behavior: "smooth" }); });
    const pw = $("#pw-form"), pwmsg = $(".auth-msg", pw);
    pw.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (pw.elements.pw.value.length < 8) return say(pwmsg, "Your password needs at least 8 characters.");
      if (pw.elements.pw.value !== pw.elements.pw2.value) return say(pwmsg, "The two passwords don't match.");
      const { error } = await sb.auth.updateUser({ password: pw.elements.pw.value });
      say(pwmsg, error ? friendly(error) : "Your new password is saved.", !error);
      if (!error) history.replaceState(null, "", "account.html");
    });

    $("#sign-out").addEventListener("click", async () => { await window.BB_AUTH.signOut(); location.replace("index.html"); });
  }

  if (page === "login") initLogin();
  if (page === "account") initAccount();
})();
