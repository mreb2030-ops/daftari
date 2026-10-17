// طبقة الوصول للمنصة: التخزين، البصمة، الملفات، دورة حياة التطبيق. تعمل أيضاً في المتصفح للتجربة.
const C = typeof window !== 'undefined' ? window.Capacitor : null;
export const isNative = !!(C && C.isNativePlatform && C.isNativePlatform());
const cache = {};
const plug = (name) => {
  if (!C || !C.registerPlugin) return null;
  try { return cache[name] || (cache[name] = C.registerPlugin(name)); } catch (e) { return null; }
};
const Pref = isNative ? plug('Preferences') : null;

export async function sGet(k) {
  try { if (Pref) { const r = await Pref.get({ key: k }); return r.value; } return localStorage.getItem(k); } catch (e) { return null; }
}
export async function sSet(k, v) {
  if (Pref) { await Pref.set({ key: k, value: v }); return; }
  localStorage.setItem(k, v);
}
export async function sDel(k) {
  try { if (Pref) await Pref.remove({ key: k }); else localStorage.removeItem(k); } catch (e) {}
}

const SERVER = 'com.daftari.app';
const NB = plug('NativeBiometric');
export const bio = {
  async available() {
    if (!NB) return false;
    try { const r = await NB.isAvailable({ useFallback: false }); return !!r.isAvailable; } catch (e) { return false; }
  },
  async verify() {
    await NB.verifyIdentity({ reason: 'تأكيد هويتك لفتح دفتري', title: 'دفتري', subtitle: 'ضع إصبعك على المستشعر', negativeButtonText: 'استخدام الرمز', maxAttempts: 3 });
  },
  async setToken(token) { await NB.setCredentials({ username: 'daftari', password: token, server: SERVER }); },
  async getToken() { const c = await NB.getCredentials({ server: SERVER }); return c && c.password; },
  async clear() { try { await NB.deleteCredentials({ server: SERVER }); } catch (e) {} },
};

const App = plug('App');
export function onResume(fn) { // fn(isActive)
  if (App && App.addListener) App.addListener('appStateChange', (s) => fn(!!s.isActive));
  document.addEventListener('visibilitychange', () => fn(document.visibilityState === 'visible'));
}
export function onBack(fn) { if (App && App.addListener) App.addListener('backButton', fn); }
export function exitApp() { if (App && App.exitApp) App.exitApp(); }

// حفظ أو مشاركة ملف (CSV أو نسخة احتياطية)
export async function saveFile(name, text, mime) {
  if (isNative) {
    const FS = plug('Filesystem'), Share = plug('Share');
    const w = await FS.writeFile({ path: name, data: text, directory: 'CACHE', encoding: 'utf8' });
    await Share.share({ title: name, url: w.uri, dialogTitle: 'حفظ أو مشاركة الملف' });
    return;
  }
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export async function shareText(title, text) {
  if (isNative) { await plug('Share').share({ title, text, dialogTitle: 'مشاركة' }); return; }
  await navigator.clipboard.writeText(text);
}
