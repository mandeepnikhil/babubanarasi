/* ===========================================================
   BABU BANARASI · ACCOUNTS
   Shared sign-in state for every page. Loads Supabase only when
   config.js is filled in, and exposes window.BB_AUTH.
   =========================================================== */
(function () {
  const cfg = window.BB_CONFIG || {};
  const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
  const configured = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && (cfg.LIVE || isLocal));
  const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";

  const loadScript = (src) => new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });

  let lockChain = Promise.resolve();
  const tabLock = (_name, _timeout, fn) => {
    const run = lockChain.then(() => fn());
    lockChain = run.catch(() => {});
    return run;
  };

  const state = { configured, client: null, user: null, profile: null };
  const listeners = [];
  const emit = () => listeners.forEach((fn) => { try { fn(state); } catch (e) {} });

  async function loadProfile() {
    if (!state.client || !state.user) { state.profile = null; return; }
    const { data } = await state.client.from("profiles").select("*").eq("id", state.user.id).maybeSingle();
    state.profile = data || null;
  }

  const ready = (async () => {
    if (!configured) return state;
    try {
      await loadScript(SUPABASE_CDN);
      state.client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        // In-tab lock: a frozen background tab can't hold up sign-in in this one
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, lock: tabLock },
      });
      const { data } = await state.client.auth.getSession();
      state.user = data.session?.user || null;
      await loadProfile();
      state.client.auth.onAuthStateChange(async (event, session) => {
        state.user = session?.user || null;
        state.lastEvent = event;
        await loadProfile();
        emit();
      });
    } catch (e) {
      console.warn("Accounts unavailable:", e);
      state.configured = false;
    }
    return state;
  })();

  const firstName = () => {
    const n = state.profile?.full_name || state.user?.user_metadata?.full_name || state.user?.user_metadata?.name || "";
    return n.trim().split(/\s+/)[0] || "";
  };

  /* Header: "Sign in" or the customer's first name */
  function paintHeader() {
    const here = encodeURIComponent(location.pathname.split("/").pop() + location.search);
    document.querySelectorAll(".account-link").forEach((a) => {
      const label = a.querySelector(".account-label") || a;
      if (!state.configured) { a.href = "login.html"; label.textContent = "Account"; return; }
      if (state.user) { a.href = "account.html"; label.textContent = firstName() || "Account"; a.setAttribute("aria-label", "Your account"); }
      else { a.href = `login.html?next=${here}`; label.textContent = "Sign in"; a.setAttribute("aria-label", "Sign in or create an account"); }
    });
  }

  async function saveProfile(patch) {
    if (!state.client || !state.user) return { error: { message: "Not signed in" } };
    const row = { id: state.user.id, ...patch, updated_at: new Date().toISOString() };
    const res = await state.client.from("profiles").upsert(row).select().maybeSingle();
    if (!res.error) state.profile = res.data;
    return res;
  }

  async function callFunction(name, body) {
    if (!state.configured) throw new Error("Online services are not set up yet.");
    const headers = { "Content-Type": "application/json", apikey: cfg.SUPABASE_ANON_KEY };
    const session = state.client ? (await state.client.auth.getSession()).data.session : null;
    headers.Authorization = `Bearer ${session?.access_token || cfg.SUPABASE_ANON_KEY}`;
    const r = await fetch(`${cfg.SUPABASE_URL}/functions/v1/${name}`, { method: "POST", headers, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`);
    return data;
  }

  window.BB_AUTH = {
    ready,
    get state() { return state; },
    onChange: (fn) => listeners.push(fn),
    firstName,
    saveProfile,
    loadProfile,
    callFunction,
    signOut: async () => { if (state.client) await state.client.auth.signOut(); },
  };

  listeners.push(paintHeader);
  ready.then(paintHeader);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", paintHeader); else paintHeader();
})();
