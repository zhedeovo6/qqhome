const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const out = [];

  // 设备 A：玩一会，攒点数据
  const ctxA = await browser.newContext({ viewport: { width: 324, height: 576 } });
  const pa = await ctxA.newPage();
  pa.on('pageerror', e => out.push('A PAGEERROR ' + e.message));
  await pa.goto(process.argv[2], { waitUntil: 'domcontentloaded', timeout: 30000 });
  await pa.waitForTimeout(6000);
  await pa.evaluate(() => { QH.act('sign'); QH.act('work'); });
  await pa.waitForTimeout(1500);
  const stateA = await pa.evaluate(() => ({
    key: QH.C.key(), gb: QH.S.get().gb, nick: QH.S.get().nick, lv: QH.S.get().lv
  }));
  await pa.evaluate(() => QH.C.pushSave());
  await pa.waitForTimeout(2500);
  out.push('设备A: ' + JSON.stringify(stateA));
  await ctxA.close();

  // 设备 B：全新的浏览器上下文，输入存档码接档
  const ctxB = await browser.newContext({ viewport: { width: 324, height: 576 } });
  const pb = await ctxB.newPage();
  pb.on('pageerror', e => out.push('B PAGEERROR ' + e.message));
  await pb.goto(process.argv[2], { waitUntil: 'domcontentloaded', timeout: 30000 });
  await pb.waitForTimeout(6000);
  const fresh = await pb.evaluate(() => ({ key: QH.C.key(), gb: QH.S.get().gb }));
  out.push('设备B(接档前): ' + JSON.stringify(fresh));

  await pb.evaluate(() => { location.hash = '#/me'; });
  await pb.waitForTimeout(1200);
  await pb.fill('#ck', stateA.key);
  await pb.locator('a.btn:has-text("接上")').click();
  await pb.waitForTimeout(5000);
  const restored = await pb.evaluate(() => ({
    key: QH.C.key(), gb: QH.S.get().gb, nick: QH.S.get().nick, hash: location.hash,
    text: (document.getElementById('page').innerText || '').split('\n').slice(0, 4).join(' | ')
  }));
  out.push('设备B(接档后): ' + JSON.stringify(restored));
  out.push((restored.key === stateA.key && restored.gb === stateA.gb) ? '✅ 存档码跨设备恢复成功' : '❌ 恢复失败');

  console.log(out.join('\n'));
  await browser.close();
})();
