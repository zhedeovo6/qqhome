const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 324, height: 576 } });
  const out = [];
  page.on('pageerror', e => out.push('PAGEERROR ' + e.message));

  await page.goto(process.argv[2], { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(6000);

  // --- 偷菜 ---
  await page.evaluate(() => { location.hash = '#/steal'; });
  await page.waitForTimeout(4000);
  const before = await page.evaluate(() => QH.S.get().gb);
  const targets = await page.evaluate(() => (document.getElementById('page').innerText || '').match(/☆[^\n]+/g) || []);
  out.push('偷菜目标: ' + targets.slice(0, 6).join(' / '));

  const btn = await page.$('text=偷一朵');
  if (btn) {
    await btn.click();
    await page.waitForTimeout(3500);
    const after = await page.evaluate(() => QH.S.get().gb);
    const flash = await page.evaluate(() => (document.querySelector('.tip') || {}).innerText || '');
    out.push('偷菜结果: G币 ' + before + ' → ' + after + ' | 提示: ' + flash.replace(/\n/g, ' '));
  } else {
    out.push('偷菜按钮没找到（可能还在冷却或没目标）');
  }

  // --- 发帖 ---
  await page.evaluate(() => { location.hash = '#/bbs/new'; });
  await page.waitForTimeout(1500);
  await page.selectOption('#pb', '同城客栈').catch(() => {});
  await page.fill('#pt', '新来的报个到，说说你是哪一年的');
  await page.fill('#pd', '我先来：2009 年，诺基亚 5310，一晚上偷菜偷到手机发烫。\n\n那时候流量 5 块 30M，图片全关，就为了多刷两把家园。');
  await page.click('text=发表');
  await page.waitForTimeout(5000);

  const listText = await page.evaluate(() => (document.getElementById('page').innerText || '').split('\n').slice(0, 8).join(' | '));
  out.push('发帖后列表: ' + listText);

  // --- 排行榜 ---
  await page.evaluate(() => { location.hash = '#/rank'; });
  await page.waitForTimeout(4000);
  const rank = await page.evaluate(() => (document.getElementById('page').innerText || '').split('\n').slice(0, 12).join(' | '));
  out.push('排行榜: ' + rank);

  await page.evaluate(() => { location.hash = '#/steal'; });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'tools/e2e_steal.png' });
  await page.evaluate(() => { location.hash = '#/bbs'; });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'tools/e2e_bbs.png' });

  console.log(out.join('\n'));
  await browser.close();
})();
