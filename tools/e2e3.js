const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 324, height: 576 } });
  const out = [];
  page.on('pageerror', e => out.push('PAGEERROR ' + e.message));

  await page.goto(process.argv[2], { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(6000);

  await page.evaluate(() => { location.hash = '#/bbs/new'; });
  await page.waitForTimeout(1200);

  await page.selectOption('#pb', '同城客栈').catch(e => out.push('select err ' + e.message));
  await page.fill('#pt', '新来的报个到，说说你是哪一年的');
  await page.fill('#pd', '我先来：2009 年，诺基亚 5310，一晚上偷菜偷到手机发烫。\n\n那时候流量 5 块 30M，图片全关，就为了多刷两把家园。');

  const vals = await page.evaluate(() => ({ b: document.getElementById('pb').value, t: document.getElementById('pt').value, d: document.getElementById('pd').value.length }));
  out.push('表单值: ' + JSON.stringify(vals));

  await page.locator('a.btn:has-text("发表")').first().click();
  await page.waitForTimeout(6000);

  const after = await page.evaluate(() => ({
    hash: location.hash,
    text: (document.getElementById('page').innerText || '').split('\n').slice(0, 10).join(' | '),
    count: QH.B.list('全部').length
  }));
  out.push('发帖后: ' + JSON.stringify(after).slice(0, 900));

  await page.screenshot({ path: 'tools/e2e_post.png' });
  console.log(out.join('\n'));
  await browser.close();
})();
