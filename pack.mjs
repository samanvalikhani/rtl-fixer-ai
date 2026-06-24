// ساخت مجدد CRX با همان کلید (شناسه ثابت می‌ماند):  node pack.mjs
import crx3 from 'crx3';
await crx3(['extension/manifest.json'], { keyPath: 'dist/key.pem', crxPath: 'dist/rtl-fixer.crx', crxVersion: 3 });
console.log('dist/rtl-fixer.crx ساخته شد.');
