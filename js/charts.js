/* ════════════════════════════════════════════════════
   PandaLab — ECharts 图表封装
   ════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  let chart = null;
  const PALETTE = ['#0d9488', '#6366f1', '#f59e0b', '#e11d48', '#06b6d4', '#8b5cf6', '#84cc16', '#f97316', '#ec4899', '#14b8a6'];

  function isNull(v) { return MF.isNull(v); }

  /* 聚合：x 列 → y 值数组 → 聚合值 */
  function aggregate(frame, xCol, yCol, func) {
    const xi = frame.colIdx(xCol);
    const yi = yCol ? frame.colIdx(yCol) : -1;
    const map = new Map(), raw = new Map();
    for (const r of frame.rows) {
      if (isNull(r[xi])) continue;
      const k = String(r[xi]);
      if (!map.has(k)) { map.set(k, []); raw.set(k, r[xi]); }
      if (yi >= 0) { if (!isNull(r[yi]) && typeof r[yi] === 'number') map.get(k).push(r[yi]); }
      else map.get(k).push(1);
    }
    const keys = [...map.keys()].sort((a, b) => MF.compareVals(raw.get(a), raw.get(b)));
    const vals = keys.map(k => {
      const vs = map.get(k);
      if (func === 'count') return vs.length;
      if (!vs.length) return null;
      return MF.AGG[func](vs, vs);
    });
    return { labels: keys, values: vals };
  }

  function groupSeries(frame, xCol, yCol, gCol) {
    const xi = frame.colIdx(xCol), yi = frame.colIdx(yCol), gi = frame.colIdx(gCol);
    const groups = new Map();
    for (const r of frame.rows) {
      if (isNull(r[xi]) || isNull(r[yi])) continue;
      const g = isNull(r[gi]) ? 'NaN' : String(r[gi]);
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push([r[xi], r[yi]]);
    }
    return [...groups.entries()].map(([name, data]) => ({
      name, type: 'scatter', data, symbolSize: 9,
      emphasis: { focus: 'series' },
    }));
  }

  /* ─────────── 主渲染 ─────────── */
  function render(dom, type, frame, opts, dark) {
    if (typeof echarts === 'undefined') throw new Error('echarts not loaded');
    if (chart) { chart.dispose(); chart = null; }
    chart = echarts.init(dom, dark ? 'dark' : null, { renderer: 'canvas' });
    const base = {
      backgroundColor: 'transparent',
      color: PALETTE,
      textStyle: { fontFamily: 'Inter, PingFang SC, Microsoft YaHei, sans-serif' },
    };
    let option = null;

    if (type === 'bar' || type === 'line') {
      const { labels, values } = aggregate(frame, opts.x, opts.y, opts.agg);
      option = {
        ...base,
        tooltip: { trigger: 'axis' },
        grid: { left: 60, right: 30, top: 40, bottom: 70 },
        xAxis: { type: 'category', data: labels, axisLabel: { rotate: labels.length > 10 ? 35 : 0 } },
        yAxis: { type: 'value' },
        series: [{
          type, data: values, barMaxWidth: 46,
          smooth: type === 'line',
          areaStyle: type === 'line' ? { opacity: 0.12 } : undefined,
          itemStyle: { borderRadius: type === 'bar' ? [5, 5, 0, 0] : 0 },
          label: { show: labels.length <= 15 && type === 'bar', position: 'top', fontSize: 11 },
        }],
      };
    } else if (type === 'pie') {
      const { labels, values } = aggregate(frame, opts.label, opts.value, opts.agg);
      option = {
        ...base,
        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        legend: { type: 'scroll', bottom: 0 },
        series: [{
          type: 'pie', radius: ['38%', '68%'], center: ['50%', '46%'],
          data: labels.map((l, i) => ({ name: l, value: values[i] })),
          itemStyle: { borderRadius: 6, borderWidth: 2, borderColor: dark ? '#131f36' : '#fff' },
          label: { formatter: '{b}\n{d}%' },
        }],
      };
    } else if (type === 'scatter') {
      const series = opts.group
        ? groupSeries(frame, opts.x, opts.y, opts.group)
        : [{
            type: 'scatter', symbolSize: 9,
            data: frame.rows.filter(r => !isNull(r[frame.colIdx(opts.x)]) && !isNull(r[frame.colIdx(opts.y)]))
                            .map(r => [r[frame.colIdx(opts.x)], r[frame.colIdx(opts.y)]]),
          }];
      option = {
        ...base,
        tooltip: { trigger: 'item' },
        legend: opts.group ? { type: 'scroll', top: 0 } : undefined,
        grid: { left: 60, right: 30, top: 40, bottom: 50 },
        xAxis: { type: 'value', name: opts.x, nameLocation: 'middle', nameGap: 28, scale: true },
        yAxis: { type: 'value', name: opts.y, nameLocation: 'middle', nameGap: 40, scale: true },
        series,
      };
    } else if (type === 'hist') {
      const vs = frame.col(opts.col).filter(v => !isNull(v));
      if (!vs.length) throw new Error('no numeric data');
      let lo = vs[0], hi = vs[0];
      for (const v of vs) { if (v < lo) lo = v; if (v > hi) hi = v; }
      const bins = Math.max(2, Math.min(60, opts.bins || 15));
      const w = (hi - lo) / bins || 1;
      const counts = new Array(bins).fill(0);
      for (const v of vs) counts[Math.min(bins - 1, Math.floor((v - lo) / w))]++;
      const labels = counts.map((_, i) => (lo + i * w).toFixed(1) + '~' + (lo + (i + 1) * w).toFixed(1));
      option = {
        ...base,
        tooltip: { trigger: 'axis' },
        grid: { left: 60, right: 30, top: 30, bottom: 70 },
        xAxis: { type: 'category', data: labels, axisLabel: { rotate: 40, fontSize: 10 } },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', data: counts, barCategoryGap: '8%', itemStyle: { borderRadius: [4, 4, 0, 0] } }],
      };
    } else if (type === 'box') {
      const ci = frame.colIdx(opts.col);
      const gi = opts.group ? frame.colIdx(opts.group) : -1;
      const groups = new Map();
      for (const r of frame.rows) {
        if (isNull(r[ci])) continue;
        const g = gi < 0 ? opts.col : String(isNull(r[gi]) ? 'NaN' : r[gi]);
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g).push(r[ci]);
      }
      const names = [...groups.keys()].sort();
      const q = (s, p) => { const pos = (s.length - 1) * p, b = Math.floor(pos), r = pos - b; return s[b + 1] !== undefined ? s[b] + r * (s[b + 1] - s[b]) : s[b]; };
      const data = names.map(n => {
        const s = groups.get(n).slice().sort((a, b) => a - b);
        return [s[0], q(s, 0.25), q(s, 0.5), q(s, 0.75), s[s.length - 1]];
      });
      option = {
        ...base,
        tooltip: { trigger: 'item' },
        grid: { left: 70, right: 30, top: 30, bottom: 50 },
        xAxis: { type: 'category', data: names },
        yAxis: { type: 'value', scale: true },
        series: [{ type: 'boxplot', data, itemStyle: { borderWidth: 1.6 } }],
      };
    } else if (type === 'heatmap') {
      const { cols, matrix } = frame.corr();
      if (!cols.length) throw new Error('no numeric columns');
      const data = [];
      for (let i = 0; i < cols.length; i++)
        for (let j = 0; j < cols.length; j++)
          if (matrix[i][j] !== null) data.push([j, i, +matrix[i][j].toFixed(3)]);
      option = {
        ...base,
        tooltip: { formatter: p => cols[p.value[1]] + ' × ' + cols[p.value[0]] + ' : ' + p.value[2] },
        grid: { left: 110, right: 80, top: 20, bottom: 70 },
        xAxis: { type: 'category', data: cols, axisLabel: { rotate: 30 } },
        yAxis: { type: 'category', data: cols },
        visualMap: {
          min: -1, max: 1, calculable: true, orient: 'vertical', right: 8, top: 'center',
          inRange: { color: dark ? ['#6366f1', '#131f36', '#f43f5e'] : ['#4f63d2', '#f8fafc', '#e11d48'] },
        },
        series: [{ type: 'heatmap', data, label: { show: cols.length <= 12, fontSize: 10, formatter: p => p.value[2] } }],
      };
    } else {
      throw new Error('unknown chart type: ' + type);
    }

    chart.setOption(option, true);
    return chart;
  }

  function resize() { if (chart) chart.resize(); }
  function exportPNG(filename) {
    if (!chart) return false;
    const url = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: 'transparent' });
    const a = document.createElement('a');
    a.href = url; a.download = filename || 'chart.png';
    a.click();
    return true;
  }
  function clear() { if (chart) { chart.dispose(); chart = null; } }

  global.Charts = { render, resize, exportPNG, clear };
})(typeof window !== 'undefined' ? window : globalThis);
