// منطق المحاسبة: دوال نقية بلا واجهة، قابلة للاختبار.
export const KIND_LABEL = { cash: 'صندوق', bank: 'بنك', asset: 'أصل', liab: 'التزام' };
export const KIND_PLURAL = { cash: 'الصناديق', bank: 'البنوك', asset: 'الأصول', liab: 'الالتزامات' };
export const TYPE_LABEL = { rev: 'إيراد', exp: 'مصروف', pur: 'مشتريات', trf: 'تحويل', bor: 'التزام جديد', pay: 'سداد التزام' };
export const isLiquid = (a) => !!a && (a.kind === 'cash' || a.kind === 'bank');

export function defaultState() {
  return {
    v: 1, currency: 'SAR', seq: 0,
    accounts: [
      { id: 'a_cash', name: 'الصندوق', kind: 'cash', opening: 0 },
      { id: 'a_bank', name: 'الحساب البنكي', kind: 'bank', opening: 0 },
    ],
    cats: [
      ...['راتب', 'دخل إضافي', 'أرباح استثمار', 'هدايا', 'إيرادات أخرى'].map((n, i) => ({ id: 'r' + i, name: n, kind: 'rev', color: i })),
      ...['سكن وإيجار', 'فواتير وخدمات', 'مواصلات ووقود', 'صحة', 'تعليم', 'ترفيه', 'زكاة وصدقات', 'أسرة', 'مصروفات أخرى'].map((n, i) => ({ id: 'e' + i, name: n, kind: 'exp', color: i })),
      ...['بقالة ومواد غذائية', 'ملابس', 'مستلزمات منزلية', 'أدوات وأجهزة صغيرة', 'مشتريات أخرى'].map((n, i) => ({ id: 'p' + i, name: n, kind: 'pur', color: i + 3 })),
    ],
    tx: [],
  };
}

export const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// أثر كل عملية على أرصدة الحسابات (الرصيد الطبيعي: النقد والأصل = ما يملكه، الالتزام = ما عليه)
export function effects(t, accById) {
  const L = (id) => accById[id] && accById[id].kind === 'liab';
  const payer = (id) => [id, L(id) ? t.amt : -t.amt];
  switch (t.type) {
    case 'rev': return [[t.acc, t.amt]];
    case 'exp': return [payer(t.acc)];
    case 'pur': return t.to ? [payer(t.acc), [t.to, t.amt]] : [payer(t.acc)];
    case 'trf': return [[t.acc, -t.amt], [t.to, t.amt]];
    case 'bor': return [[t.acc, t.amt], [t.to, t.amt]];
    case 'pay': return [[t.acc, -t.amt], [t.to, -t.amt]];
    default: return [];
  }
}
export const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));

export function balances(S, asOf) {
  const A = byId(S.accounts), b = {};
  S.accounts.forEach((a) => (b[a.id] = Number(a.opening) || 0));
  for (const t of S.tx) {
    if (asOf && t.date > asOf) continue;
    for (const [id, d] of effects(t, A)) if (id in b) b[id] = r2(b[id] + d);
  }
  return b;
}

export function periodRange(p) {
  if (p.mode === 'all') return { from: '0000-01-01', to: '9999-12-31' };
  if (p.mode === 'year') return { from: `${p.y}-01-01`, to: `${p.y}-12-31` };
  const last = new Date(p.y, p.m, 0).getDate();
  const mm = String(p.m).padStart(2, '0');
  return { from: `${p.y}-${mm}-01`, to: `${p.y}-${mm}-${String(last).padStart(2, '0')}` };
}
const inRange = (t, r) => t.date >= r.from && t.date <= r.to;

export function incomeStatement(S, range) {
  const C = byId(S.cats), sum = (type) => {
    const m = {};
    for (const t of S.tx) if (t.type === type && inRange(t, range) && !(type === 'pur' && t.to)) m[t.cat] = r2((m[t.cat] || 0) + t.amt);
    return Object.entries(m).map(([id, v]) => ({ id, name: C[id] ? C[id].name : 'بدون تصنيف', color: C[id] ? C[id].color : 5, v })).sort((a, b) => b.v - a.v);
  };
  const revenues = sum('rev'), purchases = sum('pur'), expenses = sum('exp');
  const tot = (l) => r2(l.reduce((a, x) => a + x.v, 0));
  const r = tot(revenues), p = tot(purchases), e = tot(expenses);
  return { revenues, purchases, expenses, totalRevenue: r, totalPurchases: p, totalExpenses: e, gross: r2(r - p), net: r2(r - p - e) };
}

