/*
 * Generated artwork: placeholder shoes, simulated QR tags, foot outline,
 * floor map, shoebox and icons. All original SVG — no product photos or logos.
 */
window.KioskArt = (() => {
  let uid = 0;

  /* ---------- Shoe (side profile, toe to the right) ---------- */
  // Lighten (amt > 0) or darken (amt < 0) a hex colour.
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const mix = (v) => Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt);
    const r = mix(n >> 16), g = mix((n >> 8) & 255), b = mix(n & 255);
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
  }

  // One silhouette, three constructions. Every part takes its colour from the colourway.
  const LACE = [[186, 66], [232, 70], [294, 90], [338, 112]]; // the lace line, as a cubic Bézier
  const UPPER = "M40 150 C30 126 30 98 44 76 C50 66 60 60 74 61 C90 62 104 74 124 80 C140 84 160 82 176 72 L186 66 C232 70 294 90 338 112 C372 118 398 127 406 140 C409 145 409 149 406 151 L40 151 Z";
  const bez = (t) => [0, 1].map((k) => {
    const [a, b, c, d] = LACE.map((p) => p[k]), u = 1 - t;
    return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
  });
  const VARIANTS = {
    runner: { mesh: true, perf: false, bumper: false, lugs: false,
      mid: "M36 146 C30 160 32 178 50 186 L300 188 C354 188 398 178 414 157 C417 151 413 146 404 146 Z",
      out: "M50 186 C58 193 74 197 96 197 L300 197 C356 197 400 184 414 158 L413 156 C396 180 352 189 300 189 L96 189 C76 189 60 188 50 186 Z",
      groove: "M54 172 C140 181 250 179 330 175 C366 173 392 165 405 157" },
    court: { mesh: false, perf: true, bumper: false, lugs: false,
      mid: "M34 145 L408 148 C413 158 413 176 401 184 L48 184 C34 182 30 165 34 145 Z",
      out: "M48 184 L401 184 C399 190 393 195 384 195 L60 195 C52 195 48 191 48 184 Z",
      groove: "M44 164 L402 167", stitch: true },
    trail: { mesh: true, perf: false, bumper: true, lugs: true,
      mid: "M36 146 C30 158 32 174 48 182 L300 184 C354 184 398 174 414 155 C417 150 413 146 404 146 Z",
      out: "M48 182 C56 189 72 192 94 192 L300 192 C356 192 400 180 414 156 L413 154 C396 176 352 185 300 185 L94 185 C74 185 58 184 48 182 Z",
      groove: "M44 166 L74 158 L104 168 L134 158 L164 168 L194 158 L224 168 L254 158 L284 168 L314 158 L344 166 L384 158" },
  };

  function shoe(c, variant = "runner", { cls = "" } = {}) {
    const v = VARIANTS[variant] || VARIANTS.runner;
    const id = `sh${++uid}`;
    const ink = "rgba(0,0,0,.28)";
    const stitchCol = shade(c.overlay, -0.35);

    const lacePts = [0.07, 0.21, 0.35, 0.49, 0.63, 0.77].map((t) => { const [x, y] = bez(t); return [x + 2, y + 6]; });
    const laces = lacePts.map(([x, y]) => `
      <circle cx="${x + 11}" cy="${y + 7}" r="2.6" fill="${shade(c.overlay, -0.45)}"/>
      <path d="M${x - 8} ${y + 7} L${x + 9} ${y - 9}" stroke="${shade(c.laces, -0.25)}" stroke-width="7" stroke-linecap="round"/>
      <path d="M${x - 8} ${y + 7} L${x + 9} ${y - 9}" stroke="${c.laces}" stroke-width="5" stroke-linecap="round"/>`).join("");

    const perf = [];
    if (v.perf) for (let r = 0; r < 3; r++) for (let k = 0; k < 4 - (r === 0 ? 1 : 0); k++) perf.push(`<circle cx="${350 + k * 11 + r * 6 + (r === 0 ? 8 : 0)}" cy="${126 + r * 6.5}" r="1.6" fill="${ink}"/>`);

    const lugs = v.lugs ? [...Array(16)].map((_, i) => {
      const x = 56 + i * 22, lift = i > 12 ? (i - 12) * 2.6 : 0;
      return `<path d="M${x} ${191 - lift} L${x + 14} ${191 - lift} L${x + 12} ${200 - lift} L${x + 2} ${200 - lift} Z" fill="${c.outsole}"/>`;
    }).join("") : "";

    return `<svg class="shoe ${cls}" viewBox="0 0 440 230" role="img" aria-label="Placeholder shoe illustration">
      <defs>
        <linearGradient id="${id}u" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fff" stop-opacity=".26"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/>
        </linearGradient>
        <linearGradient id="${id}h" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset=".22" stop-color="#000" stop-opacity="0"/><stop offset=".85" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".12"/>
        </linearGradient>
        <linearGradient id="${id}m" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${shade(c.sole, 0.35)}"/><stop offset=".6" stop-color="${c.sole}"/><stop offset="1" stop-color="${shade(c.sole, -0.14)}"/>
        </linearGradient>
        <pattern id="${id}p" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <circle cx="2.5" cy="2.5" r="1" fill="#000" fill-opacity=".13"/>
        </pattern>
        <radialGradient id="${id}s" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".5"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
        <clipPath id="${id}c"><path d="${UPPER}"/></clipPath>
      </defs>
      <ellipse class="shoe-shadow" cx="226" cy="204" rx="196" ry="11" fill="url(#${id}s)"/>

      <!-- tongue -->
      <path d="M170 76 C172 58 180 43 195 38 C208 34 220 39 222 50 L216 88 Z" fill="${shade(c.overlay, -0.06)}"/>
      <path d="M180 60 C186 48 196 42 208 42" fill="none" stroke="${stitchCol}" stroke-width="1.4" stroke-dasharray="3 3" opacity=".7"/>
      <rect x="196" y="44" width="16" height="9" rx="2" transform="rotate(-12 204 48)" fill="${c.accent}"/>

      <!-- upper -->
      <path class="s-upper" d="${UPPER}" fill="${c.upper}"/>
      <g clip-path="url(#${id}c)">
        ${v.mesh ? `<rect class="fx" x="0" y="0" width="440" height="160" fill="url(#${id}p)"/>` : ""}
        <!-- midfoot saddle (tonal) -->
        <path d="M156 152 C166 122 180 96 196 74 L242 80 C226 104 214 130 210 152 Z" fill="${shade(c.upper, -0.14)}"/>
        <path d="M161 150 C171 122 184 98 199 78" fill="none" stroke="${c.accent}" stroke-width="4" stroke-linecap="round"/>
        <path d="M206 150 C210 128 220 108 236 88" fill="none" stroke="${stitchCol}" stroke-width="1.4" stroke-dasharray="3 3"/>
        <!-- foxing line -->
        <path d="M92 146 L320 146" stroke="${shade(c.upper, -0.25)}" stroke-width="2" opacity=".6"/>
        <!-- heel counter -->
        <path d="M30 152 C26 124 30 96 44 76 C50 68 56 64 62 63 C60 92 68 124 92 152 Z" fill="${c.overlay}"/>
        <path d="M67 68 C66 94 73 124 94 148" fill="none" stroke="${stitchCol}" stroke-width="1.4" stroke-dasharray="3 3"/>
        <!-- toe cap -->
        <path d="M330 152 C328 136 340 126 362 124 C386 126 402 134 412 152 Z" fill="${c.overlay}"/>
        <path d="M336 150 C334 138 344 130 362 129" fill="none" stroke="${stitchCol}" stroke-width="1.4" stroke-dasharray="3 3"/>
        ${perf.join("")}
        <path class="fx" d="${UPPER}" fill="url(#${id}u)"/>
        <path class="fx" d="${UPPER}" fill="url(#${id}h)"/>
      </g>
      ${v.bumper ? `<path d="M352 152 C364 140 392 136 412 149 L412 153 Z" fill="${c.outsole}"/>` : ""}

      <!-- collar lining + padding -->
      <path d="M74 61 C90 62 104 74 124 80 C140 84 160 82 176 72 L172 66 C158 75 140 77 124 73 C106 68 92 57 78 55 Z" fill="${c.lining}"/>
      <path d="M74 62 C90 63 104 75 124 81 C140 85 160 83 176 73" fill="none" stroke="${shade(c.upper, 0.25)}" stroke-width="3" stroke-linecap="round" opacity=".55"/>

      <!-- eyestay + laces -->
      <path d="M186 66 C232 70 294 90 338 112 L333 125 C290 104 230 85 180 83 Z" fill="${shade(c.overlay, -0.04)}"/>
      <path d="M182 83 C230 87 290 106 333 127" fill="none" stroke="${stitchCol}" stroke-width="1.4" stroke-dasharray="3 3"/>
      ${laces}

      <!-- side mark + heel loop (generic, not any brand's logo) -->
      <circle cx="50" cy="118" r="5.5" fill="none" stroke="${c.accent}" stroke-width="2.8"/>
      <path d="M48 74 C40 62 42 50 50 47 C58 45 62 54 60 66" fill="none" stroke="${c.accent}" stroke-width="5" stroke-linecap="round"/>

      <!-- sole unit -->
      ${lugs}
      <path class="s-outsole" d="${v.out}" fill="${c.outsole}"/>
      <path class="s-mid" d="${v.mid}" fill="url(#${id}m)"/>
      <path d="${v.groove}" fill="none" stroke="${shade(c.sole, -0.2)}" stroke-width="${v.stitch ? 1.6 : 2.4}" ${v.stitch ? 'stroke-dasharray="5 4"' : ""} stroke-linecap="round" stroke-linejoin="round"/>
      <path class="fx" d="M38 148 L406 149" stroke="#000" stroke-opacity=".22" stroke-width="2.5"/>
      <path class="fx" d="${v.mid}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.2" stroke-dasharray="0 0"/>
    </svg>`;
  }

  /* ---------- Simulated QR code (deterministic pattern, not scannable) ---------- */
  function hash(str) {
    let h = 2166136261;
    for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function qr(text, { cls = "" } = {}) {
    const N = 25, rand = rng(hash(text));
    const on = Array.from({ length: N }, () => Array(N).fill(false));
    const reserved = Array.from({ length: N }, () => Array(N).fill(false));
    const finder = (ox, oy) => {
      for (let y = -1; y <= 7; y++) for (let x = -1; x <= 7; x++) {
        const X = ox + x, Y = oy + y;
        if (X < 0 || Y < 0 || X >= N || Y >= N) continue;
        reserved[Y][X] = true;
        const ring = x === 0 || x === 6 || y === 0 || y === 6;
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        on[Y][X] = x >= 0 && x <= 6 && y >= 0 && y <= 6 && (ring || core);
      }
    };
    finder(0, 0); finder(N - 7, 0); finder(0, N - 7);
    for (let i = 8; i < N - 8; i++) { on[6][i] = on[i][6] = i % 2 === 0; reserved[6][i] = reserved[i][6] = true; }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!reserved[y][x]) on[y][x] = rand() > 0.52;
    let d = "";
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (on[y][x]) d += `M${x} ${y}h1v1h-1z`;
    return `<svg class="qr ${cls}" viewBox="-2 -2 ${N + 4} ${N + 4}" shape-rendering="crispEdges" aria-hidden="true"><rect x="-2" y="-2" width="${N + 4}" height="${N + 4}" rx="2" class="qr-bg"/><path d="${d}" class="qr-fg"/></svg>`;
  }

  /* ---------- Foot outline (top view) ---------- */
  function foot({ cls = "", mirror = false } = {}) {
    const body = "M100 388 C70 388 60 362 62 328 C64 298 72 272 70 242 C68 206 50 182 48 142 C46 102 56 72 78 62 C102 52 142 58 157 78 C167 92 163 132 159 172 C155 232 151 292 149 332 C147 372 128 388 100 388 Z";
    const toes = [[80, 34, 16, 22], [111, 30, 9.5, 13], [130, 38, 8.5, 12], [145, 51, 7.5, 10.5], [157, 66, 6.5, 9]];
    return `<svg class="foot ${cls}" viewBox="0 0 210 400" aria-hidden="true" ${mirror ? 'style="transform:scaleX(-1)"' : ""}>
      <path class="foot-body" d="${body}"/>
      ${toes.map(([x, y, rx, ry]) => `<ellipse class="foot-toe" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>`).join("")}
    </svg>`;
  }

  /* ---------- Store floor schematic (not the real layout) ---------- */
  const POINT_X = (n) => 196 + (n - 1) * 44;
  function floorMap({ point = 4, mode = "conveyor", points = [] } = {}) {
    const px = POINT_X(point);
    const route = mode === "conveyor"
      ? `M118 58 H${px} V104`
      : `M118 84 C150 130 ${px - 60} 150 ${px} 128`;
    return `<svg class="floormap" viewBox="0 0 480 214" aria-label="Simplified floor map showing the stockroom, your try-on point and the kiosk">
      <defs>
        <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" class="fm-hatch"/></pattern>
      </defs>
      <rect x="6" y="6" width="468" height="202" rx="16" class="fm-floor"/>
      <rect x="6" y="6" width="118" height="92" rx="16" class="fm-stock"/>
      <rect x="6" y="6" width="118" height="92" rx="16" fill="url(#hatch)"/>
      <text x="22" y="34" class="fm-label strong">Stockroom</text>
      <text x="22" y="50" class="fm-label">Back of house</text>
      <rect x="146" y="16" width="316" height="12" rx="6" class="fm-wall"/>
      <text x="146" y="44" class="fm-label">Footwear wall</text>
      <rect x="388" y="150" width="74" height="46" rx="8" class="fm-esc"/>
      <text x="425" y="178" text-anchor="middle" class="fm-label">Escalator</text>
      <path d="${route}" class="fm-route fm-route-${mode}" id="fm-route"/>
      ${[1, 2, 3, 4, 5, 6].map((n) => {
        const p = points.find((q) => q.n === n) || {};
        const sel = n === point;
        return `<g class="fm-point ${sel ? "is-sel" : ""} ${p.busy && !sel ? "is-busy" : ""}">
          ${sel ? `<circle cx="${POINT_X(n)}" cy="118" r="22" class="fm-pulse"/>` : ""}
          <rect x="${POINT_X(n) - 15}" y="103" width="30" height="30" rx="9"/>
          <text x="${POINT_X(n)}" y="123" text-anchor="middle">${n}</text>
        </g>`;
      }).join("")}
      <text x="196" y="156" class="fm-label">Try-on points</text>
      <g class="fm-you" transform="translate(84 168)">
        <circle r="15" class="fm-you-ring"/><circle r="6" class="fm-you-dot"/>
        <text x="24" y="5" class="fm-label strong">You are here</text>
      </g>
      <g id="fm-box" class="fm-box" transform="translate(118 58)"><rect x="-11" y="-8" width="22" height="16" rx="3"/><path d="M-11 -2 H11" /></g>
    </svg>`;
  }

  /* ---------- Shoebox ---------- */
  function box({ label = "", sub = "" } = {}) {
    return `<svg class="box" viewBox="0 0 300 220" aria-hidden="true">
      <ellipse cx="150" cy="200" rx="122" ry="12" class="box-shadow"/>
      <path d="M40 86 L150 116 L150 196 L40 166 Z" class="box-front"/>
      <path d="M150 116 L262 92 L262 172 L150 196 Z" class="box-side"/>
      <g class="box-lid">
        <path d="M30 76 L150 108 L272 82 L152 54 Z" class="box-top"/>
        <path d="M30 76 L150 108 L150 124 L30 92 Z" class="box-lid-front"/>
        <path d="M150 108 L272 82 L272 98 L150 124 Z" class="box-lid-side"/>
        <path d="M58 70 L178 100" class="box-stripe"/>
      </g>
      <g transform="matrix(1 .27 0 1 58 128)">
        <rect width="78" height="40" rx="4" class="box-label"/>
        <text x="8" y="17" class="box-label-t">${label}</text>
        <text x="8" y="31" class="box-label-s">${sub}</text>
      </g>
    </svg>`;
  }

  /* ---------- Brand mark (generic, original) ---------- */
  function logo(cls = "") {
    return `<svg class="logo ${cls}" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="12" class="logo-bg"/><path d="M11 25.5c4.5 1 9.5 1 14-.5l4-1.6M15 15h10M20 15v11" class="logo-fg"/></svg>`;
  }

  /* ---------- Icons (24px, stroke = currentColor) ---------- */
  const I = {
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    arrowDown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    scan: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M4 12h16"/>',
    foot: '<path d="M8.5 21c-2 0-3-1.6-2.7-3.8.3-2-.6-3.6-.8-5.7C4.7 8.4 6 6 8.8 6c2.6 0 3.6 2 3.4 4.7-.2 2.4-.9 4-1 6.3-.1 2.3-.7 4-2.7 4z"/><circle cx="14.5" cy="4.8" r="1.4"/><circle cx="17.4" cy="6.4" r="1.1"/><circle cx="19.1" cy="8.9" r="1"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    pin: '<path d="M12 21s-6.5-5.8-6.5-11a6.5 6.5 0 0 1 13 0c0 5.2-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    box: '<path d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4z"/><path d="M3.5 7.5 12 11.5l8.5-4M12 11.5v9"/>',
    seat: '<path d="M7 4h10v7H7zM5 11h14v3H5zM7 14v6M17 14v6"/>',
    refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.4"/>',
    keypad: '<circle cx="6" cy="6" r="1.2"/><circle cx="12" cy="6" r="1.2"/><circle cx="18" cy="6" r="1.2"/><circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/><circle cx="6" cy="18" r="1.2"/><circle cx="12" cy="18" r="1.2"/><circle cx="18" cy="18" r="1.2"/>',
    sparkle: '<path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z"/><path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
    layers: '<path d="M12 4 3 8.5l9 4.5 9-4.5z"/><path d="M3 12.5l9 4.5 9-4.5M3 16.5l9 4.5 9-4.5"/>',
    backspace: '<path d="M9 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6-7z"/><path d="M12 9.5l5 5M17 9.5l-5 5"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>',
    conveyor: '<rect x="3" y="13" width="18" height="5" rx="2.5"/><circle cx="7" cy="15.5" r=".9"/><circle cx="12" cy="15.5" r=".9"/><circle cx="17" cy="15.5" r=".9"/><path d="M8 13V8h8v5"/>',
    tag: '<path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1 1 0 0 1 0 1.4l-7.3 7.3a1 1 0 0 1-1.4 0z"/><circle cx="8" cy="8" r="1.5"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    shield: '<path d="M12 3.5 5 6v5.5c0 4.3 3 7.6 7 9 4-1.4 7-4.7 7-9V6z"/><path d="M9 12l2 2 4-4"/>',
    card: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/>',
  };
  function icon(name, cls = "") {
    return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[name] || ""}</svg>`;
  }

  return { shoe, shade, qr, foot, floorMap, box, logo, icon, hash };
})();
