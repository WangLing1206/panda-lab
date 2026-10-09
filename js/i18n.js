/* ════════════════════════════════════════════════════
   PandaLab — i18n 中英双语字典 + 语言切换
   zh / en 两个字典的键必须完全一致（自检函数会校验）
   ════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const zh = {
    // ── 应用 ──
    'app.subtitle': '可视化 Pandas 数据分析',

    // ── 顶栏 ──
    'tb.dataset': '数据集',
    'tb.upload': '📂 上传数据',
    'tb.export': '⬇ 导出',
    'tb.undo': '撤销上一步操作',
    'tb.reset': '重置为原始数据',

    // ── 页签 ──
    'tab.table': '数据表',
    'tab.chart': '图表',
    'tab.code': 'pandas 代码',
    'tab.info': '信息 info()',
    'tab.describe': '统计 describe()',

    // ── 分页 ──
    'pager.prev': '上一页',
    'pager.next': '下一页',
    'pager.info': '第 {page} / {pages} 页 · 共 {rows} 行',
    'pager.perPage': '行/页',

    // ── 流水线 ──
    'pipe.label': '操作流水线',
    'pipe.empty': '尚未应用任何操作 —— 点击左侧菜单开始',
    'pipe.base': '原始数据',

    // ── 面板 ──
    'panel.apply': '应用操作',
    'panel.cancel': '取消',

    // ── 状态栏 ──
    'status.rows': '{r} 行 × {c} 列',
    'status.nulls': '缺失值 {n}',
    'status.source': '来源：{name}',
    'status.hint': '点击左侧菜单开始分析 ✨',
    'status.builtin': '内置',
    'status.uploaded': '上传',

    // ── 拖拽 ──
    'drop.hint': '松开以加载文件 📄',

    // ── 代码页 ──
    'code.copy': '📋 复制代码',
    'code.copied': '代码已复制到剪贴板 ✓',

    // ── 图表 ──
    'chart.type': '图表类型',
    'chart.bar': '柱状图',
    'chart.line': '折线图',
    'chart.scatter': '散点图',
    'chart.pie': '饼图',
    'chart.hist': '直方图',
    'chart.box': '箱线图',
    'chart.heatmap': '相关热力图',
    'chart.x': 'X 轴',
    'chart.y': 'Y 轴',
    'chart.labelCol': '标签列',
    'chart.valueCol': '数值列',
    'chart.group': '分组（可选）',
    'chart.none': '（无）',
    'chart.agg': '聚合',
    'chart.aggNone': '不聚合',
    'chart.bins': '分箱数',
    'chart.draw': '📊 绘制',
    'chart.exportPng': '💾 导出 PNG',
    'chart.empty': '请选择图表类型与字段后点击「绘制」',
    'chart.needNumeric': '该图表需要数值列',
    'chart.rendered': '图表已绘制 ✓',

    // ── 操作菜单分类 ──
    'cat.clean': '数据清洗',
    'cat.transform': '筛选与变换',
    'cat.reshape': '重塑与汇总',
    'cat.combine': '合并',
    'cat.stats': '统计分析',

    // ── 操作名称 / 描述 ──
    'op.filter.name': '筛选行',
    'op.filter.desc': 'df.query / 布尔索引',
    'op.sort.name': '排序',
    'op.sort.desc': 'df.sort_values',
    'op.groupby.name': '分组聚合',
    'op.groupby.desc': 'df.groupby().agg()',
    'op.pivot.name': '透视表',
    'op.pivot.desc': 'df.pivot_table',
    'op.rename.name': '重命名列',
    'op.rename.desc': 'df.rename',
    'op.dropcol.name': '删除列',
    'op.dropcol.desc': 'df.drop',
    'op.addcol.name': '新增计算列',
    'op.addcol.desc': 'df.assign',
    'op.astype.name': '类型转换',
    'op.astype.desc': 'df.astype',
    'op.fillna.name': '填充缺失值',
    'op.fillna.desc': 'df.fillna',
    'op.dropna.name': '删除缺失行',
    'op.dropna.desc': 'df.dropna',
    'op.dedup.name': '去除重复行',
    'op.dedup.desc': 'df.drop_duplicates',
    'op.slice.name': '截取 / 抽样',
    'op.slice.desc': 'head · tail · sample',
    'op.valuecounts.name': '值计数',
    'op.valuecounts.desc': 'series.value_counts',
    'op.strop.name': '字符串处理',
    'op.strop.desc': '.str 访问器',
    'op.merge.name': '合并数据',
    'op.merge.desc': 'df.merge / join',
    'op.corr.name': '相关矩阵',
    'op.corr.desc': 'df.corr',

    // ── 表单通用 ──
    'form.column': '列',
    'form.columns': '列（可多选）',
    'form.value': '值',
    'form.operator': '操作符',
    'form.newName': '新列名',
    'form.type': '目标类型',
    'form.method': '方法',
    'form.how': '方式',
    'form.keep': '保留',
    'form.keepFirst': '第一行 first',
    'form.keepLast': '最后一行 last',
    'form.n': '行数 n',
    'form.seed': '随机种子',
    'form.optional': '（可选）',

    // ── 筛选 ──
    'form.conds': '筛选条件',
    'form.addCond': '＋ 添加条件',
    'form.logic': '条件组合',
    'form.and': '全部满足 AND',
    'form.or': '任一满足 OR',
    'op.eq': '等于 =', 'op.ne': '不等于 ≠', 'op.gt': '大于 >', 'op.ge': '大于等于 ≥',
    'op.lt': '小于 <', 'op.le': '小于等于 ≤',
    'op.contains': '包含 contains', 'op.startswith': '开头是 startswith', 'op.endswith': '结尾是 endswith',
    'op.isnull': '为空 isnull', 'op.notnull': '非空 notnull',

    // ── 排序 ──
    'form.sortKeys': '排序键',
    'form.addSort': '＋ 添加排序列',
    'form.asc': '升序', 'form.desc': '降序',

    // ── 分组 / 透视 ──
    'form.groupCols': '分组列',
    'form.aggs': '聚合配置',
    'form.addAgg': '＋ 添加聚合',
    'form.aggCol': '聚合列',
    'form.aggFunc': '聚合函数',
    'form.pivIndex': '行 index',
    'form.pivCols': '列 columns',
    'form.pivVals': '值 values',
    'form.margins': '显示合计行/列 margins',
    'agg.sum': '求和 sum', 'agg.mean': '均值 mean', 'agg.median': '中位数 median',
    'agg.count': '计数 count', 'agg.min': '最小 min', 'agg.max': '最大 max',
    'agg.std': '标准差 std', 'agg.nunique': '去重计数 nunique',
    'agg.first': '首个 first', 'agg.last': '末个 last',

    // ── 新增列 ──
    'form.expr': '表达式',
    'form.exprHint': '可用列名、数字、+ - * / % ( ) 与函数 abs round floor ceil sqrt log pow min max year month day。例：units * price * 0.9',

    // ── 缺失值 ──
    'fillna.value': '固定值', 'fillna.mean': '均值 mean', 'fillna.median': '中位数 median',
    'fillna.mode': '众数 mode', 'fillna.ffill': '向前填充 ffill', 'fillna.bfill': '向后填充 bfill',
    'dropna.any': '任一缺失即删 any', 'dropna.all': '全部缺失才删 all',
    'dropna.subset': '检查范围（留空=全部列）',

    // ── 截取 ──
    'slice.mode': '截取方式',
    'slice.head': '前 n 行 head', 'slice.tail': '后 n 行 tail', 'slice.sample': '随机抽样 sample',

    // ── 字符串 ──
    'str.op': '字符串操作',
    'str.contains': '包含 contains', 'str.replace': '替换 replace', 'str.upper': '大写 upper',
    'str.lower': '小写 lower', 'str.title': '首字母大写 title', 'str.len': '长度 len', 'str.slice': '切片 slice',
    'str.pattern': '查找内容', 'str.replacement': '替换为',
    'str.start': '起始位置', 'str.end': '结束位置',
    'str.target': '结果写入',

    // ── 合并 ──
    'merge.other': '另一个数据集',
    'merge.leftOn': '当前表连接键',
    'merge.rightOn': '对方表连接键',
    'merge.how': '连接方式',
    'merge.inner': '内连接 inner', 'merge.left': '左连接 left',
    'merge.right': '右连接 right', 'merge.outer': '外连接 outer',

    // ── 类型 ──
    'dtype.number': '数值', 'dtype.string': '文本', 'dtype.boolean': '布尔',
    'dtype.date': '日期', 'dtype.mixed': '混合',
    'astype.int': '整数 int', 'astype.float': '小数 float', 'astype.str': '文本 str', 'astype.date': '日期 date',

    // ── 模态框：上传 ──
    'up.title': '上传数据',
    'up.zone': '点击选择文件，或拖拽文件到此处',
    'up.zoneTypes': '支持 CSV / TSV / JSON / Excel（.xlsx .xls）',
    'up.or': '或粘贴 CSV 文本',
    'up.pastePh': 'date,region,units\n2025-01-01,North,12\n…',
    'up.parse': '解析并加载',
    'up.ok': '已加载「{name}」：{r} 行 × {c} 列 ✓',
    'up.err': '文件解析失败：{msg}',
    'up.noHeader': '首行需为列名',

    // ── 模态框：导出 ──
    'ex.title': '导出当前数据',
    'ex.format': '格式',
    'ex.filename': '文件名',
    'ex.download': '⬇ 下载',
    'ex.ok': '已导出 {name} ✓',

    // ── 模态框：信息 / 统计 ──
    'info.title': '数据信息 · df.info()',
    'info.col': '列名', 'info.dtype': '类型', 'info.nonnull': '非空', 'info.nulls': '缺失', 'info.unique': '唯一值', 'info.sample': '示例',
    'desc.title': '描述统计 · df.describe()',
    'desc.stat': '统计量', 'desc.noNumeric': '当前数据没有数值列',
    'desc.count': '计数', 'desc.mean': '均值', 'desc.std': '标准差', 'desc.min': '最小',
    'desc.p25': '25%', 'desc.p50': '50%', 'desc.p75': '75%', 'desc.max': '最大',

    // ── 数据集 ──
    'ds.sales.name': '销售明细 sales',
    'ds.sales.desc': '500 行订单：日期/地区/产品/销量/单价',
    'ds.employees.name': '员工信息 employees',
    'ds.employees.desc': '120 行员工：部门/年龄/薪资，含缺失值',
    'ds.iris.name': '鸢尾花 iris',
    'ds.iris.desc': '150 行经典数据集（模拟生成），4 个数值特征',
    'ds.products.name': '产品维表 products',
    'ds.products.desc': '12 个产品：类别/品牌/成本，可与 sales 合并',

    // ── 提示消息 ──
    'msg.applied': '已应用「{op}」→ {r} 行 × {c} 列 ✓',
    'msg.undone': '已撤销上一步 ✓',
    'msg.resetDone': '已重置为原始数据 ✓',
    'msg.nothing': '没有可撤销的操作',
    'msg.opErr': '操作失败：{msg}',
    'msg.noData': '当前没有数据',
    'msg.copied': '已复制 ✓',

    // ── 错误 ──
    'err.needCol': '请选择至少一列',
    'err.needCond': '请至少添加一个完整条件',
    'err.needAgg': '请至少添加一个聚合',
    'err.needValue': '请填写值',
    'err.needName': '请填写新列名',
    'err.dupName': '列名已存在或与被修改列冲突',
    'err.expr': '表达式无效：{msg}',
    'err.noNumeric': '没有可用的数值列',
    'err.needKey': '请选择连接键',
    'err.needOther': '请先选择另一个数据集（可先在顶栏上传）',
    'err.keyType': '连接键类型不一致',
    'err.libMissing': 'CDN 库加载失败，请检查网络后刷新',
  };

  const en = {
    // ── App ──
    'app.subtitle': 'Visual Pandas Data Analysis',

    // ── Top bar ──
    'tb.dataset': 'Dataset',
    'tb.upload': '📂 Upload data',
    'tb.export': '⬇ Export',
    'tb.undo': 'Undo last operation',
    'tb.reset': 'Reset to original data',

    // ── Tabs ──
    'tab.table': 'Table',
    'tab.chart': 'Charts',
    'tab.code': 'pandas Code',
    'tab.info': 'Info info()',
    'tab.describe': 'Stats describe()',

    // ── Pager ──
    'pager.prev': 'Prev',
    'pager.next': 'Next',
    'pager.info': 'Page {page} / {pages} · {rows} rows',
    'pager.perPage': 'rows/page',

    // ── Pipeline ──
    'pipe.label': 'Pipeline',
    'pipe.empty': 'No operations yet — pick one from the left menu',
    'pipe.base': 'Original data',

    // ── Panel ──
    'panel.apply': 'Apply',
    'panel.cancel': 'Cancel',

    // ── Status bar ──
    'status.rows': '{r} rows × {c} cols',
    'status.nulls': '{n} missing',
    'status.source': 'Source: {name}',
    'status.hint': 'Pick an operation from the left menu ✨',
    'status.builtin': 'built-in',
    'status.uploaded': 'uploaded',

    // ── Drag & drop ──
    'drop.hint': 'Drop file to load 📄',

    // ── Code tab ──
    'code.copy': '📋 Copy code',
    'code.copied': 'Code copied to clipboard ✓',

    // ── Charts ──
    'chart.type': 'Chart type',
    'chart.bar': 'Bar',
    'chart.line': 'Line',
    'chart.scatter': 'Scatter',
    'chart.pie': 'Pie',
    'chart.hist': 'Histogram',
    'chart.box': 'Box plot',
    'chart.heatmap': 'Corr heatmap',
    'chart.x': 'X axis',
    'chart.y': 'Y axis',
    'chart.labelCol': 'Label column',
    'chart.valueCol': 'Value column',
    'chart.group': 'Group by (opt.)',
    'chart.none': '(none)',
    'chart.agg': 'Aggregation',
    'chart.aggNone': 'No aggregation',
    'chart.bins': 'Bins',
    'chart.draw': '📊 Render',
    'chart.exportPng': '💾 Export PNG',
    'chart.empty': 'Choose a chart type and fields, then click "Render"',
    'chart.needNumeric': 'This chart needs numeric columns',
    'chart.rendered': 'Chart rendered ✓',

    // ── Menu categories ──
    'cat.clean': 'Data cleaning',
    'cat.transform': 'Filter & transform',
    'cat.reshape': 'Reshape & aggregate',
    'cat.combine': 'Combine',
    'cat.stats': 'Statistics',

    // ── Operation names / descriptions ──
    'op.filter.name': 'Filter rows',
    'op.filter.desc': 'df.query / boolean indexing',
    'op.sort.name': 'Sort',
    'op.sort.desc': 'df.sort_values',
    'op.groupby.name': 'Group & aggregate',
    'op.groupby.desc': 'df.groupby().agg()',
    'op.pivot.name': 'Pivot table',
    'op.pivot.desc': 'df.pivot_table',
    'op.rename.name': 'Rename columns',
    'op.rename.desc': 'df.rename',
    'op.dropcol.name': 'Drop columns',
    'op.dropcol.desc': 'df.drop',
    'op.addcol.name': 'Add computed column',
    'op.addcol.desc': 'df.assign',
    'op.astype.name': 'Convert dtype',
    'op.astype.desc': 'df.astype',
    'op.fillna.name': 'Fill missing values',
    'op.fillna.desc': 'df.fillna',
    'op.dropna.name': 'Drop missing rows',
    'op.dropna.desc': 'df.dropna',
    'op.dedup.name': 'Drop duplicates',
    'op.dedup.desc': 'df.drop_duplicates',
    'op.slice.name': 'Slice / sample',
    'op.slice.desc': 'head · tail · sample',
    'op.valuecounts.name': 'Value counts',
    'op.valuecounts.desc': 'series.value_counts',
    'op.strop.name': 'String operations',
    'op.strop.desc': '.str accessor',
    'op.merge.name': 'Merge data',
    'op.merge.desc': 'df.merge / join',
    'op.corr.name': 'Correlation matrix',
    'op.corr.desc': 'df.corr',

    // ── Common form labels ──
    'form.column': 'Column',
    'form.columns': 'Columns (multi-select)',
    'form.value': 'Value',
    'form.operator': 'Operator',
    'form.newName': 'New column name',
    'form.type': 'Target type',
    'form.method': 'Method',
    'form.how': 'How',
    'form.keep': 'Keep',
    'form.keepFirst': 'first',
    'form.keepLast': 'last',
    'form.n': 'Rows n',
    'form.seed': 'Random seed',
    'form.optional': '(optional)',

    // ── Filter ──
    'form.conds': 'Conditions',
    'form.addCond': '＋ Add condition',
    'form.logic': 'Combine with',
    'form.and': 'All (AND)',
    'form.or': 'Any (OR)',
    'op.eq': 'equals =', 'op.ne': 'not equals ≠', 'op.gt': 'greater than >', 'op.ge': 'at least ≥',
    'op.lt': 'less than <', 'op.le': 'at most ≤',
    'op.contains': 'contains', 'op.startswith': 'starts with', 'op.endswith': 'ends with',
    'op.isnull': 'is null', 'op.notnull': 'not null',

    // ── Sort ──
    'form.sortKeys': 'Sort keys',
    'form.addSort': '＋ Add sort column',
    'form.asc': 'Ascending', 'form.desc': 'Descending',

    // ── Group / pivot ──
    'form.groupCols': 'Group by columns',
    'form.aggs': 'Aggregations',
    'form.addAgg': '＋ Add aggregation',
    'form.aggCol': 'Column',
    'form.aggFunc': 'Function',
    'form.pivIndex': 'Rows (index)',
    'form.pivCols': 'Columns',
    'form.pivVals': 'Values',
    'form.margins': 'Show totals (margins)',
    'agg.sum': 'sum', 'agg.mean': 'mean', 'agg.median': 'median',
    'agg.count': 'count', 'agg.min': 'min', 'agg.max': 'max',
    'agg.std': 'std dev', 'agg.nunique': 'nunique',
    'agg.first': 'first', 'agg.last': 'last',

    // ── Add column ──
    'form.expr': 'Expression',
    'form.exprHint': 'Use column names, numbers, + - * / % ( ) and functions abs round floor ceil sqrt log pow min max year month day. e.g. units * price * 0.9',

    // ── Missing values ──
    'fillna.value': 'Fixed value', 'fillna.mean': 'Mean', 'fillna.median': 'Median',
    'fillna.mode': 'Mode', 'fillna.ffill': 'Forward fill', 'fillna.bfill': 'Backward fill',
    'dropna.any': 'Drop if any missing', 'dropna.all': 'Drop if all missing',
    'dropna.subset': 'Check subset (empty = all columns)',

    // ── Slice ──
    'slice.mode': 'Mode',
    'slice.head': 'First n rows (head)', 'slice.tail': 'Last n rows (tail)', 'slice.sample': 'Random sample',

    // ── Strings ──
    'str.op': 'Operation',
    'str.contains': 'contains', 'str.replace': 'replace', 'str.upper': 'uppercase',
    'str.lower': 'lowercase', 'str.title': 'title case', 'str.len': 'length', 'str.slice': 'slice',
    'str.pattern': 'Find', 'str.replacement': 'Replace with',
    'str.start': 'Start', 'str.end': 'End',
    'str.target': 'Write result to',

    // ── Merge ──
    'merge.other': 'Other dataset',
    'merge.leftOn': 'Key in current table',
    'merge.rightOn': 'Key in other table',
    'merge.how': 'Join type',
    'merge.inner': 'inner', 'merge.left': 'left',
    'merge.right': 'right', 'merge.outer': 'outer',

    // ── dtypes ──
    'dtype.number': 'number', 'dtype.string': 'text', 'dtype.boolean': 'boolean',
    'dtype.date': 'date', 'dtype.mixed': 'mixed',
    'astype.int': 'integer int', 'astype.float': 'float', 'astype.str': 'string str', 'astype.date': 'date',

    // ── Upload modal ──
    'up.title': 'Upload data',
    'up.zone': 'Click to choose a file, or drag it here',
    'up.zoneTypes': 'Supports CSV / TSV / JSON / Excel (.xlsx .xls)',
    'up.or': 'or paste CSV text',
    'up.pastePh': 'date,region,units\n2025-01-01,North,12\n…',
    'up.parse': 'Parse & load',
    'up.ok': 'Loaded "{name}": {r} rows × {c} cols ✓',
    'up.err': 'Failed to parse file: {msg}',
    'up.noHeader': 'First row must be column names',

    // ── Export modal ──
    'ex.title': 'Export current data',
    'ex.format': 'Format',
    'ex.filename': 'File name',
    'ex.download': '⬇ Download',
    'ex.ok': 'Exported {name} ✓',

    // ── Info / describe modals ──
    'info.title': 'Data info · df.info()',
    'info.col': 'Column', 'info.dtype': 'Dtype', 'info.nonnull': 'Non-null', 'info.nulls': 'Missing', 'info.unique': 'Unique', 'info.sample': 'Sample',
    'desc.title': 'Descriptive stats · df.describe()',
    'desc.stat': 'Stat', 'desc.noNumeric': 'No numeric columns in current data',
    'desc.count': 'count', 'desc.mean': 'mean', 'desc.std': 'std', 'desc.min': 'min',
    'desc.p25': '25%', 'desc.p50': '50%', 'desc.p75': '75%', 'desc.max': 'max',

    // ── Datasets ──
    'ds.sales.name': 'Sales orders sales',
    'ds.sales.desc': '500 orders: date/region/product/units/price',
    'ds.employees.name': 'Employees employees',
    'ds.employees.desc': '120 employees: dept/age/salary, with NaNs',
    'ds.iris.name': 'Iris iris',
    'ds.iris.desc': '150 rows classic dataset (simulated), 4 numeric features',
    'ds.products.name': 'Product dim products',
    'ds.products.desc': '12 products: category/brand/cost, merge with sales',

    // ── Toasts ──
    'msg.applied': 'Applied "{op}" → {r} rows × {c} cols ✓',
    'msg.undone': 'Undone ✓',
    'msg.resetDone': 'Reset to original data ✓',
    'msg.nothing': 'Nothing to undo',
    'msg.opErr': 'Operation failed: {msg}',
    'msg.noData': 'No data available',
    'msg.copied': 'Copied ✓',

    // ── Errors ──
    'err.needCol': 'Please select at least one column',
    'err.needCond': 'Please add at least one complete condition',
    'err.needAgg': 'Please add at least one aggregation',
    'err.needValue': 'Please enter a value',
    'err.needName': 'Please enter a new column name',
    'err.dupName': 'Column name already exists or conflicts',
    'err.expr': 'Invalid expression: {msg}',
    'err.noNumeric': 'No numeric columns available',
    'err.needKey': 'Please choose join keys',
    'err.needOther': 'Please choose another dataset first (upload one from the top bar)',
    'err.keyType': 'Join key dtypes do not match',
    'err.libMissing': 'CDN libraries failed to load. Check network and refresh.',
  };

  const I18N = { zh, en };

  /* ── 语言管理器 ── */
  const Lang = {
    current: 'zh',
    _listeners: [],
    init() {
      let saved = null;
      try { saved = localStorage.getItem('pandalab-lang'); } catch (e) { /* file:// 下可能受限 */ }
      this.current = (saved === 'en') ? 'en' : 'zh';
    },
    t(key, vars) {
      let s = I18N[this.current][key];
      if (s === undefined) s = I18N.zh[key];
      if (s === undefined) return key;
      if (vars) for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(String(vars[k]));
      return s;
    },
    set(lang) {
      if (!I18N[lang]) return;
      this.current = lang;
      try { localStorage.setItem('pandalab-lang', lang); } catch (e) {}
      applyStaticI18n();
      this._listeners.forEach(fn => fn(lang));
    },
    toggle() { this.set(this.current === 'zh' ? 'en' : 'zh'); },
    onChange(fn) { this._listeners.push(fn); },
  };

  /* 替换带 data-i18n / data-i18n-title 属性的静态文案 */
  function applyStaticI18n() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = Lang.t(el.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = Lang.t(el.getAttribute('data-i18n-title')); });
    document.documentElement.lang = Lang.current === 'zh' ? 'zh' : 'en';
    document.title = Lang.current === 'zh'
      ? 'PandaLab · 可视化 Pandas 数据分析'
      : 'PandaLab · Visual Pandas Data Analysis';
  }

  /* zh / en 键一致性自检（开发用，返回缺失键列表） */
  function checkI18nConsistency() {
    const problems = [];
    for (const k of Object.keys(zh)) if (!(k in en)) problems.push('en 缺少: ' + k);
    for (const k of Object.keys(en)) if (!(k in zh)) problems.push('zh 缺少: ' + k);
    return problems;
  }

  global.I18N = I18N;
  global.Lang = Lang;
  global.t = (k, v) => Lang.t(k, v);
  global.applyStaticI18n = applyStaticI18n;
  global.checkI18nConsistency = checkI18nConsistency;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { I18N, checkI18nConsistency };
  }
})(typeof window !== 'undefined' ? window : globalThis);
