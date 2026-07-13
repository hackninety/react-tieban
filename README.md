# react-tieban · 铁板神数

铁板神数语料阅读与检索前端。Vite + React + TypeScript，语料以
[tbss-ts-lib](https://github.com/hackninety/tbss-ts-lib) 接入
（GitHub tag 固定引入；卷册索引同步、条文载荷按十二集分包懒加载，首屏仅数 KB 索引）。

## 语料（tbss-ts-lib `#v0.1.0`）

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
- **条文库** `/volumes` 十二集切换 + 分页条文列表（100 条/页），条文号直达
- **单条** `/v/:n` 断语大字视图 + 出处行 + 前后条翻页
- **检索** `/search` 断语全文（繁简折叠，可限某集）＋ 按岁数反查年龄注记条文
- **取数表** `/tables` 十四考 15 张直渲，考刻表页附八刻细分与核心公式、太玄数歌诀
- **注解精选** `/annotated` 分类页签 + 原文/今注/标签卡片
- **方法文献** `/method` markdown 阅读器（正文懒加载）

样式沿用 react-* 家族令牌体系（paper/ink/rule/seal + 宣纸噪纹 + 印章），
配色独立为「铁」系：玄铁青 × 锈朱，三主题 铁 / 雪 / 玄（localStorage 持久化、防闪烁预置）。

## 排盘引擎（src/engine）

考刻推演为 [xaminxan/tiebanshenshu](https://github.com/xaminxan/tiebanshenshu) 算法的
TypeScript 移植，叠加 [Nanphy/TiebanshenshuOS](https://github.com/Nanphy/TiebanshenshuOS) v2
的八刻细分、终局公式（+刻干数×48）、五数寄宫与八卦加则；查表全部走 `tbss-ts-lib/tables`，
历法换算用 lunar-typescript（已验证与上游 cnlunar 的八字一致）。纯同步引擎 + 页面层异步补断语。

与上游明示取齐的口径（engine.ts 头注详述）：八刻计分沿用上游「偶数小时为时辰首小时」
约定；卦象/本命条文/流年字母统一按八刻归并刻（刻干数≤4→初刻）查表（上游 v2 混键之整理），
14-7 考刻完整计算作先验参考。考刻工作流：`quarterOverride` 手动定刻重排全盘，
`computeQuarterCandidates` 八刻候选对比，`scoreQuarterCandidates` 六亲事实关键词匹配评分
（透明启发式——上游六亲考刻为残缺实现且已自禁用，未予移植）。
`npm test` 以上游 README 完整排盘示例为黄金向量（男 1924-06-15 16:00：先天 11 / 本命 344 /
泰卦 / 流年八行逐格比对 + 空白行为证；正刻系 否卦 / 终局 728 / 泰初否正性格条文号互镜），
24 项断言全绿。各派口诀不一，结果仅供文献研究。

## 开发

```bash
npm install
npm run dev        # http://localhost:5173（.claude/launch.json 固定 5187）
npm run build      # tsc -b && vite build
npm run lint       # oxlint
```

本地并排改库：`npm install file:../tbss-ts-lib` 后重启 dev server。

## 声明

铁板神数为历史术数文献；本应用仅供文献研究、数字人文与传统文化学习之用，
不构成任何命运预测依据。条文底本为社区数字化转录，未经与清刊本逐字校勘。
