/*
 * Try-On Kiosk — clickable prototype.
 * State + screens + a simulated request clock. Content comes from config.js.
 */
(() => {
  const C = window.KIOSK_CONFIG;
  const A = window.KioskArt;
  const icon = A.icon;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fill = (tpl, vars) => String(tpl).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));

  const SCREENS = [
    { id: "attract",  label: "Attract" },
    { id: "scan",     label: "Scan a shoe" },
    { id: "product",  label: "Sizes & stock" },
    { id: "footscan", label: "Foot scan", module: "footScan" },
    { id: "confirm",  label: "Request", module: "request" },
    { id: "wait",     label: "Live wait", module: "request" },
    { id: "arrived",  label: "Box arrived", module: "request" },
    { id: "checkout", label: "Pay at counter" },
    { id: "thanks",   label: "Thank you" },
  ];

  /* ---------------- Settings (remembered per browser) ---------------- */
  const LS = "tryon-kiosk-settings-v0";
  const saved = (() => { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch { return {}; } })();
  const moduleDefaults = Object.fromEntries(Object.entries(C.modules).map(([k, v]) => [k, v.on]));

  const state = {
    screen: "attract",
    product: null, colour: null, size: null, sizeSys: "UK",
    foot: null, footPhase: "intro", footFrom: "product",
    pairUp: true, point: C.store.defaultPoint,
    requests: [], activeId: null, nextTicket: C.store.firstTicket,
    cart: [], served: C.store.servedToday,
    scanning: null, keypad: false, code: "", codeError: "",
    modules: { ...moduleDefaults, ...(saved.modules || {}) },
    delivery: saved.delivery || C.delivery.mode,
    speed: saved.speed || C.demo.speed,
    fidelity: saved.fidelity || C.demo.fidelity,
    notes: saved.notes != null ? saved.notes : C.demo.showNotes,
    staffManual: !!saved.staffManual,
    solo: false,
  };
  function saveSettings() {
    try {
      localStorage.setItem(LS, JSON.stringify({
        modules: state.modules, delivery: state.delivery, speed: state.speed,
        fidelity: state.fidelity, notes: state.notes, staffManual: state.staffManual,
      }));
    } catch { /* private window: settings just won't persist */ }
  }

  /* ---------------- Data helpers ---------------- */
  const productBy = (code) => C.products.find((p) => p.code === code);
  const colourBy = (p, id) => p.colours.find((c) => c.id === id) || p.colours[0];
  const runOf = (p) => C.sizeRuns[p.sizeRun];
  const money = (n) => `${C.meta.currency}${n}`;
  const on = (m) => !!state.modules[m];

  function fmtSize(p, uk, sys = state.sizeSys) {
    const r = runOf(p);
    if (sys === "US") return `US ${r.us(uk)}`;
    if (sys === "EU") return `EU ${r.eu[uk]}`;
    return `UK ${uk}`;
  }
  function stockFor(p, c, uk) {
    const i = runOf(p).sizes.indexOf(uk);
    const byFloor = Object.entries(c.stock || {})
      .map(([floor, arr]) => ({ floor, n: arr[i] || 0 }))
      .filter((f) => f.n > 0)
      .sort((a, b) => b.n - a.n);
    return { total: byFloor.reduce((s, f) => s + f.n, 0), byFloor };
  }
  const colourTotal = (p, c) => runOf(p).sizes.reduce((s, uk) => s + stockFor(p, c, uk).total, 0);
  function recommended(p) {
    if (!state.foot) return null;
    const r = runOf(p);
    const target = C.footScan.result.recommend[p.sizeRun] + (p.fitOffset || 0);
    return r.sizes.reduce((best, s) => (Math.abs(s - target) < Math.abs(best - target) ? s : best), r.sizes[0]);
  }
  function neighbour(p, uk, dir) {
    const s = runOf(p).sizes, i = s.indexOf(uk) + dir;
    return i >= 0 && i < s.length ? s[i] : null;
  }
  function bayFor(p, c) {
    const h = A.hash(p.code + c.id);
    return `${"ABCDE"[h % 5]}-${String(10 + (h % 29)).padStart(2, "0")}`;
  }
  const modeCfg = (m) => C.delivery.modes[m] || C.delivery.modes.conveyor;
  const stagesOf = (req) => modeCfg(req.mode).stages;
  const totalOf = (req) => stagesOf(req)[stagesOf(req).length - 1].at;
  const isArrived = (req) => req.stageIdx >= stagesOf(req).length - 1;
  const activeReq = () => state.requests.find((r) => r.id === state.activeId) || null;
  const pointCfg = (n) => C.store.tryOnPoints.find((p) => p.n === n) || {};

  function reqVars(req) {
    const p = productBy(req.code);
    return {
      ticket: req.ticket, point: req.point, bay: req.bay, floor: req.floor, runner: req.runner,
      size: req.sizes.map((s) => fmtSize(p, s, "UK")).join(" + "),
    };
  }
  function fmtClock(sec) {
    sec = Math.max(0, Math.ceil(sec));
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  }
  const remaining = (req) => Math.max(0, totalOf(req) - req.elapsed);
  const etaMins = () => Math.max(1, Math.round(totalOf({ mode: state.delivery }) / 60));

  /* ---------------- Requests ---------------- */
  let reqSeq = 0;
  function makeRequest({ code, colour, sizes, point, mine, elapsed = 0, ticket }) {
    const p = productBy(code), c = colourBy(p, colour);
    const floor = (stockFor(p, c, sizes[0]).byFloor[0] || { floor: C.store.kioskFloor }).floor;
    const req = {
      id: ++reqSeq, ticket: ticket || `A${state.nextTicket++}`, code, colour: c.id, sizes: [...sizes],
      point, mine, mode: state.delivery, elapsed: 0, stageIdx: 0, doneFor: 0,
      bay: bayFor(p, c), floor, runner: C.delivery.runners[reqSeq % C.delivery.runners.length],
    };
    advanceTo(req, elapsed);
    return req;
  }
  function advanceTo(req, elapsed) {
    req.elapsed = elapsed;
    const st = stagesOf(req);
    let idx = 0;
    st.forEach((s, i) => { if (req.elapsed >= s.at) idx = i; });
    req.stageIdx = idx;
  }
  function sendRequest(sizes) {
    const req = makeRequest({
      code: state.product.code, colour: state.colour.id, sizes, point: state.point, mine: true,
    });
    state.requests.unshift(req);
    state.activeId = req.id;
    return req;
  }
  function seedRequests() {
    C.store.seedRequests.forEach((s) => {
      state.requests.push(makeRequest({ ...s, mine: false }));
    });
  }

  /* ---------------- Navigation ---------------- */
  const timers = new Set();
  function later(fn, ms) {
    const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
    timers.add(t);
  }
  function clearLater() { timers.forEach(clearTimeout); timers.clear(); }

  function selectProduct(code) {
    const p = productBy(code);
    if (!p) return false;
    const keepColour = state.product && state.product.code === code ? state.colour : null;
    state.product = p;
    state.colour = keepColour || p.colours.find((c) => colourTotal(p, c) > 0) || p.colours[0];
    const rec = recommended(p);
    state.size = rec && stockFor(p, state.colour, rec).total ? rec : null;
    return true;
  }
  function ensureProduct() { if (!state.product) selectProduct(C.products[0].code); }
  function ensureSize() {
    ensureProduct();
    if (state.size != null && stockFor(state.product, state.colour, state.size).total) return;
    const r = runOf(state.product);
    const pref = recommended(state.product) || r.demoSize;
    const ordered = [...r.sizes].sort((a, b) => Math.abs(a - pref) - Math.abs(b - pref));
    state.size = ordered.find((s) => stockFor(state.product, state.colour, s).total) || r.sizes[0];
  }
  function ensureRequest() {
    if (activeReq()) return activeReq();
    ensureSize();
    return sendRequest([state.size]);
  }

  function go(screen, { animate = true } = {}) {
    clearLater();
    state.scanning = null;
    state.keypad = false;
    state.screen = screen;
    if (screen === "thanks") later(() => resetSession(), 9000);
    render(animate);
    const sc = $("#screen .scroll");
    if (sc) sc.scrollTop = 0;
  }
  function jump(screen) {
    if (["product", "footscan", "confirm"].includes(screen)) ensureProduct();
    if (screen === "confirm") ensureSize();
    if (screen === "footscan") { state.footFrom = "product"; state.footPhase = "intro"; }
    if (screen === "wait" || screen === "arrived") {
      const req = ensureRequest();
      if (screen === "arrived") advanceTo(req, totalOf(req));
      else if (isArrived(req)) advanceTo(req, 0);
    }
    if (screen === "checkout" && !state.cart.length) {
      ensureSize();
      state.cart.push({ code: state.product.code, colour: state.colour.id, size: state.size });
      state.ticket = `A${state.nextTicket++}`;
    }
    go(screen);
  }
  function resetSession() {
    clearLater();
    Object.assign(state, {
      screen: "attract", product: null, colour: null, size: null, foot: null,
      footPhase: "intro", pairUp: true, point: C.store.defaultPoint,
      activeId: null, cart: [], ticket: null, scanning: null, keypad: false, code: "", codeError: "",
    });
    state.requests = state.requests.filter((r) => !r.mine || !isArrived(r));
    state.requests.forEach((r) => { r.mine = false; });
    render(true);
  }

  /* ---------------- Shared fragments ---------------- */
  function topbar({ back } = {}) {
    const req = activeReq();
    const pill = req && !["wait", "arrived", "checkout", "thanks"].includes(state.screen);
    return `<header class="k-top">
      <div class="k-brand">
        ${back ? `<button class="k-iconbtn" data-act="${back}" aria-label="Back">${icon("arrowLeft")}</button>` : A.logo()}
        <div class="k-brand-t"><b>${esc(C.meta.kioskName)}</b><span>${esc(C.store.name)} · ${esc(C.store.kioskFloor)}</span></div>
      </div>
      <div class="k-top-r">
        ${pill ? `<button class="k-pill ${isArrived(req) ? "is-ready" : ""}" data-act="toWait" data-live="pill">${pillText(req)}</button>` : ""}
        <button class="k-ghost ${pill ? "icon-only" : ""}" data-act="home" aria-label="Start over">${icon("refresh")}<span>Start over</span></button>
      </div>
    </header>`;
  }
  function pillText(req) {
    if (isArrived(req)) return `<i class="dot"></i>${req.ticket} · Ready at point ${req.point}`;
    return `<i class="dot"></i>${req.ticket} · ${on("waitStatus") ? fmtClock(remaining(req)) : "On its way"}`;
  }
  // A colourway's picture: the real photo when config gives an `image`, otherwise the placeholder drawing.
  function shoeArt(p, c) {
    return c.image
      ? `<img class="shoe shoe-img" src="${esc(c.image)}" alt="${esc(p.name)} in ${esc(c.name)}" draggable="false">`
      : A.shoe(c, p.variant);
  }
  function shoeThumb(p, c, cls = "") {
    return `<div class="thumb ${cls}" style="--tint:${c.upper}">${shoeArt(p, c)}</div>`;
  }
  function similarCards(p, ctx) {
    const list = (p.similar || []).map(productBy).filter(Boolean);
    if (!list.length) return "";
    return `<div class="sim-row">${list.map((q) => {
      const c = q.colours[0];
      return `<button class="sim-card k-card" data-act="viewProduct" data-arg="${q.code}">
        ${shoeThumb(q, c)}
        <b>${esc(q.name)}</b><span>${esc(q.category)} · ${money(q.price)}</span>
      </button>`;
    }).join("")}</div>`;
  }

  /* ---------------- Screens ---------------- */
  const screens = {
    attract() {
      const a = C.copy.attract;
      const n = C.products.length;
      return `<section class="scr attract" data-act="start">
        <div class="att-marquee" aria-hidden="true"><span>TRY ON · TRY ON · TRY ON · TRY ON · </span><span>TRY ON · TRY ON · TRY ON · TRY ON · </span></div>
        <div class="att-top rise" style="--d:0">${A.logo()}<b>${esc(C.meta.kioskName)}</b><span>${esc(C.store.name)}</span></div>
        <div class="att-stage">
          <div class="att-orb"></div>
          <div class="att-shoes" style="--n:${n}">
            ${C.products.map((p, i) => `<div class="att-shoe" style="--i:${i}">${shoeArt(p, p.colours[0])}<span>${esc(p.name)}</span></div>`).join("")}
          </div>
        </div>
        <div class="att-copy">
          <span class="kicker rise" style="--d:1">${esc(a.kicker)}</span>
          <h1 class="rise" style="--d:2">${esc(a.title[0])}<br><em>${esc(a.title[1])}</em></h1>
          <p class="rise" style="--d:3">${esc(a.sub)}</p>
          <ul class="att-chips rise" style="--d:4">${a.chips.map((c) => `<li>${icon("check")}${esc(c)}</li>`).join("")}</ul>
        </div>
        <div class="att-cta rise" style="--d:5"><span class="tap"><i></i>${icon("arrowRight")}</span><div><b>Tap anywhere to start</b><small>or scan a shoe's tag below</small></div></div>
      </section>`;
    },

    scan() {
      const scanOn = on("scan");
      return `<section class="scr scan">${topbar()}
        <div class="scroll">
          ${scanOn ? `
          <div class="scan-hero rise" style="--d:0">
            <div class="scan-visual">
              <div class="scan-tag k-card">${A.qr("TRYON-DEMO")}<span>#0000</span></div>
              <div class="scan-beam"></div>
            </div>
            <h2>Scan the tag on<br>any display shoe</h2>
            <p>Hold its QR tag under the light below the screen.</p>
            <div class="scan-hint">${icon("arrowDown")}<span>Scanner is just below</span></div>
          </div>` : `
          <div class="scan-hero compact rise" style="--d:0"><h2>Which shoe caught your eye?</h2><p>Tap one to see every size we have in store.</p></div>`}
          <div class="demo-head rise" style="--d:1">
            ${scanOn ? `<span class="demo-badge">Demo</span><span>Tap a tag to simulate a scan</span>` : `<span>${C.products.length} styles in store</span>`}
          </div>
          <div class="tag-grid">
            ${C.products.map((p, i) => `
              <button class="tag-card k-card rise" style="--d:${2 + i * 0.5}" data-act="scanTag" data-arg="${p.code}">
                ${shoeThumb(p, p.colours[0])}
                <div class="tag-meta"><b>${esc(p.name)}</b><span>${esc(p.category)}</span></div>
                ${scanOn ? `<div class="tag-qr">${A.qr(p.code)}<small>#${p.code}</small></div>` : `<span class="tag-price">${money(p.price)}</span>`}
              </button>`).join("")}
          </div>
          ${on("manualCode") ? `<button class="k-link rise" style="--d:5" data-act="keypad">${icon("keypad")}<span>Tag won't scan? <b>Type its 4-digit code</b></span></button>` : ""}
        </div>
        ${state.scanning ? scanningOverlay() : ""}
        ${state.keypad ? keypadOverlay() : ""}
      </section>`;
    },

    product() {
      const p = state.product, c = state.colour, r = runOf(p);
      const rec = recommended(p);
      const sel = state.size;
      const st = sel != null ? stockFor(p, c, sel) : null;
      const canRequest = st && st.total > 0;
      return `<section class="scr product">${topbar({ back: "toScan" })}
        <div class="scroll">
          <div class="p-hero" style="--tint:${c.upper}">
            <div class="p-glow"></div>
            <div class="p-bigname" aria-hidden="true">${esc(p.name.split(" ")[0])}</div>
            <div class="p-floor"></div>
            <div class="p-shoe">${shoeArt(p, c)}</div>
            <div class="p-tags"><span class="chip">${esc(p.category)}</span><span class="chip">${esc(runOf(p).label)}</span></div>
            <span class="p-code">#${p.code}</span>
          </div>
          <div class="p-head">
            <div><h2>${esc(p.name)}</h2><p>${esc(c.name)} · ${esc(p.tagline)}</p></div>
            <div class="price">${money(p.price)}</div>
          </div>
          ${p.features && p.features.length ? `<ul class="p-feats">${p.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}
          <div class="p-sub-h"><h3>Colour</h3><span>${esc(c.name)} · ${colourTotal(p, c)} pairs in store</span></div>
          <div class="p-colours">
            ${p.colours.map((col) => {
              const t = colourTotal(p, col);
              return `<button class="cw ${col.id === c.id ? "is-sel" : ""} ${t ? "" : "is-out"}" data-act="colour" data-arg="${col.id}" aria-label="${esc(col.name)}">
                <span class="cw-img" style="--tint:${col.upper}">${shoeArt(p, col)}</span>
                <b>${esc(col.name)}</b><small>${t ? `${t} pairs` : "Sold out"}</small>
              </button>`;
            }).join("")}
          </div>
          <div class="size-head">
            <h3>Choose your size</h3>
            <div class="seg" role="group" aria-label="Size system">
              ${["UK", "US", "EU"].map((s) => `<button class="${state.sizeSys === s ? "is-sel" : ""}" data-act="sizeSys" data-arg="${s}">${s}</button>`).join("")}
            </div>
          </div>
          ${on("footScan") ? (rec
            ? `<div class="fit-banner">${icon("foot")}<div>Your foot scan says <b>${fmtSize(p, rec)}</b> in this model.<small>${esc(p.fitNote)}</small></div></div>`
            : `<button class="fit-cta" data-act="footscan">${icon("foot")}<div><b>Not sure of your size?</b><span>Free 30-second foot scan</span></div>${icon("arrowRight")}</button>`) : ""}
          <div class="size-grid">
            ${r.sizes.map((uk) => {
              const n = stockFor(p, c, uk).total;
              const lab = n === 0 ? "Sold out" : !on("stockByFloor") ? "In stock" : n === 1 ? "Last pair" : `${n} in store`;
              return `<button class="size ${sel === uk ? "is-sel" : ""} ${n === 0 ? "is-out" : ""} ${n === 1 ? "is-low" : ""} ${rec === uk ? "is-rec" : ""}" data-act="size" data-arg="${uk}">
                ${rec === uk ? `<em>Your fit</em>` : ""}<b>${fmtSize(p, uk).replace(/^(UK|US|EU) /, "")}</b><small>${lab}</small>
              </button>`;
            }).join("")}
          </div>
          ${st ? stockPanel(p, c, sel, st) : `<p class="hint">${icon("info")}Tap a size to see if it's in store and where.</p>`}
          ${on("similar") ? `<h3 class="sec-h">You might also like</h3>${similarCards(p)}` : ""}
        </div>
        <footer class="cta-bar">
          ${on("request") ? `
            <button class="btn-primary" data-act="toConfirm" ${canRequest ? "" : "disabled"}>
              ${sel == null ? "Select a size" : canRequest ? `Bring me ${fmtSize(p, sel)}` : `${fmtSize(p, sel)} isn't in store`}${canRequest ? icon("arrowRight") : ""}
            </button>
            <p class="cta-sub">${icon("shield")}No app · No sign-in · About ${etaMins()} min</p>`
          : `<div class="ask-staff k-card">${icon("user")}<div><b>Show this screen to any staff member</b><span>They'll fetch ${sel != null ? fmtSize(p, sel) : "your size"} for you.</span></div></div>`}
        </footer>
      </section>`;
    },

    footscan() {
      const ph = state.footPhase;
      const R = C.footScan.result;
      const p = state.product;
      const rec = p ? recommended(p) : null;
      const req = activeReq();
      let body = "";
      if (ph === "intro") {
        body = `<div class="fs-intro">
          <div class="fs-pad rise" style="--d:0"><div class="fs-feet">${A.foot()}${A.foot({ mirror: true })}</div><span>Step here</span></div>
          <span class="kicker rise" style="--d:1">Free · about ${C.footScan.seconds} seconds</span>
          <h2 class="rise" style="--d:2">Find your size<br>before you try</h2>
          <p class="rise" style="--d:3">Step onto the pad in front of the kiosk. Socks on is fine.</p>
          <ul class="fs-list rise" style="--d:4">
            <li>${icon("check")}Length and width of both feet</li>
            <li>${icon("check")}Your arch type</li>
            <li>${icon("check")}Your size in ${p ? esc(p.name) : "this model"}</li>
          </ul>
          <p class="fine rise" style="--d:5">${icon("shield")}Nothing is saved. Results clear when you start over.</p>
        </div>`;
      } else if (ph === "scanning") {
        body = `<div class="fs-scanning">
          <div class="fs-scanfeet">${A.foot({ cls: "scanning" })}${A.foot({ cls: "scanning", mirror: true })}<div class="fs-line"></div></div>
          <h2>Scanning…</h2>
          <p class="fs-steps"><span>Measuring length</span><span>Measuring width</span><span>Reading your arch</span></p>
          <div class="fs-bar"><i></i></div>
        </div>`;
      } else {
        body = `<div class="fs-result">
          <span class="kicker rise" style="--d:0">Your foot scan</span>
          <div class="fs-feet-res rise" style="--d:1">
            <div class="fs-f">${A.foot()}<b>${R.left.length} mm</b><span>Left</span></div>
            <div class="fs-f">${A.foot({ mirror: true })}<b>${R.right.length} mm</b><span>Right</span></div>
          </div>
          <div class="fs-stats rise" style="--d:2">
            <div><span>Width</span><b>${R.width}</b></div><div><span>Arch</span><b>${R.arch}</b></div><div><span>Longer foot</span><b>Right</b></div>
          </div>
          ${p ? `<div class="fs-rec k-card rise" style="--d:3">
            <span>Your size in ${esc(p.name)}</span>
            <b>${fmtSize(p, rec)}</b>
            <small>${esc(p.fitNote)}</small>
          </div>` : ""}
        </div>`;
      }
      let cta = "";
      if (ph === "intro") cta = `<button class="btn-primary" data-act="footStart">I'm on the pad: start scan ${icon("arrowRight")}</button>`;
      if (ph === "result") {
        if (state.footFrom === "wait" && req) {
          const has = req.sizes.includes(rec);
          cta = has
            ? `<button class="btn-primary" data-act="toWait">${icon("check")} Your request is already ${fmtSize(p, rec)}</button>`
            : `<button class="btn-primary" data-act="footAdd">Add ${fmtSize(p, rec)} to my request ${icon("arrowRight")}</button>
               <button class="btn-ghost" data-act="toWait">Keep my request as is</button>`;
        } else {
          cta = `<button class="btn-primary" data-act="footUse">Show me ${fmtSize(p, rec)} ${icon("arrowRight")}</button>`;
        }
      }
      return `<section class="scr footscan">${topbar({ back: "footBack" })}
        <div class="scroll center">${body}</div>
        ${cta ? `<footer class="cta-bar">${cta}</footer>` : ""}
      </section>`;
    },

    confirm() {
      const p = state.product, c = state.colour, sel = state.size;
      const up = neighbour(p, sel, 1);
      const upOk = up != null && stockFor(p, c, up).total > 0;
      const showPair = on("pairUp") && upOk;
      const sizes = showPair && state.pairUp ? [sel, up] : [sel];
      return `<section class="scr confirm">${topbar({ back: "toProduct" })}
        <div class="scroll">
          <h2 class="scr-title rise" style="--d:0">Where should we<br>bring your pair?</h2>
          <div class="sum-card k-card rise" style="--d:1">
            ${shoeThumb(p, c)}
            <div class="sum-t"><b>${esc(p.name)}</b><span>${esc(c.name)}</span>
              <div class="sum-sizes">${sizes.map((s) => `<i>${fmtSize(p, s)}</i>`).join("")}</div>
            </div>
            <div class="sum-price">${money(p.price)}</div>
          </div>
          ${showPair ? `
          <button class="toggle-row k-card rise ${state.pairUp ? "is-on" : ""}" style="--d:2" data-act="pairUp">
            <div><b>Also bring ${fmtSize(p, up)}</b><span>Try both, keep one. Handy if you're between sizes.</span></div>
            <span class="switch"><i></i></span>
          </button>` : ""}
          <h3 class="sec-h rise" style="--d:3">Pick a try-on point</h3>
          <div class="points rise" style="--d:3">
            ${C.store.tryOnPoints.map((pt) => `
              <button class="point ${pt.n === state.point ? "is-sel" : ""}" data-act="point" data-arg="${pt.n}" ${pt.busy ? "disabled" : ""}>
                <b>${pt.n}</b><small>${pt.busy ? "In use" : pt.dist}</small>
              </button>`).join("")}
          </div>
          <div class="map-card k-card rise" style="--d:4">${A.floorMap({ point: state.point, mode: state.delivery, points: C.store.tryOnPoints })}</div>
          <div class="eta-row rise" style="--d:5">${icon("clock")}<span>Ready in about <b>${etaMins()} min</b></span><span class="sep"></span>${icon(state.delivery === "conveyor" ? "conveyor" : "user")}<span>${esc(modeCfg(state.delivery).short)}</span></div>
        </div>
        <footer class="cta-bar">
          <button class="btn-primary" data-act="sendRequest">Send my request ${icon("arrowRight")}</button>
          <p class="cta-sub">${icon("card")}Nothing to pay here. Pay at the counter only if you buy.</p>
        </footer>
      </section>`;
    },

    wait() {
      const req = activeReq();
      const p = productBy(req.code), c = colourBy(p, req.colour);
      const st = stagesOf(req), cur = st[req.stageIdx];
      const v = reqVars(req);
      const sizes = req.sizes.map((s) => fmtSize(p, s)).join(" + ");
      const footCard = on("footScan") ? (state.foot
        ? `<div class="ww-card k-card done">${icon("foot")}<b>Foot scan done</b><span>Your size: ${fmtSize(p, recommended(p))}</span></div>`
        : `<button class="ww-card k-card accent" data-act="footscanWait">${icon("foot")}<b>Scan your feet</b><span>30 sec · check your size before the box arrives</span></button>`) : "";
      if (!on("waitStatus")) {
        return `<section class="scr wait simple">${topbar()}
          <div class="scroll center">
            <div class="simple-wait rise" style="--d:0">
              <div class="sw-icon">${icon("box")}</div>
              <span class="kicker">Request ${req.ticket}</span>
              <h2>Request sent</h2>
              <p>Please wait at Try-on Point ${req.point}.<br>${esc(p.name)} · ${esc(c.name)} · ${sizes}</p>
            </div>
            ${footCard ? `<div class="ww-row single">${footCard}</div>` : ""}
          </div>
        </section>`;
      }
      const C2 = 2 * Math.PI * 76;
      const prog = Math.min(1, req.elapsed / totalOf(req));
      return `<section class="scr wait">${topbar()}
        <div class="scroll">
          <div class="w-head rise" style="--d:0">
            <span class="kicker">Request ${req.ticket} · ${esc(p.name)} · ${sizes}</span>
            <h2 data-live="headline">${esc(fill(cur.kiosk, v))}</h2>
          </div>
          <div class="w-main rise" style="--d:1">
            <div class="ring">
              <svg viewBox="0 0 180 180"><circle cx="90" cy="90" r="76" class="ring-bg"/><circle cx="90" cy="90" r="76" class="ring-fg" data-live="ring" stroke-dasharray="${C2}" stroke-dashoffset="${C2 * (1 - prog)}"/></svg>
              <div class="ring-c"><small>Ready in about</small><b data-live="eta">${fmtClock(remaining(req))}</b><span>min</span></div>
            </div>
            <ol class="stepper">
              ${st.map((s, i) => `<li class="${i < req.stageIdx ? "done" : i === req.stageIdx ? "now" : ""}">
                <i>${i < req.stageIdx ? icon("check") : ""}</i><div><b>${esc(s.label)}</b><span>${esc(fill(s.detail, v))}</span></div></li>`).join("")}
            </ol>
          </div>
          <div class="why k-card rise" style="--d:2">${icon("info")}<div><b>Why the wait?</b><p>${esc(fill(modeCfg(req.mode).why, v))}</p></div></div>
          <div class="map-card k-card rise" style="--d:3">
            <div class="map-head"><b>${icon("seat")}Take a seat at Try-on Point ${req.point}</b><span>${esc(pointCfg(req.point).dist || "")} away</span></div>
            ${A.floorMap({ point: req.point, mode: req.mode, points: C.store.tryOnPoints })}
          </div>
          ${footCard || on("similar") ? `<h3 class="sec-h rise" style="--d:4">While you wait</h3>` : ""}
          ${footCard ? `<div class="ww-row rise" style="--d:4">${footCard}</div>` : ""}
          ${on("similar") ? `<div class="rise" style="--d:5">${similarCards(p)}</div>` : ""}
        </div>
      </section>`;
    },

    arrived() {
      const req = activeReq();
      const p = productBy(req.code), c = colourBy(p, req.colour);
      const lo = Math.min(...req.sizes), hi = Math.max(...req.sizes);
      const up = neighbour(p, hi, 1), down = neighbour(p, lo, -1);
      const two = req.sizes.length > 1;
      return `<section class="scr arrived">${topbar()}
        <div class="scroll center">
          <div class="arr-hero">
            <div class="arr-burst">${[...Array(12)].map((_, i) => `<i style="--r:${i * 30}deg"></i>`).join("")}</div>
            ${A.box({ label: `UK ${req.sizes.join(" / ")}`, sub: `${req.ticket} · ${esc(c.name)}` })}
            <div class="arr-num">${req.point}</div>
          </div>
          <span class="kicker rise" style="--d:1">${req.ticket} · Delivered in ${fmtClock(req.elapsed)}</span>
          <h2 class="rise" style="--d:2">Your box is at<br>Try-on Point ${req.point}</h2>
          <p class="arr-sub rise" style="--d:3">${esc(p.name)} · ${esc(c.name)} · ${req.sizes.map((s) => fmtSize(p, s)).join(" + ")}</p>
          <h3 class="sec-h rise" style="--d:4">How do they fit?</h3>
          <div class="fit-grid rise" style="--d:5">
            ${req.sizes.map((s) => `<button class="fit good ${two ? "" : "solo"}" data-act="fit" data-arg="good:${s}">${icon("check")}<b>${two ? `${fmtSize(p, s)} fits` : "Fits great"}</b><span>I'll take it</span></button>`).join("")}
            <button class="fit" data-act="fit" data-arg="small" ${up == null ? "disabled" : ""}><b>Too small</b><span>${up != null ? `Bring ${fmtSize(p, up)}` : "No bigger size"}</span></button>
            <button class="fit" data-act="fit" data-arg="big" ${down == null ? "disabled" : ""}><b>Too big</b><span>${down != null ? `Bring ${fmtSize(p, down)}` : "No smaller size"}</span></button>
            <button class="fit wide" data-act="fit" data-arg="other"><b>Not for me</b><span>Try another colour or style</span></button>
          </div>
          <p class="fine">Leave any box you don't want at the try-on point. Staff will collect it.</p>
        </div>
      </section>`;
    },

    checkout() {
      const lines = state.cart.map((l) => ({ ...l, p: productBy(l.code) }));
      const total = lines.reduce((s, l) => s + l.p.price, 0);
      const ticket = state.ticket || `A${state.nextTicket - 1}`;
      return `<section class="scr checkout">${topbar()}
        <div class="scroll center">
          <span class="kicker rise" style="--d:0">All set</span>
          <h2 class="rise" style="--d:1">Pay at any counter</h2>
          <div class="ticket rise" style="--d:2">
            <div class="ticket-top">${A.qr("PAY-" + ticket)}<div><small>Your ticket</small><b>${ticket}</b><span>Show this code, or just say the number</span></div></div>
            <div class="ticket-cut"></div>
            <ul class="ticket-lines">
              ${lines.map((l) => { const c = colourBy(l.p, l.colour); return `<li>${shoeThumb(l.p, c, "sm")}<div><b>${esc(l.p.name)}</b><span>${esc(c.name)} · ${fmtSize(l.p, l.size)}</span></div><em>${money(l.p.price)}</em></li>`; }).join("")}
            </ul>
            <div class="ticket-total"><span>To pay at the counter</span><b>${money(total)}</b></div>
          </div>
          <ol class="howto rise" style="--d:3">
            <li><i>1</i><span>Take your box to any counter on L1 or L2.</span></li>
            <li><i>2</i><span>Show this screen or say <b>${ticket}</b>.</span></li>
            <li><i>3</i><span>Pay as usual: card, cash or mobile wallet.</span></li>
          </ol>
        </div>
        <footer class="cta-bar row">
          <button class="btn-ghost" data-act="keepBrowsing">Keep browsing</button>
          <button class="btn-primary" data-act="finish">Done ${icon("check")}</button>
        </footer>
      </section>`;
    },

    thanks() {
      return `<section class="scr thanks" data-act="home">
        <div class="th-check">${icon("check")}</div>
        <h2 class="rise" style="--d:1">Enjoy your new pair.</h2>
        <p class="rise" style="--d:2">See you at the counter.</p>
        <div class="th-reset rise" style="--d:3"><i></i><span>Resetting for the next shopper…</span></div>
      </section>`;
    },
  };

  function stockPanel(p, c, uk, st) {
    if (st.total > 0) {
      return `<div class="stock ok k-card">
        <div class="stock-l">${icon("check")}<div><b>${fmtSize(p, uk)} is in store</b><span>${on("stockByFloor") ? `${st.total} ${st.total === 1 ? "pair" : "pairs"} · ` : ""}ready in about ${etaMins()} min</span></div></div>
        ${on("stockByFloor") ? `<div class="floors">${st.byFloor.map((f) => `<span title="${esc(C.store.floors[f.floor] || f.floor)}">${icon("layers")}<b>${f.floor}</b>${f.n}</span>`).join("")}</div>` : ""}
      </div>`;
    }
    const alts = [];
    for (const d of [1, -1]) {
      const s = neighbour(p, uk, d);
      if (s != null && stockFor(p, c, s).total) alts.push(`<button data-act="alt" data-arg="size:${s}">${fmtSize(p, s)}<small>${d > 0 ? "half up" : "half down"}</small></button>`);
    }
    p.colours.filter((o) => o.id !== c.id && stockFor(p, o, uk).total).forEach((o) =>
      alts.push(`<button data-act="alt" data-arg="colour:${o.id}"><i class="dotc" style="background:${o.upper}"></i>${esc(o.name)}<small>same size</small></button>`));
    (p.similar || []).map(productBy).filter((q) => q && q.sizeRun === p.sizeRun && q.colours.some((o) => stockFor(q, o, uk).total)).slice(0, 2).forEach((q) =>
      alts.push(`<button data-act="alt" data-arg="product:${q.code}">${esc(q.name)}<small>similar fit</small></button>`));
    return `<div class="stock out k-card">
      <div class="stock-l">${icon("info")}<div><b>${fmtSize(p, uk)} isn't in store in ${esc(c.name)}</b><span>${esc(C.outReason)}</span></div></div>
      ${alts.length ? `<div class="alts"><small>Try instead</small><div>${alts.join("")}</div></div>` : ""}
    </div>`;
  }

  function scanningOverlay() {
    const s = state.scanning, p = productBy(s.code);
    return `<div class="overlay scanning-ov ${s.phase}">
      <div class="ov-card">
        <div class="sc-tag">${A.qr(p.code)}<div class="sc-beam"></div><div class="sc-ok">${icon("check")}</div></div>
        <b>${s.phase === "found" ? esc(p.name) : "Reading tag…"}</b>
        <span>${s.phase === "found" ? `#${p.code} · checking stock on every floor` : "Hold it steady"}</span>
      </div>
    </div>`;
  }
  function keypadOverlay() {
    const digits = state.code.padEnd(4, " ").split("");
    return `<div class="overlay keypad-ov" data-act="keypadClose">
      <div class="sheet" data-act="noop">
        <div class="sheet-grab"></div>
        <div class="sheet-head"><b>Enter the code on the tag</b><button class="k-iconbtn" data-act="keypadClose" aria-label="Close">${icon("x")}</button></div>
        <div class="code-boxes ${state.codeError ? "is-err" : ""}">${digits.map((d, i) => `<span class="${i === state.code.length ? "is-cur" : ""}">${d.trim()}</span>`).join("")}</div>
        <p class="code-msg">${state.codeError ? esc(state.codeError) : `It's the 4 digits under the QR code. Demo codes: ${C.products.map((p) => p.code).join(", ")}`}</p>
        <div class="keys">
          ${["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "<"].map((k) => `<button data-act="key" data-arg="${k}" ${k === "C" ? 'aria-label="Clear"' : k === "<" ? 'aria-label="Delete"' : ""}>${k === "<" ? icon("backspace") : k === "C" ? "Clear" : k}</button>`).join("")}
        </div>
        <button class="btn-primary" data-act="keypadGo" ${state.code.length === 4 ? "" : "disabled"}>Find this shoe ${icon("arrowRight")}</button>
      </div>
    </div>`;
  }

  /* ---------------- Actions ---------------- */
  const actions = {
    noop() {},
    start: () => go("scan"),
    home: () => resetSession(),
    toScan: () => go("scan"),
    toProduct: () => go("product"),
    toWait: () => { if (activeReq()) go(isArrived(activeReq()) ? "arrived" : "wait"); },
    scanTag(code) {
      if (!on("scan")) { selectProduct(code); go("product"); return; }
      state.scanning = { code, phase: "reading" };
      render(false);
      later(() => {
        state.scanning = { code, phase: "found" };
        render(false);
        later(() => { selectProduct(code); go("product"); }, 900);
      }, 1300);
    },
    keypad() { state.keypad = true; state.code = ""; state.codeError = ""; render(false); },
    keypadClose() { state.keypad = false; render(false); },
    key(k) {
      if (k === "C") state.code = "";
      else if (k === "<") state.code = state.code.slice(0, -1);
      else if (state.code.length < 4) state.code += k;
      state.codeError = "";
      render(false);
    },
    keypadGo() {
      if (productBy(state.code)) { const code = state.code; state.keypad = false; selectProduct(code); go("product"); }
      else { state.codeError = `No shoe with code ${state.code}. Check the tag and try again.`; render(false); }
    },
    colour(id) {
      state.colour = colourBy(state.product, id);
      render(false);
    },
    size(uk) { state.size = Number(uk); render(false); },
    sizeSys(s) { state.sizeSys = s; render(false); },
    alt(arg) {
      const [k, v] = arg.split(":");
      if (k === "size") state.size = Number(v);
      if (k === "colour") state.colour = colourBy(state.product, v);
      if (k === "product") {
        const size = state.size;
        selectProduct(v);
        const p = state.product;
        state.colour = p.colours.find((o) => stockFor(p, o, size).total) || state.colour;
        state.size = size;
        go("product");
        return;
      }
      render(false);
    },
    viewProduct(code) { selectProduct(code); go("product"); },
    footscan() { state.footFrom = "product"; state.footPhase = state.foot ? "result" : "intro"; go("footscan"); },
    footscanWait() { state.footFrom = "wait"; state.footPhase = state.foot ? "result" : "intro"; go("footscan"); },
    footBack() { state.footFrom === "wait" ? actions.toWait() : go("product"); },
    footStart() {
      state.footPhase = "scanning";
      render(false);
      later(() => { state.foot = C.footScan.result; state.footPhase = "result"; render(false); }, 3600);
    },
    footUse() {
      const p = state.product, rec = recommended(p);
      state.size = rec;
      if (!stockFor(p, state.colour, rec).total) {
        state.colour = p.colours.find((o) => stockFor(p, o, rec).total) || state.colour;
      }
      go("product");
    },
    footAdd() {
      const req = activeReq(), p = productBy(req.code), rec = recommended(p);
      if (!req.sizes.includes(rec)) req.sizes.push(rec);
      req.sizes.sort((a, b) => a - b);
      actions.toWait();
    },
    toConfirm() { if (on("request")) go("confirm"); },
    pairUp() { state.pairUp = !state.pairUp; render(false); },
    point(n) { state.point = Number(n); render(false); },
    sendRequest() {
      const p = state.product, c = state.colour, sel = state.size;
      const up = neighbour(p, sel, 1);
      const sizes = on("pairUp") && state.pairUp && up != null && stockFor(p, c, up).total ? [sel, up] : [sel];
      sendRequest(sizes);
      go("wait");
    },
    fit(arg) {
      const req = activeReq();
      const p = productBy(req.code);
      if (arg.startsWith("good")) {
        const size = Number(arg.split(":")[1]);
        state.cart.push({ code: req.code, colour: req.colour, size });
        state.ticket = req.ticket;
        state.activeId = null;
        go("checkout");
        return;
      }
      if (arg === "other") { selectProduct(req.code); go("product"); return; }
      const next = arg === "small" ? neighbour(p, Math.max(...req.sizes), 1) : neighbour(p, Math.min(...req.sizes), -1);
      selectProduct(req.code);
      state.colour = colourBy(p, req.colour);
      state.size = next;
      if (!stockFor(p, state.colour, next).total) { go("product"); return; }
      state.point = req.point;
      sendRequest([next]);
      go("wait");
    },
    keepBrowsing: () => go("scan"),
    finish: () => go("thanks"),

    /* presenter */
    jump: (id) => jump(id),
    toggleModule(k) { state.modules[k] = !state.modules[k]; saveSettings(); fixScreenForModules(); render(false); },
    delivery(m) { state.delivery = m; saveSettings(); render(false); },
    speed(n) { state.speed = Number(n); saveSettings(); renderPresenter(); },
    fidelity(f) { state.fidelity = f; saveSettings(); render(false); },
    notes() { state.notes = !state.notes; saveSettings(); renderPresenter(); },
    staffManual() { state.staffManual = !state.staffManual; saveSettings(); render(false); },
    solo() { state.solo = !state.solo; render(false); },
    resetAll() {
      try { localStorage.removeItem(LS); } catch { /* ignore */ }
      Object.assign(state, {
        modules: { ...moduleDefaults }, delivery: C.delivery.mode, speed: C.demo.speed,
        fidelity: C.demo.fidelity, notes: C.demo.showNotes, staffManual: false,
        requests: [], nextTicket: C.store.firstTicket, served: C.store.servedToday,
      });
      seedRequests();
      resetSession();
    },

    /* staff */
    staffAdvance(id) {
      const req = state.requests.find((r) => r.id === Number(id));
      if (!req || isArrived(req)) return;
      const next = stagesOf(req)[req.stageIdx + 1];
      advanceTo(req, Math.max(req.elapsed, next.at));
      onStageChange(req);
      render(false);
    },
  };

  function fixScreenForModules() {
    const s = SCREENS.find((x) => x.id === state.screen);
    if (s && s.module && !on(s.module)) go(state.product ? "product" : "scan");
  }

  /* ---------------- Simulation clock ---------------- */
  const TICK = 250;
  let spawnIn = 40;
  function onStageChange(req) {
    if (req.mine && req.id === state.activeId && isArrived(req) && state.screen === "wait") {
      later(() => go("arrived"), 700);
    }
  }
  function tick() {
    const dt = (TICK / 1000) * state.speed;
    let changed = false;
    state.requests.forEach((req) => {
      if (isArrived(req)) { req.doneFor += dt; return; }
      const st = stagesOf(req);
      const next = st[req.stageIdx + 1];
      const before = req.stageIdx;
      // In role-play mode the staff handheld advances the stages; the clock waits.
      const manual = state.staffManual && on("staffQueue");
      const cap = manual ? next.at - 1 : Infinity;
      advanceTo(req, Math.min(req.elapsed + dt, Math.max(cap, req.elapsed)));
      if (manual) req.stageIdx = before;
      if (req.stageIdx !== before) { changed = true; onStageChange(req); }
    });
    // Other shoppers come and go so the staff queue feels alive.
    const before = state.requests.length;
    state.requests = state.requests.filter((r) => {
      if (!isArrived(r) || r.id === state.activeId) return true;
      if (r.doneFor > 45) { state.served++; return false; }
      return true;
    });
    if (state.requests.length !== before) changed = true;
    spawnIn -= dt;
    if (spawnIn <= 0) {
      spawnIn = 70 + Math.random() * 50;
      if (state.requests.filter((r) => !r.mine && !isArrived(r)).length < 3) {
        const p = C.products[Math.floor(Math.random() * C.products.length)];
        const c = p.colours[Math.floor(Math.random() * p.colours.length)];
        const sizes = runOf(p).sizes.filter((s) => stockFor(p, c, s).total);
        const taken = C.store.tryOnPoints.filter((t) => t.busy);
        if (sizes.length) {
          state.requests.push(makeRequest({
            code: p.code, colour: c.id, sizes: [sizes[Math.floor(Math.random() * sizes.length)]],
            point: taken[Math.floor(Math.random() * taken.length)].n, mine: false,
          }));
          changed = true;
        }
      }
    }
    if (changed) {
      if (["wait"].includes(state.screen)) renderKiosk(false);
      else if (state.screen !== "attract") updateLive();
      renderStaff();
    }
    updateLive();
  }

  function updateLive() {
    const req = activeReq();
    const root = $("#screen");
    if (req) {
      const pill = root.querySelector('[data-live="pill"]');
      if (pill) { pill.innerHTML = pillText(req); pill.classList.toggle("is-ready", isArrived(req)); }
      const eta = root.querySelector('[data-live="eta"]');
      if (eta) eta.textContent = fmtClock(remaining(req));
      const ring = root.querySelector('[data-live="ring"]');
      if (ring) {
        const C2 = 2 * Math.PI * 76;
        ring.setAttribute("stroke-dashoffset", C2 * (1 - Math.min(1, req.elapsed / totalOf(req))));
      }
      placeBox(root.querySelector(".scr.wait .floormap"), req);
    }
    document.querySelectorAll("[data-live-el]").forEach((el) => {
      const r = state.requests.find((x) => x.id === Number(el.dataset.liveEl));
      if (r) el.textContent = fmtClock(r.elapsed);
    });
  }
  function placeBox(svg, req) {
    if (!svg) return;
    const path = svg.querySelector("#fm-route"), boxEl = svg.querySelector("#fm-box");
    if (!path || !boxEl) return;
    const st = stagesOf(req);
    // The box sits in the stockroom until it's picked, then travels the route.
    const startAt = st[Math.min(2, st.length - 2)].at;
    const t = Math.max(0, Math.min(1, (req.elapsed - startAt) / (totalOf(req) - startAt)));
    const len = path.getTotalLength();
    const pt = path.getPointAtLength(len * t);
    boxEl.setAttribute("transform", `translate(${pt.x} ${pt.y})`);
    boxEl.classList.toggle("is-moving", t > 0 && t < 1);
  }

  /* ---------------- Rendering ---------------- */
  function renderKiosk(animate) {
    const screen = $("#screen");
    // Live re-renders (stage changes, toggles) keep the shopper's scroll position.
    const prevScroll = animate ? 0 : (screen.querySelector(".scroll") || {}).scrollTop || 0;
    screen.innerHTML = screens[state.screen]();
    const sc = screen.querySelector(".scroll");
    if (sc && prevScroll) sc.scrollTop = prevScroll;
    const scr = screen.firstElementChild;
    if (animate && scr) scr.classList.add("enter");
    const device = $("#device");
    device.classList.toggle("lofi", state.fidelity === "lofi");
    device.classList.toggle("is-scanning", !!state.scanning && state.scanning.phase === "reading");
    device.classList.toggle("is-footscan", state.screen === "footscan" && state.footPhase === "scanning");
    updateLive();
  }

  function renderPresenter() {
    const cur = state.screen;
    const notes = C.notes[cur] || [];
    $("#presenter").innerHTML = `
      <div class="pr-brand">
        ${A.logo("lg")}
        <div><b>${esc(C.meta.title)}</b><span>${esc(C.meta.subtitle)}</span></div>
      </div>
      <div class="pr-badges"><span class="badge">Concept prototype</span><span class="badge ghost">${esc(C.meta.version)}</span></div>

      <section class="pr-sec">
        <h3>Flow <small>click to jump</small></h3>
        <ol class="flow">
          ${SCREENS.map((s, i) => {
            const off = s.module && !on(s.module);
            return `<li><button class="${s.id === cur ? "is-cur" : ""} ${off ? "is-off" : ""}" data-act="jump" data-arg="${s.id}" ${off ? "disabled" : ""}><i>${i + 1}</i>${esc(s.label)}</button></li>`;
          }).join("")}
        </ol>
      </section>

      ${state.notes && notes.length ? `
      <section class="pr-sec notes">
        <h3>Why this screen</h3>
        <ul>${notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
      </section>` : ""}

      <section class="pr-sec">
        <h3>Demo controls</h3>
        <div class="ctl"><span>Delivery</span><div class="pseg">
          ${Object.entries(C.delivery.modes).map(([k, m]) => `<button class="${state.delivery === k ? "is-sel" : ""}" data-act="delivery" data-arg="${k}">${esc(m.short)}</button>`).join("")}
        </div></div>
        <div class="ctl"><span>Clock speed</span><div class="pseg">
          ${C.demo.speeds.map((s) => `<button class="${state.speed === s ? "is-sel" : ""}" data-act="speed" data-arg="${s}">${s}×</button>`).join("")}
        </div></div>
        <div class="ctl"><span>Fidelity</span><div class="pseg">
          <button class="${state.fidelity === "hifi" ? "is-sel" : ""}" data-act="fidelity" data-arg="hifi">Hi-fi</button>
          <button class="${state.fidelity === "lofi" ? "is-sel" : ""}" data-act="fidelity" data-arg="lofi">Wireframe</button>
        </div></div>
        ${toggle("Design notes", "Show the reasoning for each screen", state.notes, "notes")}
        <div class="pr-btns">
          <button class="pbtn" data-act="solo">${icon("expand")}Kiosk only</button>
          <button class="pbtn" data-act="home">${icon("refresh")}Restart flow</button>
        </div>
      </section>

      <section class="pr-sec">
        <h3>Modules <small>switch on or off</small></h3>
        ${Object.entries(C.modules).map(([k, m]) => toggle(m.label, m.desc, on(k), "toggleModule", k)).join("")}
        <button class="pbtn ghost" data-act="resetAll">Reset all settings</button>
      </section>

      <footer class="pr-foot">
        <p>${esc(C.meta.disclaimer)}</p>
        <p class="ai">${icon("sparkle")}${esc(C.meta.aiNote)}</p>
      </footer>`;
  }
  function toggle(label, desc, val, act, arg) {
    return `<button class="ptoggle ${val ? "is-on" : ""}" data-act="${act}" ${arg ? `data-arg="${arg}"` : ""} role="switch" aria-checked="${val}">
      <div><b>${esc(label)}</b><small>${esc(desc)}</small></div><span class="switch"><i></i></span>
    </button>`;
  }

  const seenCards = new Set();
  function renderStaff() {
    const el = $("#staff");
    if (!on("staffQueue")) {
      el.innerHTML = `<div class="staff-off"><b>Staff handheld is off</b><p>Switch on "Staff handheld" under Modules to show the runner's queue.</p></div>`;
      return;
    }
    const active = state.requests.filter((r) => !isArrived(r));
    const done = state.requests.filter((r) => isArrived(r));
    const card = (r) => {
      const p = productBy(r.code), c = colourBy(p, r.colour);
      const st = stagesOf(r), cur = st[r.stageIdx], next = st[r.stageIdx + 1];
      const fresh = !seenCards.has(r.id);
      seenCards.add(r.id);
      return `<li class="sq ${fresh ? "fresh" : ""} ${r.mine ? "mine" : ""} ${isArrived(r) ? "done" : ""}">
        <div class="sq-top"><b>${r.ticket}</b>${r.mine ? `<span class="sq-mine">This kiosk</span>` : ""}<span class="sq-el" data-live-el="${r.id}">${fmtClock(r.elapsed)}</span></div>
        <div class="sq-mid">
          <i class="sq-dot" style="background:${c.upper}"></i>
          <div><b>${esc(p.name)}</b><span>${esc(c.name)}</span></div>
          <div class="sq-sizes">${r.sizes.map((s) => `<em>UK ${s}</em>`).join("")}</div>
        </div>
        <div class="sq-route"><span>${icon("layers")}${r.floor} · Bay ${r.bay}</span>${icon("arrowRight")}<span>${icon("seat")}Point ${r.point}</span></div>
        <div class="sq-bot">
          <span class="sq-stage s${r.stageIdx}">${esc(cur.label)}</span>
          ${state.staffManual && next ? `<button data-act="staffAdvance" data-arg="${r.id}">${esc(cur.staffAction || "Next")}</button>` : ""}
        </div>
      </li>`;
    };
    el.innerHTML = `
      <div class="staff-head"><h2>Staff handheld</h2><p>What a stockroom runner sees as requests come in.</p></div>
      <div class="phone">
        <div class="phone-screen">
          <div class="ph-status"><span>9:41</span><span class="ph-notch"></span><span>${icon("layers")}</span></div>
          <header class="ph-top"><div><b>Runner queue</b><span>${esc(C.store.kioskFloor)} stockroom · ${esc(modeCfg(state.delivery).short)}</span></div><span class="ph-mode ${state.staffManual ? "manual" : ""}">${state.staffManual ? "You" : "Auto"}</span></header>
          <div class="ph-stats">
            <div><b>${active.length}</b><span>In queue</span></div>
            <div><b>${esc(C.store.avgToSeat)}</b><span>Avg to seat</span></div>
            <div><b>${state.served}</b><span>Served today</span></div>
          </div>
          <ul class="ph-list">
            ${active.length ? active.map(card).join("") : `<li class="ph-empty">${icon("check")}Queue clear</li>`}
            ${done.length ? `<li class="ph-sep">Delivered</li>${done.map(card).join("")}` : ""}
          </ul>
        </div>
      </div>
      ${toggle("Role-play mode", "A teammate plays the runner and taps each step; the kiosk waits for them.", state.staffManual, "staffManual")}`;
  }

  function render(animate = true) {
    document.body.classList.toggle("solo", state.solo);
    renderKiosk(animate);
    renderPresenter();
    renderStaff();
    fit();
  }

  /* ---------------- Device scaling ---------------- */
  function fit() {
    const stage = $("#stage"), wrap = $("#deviceWrap"), device = $("#device");
    const W = state.solo ? 540 : 576, H = state.solo ? 960 : 1064;
    const pad = state.solo ? 0 : 28;
    const s = Math.min((stage.clientWidth - pad * 2) / W, (stage.clientHeight - pad * 2) / H, state.solo ? 3 : 1.15);
    device.style.transform = `scale(${s})`;
    wrap.style.width = `${W * s}px`;
    wrap.style.height = `${H * s}px`;
  }

  /* ---------------- Events ---------------- */
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el || el.disabled) return;
    if (el.dataset.act === "noop") { e.stopPropagation(); return; }
    const fn = actions[el.dataset.act];
    if (fn) { e.stopPropagation(); fn(el.dataset.arg, el); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.solo) { state.solo = false; render(false); }
    if (state.keypad) {
      if (/^\d$/.test(e.key)) actions.key(e.key);
      else if (e.key === "Backspace") actions.key("<");
      else if (e.key === "Enter" && state.code.length === 4) actions.keypadGo();
      else if (e.key === "Escape") actions.keypadClose();
    }
  });
  window.addEventListener("resize", fit);
  if (window.ResizeObserver) new ResizeObserver(fit).observe($("#stage"));

  seedRequests();
  render(true);
  setInterval(tick, TICK);
})();