export function balanceSheet(S, asOf) {
  const bal = balances(S, asOf), group = (pred) => S.accounts.filter(pred).map((a) => ({ id: a.id, name: a.name, v: bal[a.id] }));
  const cash = group((a) => a.kind === 'cash'), bank = group((a) => a.kind === 'bank');
  const assets = group((a) => a.kind === 'asset'), liabs = group((a) => a.kind === 'liab');
  const tot = (l) => r2(l.reduce((a, x) => a + x.v, 0));
  const totalAssets = r2(tot(cash) + tot(bank) + tot(assets)), totalLiabs = tot(liabs);
  const openingEquity = r2(S.accounts.reduce((s, a) => s + (a.kind === 'liab' ? -1 : 1) * (Number(a.opening) || 0), 0));
  const upTo = { ...S, tx: S.tx.filter((t) => !asOf || t.date <= asOf) };
  const retained = incomeStatement(upTo, { from: '0000-01-01', to: '9999-12-31' }).net;
  return { cash, bank, assets, liabs, totalCash: tot(cash), totalBank: tot(bank), totalOther: tot(assets), totalAssets, totalLiabs,
    equity: r2(totalAssets - totalLiabs), openingEquity, retained, equityCheck: r2(openingEquity + retained) };
}

export function cashFlow(S, range) {
  const A = byId(S.accounts), liquid = (id) => isLiquid(A[id]);
  const before = { ...S, tx: S.tx.filter((t) => t.date < range.from) };
  const opening = r2(Object.entries(balances(before)).reduce((s, [id, v]) => s + (liquid(id) ? v : 0), 0));
  const f = { rev: 0, exp: 0, pur: 0, assetPur: 0, bor: 0, pay: 0 };
  for (const t of S.tx) {
    if (!inRange(t, range)) continue;
    if (t.type === 'rev') f.rev += t.amt;
    else if (t.type === 'exp' && liquid(t.acc)) f.exp += t.amt;
    else if (t.type === 'pur' && liquid(t.acc)) (t.to ? (f.assetPur += t.amt) : (f.pur += t.amt));
    else if (t.type === 'bor') f.bor += t.amt;
    else if (t.type === 'pay') f.pay += t.amt;
  }
  Object.keys(f).forEach((k) => (f[k] = r2(f[k])));
  const closing = r2(opening + f.rev + f.bor - f.exp - f.pur - f.assetPur - f.pay);
  return { opening, ...f, closing, inflow: r2(f.rev + f.bor), outflow: r2(f.exp + f.pur + f.assetPur + f.pay) };
}

export function accountStatement(S, accId, range) {
  const A = byId(S.accounts), a = A[accId];
  if (!a) return null;
  const before = { ...S, tx: S.tx.filter((t) => t.date < range.from) };
  const opening = balances(before)[accId] ?? 0;
  const rows = [];
  let run = opening;
  const list = S.tx.filter((t) => inRange(t, range)).sort((x, y) => x.date.localeCompare(y.date) || (x.ts || 0) - (y.ts || 0));
  for (const t of list) {
    const d = effects(t, A).filter(([id]) => id === accId).reduce((s, [, v]) => s + v, 0);
    if (!d) continue;
    run = r2(run + d);
    rows.push({ t, delta: d, balance: run });
  }
  return { account: a, opening: r2(opening), rows, closing: r2(run) };
}

export function monthTotals(S, y, m) {
  const r = periodRange({ mode: 'month', y, m }), i = incomeStatement(S, r);
  return { rev: i.totalRevenue, out: r2(i.totalExpenses + i.totalPurchases), net: i.net };
}

export function validateTx(S, t) {
  const A = byId(S.accounts), C = byId(S.cats);
  if (!(t.amt > 0)) return 'اكتب مبلغاً أكبر من صفر.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t.date || '')) return 'اختر تاريخاً صحيحاً.';
  const a = A[t.acc], to = A[t.to];
  if (!a) return 'اختر الحساب.';
  switch (t.type) {
    case 'rev': if (!isLiquid(a)) return 'يُودَع الإيراد في صندوق أو بنك.'; if (!C[t.cat]) return 'اختر تصنيف الإيراد.'; break;
    case 'exp': if (!C[t.cat]) return 'اختر تصنيف المصروف.'; break;
    case 'pur': if (t.to) { if (!to || to.kind !== 'asset') return 'اختر الأصل المشترى.'; } else if (!C[t.cat]) return 'اختر تصنيف المشتريات.'; break;
    case 'trf': if (!isLiquid(a) || !isLiquid(to)) return 'التحويل بين صناديق وبنوك فقط.'; if (a.id === to.id) return 'اختر حسابين مختلفين.'; break;
    case 'bor': if (!a || a.kind !== 'liab') return 'اختر الالتزام.'; if (!isLiquid(to)) return 'اختر الصندوق أو البنك المستلم.'; break;
    case 'pay': if (!isLiquid(a)) return 'اختر الصندوق أو البنك الذي يدفع منه.'; if (!to || to.kind !== 'liab') return 'اختر الالتزام المسدَّد.'; break;
    default: return 'نوع العملية غير معروف.';
  }
  return '';
}

// تحذير (لا يمنع الحفظ): هل يكفي رصيد الحساب الدافع؟
export function shortfall(S, t, editingId) {
  const A = byId(S.accounts), a = A[t.acc];
  if (!a || !isLiquid(a) || !['exp', 'pur', 'trf', 'pay'].includes(t.type)) return 0;
  const rest = { ...S, tx: S.tx.filter((x) => x.id !== editingId) };
  const left = balances(rest)[a.id] - t.amt;
  return left < 0 ? r2(-left) : 0;
}
