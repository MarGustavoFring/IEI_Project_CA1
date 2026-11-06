// Dev server, no dependencies: `npm run dev` (or `node Website/serve.js`), then open the URL it prints.
// Reloads the page when a file changes; CSS edits swap in place so the demo keeps its state.
// The site also works by double-clicking index.html.
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const startPort = Number(process.env.PORT) || 5173;
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".md": "text/plain" };

const RELOAD_PATH = "/__reload";
const reloadClient = `<script>
(() => {
  const es = new EventSource("${RELOAD_PATH}");
  es.addEventListener("css", () => document.querySelectorAll('link[rel="stylesheet"]').forEach((l) => {
    if (l.href.startsWith(location.origin)) { const u = new URL(l.href); u.searchParams.set("t", Date.now()); l.href = u.href; }
  }));
  es.addEventListener("reload", () => location.reload());
})();
</script>`;

/* ---------- live reload ---------- */
const clients = new Set();
function broadcast(event) {
  for (const res of clients) res.write(`event: ${event}\ndata: ${Date.now()}\n\n`);
}
let pending = null;
const changed = new Set();
fs.watch(root, { recursive: true }, (_type, file) => {
  if (!file || file.split(path.sep).some((part) => part.startsWith(".") || part === "node_modules")) return;
  changed.add(path.extname(file));
  clearTimeout(pending);
  pending = setTimeout(() => {
    const onlyCss = [...changed].every((ext) => ext === ".css");
    changed.clear();
    broadcast(onlyCss ? "css" : "reload");
    console.log(`  ${onlyCss ? "css updated" : "reloaded"}  ${new Date().toLocaleTimeString()}`);
  }, 80);
});

/* ---------- static files ---------- */
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);

  if (url === RELOAD_PATH) {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive" });
    res.write(": connected\n\n");
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }

  const file = path.join(root, url.endsWith("/") ? url + "index.html" : url);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    const ext = path.extname(file);
    if (ext === ".html") data = data.toString("utf8").replace("</body>", `${reloadClient}\n</body>`);
    res.writeHead(200, { "Content-Type": (types[ext] || "application/octet-stream") + (ext === ".png" || ext === ".jpg" || ext === ".jpeg" || ext === ".webp" ? "" : "; charset=utf-8"), "Cache-Control": "no-store" });
    res.end(data);
  });
});

// If the port is taken (another dev server already running), try the next one.
function listen(port) {
  server.once("error", (err) => {
    if (err.code === "EADDRINUSE" && port < startPort + 10) return listen(port + 1);
    throw err;
  });
  server.listen(port, () => {
    console.log(`\n  Try-On Kiosk prototype\n  ➜  http://localhost:${port}\n\n  Watching for changes. Press Ctrl+C to stop.\n`);
  });
}
listen(startPort);
