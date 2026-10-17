import * as L from './ledger.js';
import * as P from './platform.js';
import * as Auth from './auth.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const clone = (o) => JSON.parse(JSON.stringify(o));

/* ---------- أيقونات ---------- */
const IC = {
  home: '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  chart: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
  wallet: '<path d="M4 7a2 2 0 0 1 2-2h11v3"/><path d="M4 7v11a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H6a2 2 0 0 1-2-2z"/><circle cx="16" cy="14" r="1"/>',
  gear: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', prev: '<path d="M9 6l6 6-6 6"/>', next: '<path d="M15 6l-6 6 6 6"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>', search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4-4"/>',
  down: '<path d="M12 4v13M6 12l6 6 6-6"/>', up: '<path d="M12 20V7M6 12l6-6 6 6"/>',
  cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M3 4h2l2.4 11h10l2-8H6.5"/>',
  swap: '<path d="M7 8h12l-3-3M17 16H5l3 3"/>', doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 13h5M12.5 10.5v5"/>',
  check: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  back: '<path d="M20 6H9l-5 6 5 6h11z"/><path d="M13 10l4 4M17 10l-4 4"/>',
  fp: '<path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/>',
  book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M10 8h5"/>',
};
const ic = (n, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`;

const PAL = ['#2F7FA6', '#D07A2B', '#4C9A6A', '#B5517C', '#7A6CC4', '#C2A02E', '#3E9C9C', '#C9544A', '#6F8A3A', '#8A6A52'];
const CUR = { SAR: 'ر.س', AED: 'د.إ', KWD: 'د.ك', QAR: 'ر.ق', BHD: 'د.ب', OMR: 'ر.ع', JOD: 'د.أ', EGP: 'ج.م', USD: '$', EUR: '€' };
const CUR_NAME = { SAR: 'ريال سعودي', AED: 'درهم إماراتي', KWD: 'دينار كويتي', QAR: 'ريال قطري', BHD: 'دينار بحريني', OMR: 'ريال عماني', JOD: 'دينار أردني', EGP: 'جنيه مصري', USD: 'دولار أمريكي', EUR: 'يورو' };
const TM = {
  rev: { color: 'var(--inc)', icon: 'down', desc: 'مال يدخل الصندوق أو البنك' },
  exp: { color: 'var(--exp)', icon: 'up', desc: 'فواتير وخدمات ونفقات' },
  pur: { color: 'var(--pur)', icon: 'cart', desc: 'أغراض أو أصول تشتريها' },
  trf: { color: 'var(--accent)', icon: 'swap', desc: 'بين الصندوق والبنوك' },
  bor: { color: 'var(--liab)', icon: 'doc', desc: 'اقتراض أو دين جديد' },
  pay: { color: 'var(--liab)', icon: 'check', desc: 'دفعة قسط أو سداد دين' },
};
const AUTOLOCK = [[0, 'فورًا'], [30, 'بعد 30 ثانية'], [60, 'بعد دقيقة'], [300, 'بعد 5 دقائق'], [900, 'بعد 15 دقيقة']];
const TITLES = { home: 'دفتري', ops: 'العمليات', rep: 'التقارير', acc: 'الحسابات', set: 'الإعدادات' };
const DK = 'daftari.data', DK_BAK = 'daftari.data.bak';

/* ---------- الحالة ---------- */
let S = L.defaultState();
let profile = null, unlocked = false, dataLoaded = false;
const now0 = new Date();
let per = { mode: 'month', y: now0.getFullYear(), m: now0.getMonth() + 1 };
let tab = 'home', F = { type: 'all', q: '' }, R = { kind: 'is', acc: '' };
let stack = [], confirmWipe = false, hiddenAt = 0, suppressLock = false;

const fmt = (n) => { n = Number(n) || 0; return (n < 0 ? '−' : '') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
const cur = () => CUR[S.currency] || S.currency;
const money = (n, sign) => `<bdi class="num">${sign && n > 0 ? '+' : ''}${fmt(n)}</bdi><small>${esc(cur())}</small>`;
const MF = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { month: 'long', year: 'numeric' });
const MS = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { month: 'short' });
const DF = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' });
const DFL = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });
const isoToDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const perLabel = () => per.mode === 'all' ? 'كل الفترات' : per.mode === 'year' ? String(per.y) : MF.format(new Date(per.y, per.m - 1, 1));
const range = () => L.periodRange(per);
const endISO = () => { const r = range(); return per.mode === 'all' ? todayISO() : r.to; };
function num(v) {
  v = String(v || '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/٫/g, '.').replace(/[٬,،\s]/g, '');
  const n = parseFloat(v); return isFinite(n) ? n : NaN;
}
const acc = (id) => S.accounts.find((a) => a.id === id);
const cat = (id) => S.cats.find((c) => c.id === id);
const accName = (id) => (acc(id) ? acc(id).name : 'حساب محذوف');
const catName = (id) => (cat(id) ? cat(id).name : 'بدون تصنيف');
const colorOf = (id) => PAL[(cat(id) ? cat(id).color : 5) % PAL.length];

/* ---------- حفظ البيانات ---------- */
let saveTimer = null, saving = false;
function setStatus(k) {
  const el = $('#save'); if (!el) return;
  if (k === 'ok') { el.hidden = true; return; }
  el.hidden = false; el.className = 'status' + (k === 'err' ? ' err' : '');
  el.textContent = k === 'err' ? 'تعذّر الحفظ. اضغط هنا للمحاولة مرة أخرى.' : 'جارٍ الحفظ…';
  el.dataset.act = k === 'err' ? 'retry' : '';
}
function persist() { setStatus('saving'); clearTimeout(saveTimer); saveTimer = setTimeout(flush, 250); }
async function flush() {
  if (saving) { saveTimer = setTimeout(flush, 200); return; }
  saving = true;
  try { await P.sSet(DK, JSON.stringify(S)); setStatus('ok'); } catch (e) { setStatus('err'); } finally { saving = false; }
}
function adopt(o) {
  const d = L.defaultState();
  S = Object.assign(d, o || {});
  if (!Array.isArray(S.accounts) || !S.accounts.length) S.accounts = d.accounts;
  if (!Array.isArray(S.cats) || !S.cats.length) S.cats = d.cats;
  if (!Array.isArray(S.tx)) S.tx = [];
  if (!CUR[S.currency]) S.currency = 'SAR';
  S.seq = Math.max(S.seq || 0, ...S.tx.map((t) => t.no || 0));
}
async function loadData() {
  let raw = await P.sGet(DK);
  const tryParse = (r) => { try { return r ? JSON.parse(r) : null; } catch (e) { return null; } };
  let o = tryParse(raw);
  if (!o) { const bak = tryParse(await P.sGet(DK_BAK)); if (bak) o = bak; }
  adopt(o);
  if (raw && tryParse(raw)) { try { await P.sSet(DK_BAK, raw); } catch (e) {} }
  dataLoaded = true;
}

/* ---------- شاشة القفل والدخول ---------- */
const lockEl = () => $('#lock');
let lk = { step: 'login', entry: '', first: '', name: '', err: '', busy: false, bioReady: false, forgot: false };
const padHtml = (bioKey) => `<div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button type="button" data-act="key" data-v="${n}">${n}</button>`).join('')}
  ${bioKey ? `<button type="button" class="ghost" data-act="bio" aria-label="الدخول بالبصمة">${ic('fp', 30)}</button>` : '<span></span>'}
  <button type="button" data-act="key" data-v="0">0</button>
  <button type="button" class="ghost" data-act="del" aria-label="حذف رقم">${ic('back', 26)}</button></div>`;
const dots = (n, shake) => `<div class="pins ${shake ? 'shake' : ''}" id="pins" aria-hidden="true">${[0, 1, 2, 3, 4, 5].map((i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>`;

function paintLock() {
  const el = lockEl(); let h = '';
  const mark = `<div class="mark">${ic('book', 32)}</div>`;
  if (lk.step === 'name') {
    h = `${mark}<h1>أهلاً بك في دفتري</h1><p>محاسبتك الشخصية على جهازك، بلا إنترنت وبلا اشتراك.</p>
      <label class="fld"><span>اسمك</span><input id="nm" autocomplete="off" maxlength="30" value="${esc(lk.name)}" placeholder="مثال: أحمد"></label>
      <p class="err-t">${esc(lk.err)}</p><button class="btn primary" data-act="name-next">متابعة</button>`;
  } else if (lk.step === 'pin1' || lk.step === 'pin2') {
    h = `${mark}<h1>${lk.step === 'pin1' ? 'اختر رمز الدخول' : 'أعد كتابة الرمز'}</h1><p>${lk.step === 'pin1' ? '6 أرقام تفتح بها دفترك' : 'للتأكد من أنك كتبته بشكل صحيح'}</p>${dots(lk.entry.length)}<p class="err-t" id="lkerr">${esc(lk.err)}</p>${padHtml(false)}`;
  } else if (lk.step === 'bio') {
    h = `<div class="mark">${ic('fp', 34)}</div><h1>الدخول بالبصمة</h1><p>افتح دفترك بلمسة واحدة، وابقَ الرمز احتياطاً دائماً.</p>
      <p class="err-t">${esc(lk.err)}</p><button class="btn primary" data-act="bio-on">تفعيل البصمة</button><button class="btn" data-act="bio-skip">لاحقاً</button>`;
  } else if (lk.forgot) {
    h = `${mark}<h1>نسيت الرمز؟</h1><p>لا يمكن استرجاع الرمز، لأن بياناتك محفوظة على جهازك فقط. يمكنك البدء من جديد، ثم استعادة نسخة احتياطية إن كانت لديك.</p>
      ${lk.confirm ? `<button class="btn danger" data-act="reset-go">تأكيد: مسح كل شيء والبدء من جديد</button>` : `<button class="btn ghost-danger" data-act="reset-ask">مسح البيانات والبدء من جديد</button>`}
      <button class="btn" data-act="forgot-back">رجوع</button>`;
  } else {
    h = `${mark}<h1>مرحباً ${esc(profile.name || '')}</h1><p>أدخل رمز الدخول</p>${dots(lk.entry.length)}<p class="err-t" id="lkerr">${esc(lk.err)}</p>${padHtml(lk.bioReady)}
      <button class="link" data-act="forgot" style="margin-top:14px">نسيت الرمز؟</button>`;
  }
  el.innerHTML = `<div class="lock-in">${h}</div>`;
  const nm = $('#nm'); if (nm) nm.focus();
}
function showLock(step) {
  unlocked = false; stack = []; closeSheetUI();
  $('#app').hidden = true; $('#view').innerHTML = '';
  lk = { ...lk, step: step || 'login', entry: '', first: '', err: '', forgot: false, confirm: false, bioReady: !!(profile && profile.bio) };
  lockEl().hidden = false; paintLock();
  if (lk.step === 'login') tryBio(true);
}
async function tryBio(auto) {
  if (!profile || !profile.bio || lk.busy) return;
  lk.busy = true; suppressLock = true;
  try { await Auth.bioLogin(profile); await unlock(); }
  catch (e) { if (!auto) { lk.err = 'تعذّر التحقق بالبصمة. استخدم الرمز.'; if (lk.step === 'login') paintLock(); } }
  finally { lk.busy = false; setTimeout(() => (suppressLock = false), 800); }
}
async function unlock() {
  if (!dataLoaded) await loadData();
  unlocked = true; lockEl().hidden = true; $('#app').hidden = false;
  buildChrome(); render(); window.scrollTo(0, 0);
}
async function onPinComplete() {
  const pin = lk.entry;
  if (lk.step === 'pin1') { lk.first = pin; lk.entry = ''; lk.step = 'pin2'; lk.err = ''; paintLock(); return; }
  if (lk.step === 'pin2') {
    if (pin !== lk.first) { lk.entry = ''; lk.first = ''; lk.step = 'pin1'; lk.err = 'الرمزان غير متطابقين. حاول من جديد.'; paintLock(); shake(); return; }
    profile = await Auth.createProfile(lk.name, pin);
    S = L.defaultState(); dataLoaded = true; await flush();
    lk.bioReady = false;
    if (await P.bio.available()) { lk.step = 'bio'; lk.err = ''; paintLock(); } else await unlock();
    return;
  }
  const r = await Auth.checkPin(profile, pin);
  if (r.ok) { await unlock(); return; }
  lk.entry = '';
  lk.err = r.wait ? `محاولات كثيرة. انتظر ${r.wait} ثانية.` : `الرمز غير صحيح. متبقٍ ${r.left} محاولات قبل الإيقاف المؤقت.`;
  paintLock(); shake();
}
function shake() { const p = $('#pins'); if (p) { p.classList.remove('shake'); void p.offsetWidth; p.classList.add('shake'); } }
function pressKey(v) {
  if (lk.busy || lk.entry.length >= 6) return;
  if (v === 'del') lk.entry = lk.entry.slice(0, -1); else lk.entry += v;
  lk.err = '';
  const ps = $('#pins'); if (ps) [...ps.children].forEach((d, i) => d.classList.toggle('on', i < lk.entry.length));
  const e = $('#lkerr'); if (e) e.textContent = '';
  if (lk.entry.length === 6) { lk.busy = true; setTimeout(async () => { try { await onPinComplete(); } finally { lk.busy = false; } }, 120); }
}
async function resetAll() {
  await P.sDel(DK); await P.sDel(DK_BAK); await Auth.wipeAuth();
  S = L.defaultState(); profile = null; dataLoaded = false;
  lk = { step: 'name', entry: '', first: '', name: '', err: '', busy: false, bioReady: false, forgot: false };
  lockEl().hidden = false; $('#app').hidden = true; paintLock();
}

/* ---------- الهيكل العام ---------- */
function buildChrome() {
  $('#mon [data-act=mprev]').innerHTML = ic('prev'); $('#mon [data-act=mnext]').innerHTML = ic('next');
  $('#lockBtn').innerHTML = ic('lock', 20);
  $('#fab').innerHTML = ic('plus', 20) + '<span>عملية جديدة</span>';
  const T = [['home', 'home', 'الرئيسية'], ['ops', 'list', 'العمليات'], ['rep', 'chart', 'التقارير'], ['acc', 'wallet', 'الحسابات'], ['set', 'gear', 'الإعدادات']];
  $('#tabs').innerHTML = T.map(([k, i, l]) => `<button type="button" data-act="tab" data-v="${k}" ${k === tab ? 'aria-current="page"' : ''}>${ic(i)}<span>${l}</span></button>`).join('');
}
function setTab(t) { tab = t; confirmWipe = false; buildChrome(); render(); window.scrollTo(0, 0); }
function render() {
  if (!unlocked) return;
  $('#ttl').textContent = TITLES[tab];
  const showNav = tab === 'ops' || tab === 'rep';
  $('#mon').hidden = !showNav;
  $('#mlabel').textContent = perLabel();
  $('#mon [data-act=mprev]').disabled = $('#mon [data-act=mnext]').disabled = per.mode === 'all';
  $('#view').innerHTML = { home: vHome, ops: vOps, rep: vRep, acc: vAcc, set: vSet }[tab]();
  if (tab === 'ops') renderOpsList();
  $('#fab').hidden = tab === 'set';
}

/* ---------- عناصر مشتركة ---------- */
function txTitle(t) {
  if (t.note) return esc(t.note);
  if (t.type === 'pur' && t.to) return 'شراء ' + esc(accName(t.to));
  if (t.cat) return esc(catName(t.cat));
  return L.TYPE_LABEL[t.type];
}
function txRoute(t) {
  const a = accName(t.acc), b = accName(t.to);
  switch (t.type) {
    case 'rev': return `${esc(catName(t.cat))} · إلى ${esc(a)}`;
    case 'exp': return `${esc(catName(t.cat))} · من ${esc(a)}`;
    case 'pur': return `${t.to ? 'أصل' : esc(catName(t.cat))} · من ${esc(a)}`;
    case 'trf': return `من ${esc(a)} إلى ${esc(b)}`;
    case 'bor': return `${esc(a)} · إلى ${esc(b)}`;
    case 'pay': return `${esc(b)} · من ${esc(a)}`;
  }
  return '';
}
function txRow(t) {
  const m = TM[t.type], sign = t.type === 'rev' ? '+' : t.type === 'exp' || (t.type === 'pur') ? '−' : '';
  return `<button type="button" class="row" data-act="edit" data-id="${esc(t.id)}">
    <span class="tdot" style="background:${m.color}">${ic(m.icon, 17)}</span>
    <span class="grow"><span class="t">${txTitle(t)}</span><span class="s">${L.TYPE_LABEL[t.type]} · ${txRoute(t)}</span></span>
    <span class="amt" style="color:${t.type === 'rev' ? 'var(--inc)' : t.type === 'exp' ? 'var(--exp)' : t.type === 'pur' ? 'var(--pur)' : 'inherit'}"><bdi class="num">${sign}${fmt(t.amt)}</bdi><small>${esc(cur())}</small></span></button>`;
}
const byDateDesc = (a, b) => b.date.localeCompare(a.date) || (b.ts || 0) - (a.ts || 0);
const ln = (label, v, cls = '') => `<div class="ln ${cls}"><span>${label}</span><i class="d"></i><span class="num">${fmt(v)}</span></div>`;
const colorCls = (v) => (v < 0 ? 'exp' : '');

/* ---------- الرئيسية ---------- */
function monthChart() {
  const base = new Date(); const data = [];
  for (let i = 5; i >= 0; i--) { const d = new Date(base.getFullYear(), base.getMonth() - i, 1); const t = L.monthTotals(S, d.getFullYear(), d.getMonth() + 1); data.push({ d, ...t }); }
  const niceMax = (v) => { const mag = Math.pow(10, Math.floor(Math.log10(v))); for (const m of [1, 2, 2.5, 5, 10]) if (m * mag >= v) return m * mag; return 10 * mag; };
  const max = niceMax(Math.max(1, ...data.flatMap((d) => [d.rev, d.out])));
  const W = 360, Hh = 196, Lm = 8, Rm = 318, top = 12, bse = 158, ch = bse - top, slot = (Rm - Lm) / 6, bw = 15, y = (v) => bse - (v / max) * ch;
  const lab = (v) => (v >= 1000 ? v / 1000 + 'k' : String(v));
  let g = '';
  [0, 0.5, 1].forEach((f) => { const v = max * f; g += `<line x1="${Lm}" x2="${Rm}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${W - 2}" y="${y(v) + 4}" text-anchor="end" font-size="10.5" fill="var(--muted)">${lab(v)}</text>`; });
  data.forEach((d, i) => {
    const cx = Rm - (i + 0.5) * slot, last = i === 5, op = last ? 1 : 0.55;
    if (d.rev > 0) g += `<rect x="${(cx + 1.5).toFixed(1)}" y="${y(d.rev).toFixed(1)}" width="${bw}" height="${(bse - y(d.rev)).toFixed(1)}" rx="2" fill="var(--inc)" opacity="${op}"/>`;
    if (d.out > 0) g += `<rect x="${(cx - 1.5 - bw).toFixed(1)}" y="${y(d.out).toFixed(1)}" width="${bw}" height="${(bse - y(d.out)).toFixed(1)}" rx="2" fill="var(--exp)" opacity="${op}"/>`;
    g += `<text x="${cx.toFixed(1)}" y="178" text-anchor="middle" font-size="11" fill="var(--muted)" ${last ? 'font-weight="600"' : ''}>${esc(MS.format(d.d))}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="مقارنة الإيرادات بالمصروفات والمشتريات لآخر ستة أشهر">${g}</svg>`;
}
function vHome() {
  const bs = L.balanceSheet(S), mt = L.monthTotals(S, now0.getFullYear(), now0.getMonth() + 1);
  const now = new Date(), r = L.periodRange({ mode: 'month', y: now.getFullYear(), m: now.getMonth() + 1 });
  const is = L.incomeStatement(S, r);
  const top = [...is.expenses, ...is.purchases].sort((a, b) => b.v - a.v).slice(0, 4), tmax = top[0] ? top[0].v : 1;
  const recent = S.tx.slice().sort(byDateDesc).slice(0, 5), hasSample = S.tx.some((t) => t.s);
  const empty = !S.tx.length;
  return `
  <section class="hero"><p class="eyebrow">صافي ثروتك (الأصول − الالتزامات)</p>
    <p class="nw ${bs.equity < 0 ? 'neg' : ''}">${money(bs.equity)}</p><div class="rule"></div>
    <div class="trio"><div><span>السيولة</span><b>${money(L.r2(bs.totalCash + bs.totalBank))}</b></div><div><span>الأصول</span><b>${money(bs.totalAssets)}</b></div><div><span>الالتزامات</span><b class="liab">${money(bs.totalLiabs)}</b></div></div></section>
  ${empty ? `<div class="card note hl" style="margin-top:14px"><span><b>ابدأ بثلاث خطوات:</b> سجّل رصيد الصندوق والبنك من تبويب الحسابات، ثم أضف أصولك والتزاماتك، ثم سجّل أول عملية.</span><span class="btn-row"><button class="btn sm primary" data-act="tab" data-v="acc">الحسابات</button><button class="btn sm" data-act="sample">بيانات تجريبية</button></span></div>` : ''}
  ${hasSample ? `<div class="card note hl" style="margin-top:14px"><span>تعرض الشاشة بيانات تجريبية.</span><button class="btn sm" data-act="sample-clear">حذف التجريبية</button></div>` : ''}
  <section class="sec"><div class="sec-h"><h2>الصندوق والبنوك</h2><button class="link" data-act="tab" data-v="acc">كل الحسابات</button></div>
    <div class="card list">${[...bs.cash.map((a) => ({ ...a, k: 'cash' })), ...bs.bank.map((a) => ({ ...a, k: 'bank' }))].map((a) => `<button type="button" class="row" data-act="acc-open" data-id="${esc(a.id)}"><span class="grow"><span class="t">${esc(a.name)}</span><span class="s">${L.KIND_LABEL[a.k]}</span></span><span class="amt ${colorCls(a.v)}">${money(a.v)}</span></button>`).join('') || '<div class="empty">لا توجد صناديق أو بنوك.</div>'}</div></section>
  <section class="sec"><div class="sec-h"><h2>هذا الشهر · ${esc(MF.format(now))}</h2><button class="link" data-act="go-rep">قائمة الدخل</button></div>
    <div class="card" style="padding:14px"><div class="trio"><div><span>الإيرادات</span><b class="inc">${money(mt.rev)}</b></div><div><span>المصروفات والمشتريات</span><b class="exp">${money(mt.out)}</b></div><div><span>الفائض</span><b class="${colorCls(mt.net)}">${money(mt.net)}</b></div></div>
    ${mt.rev > 0 ? `<div class="bar" style="margin-top:12px"><i style="width:${Math.min(100, (mt.out / mt.rev) * 100).toFixed(1)}%;background:${mt.out > mt.rev ? 'var(--exp)' : 'var(--accent)'}"></i></div><p class="hint" style="margin-top:6px">صرفت ${Math.round((mt.out / mt.rev) * 100)}% من إيراد الشهر</p>` : ''}</div></section>
  ${top.length ? `<section class="sec"><div class="sec-h"><h2>أين ذهب مالك</h2></div><div class="card bars">${top.map((x) => `<div><div class="l"><span><i class="dot" style="background:${PAL[x.color % PAL.length]}"></i>${esc(x.name)}</span><span><bdi class="num">${fmt(x.v)}</bdi></span></div><div class="bar"><i style="width:${((x.v / tmax) * 100).toFixed(1)}%;background:${PAL[x.color % PAL.length]}"></i></div></div>`).join('')}</div></section>` : ''}
  <section class="sec"><div class="sec-h"><h2>آخر ستة أشهر</h2></div><div class="card"><div class="chart">${monthChart()}</div><div class="legend"><span><i style="background:var(--inc)"></i>إيرادات</span><span><i style="background:var(--exp)"></i>مصروفات ومشتريات</span></div></div></section>
  <section class="sec"><div class="sec-h"><h2>آخر العمليات</h2>${recent.length ? '<button class="link" data-act="tab" data-v="ops">عرض الكل</button>' : ''}</div>
    <div class="card list">${recent.length ? recent.map(txRow).join('') : '<div class="empty"><b>لا توجد عمليات بعد</b>اضغط «عملية جديدة» لتسجيل أول إيراد أو مصروف.</div>'}</div></section>`;
}

/* ---------- العمليات ---------- */
const OPS_FILTERS = [['all', 'الكل'], ['rev', 'إيرادات'], ['exp', 'مصروفات'], ['pur', 'مشتريات'], ['trf', 'تحويلات'], ['liab', 'التزامات']];
const perSeg = () => `<div class="seg" style="margin-bottom:12px">${[['month', 'شهر'], ['year', 'سنة'], ['all', 'الكل']].map(([v, l]) => `<button type="button" class="${per.mode === v ? 'on' : ''}" data-act="pmode" data-v="${v}">${l}</button>`).join('')}</div>`;
function vOps() {
  return `${perSeg()}<div class="search" style="margin-bottom:10px">${ic('search', 18)}<input id="q" type="search" placeholder="بحث في البيان والتصنيف والحساب" value="${esc(F.q)}" autocomplete="off" aria-label="بحث"></div>
  <div class="chips scroll" style="margin-bottom:12px">${OPS_FILTERS.map(([v, l]) => `<button type="button" class="chip ${F.type === v ? 'on' : ''}" data-act="filt" data-v="${v}">${l}</button>`).join('')}</div>
  <div id="opsum"></div><div id="opslist"></div>`;
}
function renderOpsList() {
  const r = range(); let list = S.tx.filter((t) => t.date >= r.from && t.date <= r.to);
  if (F.type !== 'all') list = list.filter((t) => (F.type === 'liab' ? t.type === 'bor' || t.type === 'pay' : t.type === F.type));
  const q = F.q.trim().toLowerCase();
  if (q) list = list.filter((t) => [t.note, t.cat && catName(t.cat), accName(t.acc), t.to && accName(t.to), String(t.amt), L.TYPE_LABEL[t.type]].join(' ').toLowerCase().includes(q));
  list.sort(byDateDesc);
  const sum = (type) => L.r2(list.filter((t) => t.type === type).reduce((a, t) => a + t.amt, 0));
  $('#opsum').innerHTML = list.length ? `<div class="card trio" style="padding:12px 14px;margin-bottom:12px"><div><span>إيرادات</span><b class="inc">${money(sum('rev'))}</b></div><div><span>مصروفات</span><b class="exp">${money(sum('exp'))}</b></div><div><span>مشتريات</span><b class="pur">${money(sum('pur'))}</b></div></div>` : '';
  if (!list.length) { $('#opslist').innerHTML = `<div class="card empty"><b>${q || F.type !== 'all' ? 'لا نتائج' : 'لا توجد عمليات في هذه الفترة'}</b>${q || F.type !== 'all' ? 'غيّر البحث أو الفلتر.' : 'اضغط «عملية جديدة» لإضافة أول عملية.'}</div>`; return; }
  let h = '', last = '';
  for (const t of list) {
    if (t.date !== last) { if (last) h += '</div>'; h += `<div class="card list" style="margin-bottom:10px"><div class="day">${esc(DF.format(isoToDate(t.date)))}</div>`; last = t.date; }
    h += txRow(t);
  }
  $('#opslist').innerHTML = h + '</div>';
}

/* ---------- التقارير ---------- */
const REPORTS = [['is', 'قائمة الدخل'], ['bs', 'المركز المالي'], ['cf', 'التدفق النقدي'], ['st', 'كشف حساب']];
function vRep() {
  const tabs = `<div class="chips scroll" style="margin-bottom:10px">${REPORTS.map(([v, l]) => `<button type="button" class="chip ${R.kind === v ? 'on' : ''}" data-act="rkind" data-v="${v}">${l}</button>`).join('')}</div>`;
  const r = range(), plabel = perLabel();
  let body = '';
  if (R.kind === 'is') {
    const i = L.incomeStatement(S, r);
    const grp = (title, list, total, totalLabel) => `<div class="grp-h">${title}</div>${list.length ? list.map((x) => ln(esc(x.name), x.v)).join('') : `<div class="ln sub"><span>لا يوجد</span></div>`}${ln(totalLabel, total, 'tot')}`;
    const all = [...i.expenses, ...i.purchases].sort((a, b) => b.v - a.v), tot = L.r2(i.totalExpenses + i.totalPurchases);
    body = `<section class="card stmt"><h3 class="stmt-h">قائمة الدخل</h3><p class="stmt-p">عن الفترة: ${esc(plabel)}</p>
      ${grp('الإيرادات', i.revenues, i.totalRevenue, 'إجمالي الإيرادات')}${grp('المشتريات', i.purchases, i.totalPurchases, 'إجمالي المشتريات')}
      ${ln('الفائض بعد المشتريات', i.gross, 'sub')}${grp('المصروفات', i.expenses, i.totalExpenses, 'إجمالي المصروفات')}
      <div class="ln grand ${i.net < 0 ? 'exp' : 'inc'}"><span>${i.net < 0 ? 'صافي العجز' : 'صافي الفائض'}</span><i class="d"></i><span class="num">${fmt(i.net)}</span></div>
      <p class="hint" style="margin:6px 0 12px">شراء الأصول لا يدخل هنا لأنه يحوّل المال إلى أصل ولا يُنقص ثروتك.</p></section>
      ${all.length ? `<section class="sec"><div class="sec-h"><h2>توزيع المصروفات والمشتريات</h2></div><div class="card bars">${all.map((x) => `<div><div class="l"><span><i class="dot" style="background:${PAL[x.color % PAL.length]}"></i>${esc(x.name)}</span><span><bdi class="num">${fmt(x.v)}</bdi> <small>${tot ? Math.round((x.v / tot) * 100) : 0}%</small></span></div><div class="bar"><i style="width:${((x.v / all[0].v) * 100).toFixed(1)}%;background:${PAL[x.color % PAL.length]}"></i></div></div>`).join('')}</div></section>` : ''}`;
  } else if (R.kind === 'bs') {
    const e = endISO(), b = L.balanceSheet(S, e), ok = Math.abs(b.totalAssets - (b.totalLiabs + b.equityCheck)) < 0.005;
    const rows = (l) => l.map((x) => ln(esc(x.name), x.v)).join('');
    body = `<section class="card stmt"><h3 class="stmt-h">المركز المالي</h3><p class="stmt-p">كما في ${esc(DFL.format(isoToDate(e)))}</p>
      <div class="grp-h">الأصول المتداولة (السيولة)</div>${rows(b.cash) + rows(b.bank) || ''}${ln('إجمالي السيولة', L.r2(b.totalCash + b.totalBank), 'tot')}
      <div class="grp-h">الأصول الأخرى</div>${b.assets.length ? rows(b.assets) : '<div class="ln sub"><span>لا توجد أصول</span></div>'}${ln('إجمالي الأصول الأخرى', b.totalOther, 'tot')}
      ${ln('إجمالي الأصول', b.totalAssets, 'grand')}
      <div class="grp-h">الالتزامات</div>${b.liabs.length ? rows(b.liabs) : '<div class="ln sub"><span>لا توجد التزامات</span></div>'}${ln('إجمالي الالتزامات', b.totalLiabs, 'tot')}
      <div class="grp-h">حقوق الملكية (صافي الثروة)</div>${ln('الرصيد الافتتاحي', b.openingEquity)}${ln('صافي الفائض المتراكم', b.retained)}${ln('إجمالي حقوق الملكية', b.equityCheck, 'tot')}
      ${ln('الالتزامات + حقوق الملكية', L.r2(b.totalLiabs + b.equityCheck), 'grand')}
      <p class="okline ${ok ? '' : 'bad'}">${ok ? '✓ الميزانية متوازنة: الأصول = الالتزامات + حقوق الملكية' : 'الميزانية غير متوازنة. راجع الأرصدة الافتتاحية.'}</p></section>`;
  } else if (R.kind === 'cf') {
    const c = L.cashFlow(S, r), bal = L.balances(S, endISO()), liquid = S.accounts.filter(L.isLiquid);
    body = `<section class="card stmt"><h3 class="stmt-h">التدفق النقدي</h3><p class="stmt-p">حركة الصندوق والبنوك عن الفترة: ${esc(plabel)}</p>
      ${ln('الرصيد النقدي أول الفترة', c.opening, 'tot')}
      <div class="grp-h">الداخل</div>${ln('الإيرادات', c.rev)}${ln('التزامات جديدة (اقتراض)', c.bor)}${ln('إجمالي الداخل', c.inflow, 'tot')}
      <div class="grp-h">الخارج</div>${ln('المصروفات', c.exp)}${ln('المشتريات', c.pur)}${ln('شراء أصول', c.assetPur)}${ln('سداد التزامات', c.pay)}${ln('إجمالي الخارج', c.outflow, 'tot')}
      ${ln('صافي الحركة', L.r2(c.inflow - c.outflow), 'sub')}
      <div class="ln grand"><span>الرصيد النقدي آخر الفترة</span><i class="d"></i><span class="num">${fmt(c.closing)}</span></div>
      <div class="grp-h">موزَّع على الحسابات (حتى ${esc(DFL.format(isoToDate(endISO())))})</div>${liquid.map((a) => ln(esc(a.name), bal[a.id])).join('')}
      <p class="hint" style="margin:6px 0 12px">التحويل بين صندوق وبنك لا يغيّر الإجمالي. المشتريات والمصروفات المدفوعة بالآجل لا تظهر هنا حتى تسدّدها.</p></section>`;
  } else {
    if (!acc(R.acc)) R.acc = S.accounts[0] ? S.accounts[0].id : '';
    const st = L.accountStatement(S, R.acc, r), isL = st && st.account.kind === 'liab';
    const chips = `<div class="chips scroll" style="margin-bottom:10px">${S.accounts.map((a) => `<button type="button" class="chip ${a.id === R.acc ? 'on' : ''}" data-act="rst" data-id="${esc(a.id)}">${esc(a.name)}</button>`).join('')}</div>`;
    body = `${chips}<section class="card list"><div class="stmt" style="padding-bottom:10px"><h3 class="stmt-h">كشف حساب: ${esc(st.account.name)}</h3><p class="stmt-p">${L.KIND_LABEL[st.account.kind]} · ${esc(plabel)}</p></div>
      <div class="opening"><span>${isL ? 'المتبقي في أول الفترة' : 'الرصيد في أول الفترة'}</span><span class="num">${fmt(st.opening)}</span></div>
      ${st.rows.length ? st.rows.map(({ t, delta, balance }) => `<button type="button" class="mv" data-act="edit" data-id="${esc(t.id)}" style="width:100%;text-align:start"><span class="grow"><span class="t">${txTitle(t)}</span><span class="s">${esc(DF.format(isoToDate(t.date)))} · ${L.TYPE_LABEL[t.type]}</span></span><span class="r"><b class="num ${(isL ? delta > 0 : delta < 0) ? 'exp' : 'inc'}">${delta > 0 ? '+' : ''}${fmt(delta)}</b><span class="num">${fmt(balance)}</span></span></button>`).join('') : '<div class="empty">لا توجد حركة في هذه الفترة.</div>'}
      <div class="opening"><span>${isL ? 'المتبقي في آخر الفترة' : 'الرصيد في آخر الفترة'}</span><span class="num">${fmt(st.closing)}</span></div></section>`;
  }
  return `${perSeg()}${tabs}${body}<div class="btn-row" style="margin-top:14px"><button class="btn" data-act="rep-csv">تصدير CSV</button><button class="btn" data-act="rep-share">مشاركة ملخص نصي</button></div>`;
}
function reportRows() {
  const r = range(), n = (v) => v;
  if (R.kind === 'is') {
    const i = L.incomeStatement(S, r), rows = [['قائمة الدخل', perLabel(), ''], ['البند', 'التصنيف', 'المبلغ']];
    i.revenues.forEach((x) => rows.push(['الإيرادات', x.name, x.v])); rows.push(['إجمالي الإيرادات', '', i.totalRevenue]);
    i.purchases.forEach((x) => rows.push(['المشتريات', x.name, x.v])); rows.push(['إجمالي المشتريات', '', i.totalPurchases]);
    i.expenses.forEach((x) => rows.push(['المصروفات', x.name, x.v])); rows.push(['إجمالي المصروفات', '', i.totalExpenses]);
    rows.push(['صافي الفائض', '', i.net]); return rows;
  }
  if (R.kind === 'bs') {
    const b = L.balanceSheet(S, endISO()), rows = [['المركز المالي', endISO(), ''], ['القسم', 'الحساب', 'الرصيد']];
    [['سيولة', b.cash], ['سيولة', b.bank], ['أصول', b.assets], ['التزامات', b.liabs]].forEach(([k, l]) => l.forEach((x) => rows.push([k, x.name, x.v])));
    rows.push(['إجمالي الأصول', '', b.totalAssets], ['إجمالي الالتزامات', '', b.totalLiabs], ['حقوق الملكية', '', b.equityCheck]); return rows;
  }
  if (R.kind === 'cf') {
    const c = L.cashFlow(S, r);
    return [['التدفق النقدي', perLabel(), ''], ['البند', '', 'المبلغ'], ['الرصيد أول الفترة', '', c.opening], ['الإيرادات', '', c.rev], ['التزامات جديدة', '', c.bor], ['المصروفات', '', -c.exp], ['المشتريات', '', -c.pur], ['شراء أصول', '', -c.assetPur], ['سداد التزامات', '', -c.pay], ['الرصيد آخر الفترة', '', c.closing]];
  }
  const st = L.accountStatement(S, R.acc, r), rows = [['كشف حساب', st.account.name, perLabel()], ['التاريخ', 'النوع', 'البيان', 'الحركة', 'الرصيد'], ['', '', 'رصيد أول الفترة', '', st.opening]];
  st.rows.forEach(({ t, delta, balance }) => rows.push([t.date, L.TYPE_LABEL[t.type], t.note || t.cat && catName(t.cat) || '', delta, balance]));
  rows.push(['', '', 'رصيد آخر الفترة', '', st.closing]); return rows;
}

/* ---------- الحسابات ---------- */
function vAcc() {
  const bs = L.balanceSheet(S), bal = L.balances(S);
  const groups = [['cash', 'الصندوق'], ['bank', 'البنوك'], ['asset', 'الأصول'], ['liab', 'الالتزامات']];
  const chips = (k) => S.cats.filter((c) => c.kind === k).map((c) => `<button type="button" class="chip" data-act="cat-edit" data-id="${esc(c.id)}"><i style="background:${PAL[c.color % PAL.length]}"></i>${esc(c.name)}</button>`).join('');
  return groups.map(([k, title]) => {
    const list = S.accounts.filter((a) => a.kind === k), tot = L.r2(list.reduce((s, a) => s + bal[a.id], 0));
    return `<section class="sec" style="margin-top:${k === 'cash' ? 4 : 22}px"><div class="sec-h"><h2>${title} ${list.length ? `<small class="num">${fmt(tot)} ${esc(cur())}</small>` : ''}</h2><button class="link" data-act="acc-add" data-v="${k}">+ إضافة</button></div>
    <div class="card list">${list.length ? list.map((a) => `<button type="button" class="row" data-act="acc-open" data-id="${esc(a.id)}"><span class="grow"><span class="t">${esc(a.name)}</span>${a.note ? `<span class="s">${esc(a.note)}</span>` : ''}</span><span class="amt ${k === 'liab' ? 'liab' : colorCls(bal[a.id])}">${money(bal[a.id])}</span></button>`).join('') : `<div class="empty" style="padding:16px">${k === 'asset' ? 'سيارة، عقار، ذهب، استثمارات…' : k === 'liab' ? 'قرض، بطاقة ائتمانية، دين لشخص…' : 'لا يوجد'}</div>`}</div></section>`;
  }).join('') + `
  <section class="sec"><div class="sec-h"><h2>تصنيفات الإيرادات</h2><button class="link" data-act="cat-add" data-v="rev">+ تصنيف</button></div><div class="chips">${chips('rev')}</div></section>
  <section class="sec"><div class="sec-h"><h2>تصنيفات المصروفات</h2><button class="link" data-act="cat-add" data-v="exp">+ تصنيف</button></div><div class="chips">${chips('exp')}</div></section>
  <section class="sec"><div class="sec-h"><h2>تصنيفات المشتريات</h2><button class="link" data-act="cat-add" data-v="pur">+ تصنيف</button></div><div class="chips">${chips('pur')}</div></section>`;
}

/* ---------- الإعدادات ---------- */
function vSet() {
  const hasSample = S.tx.some((t) => t.s);
  return `
  <section class="sec" style="margin-top:4px"><div class="sec-h"><h2>الحساب والأمان</h2></div>
    <div class="card list">
      <button type="button" class="row" data-act="name-edit"><span class="grow"><span class="t">الاسم</span><span class="s">${esc(profile.name || '')}</span></span><span class="link">تعديل</span></button>
      <button type="button" class="row" data-act="pin-edit"><span class="grow"><span class="t">رمز الدخول</span><span class="s">6 أرقام</span></span><span class="link">تغيير</span></button>
      <button type="button" class="row" data-act="bio-toggle"><span class="grow"><span class="t">الدخول بالبصمة</span><span class="s">${profile.bio ? 'مفعّلة' : 'غير مفعّلة'}</span></span><span class="link">${profile.bio ? 'إيقاف' : 'تفعيل'}</span></button>
      <label class="row" style="cursor:pointer"><span class="grow"><span class="t">القفل التلقائي</span><span class="s">عند الخروج من التطبيق</span></span>
        <select id="autolock" aria-label="القفل التلقائي" style="border:1px solid var(--line);border-radius:8px;background:var(--surface);padding:6px 8px;min-height:38px">${AUTOLOCK.map(([v, l]) => `<option value="${v}" ${v === profile.autolock ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    </div></section>
  <section class="sec"><div class="sec-h"><h2>العملة</h2></div>
    <label class="fld" style="margin-top:0"><select id="cursel" aria-label="العملة">${Object.keys(CUR).map((k) => `<option value="${k}" ${k === S.currency ? 'selected' : ''}>${CUR_NAME[k]} (${CUR[k]})</option>`).join('')}</select></label>
    <p class="hint">تغيير العملة يغيّر الرمز فقط ولا يحوّل المبالغ.</p></section>
  <section class="sec"><div class="sec-h"><h2>بياناتك</h2></div>
    <div class="btn-row"><button class="btn" data-act="export-csv">تصدير كل العمليات (CSV)</button><button class="btn" data-act="export-json">نسخة احتياطية</button><label class="btn" for="imp" data-act="imp-pick">استعادة من نسخة</label></div>
    <div class="btn-row" style="margin-top:8px">${hasSample ? '<button class="btn" data-act="sample-clear">حذف البيانات التجريبية</button>' : '<button class="btn" data-act="sample">تحميل بيانات تجريبية</button>'}
      ${confirmWipe ? '<button class="btn danger" data-act="wipe">تأكيد: مسح كل البيانات</button><button class="btn" data-act="wipe-cancel">إلغاء</button>' : '<button class="btn ghost-danger" data-act="wipe-ask">مسح كل البيانات</button>'}</div>
    <p class="hint">بياناتك محفوظة على هذا الجهاز فقط ولا تُرسل إلى أي مكان. إن فقدت الجهاز فقدت البيانات، لذلك خذ نسخة احتياطية بانتظام وأرسلها لنفسك.</p></section>
  <p class="hint" style="text-align:center;margin-top:22px">دفتري · الإصدار 1.0</p>`;
}

/* ---------- النوافذ السفلية ---------- */
const cs = () => stack[stack.length - 1];
function closeSheetUI() { $('#sheetWrap').hidden = true; $('#sheet').innerHTML = ''; }
function openSheet(kind, d) { stack = [{ kind, d, err: '', confirm: false }]; $('#sheetWrap').hidden = false; paintSheet(); }
function pushSheet(kind, d, onDone) { stack.push({ kind, d, err: '', confirm: false, onDone }); paintSheet(); }
function popSheet() { stack.pop(); if (!stack.length) { closeSheetUI(); return; } paintSheet(); }
const head = (t, back) => `<div class="sh-head"><h2>${t}</h2><button type="button" class="icon-btn" data-act="close" aria-label="إغلاق">${ic('x')}</button></div>`;
const errLine = () => `<p class="err-t" id="errl">${esc(cs().err || '')}</p>`;
const sErr = (m) => { cs().err = m; const e = $('#errl'); if (e) e.textContent = m; };
const delBtn = (act, ask, label) => (cs().confirm ? `<button type="button" class="btn danger" data-act="${act}">تأكيد الحذف</button>` : `<button type="button" class="btn ghost-danger" data-act="${ask}">${label}</button>`);
const bal0 = () => L.balances(S);
function accSel(f, label, list, val, extra = '') {
  const b = bal0();
  return `<label class="fld"><span>${label}</span><select data-f="${f}">${list.map((a) => `<option value="${esc(a.id)}" ${a.id === val ? 'selected' : ''}>${esc(a.name)} · ${fmt(b[a.id])}</option>`).join('')}</select></label>${extra}`;
}
const addLink = (kind, label) => `<button type="button" class="link" data-act="new-acc" data-v="${kind}" style="margin-top:6px;align-self:flex-start">+ ${label}</button>`;

function paintSheet() {
  const sh = cs(), d = sh.d; let h = '';
  if (sh.kind === 'type') {
    h = head('عملية جديدة') + `<div class="types">${Object.keys(TM).map((k) => `<button type="button" class="tcard" data-act="newtype" data-v="${k}"><span class="tdot" style="background:${TM[k].color}">${ic(TM[k].icon, 18)}</span><span><b>${L.TYPE_LABEL[k]}</b><span class="s">${TM[k].desc}</span></span></button>`).join('')}</div>`;
  } else if (sh.kind === 'tx') {
    const liquid = S.accounts.filter(L.isLiquid), liabs = S.accounts.filter((a) => a.kind === 'liab'), assets = S.accounts.filter((a) => a.kind === 'asset');
    const catChips = (k) => `<div class="fld"><span>التصنيف</span><div class="chips">${S.cats.filter((c) => c.kind === k).map((c) => `<button type="button" class="chip ${d.cat === c.id ? 'on' : ''}" data-act="pickcat" data-v="${esc(c.id)}"><i style="background:${PAL[c.color % PAL.length]}"></i>${esc(c.name)}</button>`).join('')}<button type="button" class="chip add" data-act="new-cat" data-v="${k}">+ تصنيف</button></div></div>`;
    const m = TM[d.type]; let body = '';
    const noteLbl = d.type === 'pur' ? 'الصنف أو البائع (اختياري)' : d.type === 'rev' ? 'المصدر (اختياري)' : 'ملاحظة (اختياري)';
    if (d.type === 'rev') body = catChips('rev') + accSel('acc', 'يُودَع في', liquid, d.acc);
    else if (d.type === 'exp') body = catChips('exp') + accSel('acc', 'الدفع من', [...liquid, ...liabs], d.acc, liabs.length ? '' : addLink('liab', 'التزام أو بطاقة (للدفع الآجل)'));
    else if (d.type === 'pur') body = `<div class="fld"><span>ماذا اشتريت؟</span><div class="seg"><button type="button" class="${d.mode === 'item' ? 'on' : ''}" data-act="pmode2" data-v="item">أغراض ومواد</button><button type="button" class="${d.mode === 'asset' ? 'on' : ''}" data-act="pmode2" data-v="asset">أصل (يبقى لك)</button></div></div>`
      + (d.mode === 'asset' ? (assets.length ? accSel('to', 'الأصل المشترى', assets, d.to) : '') + addLink('asset', 'أصل جديد (سيارة، جهاز، عقار…)') : catChips('pur'))
      + accSel('acc', 'الدفع من', [...liquid, ...liabs], d.acc, liabs.length ? '' : addLink('liab', 'التزام أو بطاقة (للدفع الآجل)'));
    else if (d.type === 'trf') body = accSel('acc', 'من', liquid, d.acc) + accSel('to', 'إلى', liquid, d.to);
    else if (d.type === 'bor') body = (liabs.length ? accSel('acc', 'الالتزام', liabs, d.acc) : '') + addLink('liab', 'التزام جديد (قرض، دين…)') + accSel('to', 'يُودَع في', liquid, d.to);
    else if (d.type === 'pay') body = (liabs.length ? accSel('to', 'الالتزام المسدَّد', liabs, d.to) : '') + addLink('liab', 'التزام جديد') + accSel('acc', 'الدفع من', liquid, d.acc);
    h = head(`<span style="color:${m.color}">${L.TYPE_LABEL[d.type]}</span>${d.no ? ` <small>قيد #${d.no}</small>` : ''}`)
      + `<label class="fld big"><span>المبلغ (${esc(cur())})</span><input data-f="amt" inputmode="decimal" autocomplete="off" placeholder="0.00" value="${esc(d.amt)}"></label>`
      + body + `<p class="warn-t" id="warn" hidden></p>`
      + `<label class="fld"><span>التاريخ</span><input data-f="date" type="date" value="${esc(d.date)}"></label>
      <label class="fld"><span>${noteLbl}</span><input data-f="note" autocomplete="off" maxlength="120" value="${esc(d.note)}"></label>` + errLine()
      + `<div class="sh-actions"><button type="button" class="btn primary" data-act="txsave">حفظ</button>${d.id ? `<button type="button" class="btn" data-act="txdup">نسخ</button>${delBtn('txdel', 'txdelask', 'حذف')}` : ''}</div>`;
  } else if (sh.kind === 'acc') {
    const lbl = { cash: 'الرصيد الحالي في الصندوق', bank: 'الرصيد الحالي في البنك', asset: 'القيمة الحالية للأصل', liab: 'المبلغ المتبقي عليك' }[d.kind];
    h = head(d.id ? 'تعديل الحساب' : 'حساب جديد')
      + `<div class="fld"><span>النوع</span><div class="seg">${['cash', 'bank', 'asset', 'liab'].map((k) => `<button type="button" class="${d.kind === k ? 'on' : ''}" data-act="acckind" data-v="${k}" ${d.id && d.locked ? 'disabled' : ''}>${L.KIND_LABEL[k]}</button>`).join('')}</div></div>
      <label class="fld"><span>الاسم</span><input data-f="name" maxlength="40" autocomplete="off" value="${esc(d.name)}" placeholder="${{ cash: 'مثال: صندوق البيت', bank: 'مثال: الراجحي', asset: 'مثال: السيارة', liab: 'مثال: قرض السيارة' }[d.kind]}"></label>
      <label class="fld"><span>${lbl} (${esc(cur())})</span><input data-f="opening" inputmode="decimal" autocomplete="off" value="${esc(d.opening)}"></label>
      <label class="fld"><span>ملاحظة (اختياري)</span><input data-f="note" maxlength="60" autocomplete="off" value="${esc(d.note)}" placeholder="رقم الحساب، الجهة، القسط…"></label>
      <p class="hint">${d.id ? 'تعديل الرصيد الافتتاحي يغيّر الرصيد الحالي بنفس الفرق. لا تعدّله لتسجيل عملية، سجّل عملية بدلاً منه.' : 'هذا هو الرصيد قبل تسجيل أي عملية في دفتري.'}</p>` + errLine()
      + `<div class="sh-actions"><button type="button" class="btn primary" data-act="accsave">حفظ</button>${d.id ? `<button type="button" class="btn" data-act="acc-stmt">كشف الحساب</button>${delBtn('accdel', 'accdelask', 'حذف')}` : ''}</div>`;
  } else if (sh.kind === 'cat') {
    h = head(d.id ? 'تعديل التصنيف' : 'تصنيف جديد') + `<label class="fld"><span>اسم التصنيف</span><input data-f="name" maxlength="30" autocomplete="off" value="${esc(d.name)}"></label>
      <div class="fld"><span>اللون</span><div class="swatches">${PAL.map((c, i) => `<button type="button" class="${d.color === i ? 'on' : ''}" data-act="pickcolor" data-v="${i}" style="background:${c}" aria-label="لون ${i + 1}"></button>`).join('')}</div></div>` + errLine()
      + `<div class="sh-actions"><button type="button" class="btn primary" data-act="catsave">حفظ</button>${d.id ? delBtn('catdel', 'catdelask', 'حذف التصنيف') : ''}</div>`;
  } else if (sh.kind === 'pin') {
    h = head('تغيير رمز الدخول') + ['old:الرمز الحالي', 'nw:الرمز الجديد (6 أرقام)', 'cf:أعد كتابة الرمز الجديد'].map((x) => { const [f, l] = x.split(':'); return `<label class="fld"><span>${l}</span><input data-f="${f}" type="password" inputmode="numeric" maxlength="6" autocomplete="off" value="${esc(d[f] || '')}"></label>`; }).join('') + errLine()
      + `<div class="sh-actions"><button type="button" class="btn primary" data-act="pinsave">تغيير الرمز</button></div>`;
  } else if (sh.kind === 'name') {
    h = head('تعديل الاسم') + `<label class="fld"><span>الاسم</span><input data-f="name" maxlength="30" autocomplete="off" value="${esc(d.name)}"></label>` + errLine() + `<div class="sh-actions"><button type="button" class="btn primary" data-act="namesave">حفظ</button></div>`;
  } else if (sh.kind === 'imp') {
    h = head('استعادة نسخة احتياطية') + `<p>سيتم استبدال كل بياناتك الحالية بمحتوى النسخة: ${d.count} عملية و${d.accounts} حسابات. لا يمكن التراجع.</p>
      <div class="sh-actions"><button type="button" class="btn danger" data-act="impgo">استبدال بياناتي</button><button type="button" class="btn" data-act="close">إلغاء</button></div>`;
  }
  $('#sheet').innerHTML = h;
  if (sh.kind === 'tx') updateWarn();
}
function updateWarn() {
  const sh = cs(); if (!sh || sh.kind !== 'tx') return; const w = $('#warn'); if (!w) return;
  const n = num(sh.d.amt); if (!(n > 0)) { w.hidden = true; return; }
  const short = L.shortfall(S, { type: sh.d.type, acc: sh.d.acc, amt: n }, sh.d.id);
  w.hidden = !short; if (short) w.textContent = `الرصيد لا يكفي: سيصبح الحساب بالسالب بمقدار ${fmt(short)} ${cur()}. تأكد من الرصيد الافتتاحي أو العمليات السابقة.`;
}

/* ---------- العمليات المالية ---------- */
function newDraft(type) {
  const liquid = S.accounts.filter(L.isLiquid), liab = S.accounts.find((a) => a.kind === 'liab'), asset = S.accounts.find((a) => a.kind === 'asset');
  const l0 = (liquid[0] || {}).id || '', l1 = (liquid[1] || liquid[0] || {}).id || '';
  const date = per.mode === 'month' && !(per.y === now0.getFullYear() && per.m === now0.getMonth() + 1) ? `${per.y}-${pad(per.m)}-01` : todayISO();
  const d = { type, amt: '', date, note: '', acc: l0, to: '', cat: '', mode: 'item' };
  const first = (k) => (S.cats.find((c) => c.kind === k) || {}).id || '';
  if (type === 'rev') d.cat = first('rev');
  if (type === 'exp') d.cat = first('exp');
  if (type === 'pur') { d.cat = first('pur'); d.to = asset ? asset.id : ''; }
  if (type === 'trf') d.to = l1 === l0 ? '' : l1;
  if (type === 'bor') { d.acc = liab ? liab.id : ''; d.to = l0; }
  if (type === 'pay') { d.acc = l0; d.to = liab ? liab.id : ''; }
  return d;
}
function draftFromTx(t) { return { id: t.id, no: t.no, ts: t.ts, s: t.s, type: t.type, amt: String(t.amt), date: t.date, note: t.note || '', acc: t.acc, to: t.to || '', cat: t.cat || '', mode: t.type === 'pur' && t.to ? 'asset' : 'item' }; }
function saveTx() {
  const sh = cs(), d = sh.d, n = num(d.amt);
  const t = { id: d.id || uid(), no: d.no || S.seq + 1, ts: d.ts || Date.now(), type: d.type, amt: L.r2(n), date: d.date, acc: d.acc, note: (d.note || '').trim() };
  if (d.type === 'pur') { if (d.mode === 'asset') t.to = d.to; else t.cat = d.cat; }
  else if (['trf', 'bor', 'pay'].includes(d.type)) t.to = d.to;
  else t.cat = d.cat;
  if (d.s) t.s = 1;
  const err = L.validateTx(S, t); if (err) return sErr(err);
  if (d.id) S.tx = S.tx.filter((x) => x.id !== d.id); else S.seq += 1;
  S.tx.push(t); persist();
  if (per.mode === 'month') { per.y = +t.date.slice(0, 4); per.m = +t.date.slice(5, 7); }
  stack = []; closeSheetUI(); render(); toast(d.id ? 'تم تحديث العملية' : `تم تسجيل القيد رقم ${t.no}`);
}
function accDraft(a, kind) { return a ? { id: a.id, kind: a.kind, name: a.name, opening: String(a.opening), note: a.note || '', locked: S.tx.some((t) => t.acc === a.id || t.to === a.id) } : { kind: kind || 'bank', name: '', opening: '0', note: '' }; }
function saveAcc() {
  const sh = cs(), d = sh.d, name = d.name.trim(), o = d.opening === '' ? 0 : num(d.opening);
  if (!name) return sErr('اكتب اسم الحساب.'); if (isNaN(o)) return sErr('الرصيد الافتتاحي غير صحيح.');
  if (o < 0) return sErr(d.kind === 'liab' ? 'اكتب المبلغ المتبقي بدون إشارة سالبة.' : 'اكتب الرصيد موجباً. إن كان عليك مبلغ فأضفه كالتزام.');
  if (S.accounts.some((a) => a.name === name && a.id !== d.id)) return sErr('يوجد حساب بهذا الاسم.');
  let id = d.id;
  if (id) { const a = acc(id); Object.assign(a, { name, opening: L.r2(o), note: d.note.trim() }); if (!d.locked) a.kind = d.kind; }
  else { id = 'a_' + uid(); S.accounts.push({ id, name, kind: d.kind, opening: L.r2(o), note: d.note.trim() }); }
  persist(); const cb = sh.onDone; stack.pop(); if (cb) cb(id);
  if (!stack.length) { closeSheetUI(); render(); toast('تم حفظ الحساب'); } else paintSheet();
}
function delAcc() {
  const id = cs().d.id;
  if (S.tx.some((t) => t.acc === id || t.to === id)) { cs().confirm = false; paintSheet(); return sErr('لا يمكن حذف حساب عليه عمليات. احذف عملياته أولاً.'); }
  if (S.accounts.filter(L.isLiquid).length <= 1 && L.isLiquid(acc(id))) { cs().confirm = false; paintSheet(); return sErr('يجب أن يبقى صندوق أو بنك واحد على الأقل.'); }
  S.accounts = S.accounts.filter((a) => a.id !== id); persist(); stack = []; closeSheetUI(); render(); toast('تم حذف الحساب');
}
function saveCat() {
  const sh = cs(), d = sh.d, name = d.name.trim();
  if (!name) return sErr('اكتب اسم التصنيف.');
  if (S.cats.some((c) => c.name === name && c.kind === d.kind && c.id !== d.id)) return sErr('يوجد تصنيف بهذا الاسم.');
  let id = d.id;
  if (id) Object.assign(cat(id), { name, color: d.color }); else { id = 'c_' + uid(); S.cats.push({ id, name, kind: d.kind, color: d.color }); }
  persist(); const cb = sh.onDone; stack.pop(); if (cb) cb(id);
  if (!stack.length) { closeSheetUI(); render(); toast('تم حفظ التصنيف'); } else paintSheet();
}
function delCat() {
  const c = cat(cs().d.id), used = S.tx.filter((t) => t.cat === c.id).length;
  if (used) { cs().confirm = false; paintSheet(); return sErr(`التصنيف مستخدم في ${used} عملية. غيّر تصنيفها أولاً.`); }
  if (S.cats.filter((x) => x.kind === c.kind).length <= 1) { cs().confirm = false; paintSheet(); return sErr('يجب أن يبقى تصنيف واحد على الأقل.'); }
  S.cats = S.cats.filter((x) => x.id !== c.id); persist(); stack = []; closeSheetUI(); render(); toast('تم حذف التصنيف');
}

/* بيانات تجريبية */
function loadSample() {
  const t0 = new Date(), mk = (i) => { const d = new Date(t0.getFullYear(), t0.getMonth() - i, 1); return { y: d.getFullYear(), m: d.getMonth() + 1 }; };
  const A = [{ id: 's_cash', name: 'صندوق (تجريبي)', kind: 'cash', opening: 600 }, { id: 's_bank', name: 'بنك (تجريبي)', kind: 'bank', opening: 9000 }, { id: 's_car', name: 'سيارة (تجريبي)', kind: 'asset', opening: 38000 }, { id: 's_loan', name: 'قرض سيارة (تجريبي)', kind: 'liab', opening: 21600 }, { id: 's_card', name: 'بطاقة ائتمانية (تجريبي)', kind: 'liab', opening: 0 }];
  A.forEach((a) => { a.s = 1; if (!acc(a.id)) S.accounts.push(a); });
  let seed = 11; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280, c = (k, i) => (S.cats.filter((x) => x.kind === k)[i] || S.cats.find((x) => x.kind === k)).id;
  [2, 1, 0].forEach((back) => {
    const { y, m } = mk(back), dim = new Date(y, m, 0).getDate(), maxd = back === 0 ? t0.getDate() : dim;
    const add = (day, type, amt, o) => { if (day > maxd || day > dim) return; S.seq += 1; S.tx.push({ id: uid(), no: S.seq, ts: Date.now() + S.seq, type, amt: L.r2(amt), date: `${y}-${pad(m)}-${pad(day)}`, s: 1, note: '', ...o }); };
    add(1, 'rev', 12000, { acc: 's_bank', cat: c('rev', 0), note: 'راتب الشهر' });
    if (back === 1) add(9, 'rev', 1800, { acc: 's_bank', cat: c('rev', 1), note: 'عمل إضافي' });
    add(2, 'exp', 3500, { acc: 's_bank', cat: c('exp', 0), note: 'إيجار الشقة' });
    add(3, 'pay', 1200, { acc: 's_bank', to: 's_loan', note: 'قسط السيارة' });
    add(4, 'trf', 1000, { acc: 's_bank', to: 's_cash', note: 'سحب نقدي' });
    add(6, 'exp', 280 + rnd() * 80, { acc: 's_bank', cat: c('exp', 1), note: 'كهرباء وماء' });
    add(8, 'exp', 140 + rnd() * 60, { acc: 's_cash', cat: c('exp', 2), note: 'وقود' });
    add(11, 'pur', 420 + rnd() * 200, { acc: 's_card', cat: c('pur', 1), note: 'ملابس' });
    add(14, 'pur', 180 + rnd() * 120, { acc: 's_cash', cat: c('pur', 2), note: 'مستلزمات المنزل' });
    for (let d = 2; d <= dim; d += 3 + Math.floor(rnd() * 3)) add(d, 'pur', 70 + rnd() * 190, { acc: rnd() > 0.5 ? 's_cash' : 's_bank', cat: c('pur', 0), note: 'بقالة' });
    if (back === 0) add(Math.min(16, maxd), 'pay', 450, { acc: 's_bank', to: 's_card', note: 'سداد البطاقة' });
  });
  persist(); render(); toast('تم تحميل البيانات التجريبية');
}
function clearSample() {
  S.tx = S.tx.filter((t) => !t.s);
  S.accounts = S.accounts.filter((a) => !(a.s && !S.tx.some((t) => t.acc === a.id || t.to === a.id)));
  S.accounts.forEach((a) => delete a.s);
  persist(); render(); toast('تم حذف البيانات التجريبية');
}

/* تصدير واستيراد */
const csvCell = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
const toCsv = (rows) => '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
async function exportFile(name, text, mime) {
  suppressLock = true;
  try { await P.saveFile(name, text, mime); toast('تم تجهيز الملف'); } catch (e) { if (!/cancel/i.test(String(e && e.message))) toast('تعذّر تجهيز الملف'); } finally { setTimeout(() => (suppressLock = false), 1500); }
}
function allTxCsv() {
  const rows = [['رقم القيد', 'التاريخ', 'النوع', 'المبلغ', 'التصنيف', 'الحساب', 'الحساب المقابل', 'البيان']];
  S.tx.slice().sort((a, b) => a.date.localeCompare(b.date) || (a.no || 0) - (b.no || 0)).forEach((t) => rows.push([t.no, t.date, L.TYPE_LABEL[t.type], t.amt, t.cat ? catName(t.cat) : '', accName(t.acc), t.to ? accName(t.to) : '', t.note || '']));
  return toCsv(rows);
}
let pendingImport = null;
function onImportFile(ev) {
  const f = ev.target.files && ev.target.files[0]; ev.target.value = ''; suppressLock = false; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const o = JSON.parse(String(rd.result));
      if (!o || o.app !== 'daftari' || !o.data || !Array.isArray(o.data.accounts) || !Array.isArray(o.data.tx) || !Array.isArray(o.data.cats)) throw 0;
      pendingImport = o.data; openSheet('imp', { count: o.data.tx.length, accounts: o.data.accounts.length });
    } catch (e) { toast('الملف ليس نسخة احتياطية صالحة من دفتري'); }
  };
  rd.onerror = () => toast('تعذّرت قراءة الملف'); rd.readAsText(f);
}
function toast(m) { const t = $('#toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 2400); }

/* ---------- الأحداث ---------- */
const stepPeriod = (n) => {
  if (per.mode === 'year') per.y += n;
  else if (per.mode === 'month') { const d = new Date(per.y, per.m - 1 + n, 1); per.y = d.getFullYear(); per.m = d.getMonth() + 1; }
};
document.addEventListener('click', async (e) => {
  if (e.target.id === 'sheetWrap') { stack = []; closeSheetUI(); return; }
  const el = e.target.closest('[data-act]'); if (!el) return;
  const v = el.dataset.v, id = el.dataset.id, a = el.dataset.act;
  const sh = cs(), d = sh && sh.d;
  switch (a) {
    case 'key': pressKey(v); break;
    case 'del': pressKey('del'); break;
    case 'bio': tryBio(false); break;
    case 'forgot': lk.forgot = true; lk.confirm = false; paintLock(); break;
    case 'forgot-back': lk.forgot = false; paintLock(); break;
    case 'reset-ask': lk.confirm = true; paintLock(); break;
    case 'reset-go': await resetAll(); break;
    case 'name-next': { const n = ($('#nm').value || '').trim(); if (!n) { lk.err = 'اكتب اسمك للمتابعة.'; paintLock(); break; } lk.name = n; lk.step = 'pin1'; lk.err = ''; lk.entry = ''; paintLock(); break; }
    case 'bio-on': try { suppressLock = true; await Auth.enableBio(profile); } catch (er) { lk.err = 'لم يتم تفعيل البصمة. يمكنك تفعيلها لاحقاً من الإعدادات.'; paintLock(); suppressLock = false; break; } suppressLock = false; await unlock(); break;
    case 'bio-skip': await unlock(); break;
    case 'lock': showLock('login'); break;
    case 'tab': setTab(v); break;
    case 'go-rep': R.kind = 'is'; per = { mode: 'month', y: now0.getFullYear(), m: now0.getMonth() + 1 }; setTab('rep'); break;
    case 'mprev': stepPeriod(-1); render(); break;
    case 'mnext': stepPeriod(1); render(); break;
    case 'pmode': per.mode = v; render(); break;
    case 'filt': F.type = v; render(); break;
    case 'rkind': R.kind = v; render(); break;
    case 'rst': R.acc = id; render(); break;
    case 'add': openSheet('type', {}); break;
    case 'newtype': openSheet('tx', newDraft(v)); break;
    case 'edit': { const t = S.tx.find((x) => x.id === id); if (t) openSheet('tx', draftFromTx(t)); break; }
    case 'close': popSheet(); break;
    case 'pickcat': d.cat = v; paintSheet(); break;
    case 'pmode2': d.mode = v; if (v === 'asset' && !d.to) { const as = S.accounts.find((x) => x.kind === 'asset'); d.to = as ? as.id : ''; } paintSheet(); break;
    case 'new-acc': pushSheet('acc', accDraft(null, v), (nid) => { const p = cs(); if (v === 'asset') { p.d.to = nid; p.d.mode = 'asset'; } else if (p.d.type === 'bor') p.d.acc = nid; else if (p.d.type === 'pay') p.d.to = nid; else p.d.acc = nid; }); break;
    case 'new-cat': pushSheet('cat', { kind: v, name: '', color: S.cats.length % PAL.length }, (nid) => { cs().d.cat = nid; }); break;
    case 'txsave': saveTx(); break;
    case 'txdup': { const c = { ...d }; delete c.id; delete c.no; delete c.ts; delete c.s; c.date = todayISO(); openSheet('tx', c); break; }
    case 'txdelask': sh.confirm = true; paintSheet(); break;
    case 'txdel': S.tx = S.tx.filter((t) => t.id !== d.id); persist(); stack = []; closeSheetUI(); render(); toast('تم حذف العملية'); break;
    case 'acc-add': openSheet('acc', accDraft(null, v)); break;
    case 'acc-open': { const x = acc(id); if (x) openSheet('acc', accDraft(x)); break; }
    case 'acckind': d.kind = v; paintSheet(); break;
    case 'accsave': saveAcc(); break;
    case 'accdelask': sh.confirm = true; paintSheet(); break;
    case 'accdel': delAcc(); break;
    case 'acc-stmt': R = { kind: 'st', acc: d.id }; stack = []; closeSheetUI(); tab = 'rep'; buildChrome(); render(); break;
    case 'cat-add': openSheet('cat', { kind: v, name: '', color: S.cats.length % PAL.length }); break;
    case 'cat-edit': { const c = cat(id); if (c) openSheet('cat', { id: c.id, kind: c.kind, name: c.name, color: c.color % PAL.length }); break; }
    case 'pickcolor': d.color = Number(v); paintSheet(); break;
    case 'catsave': saveCat(); break;
    case 'catdelask': sh.confirm = true; paintSheet(); break;
    case 'catdel': delCat(); break;
    case 'name-edit': openSheet('name', { name: profile.name || '' }); break;
    case 'namesave': { const n = (d.name || '').trim(); if (!n) return sErr('اكتب الاسم.'); await Auth.update(profile, { name: n }); stack = []; closeSheetUI(); render(); toast('تم حفظ الاسم'); break; }
    case 'pin-edit': openSheet('pin', { old: '', nw: '', cf: '' }); break;
    case 'pinsave': {
      if (!/^\d{6}$/.test(d.nw || '')) return sErr('الرمز الجديد يجب أن يكون 6 أرقام.');
      if (d.nw !== d.cf) return sErr('الرمزان الجديدان غير متطابقين.');
      const r = await Auth.changePin(profile, d.old || '', d.nw);
      if (!r.ok) return sErr(r.wait ? `انتظر ${r.wait} ثانية ثم حاول.` : 'الرمز الحالي غير صحيح.');
      stack = []; closeSheetUI(); toast('تم تغيير الرمز'); break;
    }
    case 'bio-toggle':
      if (profile.bio) { await Auth.disableBio(profile); render(); toast('تم إيقاف البصمة'); }
      else if (!(await P.bio.available())) toast('لا توجد بصمة مسجلة على هذا الجهاز');
      else { try { suppressLock = true; await Auth.enableBio(profile); render(); toast('تم تفعيل البصمة'); } catch (er) { toast('لم يتم تفعيل البصمة'); } finally { setTimeout(() => (suppressLock = false), 800); } }
      break;
    case 'export-csv': exportFile('daftari-operations.csv', allTxCsv(), 'text/csv'); break;
    case 'export-json': exportFile('daftari-backup.json', JSON.stringify({ app: 'daftari', v: 1, at: new Date().toISOString(), data: S }), 'application/json'); break;
    case 'rep-csv': exportFile(`daftari-${R.kind}.csv`, toCsv(reportRows()), 'text/csv'); break;
    case 'rep-share': { const rows = reportRows(); suppressLock = true; try { await P.shareText('دفتري', rows.map((r) => r.filter((x) => x !== '').join(' · ')).join('\n')); toast('تم نسخ الملخص'); } catch (er) {} finally { setTimeout(() => (suppressLock = false), 1500); } break; }
    case 'imp-pick': suppressLock = true; break;
    case 'impgo': { const old = S.tx.length; adopt(pendingImport); pendingImport = null; persist(); stack = []; closeSheetUI(); render(); toast(`تمت الاستعادة (${S.tx.length} عملية)`); break; }
    case 'sample': loadSample(); break;
    case 'sample-clear': clearSample(); break;
    case 'wipe-ask': confirmWipe = true; render(); break;
    case 'wipe-cancel': confirmWipe = false; render(); break;
    case 'wipe': await resetAll(); break;
    case 'retry': flush(); break;
  }
});
function syncField(e) {
  const t = e.target, sh = cs();
  if (t.id === 'q') { F.q = t.value; renderOpsList(); return; }
  if (t.dataset && t.dataset.f && sh) { sh.d[t.dataset.f] = t.value; if (sh.kind === 'tx') updateWarn(); }
}
document.addEventListener('input', syncField);
document.addEventListener('change', async (e) => {
  syncField(e);
  if (e.target.id === 'cursel') { S.currency = e.target.value; persist(); render(); }
  if (e.target.id === 'autolock') await Auth.update(profile, { autolock: Number(e.target.value) });
  if (e.target.id === 'imp') onImportFile(e);
});
document.addEventListener('keydown', (e) => {
  if (!unlocked) {
    if (lk.step === 'name' && e.key === 'Enter') $('[data-act=name-next]').click();
    else if (['login', 'pin1', 'pin2'].includes(lk.step) && !lk.forgot) { if (/^\d$/.test(e.key)) pressKey(e.key); else if (e.key === 'Backspace') pressKey('del'); }
    return;
  }
  if (e.key === 'Escape' && stack.length) popSheet();
  if (e.key === 'Enter' && stack.length && e.target.tagName === 'INPUT' && e.target.type !== 'date') {
    const m = { tx: 'txsave', acc: 'accsave', cat: 'catsave', pin: 'pinsave', name: 'namesave' }[cs().kind]; const b = m && $(`[data-act=${m}]`); if (b) { e.preventDefault(); b.click(); }
  }
});

/* ---------- دورة حياة التطبيق ---------- */
P.onResume((active) => {
  if (!active) { hiddenAt = Date.now(); return; }
  if (unlocked && profile && !suppressLock && hiddenAt && (Date.now() - hiddenAt) / 1000 >= profile.autolock) showLock('login');
  hiddenAt = 0;
});
P.onBack(() => {
  if (stack.length) { popSheet(); return; }
  if (unlocked && tab !== 'home') { setTab('home'); return; }
  if (!unlocked && lk.forgot) { lk.forgot = false; paintLock(); return; }
  P.exitApp();
});
(async function boot() {
  profile = await Auth.loadProfile();
  if (profile) { lk.bioReady = !!profile.bio && (await P.bio.available()); showLock('login'); }
  else { lk.step = 'name'; lockEl().hidden = false; paintLock(); }
  window.__daftari = { get S() { return S; } };
})();
