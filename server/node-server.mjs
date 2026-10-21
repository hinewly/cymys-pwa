// cymys-pwa 国内站 Node 服务器：
// - 静态站点托管（wrangler assets 行为复刻）；worker 仅 /api 健康检查，无数据库依赖
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import worker from "../worker/src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const PORT = parseInt(process.env.PORT || "8791", 10);
const HOST = process.env.HOST || "127.0.0.1";

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webp": "image/webp",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8", ".xml": "application/xml; charset=utf-8",
};

function serveStatic(pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === "/" || rel === "") rel = "/index.html";
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR)) return null;

  let target = file;
  if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    const idx = path.join(target, "index.html");
    if (fs.existsSync(idx)) target = idx; else return null;
  }
  const ext = path.extname(target).toLowerCase();
  return { status: 200, body: fs.readFileSync(target), type: MIME[ext] || "application/octet-stream" };
}

function webRequestFromNode(req, bodyBuf) {
  const proto = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers.host || "localhost";
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) v.forEach((x) => headers.append(k, x));
    else if (v != null) headers.append(k, v);
  }
  return new Request(`${proto}://${host}${req.url}`, {
    method: req.method, headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : bodyBuf, duplex: "half",
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" || req.method === "HEAD") {
      const staticRes = serveStatic(new URL(req.url, "http://localhost").pathname);
      if (staticRes) {
        res.writeHead(staticRes.status, { "Content-Type": staticRes.type, "Cache-Control": "public, max-age=300" });
        res.end(staticRes.body);
        return;
      }
    }
    const response = await worker.fetch(webRequestFromNode(req, Buffer.concat(await (async () => { const c = []; for await (const x of req) c.push(x); return c; })()), null), {}, { waitUntil: () => {} });
    const buf = response.body ? Buffer.from(await response.arrayBuffer()) : null;
    res.writeHead(response.status, Object.fromEntries([...response.headers]));
    res.end(buf);
  } catch (err) {
    console.error("[cymys-pwa] request error:", err);
    if (!res.headersSent) res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false, error: "internal error" }));
  }
});

server.listen(PORT, HOST, () => console.log(`[cymys-pwa] listening on ${HOST}:${PORT}`));
