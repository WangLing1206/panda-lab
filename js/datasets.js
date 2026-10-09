/* ════════════════════════════════════════════════════
   PandaLab — 内置示例数据集
   全部用种子随机数生成，保证每次打开结果一致
   ════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const mulberry32 = (typeof MF !== 'undefined' && MF.mulberry32) || function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  function gauss(rnd) { // Box-Muller
    let u = 0, v = 0;
    while (u === 0) u = rnd();
    while (v === 0) v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function pickW(rnd, items, weights) {
    const sum = weights.reduce((a, b) => a + b, 0);
    let x = rnd() * sum;
    for (let i = 0; i < items.length; i++) { x -= weights[i]; if (x <= 0) return items[i]; }
    return items[items.length - 1];
  }
  function pad2(n) { return String(n).padStart(2, '0'); }

  /* ─────────── 产品维表 products ─────────── */
  const PRODUCTS = [
    ['P-101', 'Alpha Phone X1',  'Electronics', 'Orion',     2200, 2999],
    ['P-102', 'Alpha Phone X2',  'Electronics', 'Orion',     2600, 3499],
    ['P-103', 'Beta Laptop Pro', 'Electronics', 'Nova',      4800, 6299],
    ['P-104', 'Beta Tablet S',   'Electronics', 'Nova',      1500, 2199],
    ['P-105', 'Gamma Desk',      'Furniture',   'WoodArt',    450,  799],
    ['P-106', 'Gamma Chair',     'Furniture',   'WoodArt',    300,  549],
    ['P-107', 'Delta Sofa',      'Furniture',   'ComfyHome', 1200, 1999],
    ['P-108', 'Delta Lamp',      'Furniture',   'ComfyHome',   80,  159],
    ['P-109', 'Epsilon Jacket',  'Clothing',    'UrbanFit',   150,  399],
    ['P-110', 'Epsilon Sneakers','Clothing',    'UrbanFit',   200,  569],
    ['P-111', 'Zeta Coffee',     'Food',        'Sunrise',     30,   68],
    ['P-112', 'Zeta Tea',        'Food',        'Sunrise',     25,   55],
  ];

  function createProducts() {
    return new MiniFrame(
      ['product_id', 'product_name', 'category', 'brand', 'cost_price', 'list_price'],
      PRODUCTS.map(p => p.slice()),
      'products'
    );
  }

  /* ─────────── 销售明细 sales（默认数据集） ─────────── */
  function createSales() {
    const rnd = mulberry32(20250101);
    const regions = ['North', 'South', 'East', 'West'];
    const regionW = [0.30, 0.25, 0.25, 0.20];
    const prodW =   [3, 2.5, 1.5, 2.5, 3, 4, 1.5, 4, 3, 2.5, 6, 6];
    const rows = [];
    for (let k = 0; k < 500; k++) {
      const month = 1 + Math.floor(rnd() * 12);
      const day = 1 + Math.floor(rnd() * 28);
      const date = `2025-${pad2(month)}-${pad2(day)}`;
      const region = pickW(rnd, regions, regionW);
      const pi = Math.floor(rnd() * 1000000) % 12;              // 先粗选
      const prod = pickW(rnd, PRODUCTS, prodW) || PRODUCTS[pi]; // 再加权
      const isFood = prod[2] === 'Food';
      const units = 1 + Math.floor(rnd() * (isFood ? 12 : 5));
      rows.push(['ORD-' + (10001 + k), date, region, prod[0], units, prod[5]]);
    }
    rows.sort((a, b) => a[1] < b[1] ? -1 : 1); // 按日期排序
    return new MiniFrame(
      ['order_id', 'date', 'region', 'product_id', 'units', 'unit_price'],
      rows, 'sales'
    );
  }

  /* ─────────── 员工信息 employees（含缺失值） ─────────── */
  function createEmployees() {
    const rnd = mulberry32(77042);
    const depts = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance'];
    const deptBase = { Engineering: 28000, Sales: 18000, Marketing: 19000, HR: 16000, Finance: 21000 };
    const cities = ['Beijing', 'Shanghai', 'Shenzhen', 'Hangzhou', 'Chengdu'];
    const first = ['Alex', 'Ben', 'Cora', 'David', 'Emma', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack',
                   'Karen', 'Leo', 'Mia', 'Nick', 'Olivia', 'Paul', 'Queen', 'Ryan', 'Sara', 'Tom'];
    const last = ['Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Zhao', 'Huang', 'Zhou', 'Wu'];
    const rows = [];
    for (let k = 0; k < 120; k++) {
      const dept = depts[Math.floor(rnd() * depts.length)];
      const gender = rnd() < 0.52 ? 'M' : 'F';
      let age = Math.round(34 + gauss(rnd) * 7);
      age = Math.max(22, Math.min(58, age));
      let salary = Math.round((deptBase[dept] + gauss(rnd) * 4000 + (age - 30) * 350) / 100) * 100;
      salary = Math.max(8000, salary);
      const city = cities[Math.floor(rnd() * cities.length)];
      const y = 2018 + Math.floor(rnd() * 8);
      const join = `${y}-${pad2(1 + Math.floor(rnd() * 12))}-${pad2(1 + Math.floor(rnd() * 28))}`;
      rows.push([
        'E' + String(1001 + k),
        first[Math.floor(rnd() * first.length)] + ' ' + last[Math.floor(rnd() * last.length)],
        dept, gender,
        rnd() < 0.08 ? null : age,          // 故意制造缺失
        rnd() < 0.08 ? null : salary,
        rnd() < 0.06 ? null : city,
        join,
      ]);
    }
    return new MiniFrame(
      ['emp_id', 'name', 'department', 'gender', 'age', 'salary', 'city', 'join_date'],
      rows, 'employees'
    );
  }

  /* ─────────── 鸢尾花 iris（按真实分布参数模拟） ─────────── */
  function createIris() {
    const rnd = mulberry32(1936);
    const spec = [
      { name: 'setosa',     sl: [5.01, 0.35], sw: [3.42, 0.38], pl: [1.46, 0.17], pw: [0.24, 0.10] },
      { name: 'versicolor', sl: [5.94, 0.52], sw: [2.77, 0.31], pl: [4.26, 0.47], pw: [1.33, 0.20] },
      { name: 'virginica',  sl: [6.59, 0.64], sw: [2.97, 0.32], pl: [5.55, 0.55], pw: [2.03, 0.27] },
    ];
    const rows = [];
    for (const s of spec) {
      for (let k = 0; k < 50; k++) {
        const g = ([m, sd], lo, hi) => Math.round(Math.max(lo, Math.min(hi, m + gauss(rnd) * sd)) * 10) / 10;
        rows.push([
          g(s.sl, 4.0, 8.2), g(s.sw, 1.8, 4.6), g(s.pl, 0.8, 7.2), g(s.pw, 0.1, 2.7), s.name,
        ]);
      }
    }
    return new MiniFrame(
      ['sepal_length', 'sepal_width', 'petal_length', 'petal_width', 'species'],
      rows, 'iris'
    );
  }

  /* ─────────── 注册表 ─────────── */
  const BuiltinDatasets = {
    sales:     { nameKey: 'ds.sales.name',     descKey: 'ds.sales.desc',     file: 'sales.csv',     create: createSales },
    employees: { nameKey: 'ds.employees.name', descKey: 'ds.employees.desc', file: 'employees.csv', create: createEmployees },
    iris:      { nameKey: 'ds.iris.name',      descKey: 'ds.iris.desc',      file: 'iris.csv',      create: createIris },
    products:  { nameKey: 'ds.products.name',  descKey: 'ds.products.desc',  file: 'products.csv',  create: createProducts },
  };
  const DEFAULT_DATASET = 'sales';

  global.BuiltinDatasets = BuiltinDatasets;
  global.DEFAULT_DATASET = DEFAULT_DATASET;
  if (typeof module !== 'undefined' && module.exports) {
    const { MiniFrame } = require('./dataframe.js');
    global.MiniFrame = MiniFrame; // datasets 依赖 MiniFrame
    module.exports = { BuiltinDatasets, DEFAULT_DATASET };
  }
})(typeof window !== 'undefined' ? window : globalThis);
