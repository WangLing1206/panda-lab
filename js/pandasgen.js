/* ════════════════════════════════════════════════════
   PandaLab — 把可视化操作流水线翻译成 pandas Python 代码
   ════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const py = v => {
    if (v === null || v === undefined || v === '') return "''";
    if (typeof v === 'number') return String(v);
    if (typeof v === 'boolean') return v ? 'True' : 'False';
    return "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  };
  const pyList = arr => '[' + arr.map(py).join(', ') + ']';

  /* 筛选条件 → 布尔表达式 */
  function condCode(c) {
    const col = 'df[' + py(c.col) + ']';
    switch (c.op) {
      case 'eq': return '(' + col + ' == ' + py(c.value) + ')';
      case 'ne': return '(' + col + ' != ' + py(c.value) + ')';
      case 'gt': return '(' + col + ' > '  + py(c.value) + ')';
      case 'ge': return '(' + col + ' >= ' + py(c.value) + ')';
      case 'lt': return '(' + col + ' < '  + py(c.value) + ')';
      case 'le': return '(' + col + ' <= ' + py(c.value) + ')';
      case 'contains':   return col + '.str.contains(' + py(c.value) + ', na=False)';
      case 'startswith': return col + '.str.startswith(' + py(c.value) + ', na=False)';
      case 'endswith':   return col + '.str.endswith(' + py(c.value) + ', na=False)';
      case 'isnull':     return col + '.isna()';
      case 'notnull':    return col + '.notna()';
      default: return '/* ? */';
    }
  }

  /* 表达式中的列名 → df['列名']（与 dataframe.js 同样的匹配规则） */
  function exprToPandas(expr, columns) {
    const sorted = [...columns].sort((a, b) => b.length - a.length);
    const alt = sorted.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    if (!alt) return expr;
    const re = new RegExp('(?<![\\w$\'])(?:' + alt + ')(?![\\w$\'])', 'g');
    return expr.replace(re, m => 'df[' + py(m) + ']');
  }

  /* 单个步骤 → 代码行（可能多行） */
  function stepCode(step, colsBefore, otherFile) {
    const p = step.params;
    switch (step.op) {
      case 'filter': {
        const joiner = p.logic === 'or' ? ' | ' : ' & ';
        return 'df = df[' + p.conds.map(condCode).join(joiner) + ']';
      }
      case 'sort':
        return 'df = df.sort_values(by=' + pyList(p.keys.map(k => k.col)) +
               ', ascending=[' + p.keys.map(k => k.asc ? 'True' : 'False').join(', ') + '])';
      case 'groupby': {
        const named = p.aggs.map(a => a.col + '_' + a.func + '=(' + py(a.col) + ', ' + py(a.func) + ')').join(', ');
        return 'df = df.groupby(' + pyList(p.groupCols) + ').agg(' + named + ').reset_index()';
      }
      case 'pivot':
        return 'df = df.pivot_table(index=' + py(p.index) + ', columns=' + py(p.columns) +
               ', values=' + py(p.values) + ', aggfunc=' + py(p.aggfunc) +
               (p.margins ? ', margins=True' : '') + ').reset_index()';
      case 'rename': {
        const items = Object.entries(p.map).map(([k, v]) => py(k) + ': ' + py(v)).join(', ');
        return 'df = df.rename(columns={' + items + '})';
      }
      case 'dropcol':
        return 'df = df.drop(columns=' + pyList(p.cols) + ')';
      case 'addcol':
        return 'df[' + py(p.name) + '] = ' + exprToPandas(p.expr, colsBefore);
      case 'astype': {
        const col = 'df[' + py(p.col) + ']';
        if (p.type === 'date') return col + ' = pd.to_datetime(' + col + ')';
        const tmap = { int: "'int64'", float: "'float64'", str: "'string'" };
        return col + ' = ' + col + '.astype(' + tmap[p.type] + ')';
      }
      case 'fillna': {
        return p.cols.map(c => {
          const col = 'df[' + py(c) + ']';
          switch (p.method) {
            case 'value':  return col + ' = ' + col + '.fillna(' + py(p.value) + ')';
            case 'mean':   return col + ' = ' + col + '.fillna(' + col + '.mean())';
            case 'median': return col + ' = ' + col + '.fillna(' + col + '.median())';
            case 'mode':   return col + ' = ' + col + '.fillna(' + col + '.mode()[0])';
            case 'ffill':  return col + ' = ' + col + '.ffill()';
            case 'bfill':  return col + ' = ' + col + '.bfill()';
            default: return '';
          }
        }).join('\n');
      }
      case 'dropna':
        return 'df = df.dropna(' + (p.subset && p.subset.length ? 'subset=' + pyList(p.subset) + ', ' : '') +
               'how=' + py(p.how) + ')';
      case 'dedup':
        return 'df = df.drop_duplicates(' +
               (p.subset && p.subset.length ? 'subset=' + pyList(p.subset) + ', ' : '') +
               'keep=' + py(p.keep) + ')';
      case 'slice':
        if (p.mode === 'head') return 'df = df.head(' + p.n + ')';
        if (p.mode === 'tail') return 'df = df.tail(' + p.n + ')';
        return p.frac != null
          ? 'df = df.sample(frac=' + p.frac + ', random_state=' + p.seed + ')'
          : 'df = df.sample(n=' + p.n + ', random_state=' + p.seed + ')';
      case 'valuecounts':
        return 'df = df[' + py(p.col) + '].value_counts()' + (p.topN ? '.head(' + p.topN + ')' : '') +
               '.rename_axis(' + py(p.col) + ').reset_index(name=' + py('count') + ')';
      case 'strop': {
        const col = 'df[' + py(p.col) + '].str';
        const tgt = 'df[' + py(p.newName || (p.col + '_' + p.strOp)) + ']';
        switch (p.strOp) {
          case 'contains': return tgt + ' = ' + col + '.contains(' + py(p.pattern) + ', na=False)';
          case 'replace':  return tgt + ' = ' + col + '.replace(' + py(p.pattern) + ', ' + py(p.replacement) + ', regex=False)';
          case 'upper':    return tgt + ' = ' + col + '.upper()';
          case 'lower':    return tgt + ' = ' + col + '.lower()';
          case 'title':    return tgt + ' = ' + col + '.title()';
          case 'len':      return tgt + ' = ' + col + '.len()';
          case 'slice':    return tgt + ' = ' + col + '.slice(' + (p.start ?? 0) + (p.end != null ? ', ' + p.end : '') + ')';
          default: return '';
        }
      }
      case 'merge': {
        const load = 'df2 = pd.read_csv(' + py(otherFile || 'other.csv') + ')';
        const on = p.leftOn === p.rightOn
          ? 'on=' + py(p.leftOn)
          : 'left_on=' + py(p.leftOn) + ', right_on=' + py(p.rightOn);
        return load + '\ndf = df.merge(df2, ' + on + ', how=' + py(p.how) + ')';
      }
      case 'corr':
        return 'df = df.corr(numeric_only=True).reset_index()';
      default:
        return '# ' + step.op;
    }
  }

  /**
   * 生成完整脚本
   * @param {object} cfg { baseFile, baseNote, steps, history, otherFiles, opName }
   *   history[i] 是第 i 步之前的 MiniFrame（history[0] 为原始数据）
   *   opName(op) 返回当前语言的操作名（作注释）
   */
  function genAll(cfg) {
    const lines = [];
    lines.push('import pandas as pd');
    lines.push('');
    lines.push('# ' + cfg.baseNote);
    lines.push('df = pd.read_csv(' + py(cfg.baseFile) + ')');
    cfg.steps.forEach((s, i) => {
      lines.push('');
      lines.push('# [' + (i + 1) + '] ' + cfg.opName(s.op));
      lines.push(stepCode(s, cfg.history[i].columns, cfg.otherFiles && cfg.otherFiles[i]));
    });
    lines.push('');
    lines.push('df');
    return lines.join('\n');
  }

  global.PandasGen = { genAll, stepCode, exprToPandas, condCode };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PandasGen: global.PandasGen };
  }
})(typeof window !== 'undefined' ? window : globalThis);
