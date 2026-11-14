# Leo Xiang Art 长期维护规范

- 保留静态 HTML/CSS/JS、导航、视觉风格、Vercel dist 构建与既有 GA4 `G-PZF723HJCJ`；不重复插入统计标签。
- 所有内容更新使用 content/events.json、photography.json、art.json；HTML 中 CONTENT 标记为构建槽，不粘贴重复卡片。生成结果在 dist，勿手改。
- 原图放 incoming/events、photography、art，仅保留本机并由 Git 忽略；不得 git add -f 原图。仅按用户明确指定的一个子文件夹运行 npm run prepare-content -- --folder incoming/分类/子文件夹（npm run build 不带文件夹时只允许已准备好的内容），将原图转为去 EXIF、最长边 1600 的网页 WebP，写入 assets/uploads 并自动将 content/*.json 的图片引用改为该路径。必须将内容数据、content/media-registry.json 和 assets/uploads 一起提交；Vercel 从这些已提交网页图生成展示版本，不依赖 incoming 或本机 dist。禁止提交密码、token、私钥、未获许可照片。不得放大原图。
- 英文文案简洁、自然、准确；中文说明先整理成英文草稿。未知日期、地点、路线、人数、学名等留空，人数未知用 null。不得编造活动或推测物种；确认鸟名后才可写 englishName/scientificName/species，并设 speciesConfirmed:true。沿用旧作品标题并不表示照片物种已被确认。
- id 唯一、小写字母数字和连字符。日期用 YYYY-MM-DD；updatedAt 是真实内容新增/修改日期，不以迁移日伪装旧作品的新增时间。
- published:false 是草稿；只有准备公开的内容设 true。published 代表进入预览内容，并不代表允许发布正式站。
- 每条艺术作品可用 links 数组存 Redbubble/Etsy HTTPS 链接，空数组表示无商品链接。不得抓取或展示实时价格、折扣。
- 先在开发分支工作。运行 npm ci（首次或依赖变更）、npm run build、npm run check，并检查桌面与手机宽度、键盘放大/关闭、筛选、图片、SEO、锚点和内部链接。新增数据须验证空字段、草稿不展示、鸟种确认和链接白名单。
- 仅部署 Vercel Preview，检查其对应提交。未经用户明确批准不得合并 main、push main、使用 --prod、变更正式域名或开通付费服务。
- 如果 GitHub/Vercel 认证不可用，明确说明，不编造预览地址或声称已经部署。

- 当前 website 是旧目录的独立 Git 副本，两者连接同一个 origin（lexiang64-cmd/lexiangart-portfolio），不会自动同步本地文件。以后统一在当前目录维护；每轮从最新远端 main 整合新分支，不能用旧目录覆盖新内容。当前基础升级尚未获准合并 main 时，后续预览先基于本开发分支；正式发布需用户明确批准。

## 素材文件夹、去重与归档

- incoming/events 必须使用 YYYY-MM-DD_地点 子文件夹；日期必须真实，不得编造。日期未知先向用户确认，不自动生成活动文件夹。
- incoming/photography 按日期、地点或摄影专题建立子文件夹；incoming/art 按作品名称建立子文件夹。允许中文名，避免 /、\、.. 等路径字符。每次只选择一个直接子文件夹，内部可以继续分类。
- 用户必须明确指定此次子文件夹；没有指定就先询问。不得扫描所有 incoming、批量导入旧文件夹、根据“最近修改”自行挑选素材。脚本只处理数据中已引用且位于所选文件夹的图片，不自动创建内容条目；其他文件夹的待处理引用会导致拒绝处理。
- 预处理以原文件 SHA-256 和标准化网页图 SHA-256 去重，记录路径、处理时间、网页图哈希及所属内容到 content/media-registry.json。重命名/复制的同图再次作为新内容使用会被阻止；默认沿用原条目，不新建重复条目。现有网站的 9 张作品图片已建立索引，后续处理时继续补充索引。确需跨条目复用，先取得用户明确批准，才可用 --reuse-existing，并复用同一网页图，不产生第二份图片。此记录不是原图备份，也不是相似照片的视觉识别系统。
- 编辑图片引用、内容 ID 或条目时检查已有处理记录；不要通过手动复制 assets/uploads 路径绕过去重，也不要删除处理记录来强制重导入。
- 所有操作不得自动删除、移动、重命名、覆盖原始照片。归档必须另有明确授权，先运行 npm run archive-check -- --folder 用户指定子文件夹，确认当前内容、处理记录和图片字节与 origin 分支的真实远端提交一致，再核对对应 Preview 成功。未处理文件、缺失网页图或未推送修改均阻止整个文件夹归档。
- 建议项目外归档位置：/Users/mac/Documents/Leo Xiang Art 已处理素材归档/，沿用 events/日期_地点、photography/批次、art/作品名称，并保存批准版本的提交号与处理清单。可由用户手动归档或明确授权后再操作；不自动建立或搬入素材。本轮不执行原图归档。
