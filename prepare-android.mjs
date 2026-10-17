// يجهّز مشروع أندرويد من الواجهة الموجودة في www: يضيف المنصة، الصلاحيات، الأيقونات، ثم يزامن الملفات.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const run = (c) => { console.log('> ' + c); execSync(c, { stdio: 'inherit' }); };
if (!fs.existsSync('android')) run('npx cap add android');
const mf = 'android/app/src/main/AndroidManifest.xml';
let s = fs.readFileSync(mf, 'utf8');
if (!s.includes('USE_BIOMETRIC')) s = s.replace('<uses-permission android:name="android.permission.INTERNET" />', '<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.USE_BIOMETRIC" />\n    <uses-permission android:name="android.permission.USE_FINGERPRINT" />');
if (!s.includes('screenOrientation')) s = s.replace('android:launchMode="singleTask"', 'android:launchMode="singleTask"\n            android:screenOrientation="portrait"');
fs.writeFileSync(mf, s);
run("npx capacitor-assets generate --android --assetPath assets --iconBackgroundColor '#0F5F73' --iconBackgroundColorDark '#0F5F73' --splashBackgroundColor '#0F5F73' --splashBackgroundColorDark '#0B1413'");
run('npx cap sync android');
console.log('\nجاهز. افتح مجلد android في Android Studio، أو شغّل: npm run apk');
