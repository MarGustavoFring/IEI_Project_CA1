/*
 * Accounts and live stock, backed by Supabase.
 *  - Sign-up / sign-in use Supabase Auth (email + password). Guests need nothing.
 *  - Profiles (name, role, saved foot scan) live in the `profiles` table.
 *  - Stock lives in the `stock` table: anyone can read it, only admins can change it
 *    (enforced by row level security in supabase/schema.sql, not just by this UI).
 * If Supabase can't be reached (offline, no config), guests still work and stock falls
 * back to the numbers in config.js.
 */
window.KioskAccounts = (() => {
  const C = window.KIOSK_CONFIG;
  const cfg = C.supabase || {};
  const GUEST = "tryon-guest-v1";

  // The sign-in lasts until the tab closes: right for a shared kiosk.
  const sb = window.supabase && cfg.url && cfg.anonKey
    ? window.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: { storage: window.sessionStorage, storageKey: "tryon-auth", persistSession: true, autoRefreshToken: true },
    })
    : null;

  let user = null; // { id, email, name, role, foot } | { guest: true, ... }
  const guestUser = () => ({ guest: true, name: "Guest", role: "guest" });

  async function loadProfile(authUser) {
    const { data } = await sb.from("profiles").select("name, role, foot").eq("id", authUser.id).maybeSingle();
    return {
      id: authUser.id, email: authUser.email,
      name: (data && data.name) || (authUser.user_metadata && authUser.user_metadata.name) || authUser.email.split("@")[0],
      role: (data && data.role) || "member",
      foot: (data && data.foot) || null,
    };
  }

  async function init() {
    if (sb) {
      try {
        const { data } = await sb.auth.getSession();
        if (data.session) { user = await loadProfile(data.session.user); return user; }
      } catch { /* offline: carry on as signed out */ }
    }
    try { if (sessionStorage.getItem(GUEST)) user = guestUser(); } catch { /* ignore */ }
    return user;
  }

  /* ---------- validation + friendly errors ---------- */
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function validateRegister({ name, email, password, confirm }) {
    if (!String(name || "").trim()) return { field: "name", message: "Enter your name." };
    if (!EMAIL.test(String(email || "").trim())) return { field: "email", message: "Enter a valid email address." };
    if (String(password || "").length < 6) return { field: "password", message: "Use at least 6 characters." };
    if (password !== confirm) return { field: "confirm", message: "The passwords don't match." };
    return null;
  }
  function friendly(error) {
    const m = String((error && error.message) || error || "");
    if (/invalid login credentials/i.test(m)) return { field: "password", message: "That email and password don't match." };
    if (/email not confirmed/i.test(m)) return { message: "Please confirm your email first: open the link we sent you, then sign in." };
    if (/already registered|already exists/i.test(m)) return { field: "email", message: "That email already has an account. Sign in instead." };
    if (/password/i.test(m) && /least|short|weak/i.test(m)) return { field: "password", message: m };
    if (/rate limit/i.test(m)) return { message: "Too many sign-ups just now. Wait a few minutes, or continue as guest." };
    if (/fetch|network|failed to/i.test(m)) return { message: "Can't reach the account server. Check the internet connection, or continue as guest." };
    return { message: m || "Something went wrong. Please try again." };
  }
  const offlineError = { ok: false, error: { message: "Accounts need an internet connection. You can still continue as guest." } };

  async function register(form) {
    if (!sb) return offlineError;
    const invalid = validateRegister(form);
    if (invalid) return { ok: false, error: invalid };
    try {
      const { data, error } = await sb.auth.signUp({
        email: form.email.trim(), password: form.password, options: { data: { name: form.name.trim().slice(0, 40) } },
      });
      if (error) return { ok: false, error: friendly(error) };
      // With "Confirm email" on, Supabase sends a link and there's no session yet.
      if (!data.session) return { ok: false, pending: true, email: form.email.trim() };
      try { sessionStorage.removeItem(GUEST); } catch { /* ignore */ }
      user = await loadProfile(data.user);
      return { ok: true, user };
    } catch (e) { return { ok: false, error: friendly(e) }; }
  }

  async function login(email, password) {
    if (!sb) return offlineError;
    if (!EMAIL.test(String(email || "").trim())) return { ok: false, error: { field: "email", message: "Enter the email you signed up with." } };
    if (!password) return { ok: false, error: { field: "password", message: "Enter your password." } };
    try {
      const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (error) return { ok: false, error: friendly(error) };
      try { sessionStorage.removeItem(GUEST); } catch { /* ignore */ }
      user = await loadProfile(data.user);
      return { ok: true, user };
    } catch (e) { return { ok: false, error: friendly(e) }; }
  }

  function continueAsGuest() {
    try { sessionStorage.setItem(GUEST, "1"); } catch { /* ignore */ }
    user = guestUser();
    return user;
  }
  const current = () => user;
  async function logout() {
    try { sessionStorage.removeItem(GUEST); } catch { /* ignore */ }
    const wasMember = user && !user.guest;
    user = null;
    if (sb && wasMember) { try { await sb.auth.signOut(); } catch { /* ignore */ } }
  }

  async function saveFoot(foot) {
    if (!sb || !user || user.guest) return;
    user.foot = foot;
    try { await sb.from("profiles").update({ foot }).eq("id", user.id); } catch { /* not critical */ }
  }

  /* ---------- stock ---------- */
  const clone = (o) => JSON.parse(JSON.stringify(o || {}));
  const floors = Object.keys(C.store.floors);
  const defaults = {};
  C.products.forEach((p) => p.colours.forEach((c) => { defaults[`${p.code}:${c.id}`] = clone(c.stock); }));
  const qtyIn = (stock, floor, i) => ((stock || {})[floor] || [])[i] || 0;

  function applyRow(row) {
    const p = C.products.find((x) => x.code === row.product_code);
    const c = p && p.colours.find((x) => x.id === row.colour_id);
    if (!c) return;
    const sizes = C.sizeRuns[p.sizeRun].sizes;
    const i = sizes.indexOf(Number(row.size));
    if (i < 0) return;
    c.stock = c.stock || {};
    if (!c.stock[row.floor]) c.stock[row.floor] = Array(sizes.length).fill(0);
    c.stock[row.floor][i] = row.qty;
  }

  let liveStock = false;
  async function loadStock() {
    if (!sb) return false;
    try {
      const { data, error } = await sb.from("stock").select("product_code, colour_id, floor, size, qty");
      if (error || !data || !data.length) return false;
      data.forEach(applyRow);
      liveStock = true;
      return true;
    } catch { return false; }
  }

  function onStockChange(callback) {
    if (!sb) return;
    sb.channel("stock-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "stock" }, (msg) => {
        if (msg.new && msg.new.product_code) { applyRow(msg.new); callback(msg.new); }
      })
      .subscribe();
  }

  async function setStock(p, c, floor, index, value) {
    if (!sb || !user || user.role !== "admin") return { ok: false, error: { message: "Only an admin can change stock." } };
    const size = C.sizeRuns[p.sizeRun].sizes[index];
    const qty = Math.max(0, Math.min(999, Math.round(value)));
    const before = qtyIn(c.stock, floor, index);
    applyRow({ product_code: p.code, colour_id: c.id, floor, size, qty }); // show it straight away
    const { error } = await sb.from("stock").upsert({ product_code: p.code, colour_id: c.id, floor, size, qty });
    if (error) {
      applyRow({ product_code: p.code, colour_id: c.id, floor, size, qty: before });
      return { ok: false, error: friendly(error) };
    }
    return { ok: true };
  }

  async function resetStock() {
    if (!sb || !user || user.role !== "admin") return { ok: false, error: { message: "Only an admin can change stock." } };
    const rows = [];
    C.products.forEach((p) => p.colours.forEach((c) => floors.forEach((f) => C.sizeRuns[p.sizeRun].sizes.forEach((size, i) => {
      rows.push({ product_code: p.code, colour_id: c.id, floor: f, size, qty: qtyIn(defaults[`${p.code}:${c.id}`], f, i) });
    }))));
    const { error } = await sb.from("stock").upsert(rows);
    if (error) return { ok: false, error: friendly(error) };
    rows.forEach(applyRow);
    return { ok: true };
  }

  function stockEdited() {
    return C.products.some((p) => p.colours.some((c) => floors.some((f) => C.sizeRuns[p.sizeRun].sizes.some((_, i) =>
      qtyIn(c.stock, f, i) !== qtyIn(defaults[`${p.code}:${c.id}`], f, i)))));
  }

  return {
    online: () => !!sb, isLiveStock: () => liveStock,
    init, register, login, continueAsGuest, current, logout, saveFoot,
    loadStock, onStockChange, setStock, resetStock, stockEdited,
  };
})();
