/* 存档层：localStorage 单存档，惰性时间推进（关掉浏览器也在长） */

(function () {
  'use strict';

  var QH = window.QH;
  var KEY = 'qqhome_pixel_v1';

  /* 部分 App 内置浏览器禁 localStorage（比如某些竖屏 webview），这里退化到内存，
     至少当次会话能玩，不至于白屏 */
  var mem = {};
  var LS = (function () {
    try {
      var k = '__qh_t';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return window.localStorage;
    } catch (e) {
      return {
        getItem: function (k) { return mem[k] || null; },
        setItem: function (k, v) { mem[k] = String(v); },
        removeItem: function (k) { delete mem[k]; }
      };
    }
  })();

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function dkey(t) {
    var d = new Date(t || Date.now());
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function stamp(t) {
    var d = new Date(t || Date.now());
    return pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  /* 升级所需经验 */
  function need(lv) { return 300 + lv * 90; }

  /* 本机存档码：云存档、排行榜、偷菜记录都挂在这个 key 上 */
  function newKey() {
    return 'qk' + Math.random().toString(36).slice(2, 10) +
      Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }

  function fresh() {
    var t = Date.now();
    return {
      key: newKey(),
      nick: '家园小Q',
      lv: 12,
      exp: 860,
      gb: 320,
      energy: 100,
      energyAt: t,
      regAt: t,
      onlineAt: t,
      signAt: 0,
      workAt: 0,
      speed: false,
      flow: 0,
      d: {
        garden: { plots: [null, null, null, null, null, null], seeds: { rose: 2, lily: 1 }, picks: {}, stealAt: 0 },
        ranch:  { plots: [null, null, null, null, null, null], seeds: { cabbage: 2 }, stealAt: 0 },
        kf:     { lv: 9, hp: 328, atk: 46, def: 30, qi: 120, exp: 180, wins: 0, loses: 0, trainAt: 0, log: '' },
        family: { lv: 7, contrib: 320, signAt: 0 },
        /* 论坛已经搬到云端，本地只留个人的发帖计数，帖子本体在 qh_post 表 */
        bbs:    { posted: 0, replied: 0 }
      }
    };
  }

  var s = null;
  var hadSave = false;   // 本机是不是本来就有档（决定启动时要不要去云端拉）

  function normalize() {
    /* 旧档缺板块就补，不整体重置（存档迁移） */
    var f = fresh();
    if (!s.key) s.key = f.key;
    if (!s.d.garden) s.d.garden = f.d.garden;
    if (!s.d.ranch) s.d.ranch = f.d.ranch;
    if (!s.d.kf) s.d.kf = f.d.kf;
    if (!s.d.family) s.d.family = f.d.family;
    if (!s.d.bbs) s.d.bbs = f.d.bbs;
    return s;
  }

  function load() {
    try {
      var raw = LS.getItem(KEY);
      if (raw) { s = JSON.parse(raw); hadSave = true; }
    } catch (e) { s = null; }
    if (!s || !s.d) { s = fresh(); hadSave = false; }
    normalize();
    return s;
  }
  function get() { if (!s) load(); return s; }
  function save() {
    s = get();
    try { LS.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    if (QH.C && QH.C.touchSave) QH.C.touchSave();
  }
  function reset() { s = fresh(); hadSave = false; save(); }

  function isFirstRun() { return !hadSave; }

  /* 云端存档回灌本机（只在首次打开这台设备时用） */
  function adopt(saved) {
    if (!saved || !saved.d) return false;
    var keep = (s && s.key) || newKey();
    s = saved;
    if (!s.key) s.key = keep;
    s.flow = s.flow || 0;
    if (!s.speed) s.speed = false;
    hadSave = true;
    normalize();
    try { LS.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    return true;
  }

  /* 体力按分钟恢复，在线时长按登录时间算 */
  function tick() {
    s = get();
    var t = Date.now();
    if (!s.energyAt) s.energyAt = t;
    var gain = Math.floor((t - s.energyAt) / 60000);
    if (gain > 0) {
      s.energy = Math.min(100, (s.energy || 0) + gain);
      s.energyAt = t;
    }
    if (s.energy >= 100) s.energyAt = t;
    if (!s.regAt) s.regAt = t;
    if (!s.onlineAt) s.onlineAt = t;
  }

  function addGB(n) {
    var v = get();
    v.gb = Math.max(0, Math.round(v.gb + n));
    return v.gb;
  }

  /* 返回升级次数 */
  function addExp(n) {
    var v = get(), up = 0;
    v.exp += n;
    while (v.exp >= need(v.lv)) { v.exp -= need(v.lv); v.lv++; v.gb += 88; up++; }
    return up;
  }

  function spendGB(n) {
    var v = get();
    if (v.gb < n) return false;
    v.gb -= n;
    return true;
  }

  function signedToday() { var t = get().signAt; return !!t && dkey(t) === dkey(); }

  function signIn() {
    var v = get();
    if (signedToday()) return '今天已经签过了，明天再来。';
    v.signAt = Date.now();
    v.gb += 25;
    v.d.family.signAt = Date.now();
    v.d.family.contrib += 5;
    var up = addExp(20);
    return '签到成功！获得 G币25 家族贡献5' + (up ? '，等级提升到 ' + v.lv + ' 级' : '');
  }

  /* 打工：90 秒一次，消耗体力 10 */
  function work() {
    var v = get(), t = Date.now();
    if (t - (v.workAt || 0) < 90000) {
      return '刚干完活，歇会儿再说（' + Math.ceil((90000 - (t - v.workAt)) / 1000) + '秒）';
    }
    if (v.energy < 10) return '体力不足 10 点，干不动了。';
    var pay = 6 + Math.floor(Math.random() * 11);
    v.energy -= 10;
    v.workAt = t;
    addGB(pay);
    addExp(3);
    return '你去了趟工地，搬了半天砖，赚到 G币' + pay + '，体力-10。';
  }

  QH.S = {
    get: get, save: save, load: load, reset: reset, tick: tick,
    addGB: addGB, addExp: addExp, spendGB: spendGB, need: need,
    signedToday: signedToday, signIn: signIn, work: work,
    isFirstRun: isFirstRun, adopt: adopt, newKey: newKey,
    pad: pad, dkey: dkey, stamp: stamp
  };
})();
