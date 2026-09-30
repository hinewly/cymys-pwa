# cymys-pwa — 川渝麻研社（麻将拆搭练习）PWA

由微信小程序（/Users/zoujiean/CodeBuddy/cymys）迁移而来的 PWA 版本。

## 项目结构

```
├── public/               # 前端静态站（小程序改造而来）
├── worker/               # 激活码后端（Cloudflare Workers + D1）
├── .github/workflows/    # GitHub Pages 自动部署（备用）
└── docs/                 # 方案与迁移文档
```

## 状态

- [ ] 目录骨架（本次）
- [ ] 小程序页面迁移（wx.* → Web）
- [ ] 激活码后端（克隆 daobox-api 改造）
- [ ] 部署上线

## 参考项目

- 原小程序：`/Users/zoujiean/CodeBuddy/cymys`
- 同体系成熟项目（激活码/部署体系来源）：`/Users/zoujiean/CodeX/vocab-pwa`
