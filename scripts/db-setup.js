// One-time Supabase setup: `npm run db:setup` (add `-- --reset-stock` to overwrite stock with config.js).
// 1. applies supabase/schema.sql  2. creates/updates the admin account  3. seeds stock from config.js.
// Reads secrets from .env (never committed).
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const root = path.join(__dirname, "..");
process.loadEnvFile(path.join(root, ".env"));
const env = process.env;
for (const k of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "POSTGRES_URL_NON_POOLING", "ADMIN_EMAIL", "ADMIN_PASSWORD"]) {
  if (!env[k]) { console.error(`Missing ${k} in .env (see .env.example)`); process.exit(1); }
}
const resetStock = process.argv.includes("--reset-stock");

// Load the product catalogue the website uses.
global.window = {};
require(path.join(root, "Website/js/config.js"));
const C = global.window.KIOSK_CONFIG;

async function adminApi(method, url, body) {
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/admin${url}`, {
    method,
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
    body: body && JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

(async () => {
  const connectionString = env.POSTGRES_URL_NON_POOLING.replace(/[?&]sslmode=[^&]*/, "");
  const db = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await db.connect();
  try {
    console.log("1/3  Applying schema…");
    await db.query(fs.readFileSync(path.join(root, "supabase/schema.sql"), "utf8"));

    console.log("2/3  Admin account…");
    const { rows: found } = await db.query("select id from auth.users where lower(email) = lower($1)", [env.ADMIN_EMAIL]);
    let adminId = found[0] && found[0].id;
    if (adminId) {
      const r = await adminApi("PUT", `/users/${adminId}`, { password: env.ADMIN_PASSWORD, email_confirm: true });
      if (!r.ok) throw new Error(`Updating admin failed (${r.status}): ${JSON.stringify(r.json)}`);
    } else {
      const r = await adminApi("POST", "/users", {
        email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD, email_confirm: true, user_metadata: { name: "Store admin" },
      });
      if (!r.ok) throw new Error(`Creating admin failed (${r.status}): ${JSON.stringify(r.json)}`);
      adminId = r.json.id;
    }
    await db.query(
      `insert into public.profiles (id, name, role) values ($1, 'Store admin', 'admin')
       on conflict (id) do update set role = 'admin'`,
      [adminId],
    );
    console.log(`     ${env.ADMIN_EMAIL} is an admin.`);

    console.log(`3/3  ${resetStock ? "Resetting" : "Seeding"} stock…`);
    const floors = Object.keys(C.store.floors);
    const values = [];
    const params = [];
    C.products.forEach((p) => p.colours.forEach((c) => floors.forEach((f) => C.sizeRuns[p.sizeRun].sizes.forEach((uk, i) => {
      params.push(p.code, c.id, f, uk, ((c.stock || {})[f] || [])[i] || 0);
      const n = params.length;
      values.push(`($${n - 4}, $${n - 3}, $${n - 2}, $${n - 1}, $${n})`);
    }))));
    const res = await db.query(
      `insert into public.stock (product_code, colour_id, floor, size, qty) values ${values.join(",")}
       on conflict (product_code, colour_id, floor, size) do ${resetStock ? "update set qty = excluded.qty" : "nothing"}`,
      params,
    );
    console.log(`     ${res.rowCount} of ${values.length} rows written${resetStock ? "" : " (existing rows kept)"}.`);
    console.log("\nDone. Run `npm run dev` and sign in with the admin details in .env.");
  } finally {
    await db.end();
  }
})().catch((err) => { console.error("\nSetup failed:", err.message); process.exit(1); });
