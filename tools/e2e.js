const { chromium } = require('playwright');

const URL = process.argv[2];
const out = [];
function log(s) { out.push(s); }

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 324, height: 576 } });
  page.on('pageerror', e => log('PAGEERROR ' + e.message));

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(6000);

  // 1. 首页 + 帖子
  let st = await page.evaluate(() => ({
    status: QH.C.status(), err: QH.C.error(),
    feed: QH.B.list('全部').length,
    key: QH.C.key()
  }));
  log('1) 首页云状态: ' + JSON.stringify(st));

  // 2. 排行榜
  await page.evaluate(() => { location.hash = '#/rank'; });
  await page.waitForTimeout(4000);
  let rank = await page.evaluate(() => (document.getElementById('page').innerText || '').split('\n').slice(0, 12).join(' | '));
  log('2) 排行榜: ' + rank);

  // 3. 偷菜页
  await page.evaluate(() => { location.hash = '#/steal'; });
  await page.waitForTimeout(4000);
  let steal = await page.evaluate(() => (document.getElementById('page').innerText || '').split('\n').slice(0, 10).join(' | '));
  log('3) 偷菜: ' + steal);

  // 4. 论坛列表
  await page.evaluate(() => { location.hash = '#/bbs'; });
  await page.waitForTimeout(3000);
  let bbs = await page.evaluate(() => (document.getElementById('page').innerText || '').split('\n').slice(0, 10).join(' | '));
  log('4) 论坛: ' + bbs);

  // 5. 帖子详情
  await page.evaluate(() => { location.hash = '#/post/5'; });
  await page.waitForTimeout(3000);
  let post = await page.evaluate(() => (document.getElementById('page').innerText || '').split('\n').slice(0, 8).join(' | '));
  log('5) 帖子详情: ' + post);

  // 6. 云存档是否写入
  let saved = await page.evaluate(async () => {
    const ok = await QH.C.pushSave();
    return { ok, err: QH.C.error() };
  });
  log('6) 存档上报: ' + JSON.stringify(saved));

  // 7. 我的页面（存档码/状态）
  await page.evaluate(() => { location.hash = '#/me'; });
  await page.waitForTimeout(1500);
  let me = await page.evaluate(() => (document.getElementById('page').innerText || '').split('\n').filter(Boolean).slice(0, 16).join(' | '));
  log('7) 我的: ' + me);

  await page.evaluate(() => { location.hash = '#/home'; });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tools/e2e_home.png' });

  console.log(out.join('\n'));
  await browser.close();
})();
