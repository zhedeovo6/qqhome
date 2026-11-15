const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 324, height: 576 } });

  const logs = [];
  page.on('console', m => logs.push('[' + m.type() + '] ' + m.text()));
  page.on('pageerror', e => logs.push('[pageerror] ' + e.message));
  page.on('requestfailed', r => logs.push('[reqfail] ' + r.url().slice(0, 90) + ' :: ' + (r.failure() || {}).errorText));

  const url = process.argv[2] || 'https://wbapp-pinyljbkapt2d3t8d9a8df.app.workbuddy.host/';
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(e => logs.push('[goto] ' + e.message));
  await page.waitForTimeout(4000);

  const state = await page.evaluate(() => {
    const out = {};
    out.hasSDK = !!window.WorkBuddyCloud;
    out.cloud = window.QH && window.QH.C ? {
      status: window.QH.C.status(),
      err: window.QH.C.error(),
      key: window.QH.C.key()
    } : null;
    out.foot = (document.getElementById('foot') || {}).innerText || '';
    out.pageText = (document.getElementById('page') || {}).innerText || '';
    return out;
  });

  console.log(JSON.stringify(state, null, 1).slice(0, 1500));
  console.log('--- logs ---');
  console.log(logs.slice(0, 25).join('\n'));

  await page.screenshot({ path: 'tools/v_home.png', fullPage: false });
  await browser.close();
})();
