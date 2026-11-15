const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 324, height: 576 } });

  const reqs = [];
  page.on('response', r => {
    const u = r.url();
    if (u.indexOf('/.cloud/') >= 0) {
      reqs.push(r.status() + ' ' + r.request().method() + ' ' + u.replace(/^https:\/\/[^/]+/, '').slice(0, 140));
    }
  });
  page.on('requestfailed', r => {
    const u = r.url();
    if (u.indexOf('/.cloud/') >= 0) reqs.push('FAIL ' + u.replace(/^https:\/\/[^/]+/, '').slice(0, 120) + ' :: ' + ((r.failure() || {}).errorText || ''));
  });
  page.on('pageerror', e => reqs.push('[pageerror] ' + e.message));

  await page.goto(process.argv[2], { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => reqs.push('[goto] ' + e.message));
  await page.waitForTimeout(7000);

  const st = await page.evaluate(() => {
    try {
      return {
        status: window.QH.C.status(),
        err: window.QH.C.error(),
        feed: window.QH.B.list('全部').length,
        bbsReady: window.QH.B.ready(),
        bbsErr: window.QH.B.err()
      };
    } catch (e) { return { eval: String(e) }; }
  });
  console.log(JSON.stringify(st));
  console.log('--- cloud requests ---');
  console.log(reqs.join('\n') || '(none)');

  await browser.close();

})();
