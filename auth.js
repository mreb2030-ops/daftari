// المصادقة: رمز من 6 أرقام (مُجزّأ بـ PBKDF2) وبصمة اختيارية عبر Keystore.
import { sGet, sSet, sDel, bio } from './platform.js';
const KEY = 'daftari.auth';
const enc = new TextEncoder();
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const rand = (n) => crypto.getRandomValues(new Uint8Array(n));

async function hashPin(pin, salt) {
  const k = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 150000 }, k, 256));
}
async function sha(s) { return b64(await crypto.subtle.digest('SHA-256', enc.encode(s))); }

export async function loadProfile() {
  const raw = await sGet(KEY);
  try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
const save = (p) => sSet(KEY, JSON.stringify(p));

export async function createProfile(name, pin) {
  const salt = rand(16);
  const p = { name: name.trim(), salt: b64(salt), hash: await hashPin(pin, salt), bio: false, bioHash: null, autolock: 60, fails: 0, until: 0 };
  await save(p);
  return p;
}
export async function checkPin(p, pin) {
  const now = Date.now();
  if (p.until > now) return { ok: false, wait: Math.ceil((p.until - now) / 1000) };
  const ok = (await hashPin(pin, unb64(p.salt))) === p.hash;
  if (ok) { p.fails = 0; p.until = 0; await save(p); return { ok: true }; }
  p.fails = (p.fails || 0) + 1;
  if (p.fails >= 5) p.until = now + Math.min(15 * 60, 30 * 2 ** (p.fails - 5)) * 1000;
  await save(p);
  return { ok: false, left: Math.max(0, 5 - p.fails), wait: p.until > now ? Math.ceil((p.until - now) / 1000) : 0 };
}
export async function changePin(p, oldPin, newPin) {
  const r = await checkPin(p, oldPin);
  if (!r.ok) return r;
  const salt = rand(16);
  p.salt = b64(salt); p.hash = await hashPin(newPin, salt);
  await save(p);
  return { ok: true };
}
export async function update(p, patch) { Object.assign(p, patch); await save(p); }

export async function enableBio(p) {
  await bio.verify();
  const token = b64(rand(32));
  await bio.setToken(token);
  p.bio = true; p.bioHash = await sha(token);
  await save(p);
}
export async function disableBio(p) {
  await bio.clear();
  p.bio = false; p.bioHash = null;
  await save(p);
}
export async function bioLogin(p) {
  await bio.verify();
  const t = await bio.getToken();
  if (!t || (await sha(t)) !== p.bioHash) throw new Error('bio-mismatch');
  p.fails = 0; p.until = 0; await save(p);
}
export async function wipeAuth() { await bio.clear(); await sDel(KEY); }
