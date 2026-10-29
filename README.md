# react-tieban · 铁板神数

铁板神数语料阅读与检索前端。Vite + React + TypeScript，语料以
[tbss-ts-lib](https://github.com/hackninety/common-ts-lib/tree/main/packages/tbss-ts-lib) 接入
（锁定独立版本的 GitHub Release 压缩包；卷册索引同步、条文载荷按十二集分包懒加载，首屏仅数 KB 索引）。

## 在 AI 中使用统一 MCP

支持 MCP 的 AI 客户端可连接 **[https://mcp.0x7c.cc/mcp](https://mcp.0x7c.cc/mcp)**，传输方式选 **Streamable HTTP**，认证选**无**，无需访问令牌。MCP 负责排盘和 common 资料检索，当前 AI 再据此解读；远程调用会把填写的生辰等参数发送到该服务。

统一服务 `paipan-common` 提供 **31 个工具**：6 个跨术数排盘与 common 检索基础工具、11 个 `bazi_` 八字高级工具、14 个 `taiyi_` 太乙高级工具；另有 7 个提示词和 5 个静态资源。本机 stdio 与远程 HTTP 使用同一套能力，每次传完整参数，不使用旧 `chartId`。

`prepare_reading.searchQueries` 可明确提供 1–3 个检索关键词，原问题保留在 `question`，结果会返回实际关键词。铁板一键检索覆盖条文、注释和方法文档，并返回实际检索类别；考刻可指定 `searchQueries: ["考刻"]`，盘面条文号按精确编号定位。

首次配置时按所用客户端选择一条；本机 stdio 与远程 HTTP 二选一。已存在 `paipan-common` 时先在客户端移除旧同名连接再更换方式，旧 `bazi`、`taiyi`、`paipan-common-remote` 连接可移除，避免重复注册。保存后重连 MCP。

安装对应 CLI 后，在终端执行其中一条：

```bash
# Codex
codex mcp add paipan-common --url https://mcp.0x7c.cc/mcp

# Claude Code（当前用户范围）
claude mcp add --transport http --scope user paipan-common https://mcp.0x7c.cc/mcp
```

配置后重新打开客户端会话。已有本机 `paipan-common` 配置时，本机与远程选择一个即可，无需重复添加。命令说明见 [Codex MCP 文档](https://learn.chatgpt.com/docs/extend/mcp)和 [Claude Code MCP 文档](https://code.claude.com/docs/en/mcp)。

连接后可复制以下示例给 AI（请替换成实际出生与求测资料）：

> 请先调用 system_catalog 核对参数，再用 prepare_reading 排铁板（systems=["tieban"]）。出生 birth 为公历 1990-05-17 10:30，timezone="+08:00"，gender="male"；求测 queryTime 为公历 2026-10-29 14:30，timezone="+08:00"。不启用真太阳时，先不指定考刻，不开启算命模式。请检索 common 的 tbss 条文，再用 corpus_read 核对原文，标注条文号、资料 ID 和来源，区分排盘结果、原典说法与推测；不要自行把某一刻定为已验证的出生刻。

统一 MCP 的 `system="tieban"` **必须同时提供 `birth` 和 `queryTime`**，求测时间不得早于出生时间。当前开放 `tables-v1` 引擎、八刻候选、`quarterOverride`（1–8）及流年范围 `ageStart` / `ageCount`；网页的六亲事实关键词考刻评分尚未接入。`chart_calculate` 的选项直接放 `options`；`prepare_reading` 按系统分组，例如 `options={"tieban":{"quarterOverride":3,"ageStart":1,"ageCount":10}}`，定刻须以用户已确认的选择为准。

时间须明确公历日期、时分和时区（IANA 名或固定偏移，二者在夏令时日期可能不同），不得猜测出生钟点。启用 `birth.trueSolarTime` 时必须明确 `birth.longitude`，并按同地求测处理：出生与求测各按自己的日期校正，`queryTime` 的偏移须与出生地时区在**求测当日**的偏移一致；可使用等价时区别名或固定偏移，不能直接沿用出生当天的偏移。

默认从 common 的 `tbss-ts-lib` 检索铁板条文。只有明确设置 `fortuneMode=true` 才额外联查人生主题命例，仍需完整 `birth` 与 `queryTime`。默认 `practice` 不读取案例答案；只有明确要求参考答案时，才使用 `corpus_read` 的 `mode="reference"` 与 `includeAnswers=true`。

## 语料（tbss-ts-lib `0.1.0`）

| 分支 | 规模 |
|---|---|
| 条文库 | 12000 条（子集~亥集十二集，号 1001–13000；年龄注记 7089 条） |
| 取数表 | 十四考 15 张 4799 数据行 |
| 注解精选 | 29 条 10 类（陈明点校本节录 + 今注） |
| 方法文献 | 概述 / 考刻 / 取数表说明 3 篇 |

## 页面

- **首页** 语料规模总览、十二集直达、底本卡片（commit 锁定）
- **排盘推演** `/paipan` 输入生辰（精确到分钟）与求测时刻起盘：
  先天命数 → 五音命数 → 日命/时运 → 考刻定刻（14-7 + 八刻细分）→ 本命数与十二辟卦 →
  本命条文（14-10）→ 流年 1–100 岁（原条文 / 岁段校正 / 终局公式三口径断语，条文号直链单条视图）。
  盘面参数入 URL（g/b/q/k/f），可分享回放。
- **考刻对比** 排盘页内：八刻候选各一套（归并刻 → 卦 → 本命条文，终局条文 48 阶差）；
  输入已知六亲信息关键词（如「属马 兄弟二人」）对各刻断语做繁简折叠匹配评分（命中明细可复核），
  点「采用」手动定刻重排全盘；流年断语年龄注记与实岁吻合以 ✓ 高亮（年龄相验为考刻之凭）
- **流年细节** 排盘页内：每行附**公历年份**；求测时刻的**当前虚岁**行朱色衬底；
  基础排盘补**天地数**（八字太玄奇偶分和，天基 25 地基 30 取余）与**四柱六亲宫位**
  （年父母/月兄弟/日夫妻/时子女）。曾试做的子平大限分段层已按「铁板原味」原则移除
  （铁板原文与上游实现均无大运取数）
- **真太阳时** 排盘表单内：按城市（省/市/区县经度表，源自 react-8char）或手动经度+时区校正，
  `真太阳时 = 标准时 + (经度−时区中央经线)×4 分 + 均时差(EoT)`；出生与求测时刻同址同校，
  校正前后时刻与分项时差在基础信息中明示（铁板取数精确到刻，经度校正直接影响八刻与时柱）。
  求测时刻带「此刻」按钮——按**盘面时区**（城市模式恒 UTC+8、手动模式取所填时区）换算当前时间，
  浏览器异时区时表单内明示提醒；流年表前有**三口径图例**（原条文/校正后/终局的取数途径与用途）
- **数据导出 · AI 分析** 排盘页尾卡片（版式参照 react-8char，配色沿用铁系）：**MD** 完整报告
  （基础排盘/考刻对比/本命条文/流年百岁断语/口径出处，仿上游 save_to_md 版式扩充）与
  **TOON**（[Token-Oriented Object Notation](https://github.com/toon-format/toon)
  官方编码，同盘面比 JSON 省 20%+ 字符，流年走表格化数组）文件下载（标注体积），
  加 **AI Prompt 一键复制**（TOON / Markdown 两口径，内嵌角色设定、盘面字段说明、
  分析框架、反幻觉纪律与追问协议，粘入 ChatGPT / Claude 即得完整分析）；
  卡片尾部 TOON 预览；导出经 `decode` 往返校验无损
- **条文库** `/volumes` 十二集切换 + 分页条文列表（100 条/页），条文号直达
- **单条** `/v/:n` 断语大字视图 + 出处行 + 前后条翻页
- **检索** `/search` 断语全文（繁简折叠，可限某集）＋ 按岁数反查年龄注记条文
- **取数表** `/tables` 十四考 15 张直渲，考刻表页附八刻细分与核心公式、太玄数歌诀
- **注解精选** `/annotated` 分类页签 + 原文/今注/标签卡片
- **方法文献** `/method` markdown 阅读器（正文懒加载）

样式沿用 react-* 家族令牌体系（paper/ink/rule/seal + 宣纸噪纹 + 印章），
配色独立为「铁」系：玄铁青 × 锈朱，三主题 铁 / 雪 / 玄（localStorage 持久化、防闪烁预置）。

## 命例参考

排盘页的「数据导出 · AI 分析」卡片提供默认关闭的「算命模式」。手动开启后再展开「命例库」，可检索人生主题案例。当前使用 `mingli-cases-ts-lib` / `mingli-cases-react` 独立 Release `0.1.1`。点击「用于 AI 参考（不含答案）」会附入独立命例及来源；如需答案，先揭晓，再明确点击「用于 AI 参考（含已揭晓答案）」。隐藏答案会撤销含答案的引用。两种 AI Prompt 都支持独立参考块，纯盘面 MD / TOON 文件保持原样。

案例显示出生资料注记、钟点精度与来源；「钟点未核实」和「区间中点」不能视为已证实的精确出生时刻，也不能直接替当前求测人填表。

开启状态不持久化；关闭模式、换盘会清除引用，普通阅读与未开启的排盘页不加载命例界面或数据。出生和查询时间仍按原口径处理。命例属于其他命主，不能迁移为当前求测人的经历，也不能作为铁板原典条文或算法验证。

门控回归：`npm run test:e2e` 会构建后启动独立临时预览，通过 Playwright 截获真实复制文本，验证默认关闭、仅开启时均不加载资源，展开后按需加载，关闭后复制恢复原文。结果写入忽略目录 `test-results/`。默认使用 Windows 系统 Chrome；其他环境先运行 `npx playwright install chromium`，或用 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 指定浏览器。`E2E_BASE_URL` 可指向已有预览。

## 排盘引擎（src/engine）

考刻推演为 [xaminxan/tiebanshenshu](https://github.com/xaminxan/tiebanshenshu) 算法的
TypeScript 移植，叠加 [Nanphy/TiebanshenshuOS](https://github.com/Nanphy/TiebanshenshuOS) v2
的八刻细分、终局公式（+刻干数×48）、五数寄宫与八卦加则；查表全部走 `tbss-ts-lib/tables`，
历法换算用 lunar-typescript（已验证与上游 cnlunar 的八字一致）。纯同步引擎 + 页面层异步补断语。

与上游明示取齐的口径（engine.ts 头注详述）：八刻计分沿用上游「偶数小时为时辰首小时」
约定；卦象/本命条文/流年字母统一按八刻归并刻（刻干数≤4→初刻）查表（上游 v2 混键之整理），
14-7 考刻完整计算作先验参考。**后天命数用 mod 8 原值直查 14-12**（键域 1–8 全覆盖含 5）：
上游 v2 的「五数寄宫」把 5 替换为寄宫卦后天数，下元男寄离得 9 超出键域，
致该类命盘流年标记/字母全部查空——本引擎回归 v1 原始管线，寄宫/三元层一并移除。
考刻工作流：`quarterOverride` 手动定刻重排全盘，`computeQuarterCandidates` 八刻候选对比，
`scoreQuarterCandidates` 六亲事实关键词匹配评分
（透明启发式——上游六亲考刻为残缺实现且已自禁用，未予移植）。
`npm test` 以上游 README 完整排盘示例为黄金向量（男 1924-06-15 16:00：先天 11 / 本命 344 /
泰卦 / 流年八行逐格比对 + 空白行为证；正刻系 否卦 / 终局 728 / 泰初否正性格条文号互镜），
具体断言以当前测试集为准。各派口诀不一，结果仅供文献研究。

## 开发

```bash
npm ci             # 从锁文件安装 common-ts-lib Release 中的独立预构建包
npm run dev        # http://localhost:5173（.claude/launch.json 固定 5187）
npm run build      # tsc -b && vite build
npm run lint       # oxlint
```

本地并排改库：先在 common-ts-lib 构建对应包，再运行 `npm install file:../common-ts-lib/packages/tbss-ts-lib` 并重启 dev server。此方式仅用于临时调试；提交前恢复版本固定的 GitHub Release 地址与锁文件，生产依赖不使用本地路径。

## 部署（Cloudflare Pages）

生产站点 <https://tbss.0x7c.cc/>。Dashboard → Workers & Pages → 项目绑定本仓库后：

| 配置项 | 值 |
|---|---|
| Build command | `npm run build` |
| Build output directory | `dist` |
| Production branch | `main` |
| Node.js 版本 | **22（≥ 22.12）**，与仓库 `.node-version` 保持一致 |

Vite 8 支持 Node 20.19+ 或 22.12+；如果构建环境仍使用 Node 18，可能出现
`crypto.hash is not a function` 或 EBADENGINE。请核对构建日志中的实际 Node 版本，
按 `.node-version` 切换后重新部署。`tbss-ts-lib` 从 common-ts-lib 的版本化 GitHub Release 下载预构建压缩包，
公开地址匿名可取，CI 无需 SSH 凭证，也无需在前端安装时构建语料。
自定义域 522 排查：Pages 项目须有**成功的 Production 部署**，且 `tbss.0x7c.cc` 已添加进该项目的
**Custom domains**（仅 DNS CNAME 指向 pages.dev 而未在项目里登记会直接 522）。

## 声明

铁板神数为历史术数文献；本应用仅供文献研究、数字人文与传统文化学习之用，
不构成任何命运预测依据。条文底本为社区数字化转录，未经与清刊本逐字校勘。
