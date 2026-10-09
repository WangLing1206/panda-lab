/* ════════════════════════════════════════════════════
   PandaLab — MiniFrame：浏览器里的轻量 DataFrame
   语义对齐 pandas，纯 JS 实现，无 DOM 依赖（可在 Node 中测试）
   ════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  /* ─────────── 基础工具 ─────────── */
  function isNull(v) {
    return v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v)) || v === '';
  }
  function isDateStr(v) {
    return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$/.test(v) && !Number.isNaN(Date.parse(v.replace(' ', 'T')));
  }
  function inferDtype(values) {
    let num = 0, str = 0, bool = 0, date = 0, n = 0;
    for (const v of values) {
      if (isNull(v)) continue;
      n++;
      if (typeof v === 'number') num++;
      else if (typeof v === 'boolean') bool++;
      else if (isDateStr(v)) date++;
      else str++;
    }
    if (n === 0) return 'string';
    if (num === n) return 'number';
    if (bool === n) return 'boolean';
    if (date === n) return 'date';
    if (str === n) return 'string';
    if (num + str === n && num > 0) return 'mixed';
    return str > 0 ? 'string' : 'mixed';
  }
  function compareVals(a, b) {
    const an = isNull(a), bn = isNull(b);
    if (an && bn) return 0;
    if (an) return 1;               // 缺失值永远排最后
    if (bn) return -1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
  }
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ─────────── 聚合函数库 ─────────── */
  const AGG = {
    sum:   vs => vs.reduce((a, b) => a + b, 0),
    mean:  vs => vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null,
    median: vs => {
      if (!vs.length) return null;
      const s = [...vs].sort((a, b) => a - b), m = s.length >> 1;
      return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    },
    count: (vs, raw) => raw.filter(v => !isNull(v)).length,
    min:   vs => vs.length ? vs.reduce((a, b) => (compareVals(a, b) <= 0 ? a : b)) : null,
    max:   vs => vs.length ? vs.reduce((a, b) => (compareVals(a, b) >= 0 ? a : b)) : null,
    std:   vs => {
      if (vs.length < 2) return null;
      const m = vs.reduce((a, b) => a + b, 0) / vs.length;
      return Math.sqrt(vs.reduce((a, b) => a + (b - m) * (b - m), 0) / (vs.length - 1)); // ddof=1 同 pandas
    },
    nunique: (vs, raw) => new Set(raw.filter(v => !isNull(v)).map(v => String(v))).size,
    first: (vs, raw) => { const f = raw.find(v => !isNull(v)); return f === undefined ? null : f; },
    last:  (vs, raw) => { for (let i = raw.length - 1; i >= 0; i--) if (!isNull(raw[i])) return raw[i]; return null; },
  };
  const AGG_NAMES = Object.keys(AGG);

  /* ─────────── 表达式求值（新增计算列用） ─────────── */
  const EXPR_FNS = {
    abs: Math.abs, round: Math.round, floor: Math.floor, ceil: Math.ceil,
    sqrt: Math.sqrt, log: Math.log, exp: Math.exp,
    pow: Math.pow, min: Math.min, max: Math.max,
    year:  d => new Date(d).getFullYear(),
    month: d => new Date(d).getMonth() + 1,
    day:   d => new Date(d).getDate(),
  };
  function compileExpr(expr, columns) {
    // 列名按长度降序匹配，避免短名吃掉长名
    const sorted = [...columns].sort((a, b) => b.length - a.length);
    const alt = sorted.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    let transformed = expr;
    if (alt) {
      const re = new RegExp('(?<![\\w$])(' + alt + ')(?![\\w$])', 'g');
      transformed = transformed.replace(re, m => '__c[' + JSON.stringify(m) + ']');
    }
    if (/__c\s*\[/.test(transformed) === false && sorted.some(c => expr.includes(c))) {
      throw new Error('column reference failed');
    }
    const fnNames = Object.keys(EXPR_FNS);
    let fn;
    try {
      fn = new Function('__c', ...fnNames, '"use strict"; return (' + transformed + ');');
    } catch (e) {
      throw new Error(e.message);
    }
    const usedCols = sorted.filter(c => new RegExp('(?<![\\w$])' + c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w$])').test(expr));
    return function (rowObj) {
      for (const c of usedCols) if (isNull(rowObj[c])) return null;   // 缺失值传播（pandas 得 NaN）
      const vals = fnNames.map(n => EXPR_FNS[n]);
      const r = fn(rowObj, ...vals);
      if (typeof r === 'number' && !Number.isFinite(r)) return null;
      return (r === undefined) ? null : r;
    };
  }

  /* ═══════════════ MiniFrame ═══════════════ */
  class MiniFrame {
    constructor(columns, rows, name) {
      this.columns = columns.slice();
      this.rows = rows;                 // 数组的数组
      this.name = name || 'df';
      this._dtypes = null;
    }

    /* ── 构造辅助 ── */
    static fromObjects(objs, name) {
      const cols = [];
      for (const o of objs) for (const k of Object.keys(o)) if (!cols.includes(k)) cols.push(k);
      const rows = objs.map(o => cols.map(c => (o[c] === undefined ? null : o[c])));
      return new MiniFrame(cols, rows, name);
    }
    clone() { return new MiniFrame(this.columns, this.rows.map(r => r.slice()), this.name); }

    /* ── 元信息 ── */
    shape() { return [this.rows.length, this.columns.length]; }
    colIdx(name) {
      const i = this.columns.indexOf(name);
      if (i < 0) throw new Error('column not found: ' + name);
      return i;
    }
    col(name) { const i = this.colIdx(name); return this.rows.map(r => r[i]); }
    dtypes() {
      if (!this._dtypes) {
        const d = {};
        this.columns.forEach((c, i) => { d[c] = inferDtype(this.rows.map(r => r[i])); });
        this._dtypes = d;
      }
      return this._dtypes;
    }
    dtypeOf(col) { return this.dtypes()[col]; }
    numericCols() { return this.columns.filter(c => this.dtypeOf(c) === 'number'); }
    categoricalCols() { return this.columns.filter(c => this.dtypeOf(c) !== 'number'); }
    unique(col, limit) {
      const i = this.colIdx(col), seen = new Set(), out = [];
      for (const r of this.rows) {
        if (isNull(r[i])) continue;
        const k = String(r[i]);
        if (!seen.has(k)) { seen.add(k); out.push(r[i]); if (limit && out.length >= limit) break; }
      }
      return out;
    }
    nullCount() {
      let n = 0;
      for (const r of this.rows) for (const v of r) if (isNull(v)) n++;
      return n;
    }
    _rowObj(row) {
      const o = {};
      this.columns.forEach((c, i) => { o[c] = row[i]; });
      return o;
    }

    /* ─────────── 筛选 query ─────────── */
    filter(conds, logic) {
      const tests = conds.map(cd => this._condTest(cd));
      const and = logic !== 'or';
      const rows = this.rows.filter(r =>
        and ? tests.every(f => f(r)) : tests.some(f => f(r))
      );
      return new MiniFrame(this.columns, rows, this.name);
    }
    _condTest({ col, op, value }) {
      const i = this.colIdx(col);
      const dt = this.dtypeOf(col);
      let v = value;
      if (dt === 'number' && !isNull(value)) {
        v = Number(value);
        if (Number.isNaN(v)) throw new Error('"' + value + '" is not a number');
      }
      return (row) => {
        const cell = row[i];
        switch (op) {
          case 'isnull':  return isNull(cell);
          case 'notnull': return !isNull(cell);
          case 'eq': return !isNull(cell) && String(cell) === String(v);
          case 'ne': return isNull(cell) || String(cell) !== String(v);
          case 'gt': case 'ge': case 'lt': case 'le': {
            if (isNull(cell)) return false;
            const cmp = compareVals(cell, v);
            return op === 'gt' ? cmp > 0 : op === 'ge' ? cmp >= 0 : op === 'lt' ? cmp < 0 : cmp <= 0;
          }
          case 'contains':   return !isNull(cell) && String(cell).includes(String(v));
          case 'startswith': return !isNull(cell) && String(cell).startsWith(String(v));
          case 'endswith':   return !isNull(cell) && String(cell).endsWith(String(v));
          default: throw new Error('unknown operator: ' + op);
        }
      };
    }

    /* ─────────── 排序 sort_values ─────────── */
    sortBy(keys) {
      const idx = keys.map(k => ({ i: this.colIdx(k.col), asc: k.asc !== false }));
      const rows = this.rows.slice().sort((a, b) => {
        for (const { i, asc } of idx) {
          const c = compareVals(a[i], b[i]);
          if (c !== 0) return asc ? c : -c;
        }
        return 0;
      });
      return new MiniFrame(this.columns, rows, this.name);
    }

    /* ─────────── 分组聚合 groupby().agg() ─────────── */
    groupby(gcols, aggs) {
      if (!gcols.length) throw new Error('no group columns');
      const gi = gcols.map(c => this.colIdx(c));
      const ai = aggs.map(a => ({ ...a, i: this.colIdx(a.col) }));
      const groups = new Map();   // key -> {keyVals, rowsIdx}
      for (let r = 0; r < this.rows.length; r++) {
        const row = this.rows[r];
        const keyVals = gi.map(i => row[i]);
        const key = keyVals.map(v => isNull(v) ? ' NaN ' : String(v)).join('');
        if (!groups.has(key)) groups.set(key, { keyVals, idx: [] });
        groups.get(key).idx.push(r);
      }
      const outCols = gcols.concat(ai.map(a => a.col + '_' + a.func));
      const outRows = [];
      for (const g of groups.values()) {
        const out = g.keyVals.map(v => isNull(v) ? null : v);
        for (const a of ai) {
          const raw = g.idx.map(r => this.rows[r][a.i]);
          const nums = raw.filter(v => !isNull(v) && typeof v === 'number');
          const numericFn = ['sum', 'mean', 'median', 'std'].includes(a.func);
          out.push(numericFn ? (nums.length ? AGG[a.func](nums, raw) : null) : AGG[a.func](nums, raw));
        }
        outRows.push(out);
      }
      // 按分组键排序，结果稳定好看
      outRows.sort((a, b) => {
        for (let i = 0; i < gcols.length; i++) {
          const c = compareVals(a[i], b[i]);
          if (c !== 0) return c;
        }
        return 0;
      });
      return new MiniFrame(outCols, outRows, this.name);
    }

    /* ─────────── 透视表 pivot_table ─────────── */
    pivot(indexCol, colCol, valCol, func, margins) {
      const ii = this.colIdx(indexCol), ci = this.colIdx(colCol), vi = this.colIdx(valCol);
      const cellMap = new Map();  // rowKey|colKey -> vals
      const rowKeys = new Map();  // key -> rawVal
      const colKeys = new Map();
      for (const row of this.rows) {
        const rv = isNull(row[ii]) ? '(NaN)' : String(row[ii]);
        const cv = isNull(row[ci]) ? '(NaN)' : String(row[ci]);
        const k = rv + '' + cv;
        if (!cellMap.has(k)) cellMap.set(k, []);
        cellMap.get(k).push(row[vi]);
        if (!rowKeys.has(rv)) rowKeys.set(rv, row[ii]);
        if (!colKeys.has(cv)) colKeys.set(cv, row[ci]);
      }
      const colVals = [...colKeys.keys()].sort();
      const rowVals = [...rowKeys.keys()].sort((a, b) => compareVals(rowKeys.get(a), rowKeys.get(b)));
      const aggOf = vals => {
        const nums = vals.filter(v => !isNull(v) && typeof v === 'number');
        const numericFn = ['sum', 'mean', 'median', 'std'].includes(func);
        return numericFn ? (nums.length ? AGG[func](nums, vals) : null) : AGG[func](nums, vals);
      };
      const outCols = [indexCol].concat(colVals);
      if (margins) outCols.push('All');
      const outRows = [];
      const colAggAll = new Map(); // colKey -> all vals (margins)
      for (const rv of rowVals) {
        const out = [rowKeys.get(rv)];
        let allVals = [];
        for (const cv of colVals) {
          const vals = cellMap.get(rv + '' + cv) || [];
          out.push(vals.length ? aggOf(vals) : null);
          if (!colAggAll.has(cv)) colAggAll.set(cv, []);
          colAggAll.get(cv).push(...vals);
          allVals.push(...vals);
        }
        if (margins) out.push(allVals.length ? aggOf(allVals) : null);
        outRows.push(out);
      }
      if (margins) {
        const allRow = ['All'];
        let everything = [];
        for (const cv of colVals) {
          const vals = colAggAll.get(cv);
          allRow.push(vals.length ? aggOf(vals) : null);
          everything.push(...vals);
        }
        allRow.push(everything.length ? aggOf(everything) : null);
        outRows.push(allRow);
      }
      return new MiniFrame(outCols, outRows, this.name);
    }

    /* ─────────── 列操作 ─────────── */
    renameCols(map) {
      const cols = this.columns.map(c => map[c] || c);
      const dup = cols.find((c, i) => cols.indexOf(c) !== i);
      if (dup) throw new Error('duplicate column after rename: ' + dup);
      return new MiniFrame(cols, this.rows.map(r => r.slice()), this.name);
    }
    dropCols(cols) {
      const keep = this.columns.map((c, i) => cols.includes(c) ? -1 : i).filter(i => i >= 0);
      if (!keep.length) throw new Error('cannot drop all columns');
      return new MiniFrame(
        keep.map(i => this.columns[i]),
        this.rows.map(r => keep.map(i => r[i])),
        this.name
      );
    }
    addCol(name, expr) {
      if (this.columns.includes(name)) throw new Error('column exists: ' + name);
      const evalFn = compileExpr(expr, this.columns);
      const newRows = this.rows.map((r, k) => {
        const val = evalFn(this._rowObj(r));
        return r.concat([val]);
      });
      return new MiniFrame(this.columns.concat([name]), newRows, this.name);
    }
    astype(col, type) {
      const i = this.colIdx(col);
      const conv = v => {
        if (isNull(v)) return null;
        switch (type) {
          case 'int':   { const n = Number(v); return Number.isNaN(n) ? null : Math.trunc(n); }
          case 'float': { const n = Number(v); return Number.isNaN(n) ? null : n; }
          case 'str':   return String(v);
          case 'date':  {
            if (isDateStr(v)) return String(v).slice(0, 10);
            const d = new Date(v);
            if (Number.isNaN(d.getTime())) return null;
            return d.toISOString().slice(0, 10);
          }
          default: throw new Error('unknown type: ' + type);
        }
      };
      const rows = this.rows.map(r => { const c = r.slice(); c[i] = conv(c[i]); return c; });
      return new MiniFrame(this.columns, rows, this.name);
    }

    /* ─────────── 缺失值 ─────────── */
    fillna(cols, method, value) {
      const idx = cols.map(c => this.colIdx(c));
      const fillVals = {};
      for (const c of cols) {
        const i = this.colIdx(c), dt = this.dtypeOf(c), vals = this.rows.map(r => r[i]).filter(v => !isNull(v));
        switch (method) {
          case 'value': {
            let v = value;
            if (dt === 'number') { v = Number(value); if (Number.isNaN(v)) throw new Error('"' + value + '" is not a number'); }
            fillVals[c] = v; break;
          }
          case 'mean':   fillVals[c] = AGG.mean(vals.filter(v => typeof v === 'number')); break;
          case 'median': fillVals[c] = AGG.median(vals.filter(v => typeof v === 'number')); break;
          case 'mode': {
            const freq = new Map();
            for (const v of vals) freq.set(String(v), (freq.get(String(v)) || 0) + 1);
            let best = null, bn = 0;
            for (const v of vals) { const n = freq.get(String(v)); if (n > bn) { bn = n; best = v; } }
            fillVals[c] = best; break;
          }
          case 'ffill': case 'bfill': fillVals[c] = null; break; // 逐行处理
          default: throw new Error('unknown method: ' + method);
        }
      }
      const rows = this.rows.map(r => r.slice());
      if (method === 'ffill' || method === 'bfill') {
        for (const i of idx) {
          if (method === 'ffill') {
            let last = null;
            for (let r = 0; r < rows.length; r++) {
              if (isNull(rows[r][i])) rows[r][i] = last; else last = rows[r][i];
            }
          } else {
            let next = null;
            for (let r = rows.length - 1; r >= 0; r--) {
              if (isNull(rows[r][i])) rows[r][i] = next; else next = rows[r][i];
            }
          }
        }
      } else {
        for (const c of cols) {
          const i = this.colIdx(c);
          for (let r = 0; r < rows.length; r++) if (isNull(rows[r][i])) rows[r][i] = fillVals[c];
        }
      }
      return new MiniFrame(this.columns, rows, this.name);
    }
    dropna(subset, how) {
      const idx = (subset && subset.length ? subset : this.columns).map(c => this.colIdx(c));
      const rows = this.rows.filter(r => {
        const nulls = idx.filter(i => isNull(r[i])).length;
        return how === 'all' ? nulls < idx.length : nulls === 0;
      });
      return new MiniFrame(this.columns, rows, this.name);
    }

    /* ─────────── 去重 ─────────── */
    dropDups(subset, keep) {
      const idx = (subset && subset.length ? subset : this.columns).map(c => this.colIdx(c));
      const seen = new Set(), out = [];
      const rows = keep === 'last' ? [...this.rows].reverse() : this.rows;
      for (const r of rows) {
        const key = idx.map(i => isNull(r[i]) ? ' NaN ' : String(r[i])).join('');
        if (!seen.has(key)) { seen.add(key); out.push(r); }
      }
      if (keep === 'last') out.reverse();
      return new MiniFrame(this.columns, out, this.name);
    }

    /* ─────────── 截取 / 抽样 ─────────── */
    head(n) { return new MiniFrame(this.columns, this.rows.slice(0, n), this.name); }
    tail(n) { return new MiniFrame(this.columns, this.rows.slice(Math.max(0, this.rows.length - n)), this.name); }
    sample({ n, frac, seed }) {
      const total = this.rows.length;
      let k = n;
      if (frac != null) k = Math.round(total * frac);
      k = Math.max(0, Math.min(total, k == null ? 1 : k));
      const rnd = mulberry32(seed == null ? 42 : seed);
      const idx = this.rows.map((_, i) => i);
      for (let i = idx.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [idx[i], idx[j]] = [idx[j], idx[i]];
      }
      const rows = idx.slice(0, k).sort((a, b) => a - b).map(i => this.rows[i]);
      return new MiniFrame(this.columns, rows, this.name);
    }

    /* ─────────── 值计数 value_counts ─────────── */
    valueCounts(col, topN) {
      const i = this.colIdx(col);
      const freq = new Map(), rawVal = new Map();
      for (const r of this.rows) {
        if (isNull(r[i])) continue;
        const k = String(r[i]);
        freq.set(k, (freq.get(k) || 0) + 1);
        if (!rawVal.has(k)) rawVal.set(k, r[i]);
      }
      let entries = [...freq.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
      if (topN && entries.length > topN) entries = entries.slice(0, topN);
      return new MiniFrame([col, 'count'], entries.map(([k, c]) => [rawVal.get(k), c]), this.name);
    }

    /* ─────────── 字符串 .str ─────────── */
    strOp(col, op, args, newName) {
      const i = this.colIdx(col);
      const name = newName || (col + '_' + op);
      const isNew = !this.columns.includes(name);
      const fn = v => {
        if (isNull(v)) return null;
        const s = String(v);
        switch (op) {
          case 'contains': return args.pattern ? s.includes(args.pattern) : false;
          case 'replace':  return args.pattern ? s.split(args.pattern).join(args.replacement || '') : s;
          case 'upper':    return s.toUpperCase();
          case 'lower':    return s.toLowerCase();
          case 'title':    return s.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());
          case 'len':      return s.length;
          case 'slice':    return s.slice(args.start == null ? 0 : args.start, args.end == null ? undefined : args.end);
          default: throw new Error('unknown str op: ' + op);
        }
      };
      let cols = this.columns.slice();
      if (isNew) cols.push(name);
      const ti = isNew ? cols.length - 1 : this.colIdx(name);
      const rows = this.rows.map(r => {
        const c = r.slice();
        c[ti] = fn(r[i]);
        return c;
      });
      return new MiniFrame(cols, rows, this.name);
    }

    /* ─────────── 合并 merge ─────────── */
    merge(other, leftOn, rightOn, how) {
      const li = this.colIdx(leftOn), ri = other.colIdx(rightOn);
      const sameKey = leftOn === rightOn;
      // 右侧列名去重：与左侧冲突的非键列加 _y，左侧加 _x
      const leftCols = this.columns.map(c =>
        (!sameKey && c === leftOn) ? c : (other.columns.includes(c) && c !== rightOn ? c + '_x' : c));
      const rightCols = other.columns.map(c =>
        (sameKey && c === rightOn) ? null : (this.columns.includes(c) ? c + '_y' : c));
      const outCols = leftCols.concat(rightCols.filter(c => c !== null));
      const rightKeep = rightCols.map((c, i) => c === null ? -1 : i).filter(i => i >= 0);

      const rIndex = new Map();
      other.rows.forEach((r, k) => {
        const key = String(r[ri]);
        if (!rIndex.has(key)) rIndex.set(key, []);
        rIndex.get(key).push(k);
      });
      const matchedRight = new Set();
      const out = [];
      const combine = (lrow, rrow) => {
        const base = lrow ? lrow.slice() : this.columns.map(() => null);
        const extra = rightKeep.map(i => rrow ? rrow[i] : null);
        return base.concat(extra);
      };
      for (const l of this.rows) {
        const hits = rIndex.get(String(l[li]));
        if (hits && hits.length) {
          for (const h of hits) { out.push(combine(l, other.rows[h])); matchedRight.add(h); }
        } else if (how === 'left' || how === 'outer') {
          out.push(combine(l, null));
        }
      }
      if (how === 'right' || how === 'outer') {
        other.rows.forEach((r, k) => {
          if (!matchedRight.has(k)) out.push(combine(null, r));
        });
      }
      return new MiniFrame(outCols, out, this.name);
    }

    /* ─────────── 相关矩阵 corr ─────────── */
    corr() {
      const cols = this.numericCols();
      const data = cols.map(c => this.col(c));
      const n = cols.length;
      const matrix = [];
      for (let i = 0; i < n; i++) {
        matrix.push([]);
        for (let j = 0; j < n; j++) {
          const pairs = [];
          for (let r = 0; r < this.rows.length; r++) {
            const a = data[i][r], b = data[j][r];
            if (!isNull(a) && !isNull(b)) pairs.push([a, b]);
          }
          if (pairs.length < 2) { matrix[i].push(null); continue; }
          const mx = pairs.reduce((s, p) => s + p[0], 0) / pairs.length;
          const my = pairs.reduce((s, p) => s + p[1], 0) / pairs.length;
          let sxy = 0, sxx = 0, syy = 0;
          for (const [a, b] of pairs) { sxy += (a - mx) * (b - my); sxx += (a - mx) ** 2; syy += (b - my) ** 2; }
          matrix[i].push(sxx === 0 || syy === 0 ? null : sxy / Math.sqrt(sxx * syy));
        }
      }
      // 以 MiniFrame 形式返回，第一列为行标签
      const outCols = ['index'].concat(cols);
      const outRows = cols.map((c, i) => [c].concat(matrix[i]));
      return { frame: new MiniFrame(outCols, outRows, 'corr'), cols, matrix };
    }

    /* ─────────── 描述统计 describe ─────────── */
    describe() {
      const stats = {};
      for (const c of this.numericCols()) {
        const vs = this.col(c).filter(v => !isNull(v));
        const sorted = [...vs].sort((a, b) => a - b);
        const q = p => {
          if (!sorted.length) return null;
          const pos = (sorted.length - 1) * p, base = Math.floor(pos), rest = pos - base;
          return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base];
        };
        stats[c] = {
          count: vs.length, mean: AGG.mean(vs), std: AGG.std(vs),
          min: sorted[0] ?? null, p25: q(0.25), p50: q(0.5), p75: q(0.75),
          max: sorted[sorted.length - 1] ?? null,
        };
      }
      return stats;
    }

    /* ─────────── 导出 ─────────── */
    toCSV() {
      const esc = v => {
        if (isNull(v)) return '';
        const s = String(v);
        return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      };
      const lines = [this.columns.map(esc).join(',')];
      for (const r of this.rows) lines.push(r.map(esc).join(','));
      return lines.join('\n');
    }
    toJSON() {
      return JSON.stringify(this.rows.map(r => this._rowObj(r)), null, 2);
    }
  }

  global.MiniFrame = MiniFrame;
  global.MF = { isNull, inferDtype, compareVals, mulberry32, AGG, AGG_NAMES, compileExpr };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MiniFrame, MF };
  }
})(typeof window !== 'undefined' ? window : globalThis);
