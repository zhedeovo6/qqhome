/* 社区层：论坛发帖 / 回帖 / 浏览计数，家族签到 */

(function () {
  'use strict';

  var QH = window.QH, S = QH.S;

  var BOARDS = ['家园广场', '家族天地', '游戏交流', '同城客栈'];

  function posts() { return S.get().d.bbs.posts; }

  function nextId() {
    var p = posts(), m = 0;
    for (var i = 0; i < p.length; i++) if (p[i].id > m) m = p[i].id;
    return m + 1;
  }

  function list(board) {
    var p = posts().slice();
    if (board && board !== '全部') p = p.filter(function (x) { return x.board === board; });
    p.sort(function (a, b) { return b.id - a.id; });
    return p;
  }

  function get(id) {
    var p = posts();
    for (var i = 0; i < p.length; i++) if (p[i].id === +id) return p[i];
    return null;
  }

  var B = { BOARDS: BOARDS, list: list, get: get };

  B.view = function (id) {
    var p = get(id);
    if (p) p.views++;
    return p;
  };

  B.add = function (board, title, body) {
    title = (title || '').trim();
    body = (body || '').trim();
    if (!title) return '标题不能空着。';
    if (!body) return '正文不能空着。';
    if (title.length > 40) return '标题最多 40 个字。';
    var s = S.get();
    posts().push({
      id: nextId(),
      board: board || '家园广场',
      nick: s.nick,
      t: S.stamp(),
      title: title,
      body: body,
      views: 0,
      rep: []
    });
    S.addGB(5);
    S.addExp(6);
    return '发帖成功，G币+5。';
  };

  B.reply = function (id, body) {
    body = (body || '').trim();
    if (!body) return '内容不能空着。';
    var p = get(id);
    if (!p) return '帖子不存在。';
    p.rep.push({ nick: S.get().nick, t: S.stamp(), body: body });
    S.addGB(2);
    S.addExp(3);
    return '回帖成功，G币+2。';
  };

  /* 家族 */
  B.famSign = function () {
    var f = S.get().d.family;
    if (f.signAt > 0 && S.dkey(f.signAt) === S.dkey()) return '今天已经给家族签过到了。';
    f.signAt = Date.now();
    f.contrib += 8;
    f.lv = Math.min(20, 7 + Math.floor(f.contrib / 200));
    S.addGB(5);
    return '家族签到成功，贡献+8，家族等级 ' + f.lv + ' 级。';
  };

  B.famDonate = function () {
    if (!S.spendGB(50)) return 'G币不足 50，捐不了。';
    var f = S.get().d.family;
    f.contrib += 20;
    f.lv = Math.min(20, 7 + Math.floor(f.contrib / 200));
    return '你向家族捐献 G币50，贡献+20。';
  };

  QH.B = B;
})();
