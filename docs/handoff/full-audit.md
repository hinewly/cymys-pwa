# cymys-pwa full 体检打磨清单

- last_updated: 2026-10-04 19:10
- status: active
- version: v0.5.8

## 任务目标

对 cymys-pwa 做一次全面体检，产出打磨清单，等用户勾选后逐项实施。

## 当前状态

体检已完成，清单见下方，等用户勾选。**尚未动任何代码。**

## 体检结果（v0.5.8，git clean，与远端一致）

### A. 过时 UI（激活体系退役后遗留）

| # | 问题 | 位置 | 建议 |
|---|---|---|---|
| A1 | 「我的」页显示「已激活」+「管理激活」按钮，点击进入「即将开放」占位页——用户会困惑 | renderProfile + renderActivatePlaceholder（app.js） | 改成 DaoBox 登录/注册入口 + 显示剩余配额 |
| A2 | 答题页免费额度拦截弹窗（"免费额度已用完"→"输入注册码激活"）——永远不会触发（isActivated 永远 true），真正的限额已由 DaoBox.consume 接管 | renderQuestion | 删掉死代码 |
| A3 | 练习页 freeTip 死代码——`activated ? '' : ...` 永远空串 | renderPractice | 删掉 |

### B. 2026-10-04 战略对齐（HANDOFF 定调）

| # | 问题 | 建议 |
|---|---|---|
| B1 | 合规免责缺失——HANDOFF 明确「麻将全免费，只做流量和合规免责」，但麻将站目前无任何免责声明 | 参照彩票站三处免责（顶部/结果区/页脚），加「娱乐用途 / 理性游戏 / 未满18周岁不建议」 |
| B2 | 「我的」页没有登录入口——portal.js 已加载但 profile 页完全没接，用户看不到登录状态、剩余配额 | 用 portal.js 的 DaoBox 对象，展示登录/注册/剩余次数 |
| B3 | 无反馈邮箱入口——全局规则要求所有项目 footer 加 hinewly@163.com（JS 拼接防 obfuscate） | 加到底部或「我的」页 |

### C. 内容骨架完善

| # | 问题 | 现状 | 建议 |
|---|---|---|---|
| C1 | 书场只有列表没有播放页——videos.js 已留 url 字段，但点击无反应 | 2 条待录 | 先建播放页骨架（url 有值就能播） |
| C2 | 牌谱只有 11 条——content/paipu/_drafts/extracted/ 里有 57 张图待整理 | 11/57 | 需用户提供整理好的素材 |
| C3 | 牌经只有 10 课、行话 45 条 | — | 内容等用户提供，不动 |

### D. 体验打磨（跨项目借鉴 vocab）

| # | 问题 | 建议 |
|---|---|---|
| D1 | 手机端底部 tab 只显示 3 个（茶馆/拆搭/我的），牌经/牌谱/书场/行话被 `display:none` 隐藏——手机用户只能从茶馆 hub 卡片进去 | 手机端 tab 改成可滑动或收进「更多」 |
| D2 | 无版本徽章+刷新按钮——vocab 有、cymys 没有（跨项目借鉴规则） | tab 栏 brand 旁加版本号+刷新 |
| D3 | style.css 有重复的 .option-btn width 规则（写了两遍 clamp） | 合并 |

### E. 代码卫生（不影响用户）

| # | 问题 | 建议 |
|---|---|---|
| E1 | worker/README.md 还写着「后续激活码 API」——已过时 | 更新 |
| E2 | FREE_LIMIT / ACTIVATED / locked 等死变量遍布 app.js | 一次性清理 |
| E3 | manifest start_url 是 `./index.html`——可改成 `./` 更干净 | 改 |

## 建议优先级

**A1 + B1 + B2 + B3** 优先（用户能直接感知），C1 看用户意愿，D/E 类看用户勾选。

## 注意事项

- 改 public/ 下任何文件必须递增 sw.js CACHE_VERSION 及 js/app.js APP_VERSION（AGENTS.md 规定）
- 改完 `cd worker && npx wrangler deploy`（Cloudflare 是主通道，GitHub Pages 只是镜像）
- 不要碰 lottery-pwa / vocab-pwa / daobox-home 的文件
- 免责声明文案参照 lottery-pwa 的格式（顶部 header + 结果区 + 页脚三处）

## 相关文件

- `public/js/app.js` — 主应用（A1/A2/A3/B2 都在这里）
- `public/style.css` — 样式（B1/D3）
- `public/index.html` — 页面骨架（B1/B3/D2）
- `public/sw.js` — 版本号 bump
- `worker/README.md` — E1
- `public/manifest.json` — E3
