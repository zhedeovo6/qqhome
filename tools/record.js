/* 录抖音演示视频：真实点击操作，输出 webm，再转 mp4
   运行：NODE_PATH="$(npm root -g)/@playwright/cli/node_modules" node tools/record.js */
'use strict';

var path = require('path');
var pw = require('playwright');

var SITE = 'file:///' + path.resolve(__dirname, '..').replace(/\\/g, '/') + '/index.html';

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

(async function () {
  var t = Date.now();
  var mk = function (k, ago) { return { k: k, t0: t - ago * 1000, w: false }; };

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

  await page.goto(SITE);
  await sleep(900);

  /* 花园：收三块熟地 */
  await page.locator('#page a:has-text("魔法花园")').first().click();
  await sleep(800);
  for (var i = 0; i < 3; i++) {
    var btn = page.locator('a.btn:has-text("收")').first();
    if (await btn.count()) { await btn.click(); await sleep(700); }
  }
  await page.locator('#bar a:has-text("返回")').first().click();
  await sleep(700);

  /* 牧场：偷一把菜 */
  await page.locator('#page a:has-text("阳光牧场")').first().click();
  await sleep(700);
  await page.locator('a:has-text("去好友地里偷菜")').first().click();
  await sleep(800);
  await page.locator('#bar a:has-text("返回")').first().click();
  await sleep(700);

  /* 精武堂：比武，看战报 */
  await page.locator('#page a:has-text("精武堂")').first().click();
  await sleep(700);
  await page.locator('a:has-text("找人比武")').first().click();
  await sleep(900);
  await page.evaluate(function () { window.scrollTo(0, document.body.scrollHeight); });
  await sleep(1800);
  await page.evaluate(function () { window.scrollTo(0, 0); });
  await sleep(400);
  await page.locator('#bar a:has-text("返回")').first().click();
  await sleep(700);

  /* 论坛：看一篇帖子 */
  await page.locator('#page a:has-text("家园论坛")').first().click();
  await sleep(700);
  await page.locator('#page a:has-text("精武堂")').first().click();
  await sleep(1200);

  /* 回首页收尾 */
  await page.locator('#bar a:has-text("返回")').first().click();
  await sleep(1200);

  await ctx.close();
  await browser.close();
  console.log('video saved');
})().catch(function (e) { console.error(e); process.exit(1); });
