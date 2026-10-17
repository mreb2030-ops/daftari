const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const OUT = process.argv[2];
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 360, height: 760 }, deviceScaleFactor: 2, locale: 'ar-SA', acceptDownloads: true });
  await ctx.addInitScript(() => {
    window.__cred = null; window.__bioCalls = 0;
    const mocks = {
      NativeBiometric: { isAvailable: async () => ({ isAvailable: true }), verifyIdentity: async () => { window.__bioCalls++; }, setCredentials: async (o) => { window.__cred = o.password; }, getCredentials: async () => ({ username: 'daftari', password: window.__cred }), deleteCredentials: async () => { window.__cred = null; } },
      App: { addListener: async () => ({ remove() {} }), exitApp: async () => {} },
    };
    window.Capacitor = { isNativePlatform: () => false, registerPlugin: (n) => mocks[n] || {} };
  });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push('pageerror: ' + e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto('http://localhost:8765/');
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
  const click = (sel) => page.click(sel);
  const pin = async (p) => { for (const c of p) await page.click(`.pad [data-v="${c}"]`); await page.waitForTimeout(450); };
  const txt = (sel) => page.locator(sel).first().innerText();

  // الإعداد الأول
  await page.fill('#nm', 'أحمد'); await shot('01-welcome'); await click('[data-act=name-next]');
  await pin('123456'); await pin('123456'); await page.waitForSelector('[data-act=bio-on]'); await shot('02-bio');
  await click('[data-act=bio-on]'); await page.waitForSelector('#app:not([hidden])');
  assert.ok(await page.evaluate(() => window.__bioCalls) >= 1, 'bio enable verifies identity');
  await shot('03-home-empty');
  // بيانات تجريبية
  await click('[data-act=sample]'); await page.waitForSelector('.hero');
  await shot('04-home-sample');
  const eq = await page.evaluate(() => { const S = window.__daftari.S; return S.tx.length; });
  assert.ok(eq > 15, 'sample loaded');
  for (const t of ['home','ops','rep','acc','set']) { await click(`[data-act=tab][data-v=${t}]`); const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); assert.ok(ov <= 0, 'horizontal overflow on ' + t + ': ' + ov); }
  // العمليات
  await click('[data-act=tab][data-v=ops]'); await shot('05-ops');
  // التقارير
  await click('[data-act=tab][data-v=rep]'); await shot('06-report-is');
  await click('[data-act=rkind][data-v=bs]'); await shot('07-report-bs');
  assert.match(await txt('.okline'), /متوازنة/);
  await click('[data-act=rkind][data-v=cf]'); await shot('08-report-cf');
  await click('[data-act=rkind][data-v=st]'); await shot('09-report-st');
  const [dl] = await Promise.all([page.waitForEvent('download'), click('[data-act=rep-csv]')]);
  assert.match(dl.suggestedFilename(), /\.csv$/);
  // الحسابات
  await click('[data-act=tab][data-v=acc]'); await shot('10-accounts');
  // إضافة إيراد
  await click('#fab'); await click('[data-act=newtype][data-v=rev]');
  await page.fill('[data-f=amt]', '٥٠٠٠'); await page.fill('[data-f=note]', 'مكافأة'); await shot('11-form-rev');
  await click('[data-act=txsave]'); await page.waitForSelector('#sheetWrap', { state: 'hidden' });
  // شراء أصل جديد
  await click('#fab'); await click('[data-act=newtype][data-v=pur]'); await click('[data-act=pmode2][data-v=asset]');
  await click('[data-act=new-acc][data-v=asset]'); await page.fill('[data-f=name]', 'لابتوب'); await page.fill('[data-f=opening]', '0'); await shot('12-new-asset');
  await click('[data-act=accsave]'); await page.fill('[data-f=amt]', '3000');
  assert.equal(await page.inputValue('select[data-f=to]'), await page.evaluate(() => window.__daftari.S.accounts.find((a) => a.name === 'لابتوب').id), 'new asset preselected');
  await shot('13-form-pur-asset'); await click('[data-act=txsave]'); await page.waitForSelector('#sheetWrap', { state: 'hidden' });
  const chk = await page.evaluate(async () => { const L = await import('/js/ledger.js'); const S = window.__daftari.S; const b = L.balances(S); const bs = L.balanceSheet(S); return { laptop: b[S.accounts.find((a) => a.name === 'لابتوب').id], eq: bs.equity, eqc: bs.equityCheck }; });
  assert.equal(chk.laptop, 3000); assert.equal(chk.eq, chk.eqc);
  // سداد التزام دون التزامات => رابط التزام جديد
  await click('#fab'); await click('[data-act=newtype][data-v=bor]'); await shot('14-form-bor'); await click('[data-act=close]');
  // الإعدادات
  await click('[data-act=tab][data-v=set]'); await shot('15-settings');
  // قفل ثم دخول بالبصمة تلقائياً
  const calls0 = await page.evaluate(() => window.__bioCalls);
  await click('[data-act=lock]'); await page.waitForSelector('#app:not([hidden])', { timeout: 3000 });
  assert.ok(await page.evaluate(() => window.__bioCalls) > calls0, 'bio login used');
  // أوقف البصمة ثم جرّب الرمز: خطأ ثم صحيح
  await click('[data-act=tab][data-v=set]'); await click('[data-act=bio-toggle]'); await page.waitForTimeout(200);
  await click('[data-act=lock]'); await page.waitForSelector('#lock:not([hidden])');
  await pin('111111'); assert.match(await txt('#lkerr'), /غير صحيح/); await shot('18-wrong-pin');
  await pin('123456'); await page.waitForSelector('#app:not([hidden])');
  // تغيير الرمز
  await click('[data-act=tab][data-v=set]'); await click('[data-act=pin-edit]');
  await page.fill('[data-f=old]', '123456'); await page.fill('[data-f=nw]', '654321'); await page.fill('[data-f=cf]', '654321'); await click('[data-act=pinsave]');
  await page.waitForSelector('#sheetWrap', { state: 'hidden' });
  await click('[data-act=lock]'); await page.waitForSelector('#lock:not([hidden])'); await pin('654321'); await page.waitForSelector('#app:not([hidden])');
  await click('[data-act=tab][data-v=set]');
  const [dl2] = await Promise.all([page.waitForEvent('download'), click('[data-act=export-json]')]);
  assert.match(dl2.suggestedFilename(), /backup\.json$/);
  await click('[data-act=tab][data-v=home]');
  await page.emulateMedia({ colorScheme: 'dark' }); await click('[data-act=tab][data-v=home]'); await shot('16-home-dark');
  await click('[data-act=tab][data-v=rep]'); await click('[data-act=rkind][data-v=is]'); await shot('17-report-dark');
  console.log('ERRORS:', JSON.stringify(errs));
  assert.equal(errs.length, 0);
  await browser.close(); console.log('E2E OK');
})().catch((e) => { console.error('E2E FAIL', e); process.exit(1); });
