# Leo Xiang Art 长期维护规范

- 保留静态 HTML/CSS/JS、导航、视觉风格、Vercel dist 构建与既有 GA4 `G-PZF723HJCJ`；不重复插入统计标签。
- 所有内容更新使用 content/events.json、photography.json、art.json；HTML 中 CONTENT 标记为构建槽，不粘贴重复卡片。生成结果在 dist，勿手改。
- 原图放 incoming/events、photography、art，仅保留本机并由 Git 忽略；不得 git add -f 原图。先运行 npm run prepare-content（npm run build 也会自动运行），将原图转为去 EXIF、最长边 1600 的网页 WebP，写入 assets/uploads 并自动将 content/*.json 的图片引用改为该路径。必须将 content/*.json 和 assets/uploads 一起提交；Vercel 从这些已提交网页图生成展示版本，不依赖 incoming 或本机 dist。禁止提交密码、token、私钥、未获许可照片。不得放大原图。
- 英文文案简洁、自然、准确；中文说明先整理成英文草稿。未知日期、地点、路线、人数、学名等留空，人数未知用 null。不得编造活动或推测物种；确认鸟名后才可写 englishName/scientificName/species，并设 speciesConfirmed:true。沿用旧作品标题并不表示照片物种已被确认。
- id 唯一、小写字母数字和连字符。日期用 YYYY-MM-DD；updatedAt 是真实内容新增/修改日期，不以迁移日伪装旧作品的新增时间。
- published:false 是草稿；只有准备公开的内容设 true。published 代表进入预览内容，并不代表允许发布正式站。
- 每条艺术作品可用 links 数组存 Redbubble/Etsy HTTPS 链接，空数组表示无商品链接。不得抓取或展示实时价格、折扣。
- 先在开发分支工作。运行 npm ci（首次或依赖变更）、npm run build、npm run check，并检查桌面与手机宽度、键盘放大/关闭、筛选、图片、SEO、锚点和内部链接。新增数据须验证空字段、草稿不展示、鸟种确认和链接白名单。
- 仅部署 Vercel Preview，检查其对应提交。未经用户明确批准不得合并 main、push main、使用 --prod、变更正式域名或开通付费服务。
- 如果 GitHub/Vercel 认证不可用，明确说明，不编造预览地址或声称已经部署。

- 当前 website 是旧目录的独立 Git 副本，两者连接同一个 origin（lexiang64-cmd/lexiangart-portfolio），不会自动同步本地文件。以后统一在当前目录维护；每轮从最新远端 main 整合新分支，不能用旧目录覆盖新内容。当前基础升级尚未获准合并 main 时，后续预览先基于本开发分支；正式发布需用户明确批准。
