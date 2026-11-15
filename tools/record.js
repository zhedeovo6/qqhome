/* 录抖音演示视频：在发布域名上真实操作（含云端功能），输出 webm 再转 mp4
   运行：NODE_PATH="$(npm root -g)/@playwright/cli/node_modules" node tools/record.js */
'use strict';

var path = require('path');
var pw = require('playwright');

var SITE = process.argv[2] ||
  'https://wbapp-pinyljbkapt2d3t8d9a8df.app.workbuddy.host/?sharecode=MJJACWNKR6';

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

(async function () {
  var t = Date.now();
  var mk = function (k, ago) { return { k: k, t0: t - ago * 1000, w: false }; };

  /* 预置一份有熟花可收的存档，录出来画面更满 */
  var state = {
    nick: '家园小Q', lv: 12, exp: 860, gb: 320, energy: 100,
    energyAt: t, regAt: t, onlineAt: t, signAt: 0, workAt: 0,
    speed: false, flow: 0,
    d: {
      garden: {
        plots: [mk('rose', 120), mk('lily', 200), mk('tulip', 300), null, mk('rose', 120), null],
        seeds: { rose: 2, lily: 1 }, picks: { rose: 1 }, stealAt: 0
      },
      ranch: {
        plots: [mk('cabbage', 120), mk('corn', 300), null, mk('radish', 150), null, null],
        seeds: { cabbage: 2 }, stealAt: 0
      },
      kf: { lv: 9, hp: 328, atk: 46, def: 30, qi: 120, exp: 180, wins: 12, loses: 3, trainAt: 0, log: '' },
      family: { lv: 7, contrib: 320, signAt: 0 },
      bbs: null
    }
  };

  var browser = await pw.chromium.launch({ channel: 'msedge' });
  var ctx = await browser.newContext({
    viewport: { width: 324, height: 576 },   /* 9:16，和 720x1280 成比例 */
    recordVideo: { dir: path.join(__dirname, 'vid'), size: { width: 720, height: 1280 } }
  });
  var page = await ctx.newPage();

  await page.addInitScript(function (s) {
    try { localStorage.setItem('qqhome_pixel_v1', s); } catch (e) {}
  }, JSON.stringify(state));

  await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(3200);   /* 等云连上、热帖顶上来 */

  /* 全服排行：等级榜 */
  await page.locator('#page a:has-text("全服排行")').first().click();
  await sleep(3000);

  /* 切比武榜 */
  await page.locator('a:has-text("比武榜")').first().click();
  await sleep(2200);

  /* 去偷菜 */
  await page.locator('a:has-text("去偷菜")').first().click();
  await sleep(3000);

  /* 偷一朵 */
  var btn = page.locator('a.btn:has-text("偷一朵")').first();
  if (await btn.count()) { await btn.click(); await sleep(2400); }

  /* 论坛看帖 */
  await page.locator('#foot a:has-text("论坛")').first().click();
  await sleep(2000);
  await page.locator('#page a:has-text("有没有人跟我一样")').first().click();
  await sleep(2600);

  /* 回首页收尾 */
  await page.locator('#bar a:has-text("返回")').first().click();
  await sleep(1800);

  await ctx.close();
  await browser.close();
  console.log('video saved');
})().catch(function (e) { console.error(e); process.exit(1); });
