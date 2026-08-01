# CLAUDE.md

react-tieban 工作约定（供 Claude Code 使用）。

## 沟通与提交

- 一律用**中文**对话，注释与文档也用中文。
- Commit message 用**中文**，沿用历史风格：一句话概括改动，分号并列要点，末尾附测试数（如「……，35 测试」）。
- **每次处理完自动 commit 并推送到主分支 `main`**（存档式工作流，无需事先询问）。

## 姊妹库（*-ts-lib）

- 语料库 `tbss-ts-lib` 以 GitHub tag 固定引入（package.json 中 `git+https://github.com/hackninety/tbss-ts-lib.git#vX.Y.Z`）。
- 同账号下还有 lrdq / nhx / qmdj / shj / zslj 等 `*-ts-lib` 数据库，各 react-* 前端同理引用。
- 如改动需要动库：**可直接同步修改对应 ts-lib 仓库并推送**，打新 tag 后回来更新本仓库依赖版本与 package-lock。
- 本地并排调试：`npm install file:../tbss-ts-lib` 后重启 dev server。

## 风格参考

- UI 属 react-* 家族令牌体系（paper/ink/rule/seal + 宣纸噪纹 + 印章）。
- 排版可参考同账号 `react-8char` 等项目，但**配色保持本项目「铁」系现状**（玄铁青 × 锈朱，三主题 铁/雪/玄）。

## 构建与部署

- `npm run dev` · `npm run build`（tsc -b && vite build）· `npm run lint`（oxlint）· `npm test`（vitest）。
- 冒烟：`npm run build && npm run preview -- --port 5187`，另开终端 `node scripts/smoke.mjs <截图目录>`（Chrome 路径可用环境变量 `CHROME` 覆盖）。
- 部署：Cloudflare Pages，构建命令 `npm run build`、输出 `dist`；**Node ≥ 20.19**（Vite 8 硬性要求，仓库以 `.node-version` 钉 22，CF 构建镜像默认 Node 18 会失败）。
- 生产域名 https://tbss.0x7c.cc/ ；推 main 后 CF Pages 自动构建。
