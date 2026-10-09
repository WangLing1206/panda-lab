# 🐼 PandaLab · 可视化 Pandas 数据分析平台

> 在浏览器里用可视化方式完成 pandas 数据分析 —— 无需安装、无需后端、中英双语。
> Visual pandas-style data analysis in your browser — no install, no backend, bilingual (中文/English).

---

## 中文说明

### ✨ 功能特性

- **数据加载**：打开即用内置数据集（销售明细 sales 为默认集，另有员工信息 employees、鸢尾花 iris、产品维表 products）；支持上传 / 拖拽 / 粘贴 **CSV、TSV、JSON、Excel**；可导出当前结果为 CSV / JSON
- **完整的 pandas 类操作**（全部以流水线方式叠加，可随时撤销、单步删除、一键重置）：

  | 分类 | 操作 | 对应 pandas |
  |---|---|---|
  | 筛选与变换 | 筛选行 / 排序 / 截取抽样 / 新增计算列 / 字符串处理 | `query` `sort_values` `head/tail/sample` `assign` `.str` |
  | 数据清洗 | 填充缺失值 / 删除缺失行 / 去重 / 类型转换 / 重命名 / 删除列 | `fillna` `dropna` `drop_duplicates` `astype` `rename` `drop` |
  | 重塑与汇总 | 分组聚合 / 透视表 / 值计数 | `groupby().agg()` `pivot_table` `value_counts` |
  | 合并 | 横向合并（inner/left/right/outer） | `merge` |
  | 统计分析 | 相关矩阵 / info() / describe() | `corr` `info` `describe` |

- **图表**：柱状图、折线图、散点图、饼图、直方图、箱线图、相关热力图（ECharts，可导出 PNG）
- **pandas 代码同步生成**：每一步操作都实时翻译成等价的 Python pandas 代码，可一键复制
- **信息面板**：`df.info()`（类型/非空/唯一值）与 `df.describe()`（描述统计）
- **中英双语**：顶栏一键切换，两种语言内容完全一致，选择记忆在本地
- **深色 / 浅色主题**：一键切换，图表联动换肤

### 🚀 本地运行

纯静态站点，无构建步骤：

```bash
# 方式一：直接用浏览器打开 index.html（内置数据集可正常使用）

# 方式二：本地服务器（推荐）
python -m http.server 8000
# 打开 http://localhost:8000
```

> 第三方库（ECharts / PapaParse / SheetJS）通过 CDN 加载，首次打开需要联网。

### 🌐 部署到 GitHub Pages

1. 把本目录推送到 GitHub 仓库（如 `username.github.io` 或任意仓库）
2. 仓库 **Settings → Pages → Source** 选择 `main` 分支根目录
3. 稍等片刻，访问 `https://<username>.github.io/<repo>/` 即可

### 🗂 项目结构

```
├── index.html        # 单页入口
├── css/style.css     # 样式（CSS 变量实现深浅双主题）
├── js/
│   ├── i18n.js       # 中英双语字典（zh/en 键一一对应，带自检）
│   ├── dataframe.js  # MiniFrame：轻量 DataFrame，实现全部 pandas 类操作
│   ├── datasets.js   # 内置数据集（种子随机数生成，结果确定）
│   ├── pandasgen.js  # 操作流水线 → pandas Python 代码
│   ├── charts.js     # ECharts 图表封装
│   └── app.js        # 状态管理 / 操作流水线 / 全部 UI 逻辑
└── README.md
```

### 🧮 技术要点

- **MiniFrame 数据引擎**：列存结构 + 类型推断（number/string/boolean/date），不可变操作链；表达式求值使用列名替换 + 受限 `Function` 沙箱，支持 `abs round floor ceil sqrt log pow min max year month day` 等函数
- **流水线重放**：每一步操作记录 `{op, params}`，删除中间步骤后从原始数据确定性重放
- **缺失值语义**：对齐 pandas——筛选比较时缺失值不落选、聚合忽略缺失、算术运算缺失传播
- **i18n 一致性**：`checkI18nConsistency()` 在启动时自动校验两个字典的键完全对应

---

## English

### ✨ Features

- **Data loading**: ready-to-use built-in datasets (**sales** by default, plus **employees**, **iris**, **products**); upload / drag-and-drop / paste **CSV, TSV, JSON, Excel**; export the current result as CSV / JSON
- **Full pandas-style operations** — stacked as a pipeline with undo, per-step removal and one-click reset:

  | Category | Operations | pandas equivalent |
  |---|---|---|
  | Filter & transform | Filter, sort, slice/sample, computed column, string ops | `query` `sort_values` `head/tail/sample` `assign` `.str` |
  | Data cleaning | fillna, dropna, dedup, astype, rename, drop columns | `fillna` `dropna` `drop_duplicates` `astype` `rename` `drop` |
  | Reshape & aggregate | groupby-agg, pivot table, value counts | `groupby().agg()` `pivot_table` `value_counts` |
  | Combine | merge (inner/left/right/outer) | `merge` |
  | Statistics | correlation matrix, info(), describe() | `corr` `info` `describe` |

- **Charts**: bar, line, scatter, pie, histogram, box plot, correlation heatmap (ECharts, PNG export)
- **Live pandas code generation**: every operation is translated into equivalent Python pandas code, copyable with one click
- **Info panels**: `df.info()` (dtypes / non-null / unique) and `df.describe()` (descriptive stats)
- **Bilingual 中文/English**: one-click toggle in the top bar, identical content in both languages, preference saved locally
- **Dark / light theme**: one-click toggle, charts follow the theme

### 🚀 Run locally

Fully static site, no build step:

```bash
# Option 1: just open index.html in a browser (built-in datasets work)

# Option 2: local server (recommended)
python -m http.server 8000
# visit http://localhost:8000
```

> Third-party libraries (ECharts / PapaParse / SheetJS) are loaded via CDN — an internet connection is required on first load.

### 🌐 Deploy to GitHub Pages

1. Push this directory to a GitHub repository
2. In **Settings → Pages → Source**, pick the `main` branch root
3. Visit `https://<username>.github.io/<repo>/`

### 🗂 Project structure

```
├── index.html        # Single-page entry
├── css/style.css     # Styles (light/dark themes via CSS variables)
├── js/
│   ├── i18n.js       # zh/en dictionaries (keys kept 1:1, self-checked)
│   ├── dataframe.js  # MiniFrame: lightweight DataFrame with pandas-style ops
│   ├── datasets.js   # Built-in datasets (seeded RNG, deterministic)
│   ├── pandasgen.js  # Pipeline → pandas Python code
│   ├── charts.js     # ECharts wrappers
│   └── app.js        # State / pipeline / all UI logic
└── README.md
```

### 🧮 Implementation notes

- **MiniFrame engine**: columnar storage with dtype inference (number/string/boolean/date) and immutable operation chains; expression evaluation replaces column references and evaluates inside a restricted `Function` sandbox with `abs round floor ceil sqrt log pow min max year month day` helpers
- **Deterministic replay**: each step is stored as `{op, params}`; removing a step replays the pipeline from the original data
- **NaN semantics** (aligned with pandas): NaN fails comparisons, aggregations skip NaN, arithmetic propagates NaN
- **i18n consistency**: `checkI18nConsistency()` verifies both dictionaries expose exactly the same keys on startup
