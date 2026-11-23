# cymys-pwa 国内化部署（cymys.daobox.net.cn）交接

- last_updated: 2026-10-21 12:40
- status: done
- version: v0.6.7

## 任务目标
川麻茶馆国内版部署到 cymys.daobox.net.cn，海外版不动。

## 当前状态
✅ 已上线（2026-10-21）。前端 DB_HOME 动态适配（portal.js/返回链接/登录兜底），SW bump v0.6.7。server/ 纯静态 Node 适配器（8791，/api/* 返回 404 JSON 与 worker 行为一致；cymys worker 的 fetch(request) 是 CF assets 转发语义，Node 里不能直接调）。public/js/data 已同步。

## 注意事项
- 改 public/ 必须 bump public/sw.js CACHE_VERSION
