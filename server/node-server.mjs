// cymys-pwa 国内站 Node 服务器：
// - 静态站点托管（wrangler assets 行为复刻）；worker 仅 /api 健康检查，无数据库依赖
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
    // 与 worker 行为一致：/api/* 返回 404 JSON，其余未匹配路径 404（cymys worker 无后端逻辑）
    const pathname = new URL(req.url, "http://localhost").pathname;
    if (pathname.startsWith("/api/")) {
      res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: "API 未部署" }));
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  } catch (err) {
    console.error("[cymys-pwa] request error:", err);
    if (!res.headersSent) res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false, error: "internal error" }));
  }
});

server.listen(PORT, HOST, () => console.log(`[cymys-pwa] listening on ${HOST}:${PORT}`));
