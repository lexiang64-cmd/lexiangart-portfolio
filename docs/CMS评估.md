# 可视化 CMS 评估（2026-11-14）

建议先使用本次“照片文件夹 + 中文说明 + Codex”的流程。它没有新增 CMS 订阅或账号，既有 GitHub/Vercel 配额与现有 AI 使用费用照常。等确定需要独立通过网页经常更新，再评估 Decap CMS 小规模接入。

| 方案 | 新增服务与成本 | 优点 | 代价和适配程度 |
| --- | --- | --- | --- |
| 当前 JSON + Codex | 不新增 CMS 服务；继续使用既有服务配额 | 改动最小、可回滚、预览后审核 | 仍需 Codex 处理更新，非独立网页后台 |
| Decap CMS | 开源编辑器；GitHub OAuth App 与 OAuth 服务（可放 Vercel serverless，是否零费用取决于现有计划和用量） | 可表单编辑数据、上传图片、保留 Git 历史，最接近当前静态架构 | 需要维护登录服务、权限、字段配置与草稿/预览流程；大量照片会增大 Git 仓库；不能将 CMS 发布按钮直接当作用户批准合并 |
| Keystatic | GitHub 模式或可选 Keystatic Cloud；免费层/付费升级须按开通时官方方案核实 | 类型化表单、图片字段、Git 数据 | 官方提供 Astro/Next.js/Remix 集成，对本项目需另加后台运行层；一次性改动比 Decap 多 |
| Sanity | 新 Sanity 项目、Studio、内容数据库、Vercel 构建 webhook；官方 Free 为 $0，Growth 为 $15/席位/月，超量按方案 | 图片管理与多人编辑成熟，适合长期大图库 | 内容从 Git 移到外部服务，需要数据读取、迁移和备份；本轮需求下偏重 |

成本判断是估算，不保证已有 Vercel/GitHub 套餐可满足所有未来流量。没有开通账号、迁移内容或收费服务。后续建议先用少量测试数据验证“保存草稿 → Preview → 用户批准 → 正式发布”全流程，再决定是否启用。

官方资料：
- Decap GitHub 与 OAuth：https://decapcms.org/docs/github-backend/ 、https://decapcms.org/docs/backends-overview/
- Keystatic Cloud：https://keystatic.com/docs/cloud
- Sanity 价格：https://www.sanity.io/pricing
