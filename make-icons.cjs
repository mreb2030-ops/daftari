const { chromium } = require('playwright');
const glyph = (c, s) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="${c}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M10 8h5"/></svg>`;
const BG = '#0F5F73';
const pages = {
  'icon-only': [1024, `<body style="margin:0;background:${BG};display:grid;place-items:center;width:1024px;height:1024px">${glyph('#fff', 560)}</body>`],
  'icon-background': [1024, `<body style="margin:0;background:${BG};width:1024px;height:1024px"></body>`],
  'icon-foreground': [1024, `<body style="margin:0;background:transparent;display:grid;place-items:center;width:1024px;height:1024px">${glyph('#fff', 440)}</body>`],
  'splash': [2732, `<body style="margin:0;background:${BG};display:grid;place-items:center;width:2732px;height:2732px">${glyph('#fff', 520)}</body>`],
  'splash-dark': [2732, `<body style="margin:0;background:#0B1413;display:grid;place-items:center;width:2732px;height:2732px">${glyph('#5DB8CE', 520)}</body>`],
};
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const [n, [sz, html]] of Object.entries(pages)) {
    const p = await b.newPage({ viewport: { width: sz, height: sz } });
    await p.setContent(html); await p.screenshot({ path: `assets/${n}.png`, omitBackground: n === 'icon-foreground' }); await p.close();
  }
  await b.close(); console.log('icons ok');
})();
