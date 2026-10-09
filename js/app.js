/* ════════════════════════════════════════════════════
   PandaLab — 应用主逻辑
   状态管理 / 操作流水线 / 面板表单 / 表格 / 图表 / 代码 / 上传导出
   ════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ══════════════ 状态 ══════════════ */
  const state = {
    datasets: {},          // key -> {frame, file, builtin, nameKey?}
    currentKey: null,
    steps: [],             // [{op, params}]
    history: [],           // [baseFrame, f1, f2, ...]
    page: 1,
    pageSize: 50,
    headerSort: {},
    chartState: { type: 'bar', x: null, y: null, group: null, agg: 'sum', bins: 15 },
  };

  const $ = id => document.getElementById(id);
  const frame = () => state.history[state.history.length - 1];
  const base = () => state.history[0];

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fmtNum(v) {
    if (Number.isInteger(v)) return v.toLocaleString('en-US');
    return String(+v.toFixed(4));
  }
  function fmtCell(v) {
    if (MF.isNull(v)) return { text: 'NaN', cls: 'cell-null' };
    if (typeof v === 'number') return { text: fmtNum(v), cls: 'num' };
    if (typeof v === 'boolean') return { text: v ? 'True' : 'False', cls: '' };
    return { text: String(v), cls: '' };
  }
  const DTYPE_ICON = { number: '#', string: 'A', date: '📅', boolean: '⊤', mixed: '◧' };

  /* ══════════════ Toast ══════════════ */
  function toast(msg, kind) {
    const wrap = $('toastWrap');
    const d = el('div', 'toast' + (kind ? ' ' + kind : ''), msg);
    wrap.appendChild(d);
    setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 350); }, 2600);
  }

  /* ══════════════ 模态框 ══════════════ */
  function openModal(title, bodyEl, footEl) {
    $('modalTitle').textContent = title;
    const body = $('modalBody'); body.innerHTML = ''; body.appendChild(bodyEl);
    const foot = $('modalFoot'); foot.innerHTML = '';
    if (footEl) foot.appendChild(footEl);
    $('modalOverlay').classList.add('open');
  }
  function closeModal() { $('modalOverlay').classList.remove('open'); }

  /* ══════════════ 操作注册表 ══════════════ */
  const OPERATORS = ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'contains', 'startswith', 'endswith', 'isnull', 'notnull'];
  const STR_OPS = ['contains', 'replace', 'upper', 'lower', 'title', 'len', 'slice'];
  const FILL_METHODS = ['value', 'mean', 'median', 'mode', 'ffill', 'bfill'];
  const AGG_LIST = ['sum', 'mean', 'median', 'count', 'min', 'max', 'std', 'nunique', 'first', 'last'];

  const OPS = {
    filter: {
      cat: 'transform', icon: '🔍', code: 'query',
      apply: (f, p) => f.filter(p.conds, p.logic),
      summary: p => p.conds.map(c => c.col + ' ' + opSymbol(c.op) + (c.op === 'isnull' || c.op === 'notnull' ? '' : ' ' + c.value)).join(p.logic === 'or' ? ' | ' : ' & '),
      build: buildFilter,
    },
    sort: {
      cat: 'transform', icon: '⇅', code: 'sort_values',
      apply: (f, p) => f.sortBy(p.keys),
      summary: p => p.keys.map(k => k.col + (k.asc ? ' ↑' : ' ↓')).join(', '),
      build: buildSort,
    },
    slice: {
      cat: 'transform', icon: '✂️', code: 'head·tail·sample',
      apply: (f, p) => p.mode === 'head' ? f.head(p.n) : p.mode === 'tail' ? f.tail(p.n) : f.sample(p),
      summary: p => p.mode === 'sample' ? 'sample ' + (p.frac != null ? Math.round(p.frac * 100) + '%' : p.n) : p.mode + ' ' + p.n,
      build: buildSlice,
    },
    addcol: {
      cat: 'transform', icon: '➕', code: 'assign',
      apply: (f, p) => f.addCol(p.name, p.expr),
      summary: p => p.name + ' = ' + p.expr,
      build: buildAddcol,
    },
    strop: {
      cat: 'transform', icon: '🔤', code: '.str',
      apply: (f, p) => f.strOp(p.col, p.strOp, p, p.newName),
      summary: p => p.col + '.' + p.strOp + '()',
      build: buildStrop,
    },
    fillna: {
      cat: 'clean', icon: '🧩', code: 'fillna',
      apply: (f, p) => f.fillna(p.cols, p.method, p.value),
      summary: p => p.cols.join(',') + ' ← ' + (p.method === 'value' ? p.value : p.method),
      build: buildFillna,
    },
    dropna: {
      cat: 'clean', icon: '🗑️', code: 'dropna',
      apply: (f, p) => f.dropna(p.subset, p.how),
      summary: p => p.how + (p.subset.length ? ' · ' + p.subset.join(',') : ''),
      build: buildDropna,
    },
    dedup: {
      cat: 'clean', icon: '👯', code: 'drop_duplicates',
      apply: (f, p) => f.dropDups(p.subset, p.keep),
      summary: p => (p.subset.length ? p.subset.join(',') : '*') + ' · ' + p.keep,
      build: buildDedup,
    },
    astype: {
      cat: 'clean', icon: '🔄', code: 'astype',
      apply: (f, p) => f.astype(p.col, p.type),
      summary: p => p.col + ' → ' + p.type,
      build: buildAstype,
    },
    rename: {
      cat: 'clean', icon: '✏️', code: 'rename',
      apply: (f, p) => f.renameCols(p.map),
      summary: p => Object.entries(p.map).map(([a, b]) => a + '→' + b).join(', '),
      build: buildRename,
    },
    dropcol: {
      cat: 'clean', icon: '❌', code: 'drop',
      apply: (f, p) => f.dropCols(p.cols),
      summary: p => p.cols.join(', '),
      build: buildDropcol,
    },
    groupby: {
      cat: 'reshape', icon: '📊', code: 'groupby',
      apply: (f, p) => f.groupby(p.groupCols, p.aggs),
      summary: p => 'by ' + p.groupCols.join(',') + ' · ' + p.aggs.map(a => a.func + '(' + a.col + ')').join(','),
      build: buildGroupby,
    },
    pivot: {
      cat: 'reshape', icon: '🔀', code: 'pivot_table',
      apply: (f, p) => f.pivot(p.index, p.columns, p.values, p.aggfunc, p.margins),
      summary: p => p.index + ' × ' + p.columns,
      build: buildPivot,
    },
    valuecounts: {
      cat: 'reshape', icon: '🔢', code: 'value_counts',
      apply: (f, p) => f.valueCounts(p.col, p.topN),
      summary: p => p.col + (p.topN ? ' top' + p.topN : ''),
      build: buildValueCounts,
    },
    merge: {
      cat: 'combine', icon: '🔗', code: 'merge',
      apply: (f, p) => {
        const other = state.datasets[p.other];
        if (!other) throw new Error(t('err.needOther'));
        return f.merge(other.frame, p.leftOn, p.rightOn, p.how);
      },
      summary: p => p.how + ' ⨝ ' + p.other + ' on ' + p.leftOn,
      build: buildMerge,
    },
    corr: {
      cat: 'stats', icon: '🌡️', code: 'corr',
      apply: f => f.corr().frame,
      summary: () => 'corr()',
      build: buildCorr,
    },
  };
  const CATS = [
    { key: 'transform', icon: '🧭' },
    { key: 'clean', icon: '🧹' },
    { key: 'reshape', icon: '📐' },
    { key: 'combine', icon: '🔗' },
    { key: 'stats', icon: '📈' },
  ];
  function opSymbol(op) {
    return { eq: '=', ne: '≠', gt: '>', ge: '≥', lt: '<', le: '≤', contains: '∋', startswith: '^', endswith: '$', isnull: '∅', notnull: '!∅' }[op] || op;
  }

  /* ══════════════ 面板通用构件 ══════════════ */
  function fld(label, control, hint) {
    const w = el('div', 'fld');
    const l = el('label', null, label);
    if (hint) { const h = el('span', 'hint', hint); l.appendChild(document.createTextNode(' ')); l.appendChild(h); }
    w.appendChild(l); w.appendChild(control);
    return w;
  }
  function selectOf(options, value) {
    const s = el('select', 'select');
    for (const o of options) {
      const opt = el('option', null, o.label);
      opt.value = o.value;
      s.appendChild(opt);
    }
    if (value !== undefined) s.value = value;
    return s;
  }
  function colOptions(f, pred) {
    const dt = f.dtypes();
    return f.columns.filter(c => !pred || pred(dt[c], c))
      .map(c => ({ value: c, label: c + '  ' + (DTYPE_ICON[dt[c]] || '') }));
  }
  function colSelect(f, pred) { return selectOf(colOptions(f, pred)); }
  function numInput(val, min, max) {
    const i = el('input', 'input'); i.type = 'number'; i.value = val;
    if (min !== undefined) i.min = min; if (max !== undefined) i.max = max;
    return i;
  }
  function txtInput(val, ph) {
    const i = el('input', 'input'); i.type = 'text';
    if (val !== undefined) i.value = val; if (ph) i.placeholder = ph;
    return i;
  }
  function radioGroup(name, options, value) {
    const g = el('div', 'radio-group');
    for (const o of options) {
      const lab = el('label', 'check-row');
      const r = el('input'); r.type = 'radio'; r.name = name; r.value = o.value;
      if (o.value === value) r.checked = true;
      lab.appendChild(r); lab.appendChild(document.createTextNode(o.label));
      g.appendChild(lab);
    }
    g.getValue = () => { const c = g.querySelector('input:checked'); return c ? c.value : null; };
    return g;
  }
  /* 列多选 chips */
  function colPicker(f, pred) {
    const box = el('div', 'col-picker');
    const dt = f.dtypes();
    f.columns.filter(c => !pred || pred(dt[c], c)).forEach(c => {
      const chip = el('span', 'col-pick');
      chip.dataset.col = c;
      chip.innerHTML = esc(c) + '<span class="dt-icon">' + (DTYPE_ICON[dt[c]] || '') + '</span>';
      chip.onclick = () => chip.classList.toggle('on');
      box.appendChild(chip);
    });
    box.getValue = () => [...box.querySelectorAll('.col-pick.on')].map(c => c.dataset.col);
    return box;
  }

  /* ── 各操作的面板表单 ── */
  function buildFilter(body, f) {
    const list = el('div'); list.style.cssText = 'display:flex;flex-direction:column;gap:8px';
    function addRow() {
      const row = el('div', 'cond-row');
      const cs = colSelect(f);
      const os = selectOf(OPERATORS.map(o => ({ value: o, label: t('op.' + o) })), 'eq');
      const vs = txtInput('', t('form.value'));
      os.onchange = () => { vs.disabled = ['isnull', 'notnull'].includes(os.value); };
      const x = el('button', 'btn-x', '✕'); x.onclick = () => row.remove();
      row.append(cs, os, vs, x);
      list.appendChild(row);
    }
    addRow();
    const logic = radioGroup('logic', [{ value: 'and', label: t('form.and') }, { value: 'or', label: t('form.or') }], 'and');
    body.appendChild(fld(t('form.conds'), list));
    const addBtn = el('button', 'btn-add', t('form.addCond')); addBtn.onclick = addRow;
    body.appendChild(addBtn);
    body.appendChild(fld(t('form.logic'), logic));
    return () => {
      const conds = [...list.querySelectorAll('.cond-row')].map(r => {
        const [cs, os, vs] = r.querySelectorAll('select,input');
        return { col: cs.value, op: os.value, value: vs.value };
      }).filter(c => ['isnull', 'notnull'].includes(c.op) || String(c.value).trim() !== '');
      if (!conds.length) throw new Error(t('err.needCond'));
      return { conds, logic: logic.getValue() };
    };
  }

  function buildSort(body, f) {
    const list = el('div'); list.style.cssText = 'display:flex;flex-direction:column;gap:8px';
    function addRow() {
      const row = el('div', 'cond-row');
      const cs = colSelect(f);
      const as = selectOf([{ value: 'asc', label: t('form.asc') + ' ↑' }, { value: 'desc', label: t('form.desc') + ' ↓' }]);
      const x = el('button', 'btn-x', '✕'); x.onclick = () => row.remove();
      row.append(cs, as, x);
      list.appendChild(row);
    }
    addRow();
    body.appendChild(fld(t('form.sortKeys'), list));
    const addBtn = el('button', 'btn-add', t('form.addSort')); addBtn.onclick = addRow;
    body.appendChild(addBtn);
    return () => {
      const keys = [...list.querySelectorAll('.cond-row')].map(r => {
        const [cs, as] = r.querySelectorAll('select');
        return { col: cs.value, asc: as.value === 'asc' };
      });
      if (!keys.length) throw new Error(t('err.needCol'));
      return { keys };
    };
  }

  function buildSlice(body, f) {
    const mode = radioGroup('slicemode', [
      { value: 'head', label: t('slice.head') },
      { value: 'tail', label: t('slice.tail') },
      { value: 'sample', label: t('slice.sample') },
    ], 'head');
    const n = numInput(10, 1);
    const frac = numInput('', 1, 100); frac.placeholder = '%  (1-100)';
    const seed = numInput(42, 0);
    const fracFld = fld(t('form.n') + ' %', frac); fracFld.style.display = 'none';
    mode.addEventListener('change', () => {
      const m = mode.getValue();
      fracFld.style.display = m === 'sample' ? '' : 'none';
      seed.parentNode.style.display = m === 'sample' ? '' : 'none';
    });
    body.appendChild(fld(t('slice.mode'), mode));
    const row = el('div', 'fld-row');
    const nFld = fld(t('form.n'), n); row.appendChild(nFld);
    const seedFld = fld(t('form.seed'), seed); seedFld.style.display = 'none';
    body.appendChild(row);
    body.appendChild(fracFld);
    body.appendChild(seedFld);
    return () => {
      const m = mode.getValue();
      const p = { mode: m, n: Math.max(1, parseInt(n.value) || 10), frac: null, seed: parseInt(seed.value) || 42 };
      if (m === 'sample' && frac.value !== '') p.frac = Math.min(1, Math.max(0, (+frac.value) / 100));
      return p;
    };
  }

  function buildAddcol(body, f) {
    const name = txtInput('', t('form.newName'));
    const expr = txtInput('', f.columns.slice(0, 2).join(' * '));
    body.appendChild(fld(t('form.newName'), name));
    body.appendChild(fld(t('form.expr'), expr, t('form.exprHint')));
    return () => {
      const n = name.value.trim(), e = expr.value.trim();
      if (!n) throw new Error(t('err.needName'));
      if (f.columns.includes(n)) throw new Error(t('err.dupName'));
      if (!e) throw new Error(t('err.expr', { msg: 'empty' }));
      return { name: n, expr: e };
    };
  }

  function buildStrop(body, f) {
    const strCols = d => d === 'string' || d === 'mixed' || d === 'date';
    const cs = colSelect(f, strCols);
    const os = selectOf(STR_OPS.map(o => ({ value: o, label: t('str.' + o) })), 'upper');
    const pat = txtInput('', t('str.pattern'));
    const rep = txtInput('', t('str.replacement'));
    const st = numInput(0); const en = numInput('');
    const newName = txtInput('', t('str.target'));
    const dyn = el('div'); dyn.style.cssText = 'display:flex;flex-direction:column;gap:14px';
    function refresh() {
      dyn.innerHTML = '';
      const o = os.value;
      if (o === 'contains' || o === 'replace') dyn.appendChild(fld(t('str.pattern'), pat));
      if (o === 'replace') dyn.appendChild(fld(t('str.replacement'), rep));
      if (o === 'slice') { const r = el('div', 'fld-row'); r.append(fld(t('str.start'), st), fld(t('str.end'), en)); dyn.appendChild(r); }
      newName.placeholder = cs.value + '_' + o;
    }
    os.onchange = refresh; cs.onchange = refresh; refresh();
    body.appendChild(fld(t('form.column'), cs));
    body.appendChild(fld(t('str.op'), os));
    body.appendChild(dyn);
    body.appendChild(fld(t('str.target') + ' ' + t('form.optional'), newName));
    return () => {
      const o = os.value;
      const p = { col: cs.value, strOp: o, pattern: pat.value, replacement: rep.value };
      if (o === 'slice') { p.start = parseInt(st.value) || 0; p.end = en.value === '' ? null : parseInt(en.value); }
      if ((o === 'contains' || o === 'replace') && !p.pattern) throw new Error(t('err.needValue'));
      p.newName = newName.value.trim() || (p.col + '_' + o);
      return p;
    };
  }

  function buildFillna(body, f) {
    const picker = colPicker(f);
    const method = radioGroup('fillm', FILL_METHODS.map(m => ({ value: m, label: t('fillna.' + m) })), 'mean');
    const val = txtInput('', '0');
    const valFld = fld(t('form.value'), val); valFld.style.display = 'none';
    method.addEventListener('change', () => { valFld.style.display = method.getValue() === 'value' ? '' : 'none'; });
    body.appendChild(fld(t('form.columns'), picker));
    body.appendChild(fld(t('form.method'), method));
    body.appendChild(valFld);
    return () => {
      const cols = picker.getValue();
      if (!cols.length) throw new Error(t('err.needCol'));
      const m = method.getValue();
      if (m === 'value' && val.value === '') throw new Error(t('err.needValue'));
      return { cols, method: m, value: val.value };
    };
  }

  function buildDropna(body, f) {
    const how = radioGroup('dropnahow', [{ value: 'any', label: t('dropna.any') }, { value: 'all', label: t('dropna.all') }], 'any');
    const picker = colPicker(f);
    body.appendChild(fld(t('form.how'), how));
    body.appendChild(fld(t('dropna.subset'), picker));
    return () => ({ subset: picker.getValue(), how: how.getValue() });
  }

  function buildDedup(body, f) {
    const picker = colPicker(f);
    const keep = radioGroup('dupkeep', [{ value: 'first', label: t('form.keepFirst') }, { value: 'last', label: t('form.keepLast') }], 'first');
    body.appendChild(fld(t('form.columns') + ' ' + t('form.optional'), picker));
    body.appendChild(fld(t('form.keep'), keep));
    return () => ({ subset: picker.getValue(), keep: keep.getValue() });
  }

  function buildAstype(body, f) {
    const cs = colSelect(f);
    const ts = selectOf(['int', 'float', 'str', 'date'].map(x => ({ value: x, label: t('astype.' + x) })), 'float');
    body.appendChild(fld(t('form.column'), cs));
    body.appendChild(fld(t('form.type'), ts));
    return () => ({ col: cs.value, type: ts.value });
  }

  function buildRename(body, f) {
    const box = el('div'); box.style.cssText = 'display:flex;flex-direction:column;gap:8px';
    f.columns.forEach(c => {
      const row = el('div', 'fld-row');
      const lab = el('div', null, c); lab.style.cssText = 'flex:1;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
      const inp = txtInput('', c); inp.dataset.col = c;
      row.append(lab, inp);
      box.appendChild(row);
    });
    body.appendChild(fld(t('op.rename.name'), box, t('form.optional')));
    return () => {
      const map = {};
      box.querySelectorAll('input').forEach(i => {
        const v = i.value.trim();
        if (v && v !== i.dataset.col) map[i.dataset.col] = v;
      });
      if (!Object.keys(map).length) throw new Error(t('err.needName'));
      const news = Object.values(map);
      if (new Set(news).size !== news.length) throw new Error(t('err.dupName'));
      const unchanged = f.columns.filter(c => !map[c]);
      if (news.some(n => unchanged.includes(n))) throw new Error(t('err.dupName'));
      return { map };
    };
  }

  function buildDropcol(body, f) {
    const picker = colPicker(f);
    body.appendChild(fld(t('form.columns'), picker));
    return () => {
      const cols = picker.getValue();
      if (!cols.length) throw new Error(t('err.needCol'));
      if (cols.length >= f.columns.length) throw new Error(t('err.needCol'));
      return { cols };
    };
  }

  function buildGroupby(body, f) {
    const picker = colPicker(f, d => d !== 'number');
    const list = el('div'); list.style.cssText = 'display:flex;flex-direction:column;gap:8px';
    function addRow() {
      const row = el('div', 'agg-row');
      const cs = colSelect(f);
      const fs = selectOf(AGG_LIST.map(a => ({ value: a, label: t('agg.' + a) })), 'sum');
      const x = el('button', 'btn-x', '✕'); x.onclick = () => row.remove();
      row.append(cs, fs, x);
      list.appendChild(row);
    }
    addRow();
    body.appendChild(fld(t('form.groupCols'), picker));
    body.appendChild(fld(t('form.aggs'), list));
    const addBtn = el('button', 'btn-add', t('form.addAgg')); addBtn.onclick = addRow;
    body.appendChild(addBtn);
    return () => {
      const groupCols = picker.getValue();
      if (!groupCols.length) throw new Error(t('err.needCol'));
      const aggs = [...list.querySelectorAll('.agg-row')].map(r => {
        const [cs, fs] = r.querySelectorAll('select');
        return { col: cs.value, func: fs.value };
      }).filter(a => !groupCols.includes(a.col) || ['count', 'nunique'].includes(a.func));
      if (!aggs.length) throw new Error(t('err.needAgg'));
      return { groupCols, aggs };
    };
  }

  function buildPivot(body, f) {
    const catCols = d => d !== 'number';
    const is = colSelect(f, catCols);
    const cs = colSelect(f, catCols);
    const vs = colSelect(f, d => d === 'number');
    const as = selectOf(['sum', 'mean', 'count', 'min', 'max', 'median', 'std'].map(a => ({ value: a, label: t('agg.' + a) })), 'sum');
    const mg = el('input'); mg.type = 'checkbox'; mg.checked = true;
    const mgRow = el('label', 'check-row'); mgRow.append(mg, document.createTextNode(t('form.margins')));
    body.appendChild(fld(t('form.pivIndex'), is));
    body.appendChild(fld(t('form.pivCols'), cs));
    body.appendChild(fld(t('form.pivVals'), vs));
    body.appendChild(fld(t('form.aggFunc'), as));
    body.appendChild(mgRow);
    return () => {
      if (is.value === cs.value) throw new Error(t('err.needCol'));
      if (!vs.value) throw new Error(t('err.noNumeric'));
      return { index: is.value, columns: cs.value, values: vs.value, aggfunc: as.value, margins: mg.checked };
    };
  }

  function buildValueCounts(body, f) {
    const cs = colSelect(f);
    const n = numInput('', 1); n.placeholder = t('form.optional');
    body.appendChild(fld(t('form.column'), cs));
    body.appendChild(fld('Top N', n));
    return () => ({ col: cs.value, topN: n.value === '' ? null : Math.max(1, parseInt(n.value)) });
  }

  function buildMerge(body, f) {
    const others = Object.keys(state.datasets).filter(k => k !== state.currentKey);
    if (!others.length) { body.appendChild(el('div', 'hint', t('err.needOther'))); return () => { throw new Error(t('err.needOther')); }; }
    const os = selectOf(others.map(k => ({ value: k, label: datasetLabel(k) })), others[0]);
    const lo = colSelect(f);
    const roBox = el('div');
    function refreshRO() {
      roBox.innerHTML = '';
      roBox.appendChild(colSelect(state.datasets[os.value].frame));
    }
    os.onchange = refreshRO; refreshRO();
    const how = selectOf(['left', 'inner', 'outer', 'right'].map(h => ({ value: h, label: t('merge.' + h) })), 'left');
    body.appendChild(fld(t('merge.other'), os));
    body.appendChild(fld(t('merge.leftOn'), lo));
    body.appendChild(fld(t('merge.rightOn'), roBox));
    body.appendChild(fld(t('merge.how'), how));
    return () => {
      const roSel = roBox.querySelector('select');
      if (!lo.value || !roSel.value) throw new Error(t('err.needKey'));
      return { other: os.value, leftOn: lo.value, rightOn: roSel.value, how: how.value };
    };
  }

  function buildCorr(body, f) {
    const n = f.numericCols().length;
    body.appendChild(el('div', 'hint', 'df.corr(numeric_only=True) — ' + n + ' ' + t('dtype.number')));
    return () => {
      if (n < 2) throw new Error(t('err.noNumeric'));
      return {};
    };
  }

  /* ══════════════ 面板控制 ══════════════ */
  let panelCollect = null;
  let panelOp = null;

  function openPanel(opKey) {
    const op = OPS[opKey];
    panelOp = opKey;
    $('panelTitle').textContent = t('op.' + opKey + '.name');
    $('panelSub').textContent = t('op.' + opKey + '.desc');
    const body = $('panelBody');
    body.innerHTML = '';
    panelCollect = op.build(body, frame());
    $('opPanel').classList.add('open');
  }
  function closePanel() { $('opPanel').classList.remove('open'); panelCollect = null; panelOp = null; }

  function applyPanel() {
    if (!panelCollect || !panelOp) return;
    let params;
    try {
      params = panelCollect();
      pushStep(panelOp, params);
      closePanel();
    } catch (e) {
      toast(e.message, 'err');
    }
  }

  /* ══════════════ 流水线 ══════════════ */
  function pushStep(opKey, params) {
    try {
      const next = OPS[opKey].apply(frame(), params);
      state.steps.push({ op: opKey, params });
      state.history.push(next);
      afterPipelineChange();
      toast(t('msg.applied', { op: t('op.' + opKey + '.name'), r: next.rows.length, c: next.columns.length }));
    } catch (e) {
      throw new Error(t('msg.opErr', { msg: e.message }));
    }
  }
  function removeStepAt(i) {
    state.steps.splice(i, 1);
    state.history = [state.history[0]];
    for (const s of state.steps) state.history.push(OPS[s.op].apply(state.history[state.history.length - 1], s.params));
    afterPipelineChange();
  }
  function undo() {
    if (!state.steps.length) { toast(t('msg.nothing'), 'warn'); return; }
    state.steps.pop(); state.history.pop();
    afterPipelineChange();
    toast(t('msg.undone'));
  }
  function resetPipeline() {
    if (!state.steps.length) return;
    state.steps = [];
    state.history = [state.history[0]];
    afterPipelineChange();
    toast(t('msg.resetDone'));
  }
  function afterPipelineChange() {
    state.page = 1;
    Charts.clear();
    $('chartEmpty').classList.remove('hidden');
    renderChips(); renderTable(); renderCode(); renderStatus();
  }

  /* ══════════════ 渲染：菜单 ══════════════ */
  function renderMenu() {
    const menu = $('opMenu');
    menu.innerHTML = '';
    for (const cat of CATS) {
      const box = el('div', 'op-cat open');
      const head = el('button', 'op-cat-head');
      head.innerHTML = '<span>' + cat.icon + '</span><span class="cat-name">' + esc(t('cat.' + cat.key)) + '</span><span class="arrow">▶</span>';
      head.onclick = () => box.classList.toggle('open');
      const items = el('div', 'op-cat-items');
      for (const [key, op] of Object.entries(OPS)) {
        if (op.cat !== cat.key) continue;
        const it = el('button', 'op-item');
        it.innerHTML = '<span class="op-ico">' + op.icon + '</span><span class="op-name">' + esc(t('op.' + key + '.name')) +
                       '</span><span class="op-code">' + esc(op.code) + '</span>';
        it.title = t('op.' + key + '.desc');
        it.onclick = () => openPanel(key);
        items.appendChild(it);
      }
      box.append(head, items);
      menu.appendChild(box);
    }
  }

  /* ══════════════ 渲染：流水线 chips ══════════════ */
  function renderChips() {
    const box = $('pipelineChips');
    box.innerHTML = '';
    if (!state.steps.length) {
      box.appendChild(el('span', 'pipeline-empty', t('pipe.empty')));
      return;
    }
    state.steps.forEach((s, i) => {
      const chip = el('span', 'chip');
      const label = t('op.' + s.op + '.name') + ' · ' + OPS[s.op].summary(s.params);
      chip.title = label;
      chip.appendChild(el('span', 'chip-idx', String(i + 1)));
      chip.appendChild(el('span', null, label.length > 42 ? label.slice(0, 42) + '…' : label));
      const x = el('button', 'chip-x', '✕');
      x.onclick = () => removeStepAt(i);
      chip.appendChild(x);
      box.appendChild(chip);
    });
  }

  /* ══════════════ 渲染：数据表 ══════════════ */
  function renderTable() {
    const f = frame();
    const tbl = $('dataTable');
    tbl.innerHTML = '';
    const dt = f.dtypes();

    const thead = el('thead');
    const htr = el('tr');
    htr.appendChild(el('th', null, ''));
    f.columns.forEach(c => {
      const th = el('th');
      th.innerHTML = esc(c) + '<span class="dt-icon">' + (DTYPE_ICON[dt[c]] || '') + '</span>';
      th.title = c + ' : ' + t('dtype.' + dt[c]);
      th.onclick = () => {
        // 同一列交替升序/降序
        const asc = (state.headerSort[c] = state.headerSort[c] !== true);
        try { pushStep('sort', { keys: [{ col: c, asc }] }); } catch (e) {}
      };
      htr.appendChild(th);
    });
    thead.appendChild(htr);
    tbl.appendChild(thead);

    const total = f.rows.length;
    const pages = Math.max(1, Math.ceil(total / state.pageSize));
    if (state.page > pages) state.page = pages;
    const start = (state.page - 1) * state.pageSize;
    const rows = f.rows.slice(start, start + state.pageSize);

    const tbody = el('tbody');
    if (!rows.length) {
      const tr = el('tr');
      const td = el('td', 'table-empty', '∅');
      td.colSpan = f.columns.length + 1;
      tr.appendChild(td); tbody.appendChild(tr);
    }
    rows.forEach((r, k) => {
      const tr = el('tr');
      tr.appendChild(el('td', 'row-idx', String(start + k)));
      r.forEach(v => {
        const c = fmtCell(v);
        const td = el('td', c.cls || null, c.text);
        if (c.text.length > 40) td.title = c.text;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);

    $('pageInfo').textContent = t('pager.info', { page: state.page, pages, rows: total });
    $('btnPrev').disabled = state.page <= 1;
    $('btnNext').disabled = state.page >= pages;
  }

  /* ══════════════ 渲染：状态栏 ══════════════ */
  function renderStatus() {
    const f = frame();
    $('statusShape').textContent = t('status.rows', { r: f.rows.length, c: f.columns.length });
    $('statusNulls').textContent = t('status.nulls', { n: f.nullCount() });
    const ds = state.datasets[state.currentKey];
    $('statusSource').textContent = t('status.source', {
      name: datasetLabel(state.currentKey) + ' (' + t(ds.builtin ? 'status.builtin' : 'status.uploaded') + ')',
    });
  }

  /* ══════════════ 渲染：代码 ══════════════ */
  function renderCode() {
    const ds = state.datasets[state.currentKey];
    const code = PandasGen.genAll({
      baseFile: ds.file,
      baseNote: datasetLabel(state.currentKey),
      steps: state.steps,
      history: state.history,
      otherFiles: state.steps.map(s => s.op === 'merge' ? (state.datasets[s.params.other] || {}).file : null),
      opName: op => t('op.' + op + '.name'),
    });
    $('codeView').innerHTML = highlightPy(code);
  }
  function highlightPy(src) {
    return esc(src).split('\n').map(line => {
      if (/^\s*#/.test(line)) return '<span class="cm">' + line + '</span>';
      return line
        .replace(/('(?:[^'\\]|\\.)*')/g, '<span class="st">$1</span>')
        .replace(/\b(import|as|for|in|if|else|return|True|False|None)\b/g, '<span class="kw">$1</span>')
        .replace(/\b(pd|df2?)\b/g, '<span class="fn">$1</span>')
        .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="num">$1</span>');
    }).join('\n');
  }

  /* ══════════════ 数据集 ══════════════ */
  function datasetLabel(key) {
    const ds = state.datasets[key];
    if (ds) return ds.builtin ? t(ds.nameKey) : ds.file;
    const def = BuiltinDatasets[key];
    return def ? t(def.nameKey) : key;
  }
  function loadBuiltin(key) {
    const def = BuiltinDatasets[key];
    state.datasets[key] = {
      frame: def.create(), file: def.file, builtin: true,
      nameKey: def.nameKey, descKey: def.descKey,
    };
  }
  function switchDataset(key) {
    if (!state.datasets[key]) loadBuiltin(key);
    state.currentKey = key;
    state.steps = [];
    state.history = [state.datasets[key].frame];
    state.page = 1;
    state.chartState.x = null; state.chartState.y = null; state.chartState.group = null;
    Charts.clear();
    $('chartEmpty').classList.remove('hidden');
    renderDatasetSelect();
    renderChips(); renderTable(); renderCode(); renderStatus();
    closePanel();
  }
  function renderDatasetSelect() {
    const sel = $('datasetSelect');
    sel.innerHTML = '';
    const keys = Object.keys(state.datasets);
    for (const key of Object.keys(BuiltinDatasets)) if (!keys.includes(key)) keys.push(key);
    for (const key of keys) {
      const opt = el('option', null, datasetLabel(key));
      opt.value = key;
      if (key === state.currentKey) opt.selected = true;
      sel.appendChild(opt);
    }
  }

  /* ══════════════ 上传 / 导出 ══════════════ */
  function registerFrame(name, file, f) {
    let key = name.replace(/[^\w-]/g, '_');
    let k = key, i = 2;
    while (state.datasets[k]) k = key + '_' + i++;
    state.datasets[k] = { frame: f, file, builtin: false };
    switchDataset(k);
    toast(t('up.ok', { name: file, r: f.rows.length, c: f.columns.length }));
  }
  function cleanCell(v) { return v === '' ? null : v; }

  function parseFile(file) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const baseName = file.name.replace(/\.[^.]+$/, '');
    if (['csv', 'tsv', 'txt'].includes(ext)) {
      Papa.parse(file, {
        header: true, dynamicTyping: true, skipEmptyLines: 'greedy',
        complete: res => {
          try {
            const f = MiniFrame.fromObjects(res.data.map(o => {
              const oo = {}; for (const k of Object.keys(o)) oo[k] = cleanCell(o[k]); return oo;
            }), baseName);
            if (!f.columns.length) throw new Error(t('up.noHeader'));
            registerFrame(baseName, file.name, f);
          } catch (e) { toast(t('up.err', { msg: e.message }), 'err'); }
        },
        error: err => toast(t('up.err', { msg: err.message }), 'err'),
      });
    } else if (ext === 'json') {
      const rd = new FileReader();
      rd.onload = () => {
        try {
          let data = JSON.parse(rd.result);
          if (!Array.isArray(data)) data = data.data || data.rows || [data];
          registerFrame(baseName, file.name, MiniFrame.fromObjects(data, baseName));
        } catch (e) { toast(t('up.err', { msg: e.message }), 'err'); }
      };
      rd.readAsText(file);
    } else if (['xlsx', 'xls'].includes(ext)) {
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const wb = XLSX.read(new Uint8Array(rd.result), { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
          if (!aoa.length) throw new Error('empty sheet');
          const cols = aoa[0].map((c, i) => c == null ? 'col_' + (i + 1) : String(c));
          const rows = aoa.slice(1).filter(r => r.some(v => v !== null)).map(r => cols.map((_, i) => cleanCell(r[i])));
          registerFrame(baseName, file.name, new MiniFrame(cols, rows, baseName));
        } catch (e) { toast(t('up.err', { msg: e.message }), 'err'); }
      };
      rd.readAsArrayBuffer(file);
    } else {
      toast(t('up.err', { msg: '.' + ext }), 'err');
    }
  }

  function openUploadModal() {
    const body = el('div');
    const zone = el('div', 'upload-zone');
    zone.innerHTML = '<span class="uz-icon">📂</span><div>' + esc(t('up.zone')) + '</div><div class="hint" style="margin-top:6px">' + esc(t('up.zoneTypes')) + '</div>';
    const fileInput = el('input'); fileInput.type = 'file'; fileInput.accept = '.csv,.tsv,.txt,.json,.xlsx,.xls';
    fileInput.style.display = 'none';
    zone.onclick = () => fileInput.click();
    fileInput.onchange = () => { if (fileInput.files[0]) { parseFile(fileInput.files[0]); closeModal(); } };
    const or = el('div', 'upload-or', t('up.or'));
    const ta = el('textarea', 'input'); ta.placeholder = t('up.pastePh');
    body.append(zone, fileInput, or, ta);
    const foot = el('div');
    const parseBtn = el('button', 'btn btn-primary', t('up.parse'));
    parseBtn.onclick = () => {
      if (!ta.value.trim()) return;
      const res = Papa.parse(ta.value, { header: true, dynamicTyping: true, skipEmptyLines: 'greedy' });
      try {
        const f = MiniFrame.fromObjects(res.data.map(o => {
          const oo = {}; for (const k of Object.keys(o)) oo[k] = cleanCell(o[k]); return oo;
        }), 'pasted');
        if (!f.columns.length) throw new Error(t('up.noHeader'));
        closeModal();
        registerFrame('pasted', 'pasted.csv', f);
      } catch (e) { toast(t('up.err', { msg: e.message }), 'err'); }
    };
    foot.appendChild(parseBtn);
    openModal(t('up.title'), body, foot);
  }

  function openExportModal() {
    const f = frame();
    const body = el('div');
    body.style.cssText = 'display:flex;flex-direction:column;gap:14px';
    const fmt = radioGroup('exfmt', [{ value: 'csv', label: 'CSV' }, { value: 'json', label: 'JSON' }], 'csv');
    const name = txtInput((state.datasets[state.currentKey].file || 'data').replace(/\.[^.]+$/, '') + '_result');
    body.appendChild(fld(t('ex.format'), fmt));
    body.appendChild(fld(t('ex.filename'), name));
    const foot = el('div');
    const dl = el('button', 'btn btn-primary', t('ex.download'));
    dl.onclick = () => {
      const isCsv = fmt.getValue() === 'csv';
      const fname = (name.value.trim() || 'data') + '.' + (isCsv ? 'csv' : 'json');
      const content = isCsv ? '﻿' + f.toCSV() : f.toJSON();
      const blob = new Blob([content], { type: isCsv ? 'text/csv;charset=utf-8' : 'application/json' });
      const a = el('a');
      a.href = URL.createObjectURL(blob); a.download = fname;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      closeModal();
      toast(t('ex.ok', { name: fname }));
    };
    foot.appendChild(dl);
    openModal(t('ex.title'), body, foot);
  }

  /* ══════════════ info / describe 模态 ══════════════ */
  function openInfoModal() {
    const f = frame(), dt = f.dtypes();
    const tbl = el('table', 'stat-table');
    const head = el('tr');
    ['info.col', 'info.dtype', 'info.nonnull', 'info.nulls', 'info.unique', 'info.sample'].forEach(k => head.appendChild(el('th', null, t(k))));
    tbl.appendChild(head);
    f.columns.forEach((c, i) => {
      let nonnull = 0; const uniq = new Set(); let sample = null;
      for (const r of f.rows) {
        if (!MF.isNull(r[i])) {
          nonnull++;
          if (uniq.size < 10000) uniq.add(String(r[i]));
          if (sample === null) sample = r[i];
        }
      }
      const tr = el('tr');
      [c, t('dtype.' + dt[c]), nonnull, f.rows.length - nonnull, uniq.size,
       MF.isNull(sample) ? 'NaN' : String(sample)].forEach(v => tr.appendChild(el('td', null, String(v))));
      tbl.appendChild(tr);
    });
    const body = el('div');
    body.appendChild(el('p', 'hint', t('status.rows', { r: f.rows.length, c: f.columns.length })));
    body.appendChild(tbl);
    openModal(t('info.title'), body);
  }
  function openDescribeModal() {
    const f = frame();
    const stats = f.describe();
    const cols = Object.keys(stats);
    const body = el('div');
    if (!cols.length) { body.appendChild(el('p', 'hint', t('desc.noNumeric'))); openModal(t('desc.title'), body); return; }
    const tbl = el('table', 'stat-table');
    const head = el('tr');
    head.appendChild(el('th', null, t('desc.stat')));
    cols.forEach(c => head.appendChild(el('th', null, c)));
    tbl.appendChild(head);
    ['count', 'mean', 'std', 'min', 'p25', 'p50', 'p75', 'max'].forEach(k => {
      const tr = el('tr');
      tr.appendChild(el('td', null, t('desc.' + k)));
      cols.forEach(c => {
        const v = stats[c][k];
        tr.appendChild(el('td', null, v === null ? '—' : (typeof v === 'number' && !Number.isInteger(v) ? fmtNum(v) : String(v))));
      });
      tbl.appendChild(tr);
    });
    body.appendChild(tbl);
    openModal(t('desc.title'), body);
  }

  /* ══════════════ 图表页签 ══════════════ */
  const CHART_TYPES = ['bar', 'line', 'scatter', 'pie', 'hist', 'box', 'heatmap'];
  function renderChartControls() {
    const box = $('chartControls');
    box.innerHTML = '';
    const f = frame();
    const cs = state.chartState;
    const nums = f.numericCols(), cats = f.categoricalCols();
    if (cs.x && !f.columns.includes(cs.x)) cs.x = null;
    if (cs.y && !f.columns.includes(cs.y)) cs.y = null;
    if (cs.group && !f.columns.includes(cs.group)) cs.group = null;

    const typeSel = selectOf(CHART_TYPES.map(x => ({ value: x, label: t('chart.' + x) })), cs.type);
    typeSel.onchange = () => { cs.type = typeSel.value; renderChartControls(); };
    box.appendChild(fldInline(t('chart.type'), typeSel));

    function fldInline(label, ctrl) {
      const w = el('label', 'fld-inline');
      w.append(el('span', null, label), ctrl);
      return w;
    }
    function colSelWith(opts, cur, allowNone) {
      const list = allowNone ? [{ value: '', label: t('chart.none') }].concat(opts) : opts;
      const s = selectOf(list, cur || (list[0] && list[0].value));
      return s;
    }

    if (cs.type === 'bar' || cs.type === 'line') {
      const xs = colSelWith(colOptions(f), cs.x);
      const ys = colSelWith(colOptions(f, d => d === 'number'), cs.y);
      const ag = selectOf(['sum', 'mean', 'count', 'min', 'max'].map(a => ({ value: a, label: t('agg.' + a) })), cs.agg);
      xs.onchange = () => cs.x = xs.value; ys.onchange = () => cs.y = ys.value; ag.onchange = () => cs.agg = ag.value;
      box.append(fldInline(t('chart.x'), xs), fldInline(t('chart.y'), ys), fldInline(t('chart.agg'), ag));
    } else if (cs.type === 'pie') {
      const ls = colSelWith(colOptions(f, d => d !== 'number'), cs.x);
      const vs = colSelWith(colOptions(f, d => d === 'number'), cs.y);
      const ag = selectOf(['sum', 'mean', 'count', 'min', 'max'].map(a => ({ value: a, label: t('agg.' + a) })), cs.agg);
      ls.onchange = () => cs.x = ls.value; vs.onchange = () => cs.y = vs.value; ag.onchange = () => cs.agg = ag.value;
      box.append(fldInline(t('chart.labelCol'), ls), fldInline(t('chart.valueCol'), vs), fldInline(t('chart.agg'), ag));
    } else if (cs.type === 'scatter') {
      const xs = colSelWith(colOptions(f, d => d === 'number'), cs.x);
      const ys = colSelWith(colOptions(f, d => d === 'number'), cs.y);
      const gs = colSelWith(colOptions(f, d => d !== 'number'), cs.group, true);
      xs.onchange = () => cs.x = xs.value; ys.onchange = () => cs.y = ys.value; gs.onchange = () => cs.group = gs.value || null;
      box.append(fldInline(t('chart.x'), xs), fldInline(t('chart.y'), ys), fldInline(t('chart.group'), gs));
    } else if (cs.type === 'hist') {
      const csx = colSelWith(colOptions(f, d => d === 'number'), cs.x);
      const bins = numInput(cs.bins, 2, 60); bins.style.width = '70px';
      csx.onchange = () => cs.x = csx.value;
      bins.onchange = () => cs.bins = Math.max(2, Math.min(60, +bins.value || 15));
      box.append(fldInline(t('form.column'), csx), fldInline(t('chart.bins'), bins));
    } else if (cs.type === 'box') {
      const csx = colSelWith(colOptions(f, d => d === 'number'), cs.x);
      const gs = colSelWith(colOptions(f, d => d !== 'number'), cs.group, true);
      csx.onchange = () => cs.x = csx.value; gs.onchange = () => cs.group = gs.value || null;
      box.append(fldInline(t('form.column'), csx), fldInline(t('chart.group'), gs));
    }
    // heatmap 无需字段

    const draw = el('button', 'btn btn-primary btn-sm', t('chart.draw'));
    draw.onclick = renderChart;
    const png = el('button', 'btn btn-sm', t('chart.exportPng'));
    png.onclick = () => Charts.exportPNG('pandalab-chart.png');
    box.append(draw, png);

    // 初始化默认字段
    if (!cs.x) cs.x = (cats[0] || f.columns[0]);
    if (!cs.y) cs.y = nums[0];
  }

  function renderChart() {
    const f = frame();
    const cs = state.chartState;
    const dark = document.documentElement.dataset.theme === 'dark';
    try {
      const opts = { x: cs.x, y: cs.y, group: cs.group, agg: cs.agg, label: cs.x, value: cs.y, col: cs.x, bins: cs.bins };
      if (['bar', 'line', 'pie'].includes(cs.type) && (!cs.x || !cs.y)) throw new Error(t('chart.needNumeric'));
      Charts.render($('chartCanvas'), cs.type, f, opts, dark);
      $('chartEmpty').classList.add('hidden');
    } catch (e) {
      toast(e.message, 'err');
    }
  }

  /* ══════════════ 页签切换 ══════════════ */
  function switchTab(name) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    $('tab' + name[0].toUpperCase() + name.slice(1)).classList.add('active');
    if (name === 'chart') { renderChartControls(); Charts.resize(); }
    if (name === 'code') renderCode();
  }

  /* ══════════════ 主题 / 语言 ══════════════ */
  function initTheme() {
    let theme = null;
    try { theme = localStorage.getItem('pandalab-theme'); } catch (e) {}
    if (!theme) theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    setTheme(theme);
  }
  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    $('btnTheme').textContent = theme === 'dark' ? '☀️' : '🌙';
    try { localStorage.setItem('pandalab-theme', theme); } catch (e) {}
  }
  function toggleTheme() {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    Charts.clear(); $('chartEmpty').classList.remove('hidden');
  }
  function refreshLangBtn() { $('btnLang').textContent = Lang.current === 'zh' ? 'EN' : '中文'; }

  /* ══════════════ 拖拽加载 ══════════════ */
  function initDragDrop() {
    const mask = $('dropMask');
    let depth = 0;
    window.addEventListener('dragenter', e => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) { depth++; mask.classList.add('show'); }
    });
    window.addEventListener('dragleave', () => { if (--depth <= 0) { depth = 0; mask.classList.remove('show'); } });
    window.addEventListener('dragover', e => e.preventDefault());
    window.addEventListener('drop', e => {
      e.preventDefault(); depth = 0; mask.classList.remove('show');
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) parseFile(file);
    });
  }

  /* ══════════════ 事件绑定 ══════════════ */
  function bindEvents() {
    $('datasetSelect').onchange = e => switchDataset(e.target.value);
    $('btnUpload').onclick = openUploadModal;
    $('btnExport').onclick = openExportModal;
    $('btnUndo').onclick = undo;
    $('btnReset').onclick = resetPipeline;
    $('btnTheme').onclick = toggleTheme;
    $('btnLang').onclick = () => Lang.toggle();
    $('btnInfo').onclick = openInfoModal;
    $('btnDescribe').onclick = openDescribeModal;
    $('btnPrev').onclick = () => { state.page--; renderTable(); };
    $('btnNext').onclick = () => { state.page++; renderTable(); };
    $('pageSize').onchange = e => { state.pageSize = +e.target.value; state.page = 1; renderTable(); };
    $('panelClose').onclick = closePanel;
    $('panelCancel').onclick = closePanel;
    $('panelApply').onclick = applyPanel;
    $('modalClose').onclick = closeModal;
    $('modalOverlay').onclick = e => { if (e.target === $('modalOverlay')) closeModal(); };
    $('btnCopyCode').onclick = () => {
      navigator.clipboard.writeText($('codeView').textContent)
        .then(() => toast(t('code.copied')))
        .catch(() => toast(t('err.libMissing'), 'err'));
    };
    document.querySelectorAll('.tab-btn').forEach(b => b.onclick = () => switchTab(b.dataset.tab));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { closePanel(); closeModal(); } });
    window.addEventListener('resize', () => Charts.resize());
  }

  /* ══════════════ 渲染全部（语言切换时） ══════════════ */
  function renderAll() {
    renderMenu();
    renderDatasetSelect();
    renderChips();
    renderTable();
    renderCode();
    renderStatus();
    refreshLangBtn();
    if (panelOp) openPanel(panelOp);
    if ($('tabChart').classList.contains('active')) renderChartControls();
  }

  /* ══════════════ 初始化 ══════════════ */
  function init() {
    Lang.init();
    initTheme();
    // i18n 自检（控制台可见）
    const problems = checkI18nConsistency();
    if (problems.length) console.warn('[i18n]', problems);
    if (typeof Papa === 'undefined' || typeof echarts === 'undefined' || typeof XLSX === 'undefined') {
      setTimeout(() => toast(t('err.libMissing'), 'err'), 800);
    }
    Object.keys(BuiltinDatasets).forEach(loadBuiltin);
    state.currentKey = DEFAULT_DATASET;
    state.history = [state.datasets[state.currentKey].frame];
    bindEvents();
    initDragDrop();
    applyStaticI18n();
    renderAll();
    Lang.onChange(() => { applyStaticI18n(); renderAll(); });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
