/* 社区层：云端论坛（帖子/回帖存在服务器，所有人共享）+ 家族签到
   帖子走 qh_post / qh_reply 两张表，本地只缓存最近一次拉取的结果，断网时还能看。
   注意：cloud.js 是 defer 加载的，所以这里一律通过 QH.C 在运行时取，不能提前引用。 */

(function () {
  'use strict';

  var QH = window.QH, S = QH.S;

  var BOARDS = ['家园广场', '家族天地', '游戏交流', '同城客栈'];
  var cache = null;          // 最近一次拉到的全部帖子
  var loadErr = '';

  function C() { return QH.C; }

  function ready() { return !!(C() && C().status() === 'on'); }

  function all() {
    if (cache && cache.length) return cache;
    if (C()) {
      var c = C().cachedPosts() || [];
      if (c.length) cache = c;
    }
    return cache || [];
  }

  function list(board) {
    var p = all().slice();
    if (board && board !== '全部') p = p.filter(function (x) { return x.board === board; });
    p.sort(function (a, b) { return b.id - a.id; });
    return p;
  }

  /* 从服务器刷新列表；失败保留旧缓存 */
  function refresh() {
    if (!C()) return Promise.resolve(list('全部'));
    return C().fetchPosts('全部').then(function (rows) {
      cache = rows;
      loadErr = '';
      return rows;
    }).catch(function (e) {
      loadErr = (e && (e.message || e.code)) || '读取失败';
      throw e;
    });
  }

  function get(id) {
    for (var i = 0, p = all(); i < p.length; i++) if (p[i].id === +id) return p[i];
    return null;
  }

  function detail(id) {
    if (!C() || !ready()) return Promise.reject(new Error('云服务未连接'));
    return C().fetchPost(id);
  }

  function add(board, title, body) {
    title = (title || '').trim();
    body = (body || '').trim();
    if (!title) return Promise.resolve('标题不能空着。');
    if (!body) return Promise.resolve('正文不能空着。');
    if (title.length > 40) return Promise.resolve('标题最多 40 个字。');
    if (body.length > 2000) return Promise.resolve('正文最多 2000 个字。');
    if (!C()) return Promise.resolve('云服务没加载上，帖子发不出去。');

    return C().addPost(board || '家园广场', title, body).then(function () {
      var s = S.get();
      s.d.bbs.posted = (s.d.bbs.posted || 0) + 1;
      S.addGB(5);
      S.addExp(6);
      S.save();
      return refresh().then(function () { return '发帖成功，G币+5，全服都能看到了。'; });
    }).catch(function (e) {
      return '发帖失败：' + ((e && (e.message || e.code)) || '网络不给力') + '，稍后再试。';
    });
  }

  function reply(id, body) {
    body = (body || '').trim();
    if (!body) return Promise.resolve('内容不能空着。');
    if (body.length > 800) return Promise.resolve('回帖最多 800 个字。');
    if (!C()) return Promise.resolve('云服务没加载上，回帖发不出去。');

    return C().addReply(id, body).then(function () {
      var s = S.get();
      s.d.bbs.replied = (s.d.bbs.replied || 0) + 1;
      S.addGB(2);
      S.addExp(3);
      S.save();
      return '回帖成功，G币+2。';
    }).catch(function (e) {
      return '回帖失败：' + ((e && (e.message || e.code)) || '网络不给力') + '，稍后再试。';
    });
  }

  /* 家族 —— 仍然是本机数据，不对外 */
  function famSign() {
    var f = S.get().d.family;
    if (f.signAt > 0 && S.dkey(f.signAt) === S.dkey()) return '今天已经给家族签过到了。';
    f.signAt = Date.now();
    f.contrib += 8;
    f.lv = Math.min(20, 7 + Math.floor(f.contrib / 200));
    S.addGB(5);
    return '家族签到成功，贡献+8，家族等级 ' + f.lv + ' 级。';
  }

  function famDonate() {
    if (!S.spendGB(50)) return 'G币不足 50，捐不了。';
    var f = S.get().d.family;
    f.contrib += 20;
    f.lv = Math.min(20, 7 + Math.floor(f.contrib / 200));
    return '你向家族捐献 G币50，贡献+20。';
  }

  QH.B = {
    BOARDS: BOARDS,
    list: list, get: get, detail: detail, refresh: refresh,
    add: add, reply: reply,
    famSign: famSign, famDonate: famDonate,
    ready: ready,
    err: function () { return loadErr; }
  };
})();
