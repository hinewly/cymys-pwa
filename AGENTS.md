# cymys-pwa 项目约定

> 叠加在目录级 / Users/zoujiean/CodeX 级约定之上。版本号规则参照 vocab-pwa：
> 改 public/ 下文件必须递增 public/service-worker.js 的 CACHE_VERSION（及前端显示版本）。
> 版本号用递增号（v0.1.0 → v0.1.1），不用 commit sha。

## 技术决策（2026-09-30 与用户确认）

1. **独立仓库**：与 vocab-pwa 完全分开，互不影响
2. **激活码后端**：克隆 daobox-api 为独立 cymys-api Worker + 独立 D1 库，
   不改动 vocab 正在运行的线上系统
3. **前端部署**：倾向 Cloudflare Worker 静态托管（国内访问稳），
   GitHub Pages 作为备用线，最终以用户确认为准
4. **域名体系**：用户自有域名（daobox.app 同一 Cloudflare 账号），
   麻将项目用子域（如 cymys.daobox.app，最终名字用户定）
5. **免费优先**：不依赖微信云函数/任何收费服务；
   视频方案候选：B站内嵌（零成本）或 Cloudflare R2（10GB 免费流量免费）
6. **安全定位**：防君子级别即可，产品定价低，不为小钱建重防线；
   题库是否走"激活后按需拉取"待用户确认

## 数据来源

- 题库：小程序 `data/questions_csv.js`（CSV 内嵌，72 题，CSV 为唯一数据源）
- 麻将牌图片：小程序 `assets/mahjong/`（27 张 JPG，约 416K）
