# cymys-pwa 项目约定

> 给 Codex 的项目规则。版本号规则参照 vocab-pwa：
> 改 public/ 下任何文件必须递增 public/sw.js 的 CACHE_VERSION（及 js/app.js 的 APP_VERSION）。
> 版本号用递增号（v0.3.0 → v0.3.1），不用 commit sha。

## 产品定位（2026-10-01 确立）

**"川麻茶馆"文化平台**，不是刷题工具。五个模块：擂台（拆搭练习，已建成）、
牌经（牌理课堂）、牌谱（牌型图鉴）、书场（视频讲堂）、行话（川麻词典）。
后四个是骨架 + 示例数据，内容由用户逐步提供。
设计决策与理由见 docs/设计决策.md；填内容的方法见 docs/内容填写指南.md。

## 视觉基准（v0.2.x~v0.3.x，用户已认可方向）

- 材质体系：牌桌绿呢 / 象牙白牌面（mix-blend-mode 处理白底 JPG）/ 墨绿导航 / 米金点缀
- 新页面必须沿用：暖色渐变底、卡片投影、SVG 图标（禁 emoji 当图标）
- 硬性要求：答题页一屏呈现（iPad 不滚动）

## 技术栈与结构

- 纯 HTML/CSS/vanilla JS，无框架无构建；public/ 是整站
- 内容数据全部在 public/js/data/（与页面代码分离）
- hash 路由（#/home / #/practice / #/question/... / #/paipu/... 等）

## 发布双线

1. **Cloudflare（主）**：cymys.daobox.app，`cd worker && npx wrangler deploy`
2. **GitHub Pages（备）**：push main 自动部署
   （注意 workflow 里文件路径是 sw.js / js/app.js，与 vocab 不同）

## 已知待办

- [ ] cymys-api 激活码后端（克隆 daobox-api，独立 D1）
- [ ] 激活页接后端（现在是占位）
- [ ] 书场视频播放页（url 字段已预留）
- [ ] 内容填充（牌谱/牌经/行话，用户提供素材）
