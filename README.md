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
- **条文库** `/volumes` 十二集切换 + 分页条文列表（100 条/页），条文号直达
- **单条** `/v/:n` 断语大字视图 + 出处行 + 前后条翻页
- **检索** `/search` 断语全文（繁简折叠，可限某集）＋ 按岁数反查年龄注记条文
- **取数表** `/tables` 十四考 15 张直渲，考刻表页附八刻细分与核心公式、太玄数歌诀
- **注解精选** `/annotated` 分类页签 + 原文/今注/标签卡片
- **方法文献** `/method` markdown 阅读器（正文懒加载）

样式沿用 react-* 家族令牌体系（paper/ink/rule/seal + 宣纸噪纹 + 印章），
配色独立为「铁」系：玄铁青 × 锈朱，三主题 铁 / 雪 / 玄（localStorage 持久化、防闪烁预置）。

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
