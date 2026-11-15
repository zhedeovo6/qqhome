/* 路由 + 页面渲染 */

(function () {
  'use strict';

  var QH = window.QH, S = QH.S, D = QH.DATA, G = QH.G, B = QH.B;

  var view = { page: 'home', arg: null };
  var flash = '';
  var PAGES = {};

  /* ---------------- 工具 ---------------- */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function px(name, size) {
    var ic = D.ICON[name];
    if (!ic) return '';
    var m = ic.m, h = m.length, w = m[0].length, r = '';
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var ch = m[y][x];
        if (ch === '.') continue;
        var c = ic.c[ch];
        if (!c) continue;
        r += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + c + '"/>';
      }
    }
    size = size || 12;
    return '<svg class="px" width="' + size + '" height="' + size + '" viewBox="0 0 ' + w + ' ' + h +
      '" shape-rendering="crispEdges">' + r + '</svg>';
  }

  /* 纯文字方块进度条，老 WAP 就这么画 */
  function prog(cur, max) {
    var n = 10, f = max > 0 ? Math.round(Math.min(1, cur / max) * n) : 0, s = '';
    for (var i = 0; i < n; i++) s += i < f ? '<i>■</i>' : '<s>□</s>';
    return '<span class="prog">' + s + '</span> ' + Math.round(Math.min(1, max > 0 ? cur / max : 0) * 100) + '%';
  }

  function leftStr(ms) { return G.left(ms); }

  var TITLE = {
    home: '家园', garden: '魔法花园', ranch: '阳光牧场', kf: '精武堂',
    bbs: '家园论坛', post: '帖子', family: '家族', me: '我的家园'
  };

  /* ---------------- 页面骨架 ---------------- */

  function barHTML() {
    var t = TITLE[view.page] || '家园';
    var back = view.page === 'home' ? '<a onclick="location.reload()">刷新</a>' : '<a href="#/home">返回</a>';
    return back + '<span class="t">' + t + '</span><span class="r">3GQQ</span>';
  }

  function footHTML() {
    var s = S.get();
    var l = [
      ['home', '首页'], ['garden', '花园'], ['ranch', '牧场'], ['kf', '精武堂'],
      ['bbs', '论坛'], ['family', '家族'], ['me', '我的']
    ].map(function (x) {
      return '<a href="#/' + x[0] + '">' + x[1] + '</a>';
    }).join('.');

    return l +
      '<br>小Q报时：' + S.stamp() + '　G币:' + s.gb +
      '<br>本次流量:' + (s.flow || 0) + 'KB　<a onclick="QH.act(\'speed\')">极速模式:' + (s.speed ? '开' : '关') + '</a>';
  }

  /* ---------------- 页面：家园首页 ---------------- */

  PAGES.home = function () {
    var s = S.get();
    var online = Math.max(1, Math.floor((Date.now() - s.onlineAt) / 60000));
    var h = '';

    h += '<div class="p" align="center"><b style="letter-spacing:3px">Q Q 家 园</b><br>' +
      '<span class="em">3g.qq.com　腾讯手机家园 · 复刻</span></div>';

    h += '<div class="p">欢迎您 <b>' + esc(s.nick) + '</b>（' + s.lv + '级）<br>' +
      '<span class="em">今日在线:' + online + '分钟　注册:' + Math.max(1, Math.floor((Date.now() - s.regAt) / 86400000)) + '天</span></div>';

    h += '<div class="p">G币:<span class="gb">' + s.gb + '</span>　体力:' + s.energy + '/100<br>' +
      '经验:' + s.exp + '/' + S.need(s.lv) + ' ' + prog(s.exp, S.need(s.lv)) + '</div>';

    h += '<div class="p">（<a onclick="QH.act(\'sign\')">每日签到</a>|' +
      '<a onclick="QH.act(\'work\')">去打工</a>|' +
      '<a href="#/me">在线礼包</a>|' +
      '<a href="#/family">家族签到</a>）</div>';

    if (!S.signedToday()) {
      h += '<div class="tip">☆ 您今天还没签到，签到可得 G币25、家族贡献5。</div>';
    }

    h += '<div class="mt">【我的家园】</div>';

    var games = [
      ['flower', '魔法花园', '种花偷花　' + countReady(s.d.garden.plots, D.FLOWERS) + '块可收', 'garden'],
      ['cow', '阳光牧场', '偷菜收菜　' + countReady(s.d.ranch.plots, D.CROPS) + '块可收', 'ranch'],
      ['sword', '精武堂', '文字比武　' + s.d.kf.lv + '级　体力' + s.energy, 'kf'],
      ['book', '家园论坛', B.list('全部').length + '篇帖子　今日新帖', 'bbs'],
      ['home', '我的家族', '★星月传说★　' + s.d.family.lv + '级　贡献' + s.d.family.contrib, 'family'],
      ['coin', '我的资料', 'G币' + s.gb + '　等级' + s.lv, 'me']
    ];
    games.forEach(function (g) {
      h += '<div class="p">' + px(g[0], 12) + ' <a href="#/' + g[3] + '">' + g[1] + '</a><br>' +
        '<span class="em">　' + g[2] + '</span></div>';
    });

    h += '<div class="mt">【社区热帖】</div>';
    var hot = B.list('全部').slice(0, 5);
    hot.forEach(function (p) {
      h += '<div class="p2">☆<a href="#/post/' + p.id + '">' + esc(p.title) + '</a>' +
        '<span class="em">(' + p.views + '阅/' + p.rep.length + '回)</span></div>';
    });
    h += '<div class="p2"><a href="#/bbs">更多帖子&gt;&gt;</a></div>';

    h += '<div class="mt">【家园公告】</div>';
    h += '<div class="p2">☆<a href="#/post/5">家园论坛版规·发帖前必看</a></div>';
    h += '<div class="p2">☆<a href="#/post/4">精武堂加点攻略（长期更新）</a></div>';
    h += '<div class="p2">☆<a href="#/family">★星月传说★ 长期招人，只收活人</a></div>';

    return h;
  };

  function countReady(plots, table) {
    var n = 0, now = Date.now();
    plots.forEach(function (p) {
      if (!p) return;
      var f = table[p.k];
      if (now >= p.t0 + f.grow * 1000) n++;
    });
    return n;
  }

  /* ---------------- 页面：魔法花园 ---------------- */

  PAGES.garden = function () {
    var s = S.get(), g = s.d.garden;

    if (view.arg && view.arg.indexOf('seed') === 0) return seedPage(+view.arg.split('/')[1], 'garden');

    var h = '<div class="mt">【魔法花园】<a href="#/home"><span class="em">返回家园</span></a></div>';
    h += '<div class="p">花主：' + esc(s.nick) + '　等级：' + s.lv + '　人气：' + (36 + Object.keys(g.picks).length * 7) + '</div>';

    h += '<table class="g"><tr>';
    for (var i = 0; i < 6; i++) {
      if (i === 3) h += '</tr><tr>';
      h += '<td>' + plotCell(g.plots[i], i, D.FLOWERS, 'garden') + '</td>';
    }
    h += '</tr></table>';

    h += '<div class="p">花种：' + seedList(g.seeds, D.FLOWERS, 'gbuy') + '</div>';
    h += '<div class="p">（<a href="#/garden/seed/0">买花种</a>|' +
      '<a onclick="QH.act(\'gsteal\')">去好友家偷花</a>|' +
      '<a href="#/garden/picks">花谱</a>）</div>';

    if (view.arg === 'picks') {
      h += '<div class="mt">【我的花谱】</div>';
      Object.keys(D.FLOWERS).forEach(function (k) {
        var f = D.FLOWERS[k], got = g.picks[k] || 0;
        h += '<div class="p2">' + (got ? '★' : '☆') + f.n +
          '<span class="em">　' + (got ? '已点亮　收过' + got + '朵' : '未点亮') + '</span></div>';
      });
    }

    return h;
  };

  function plotCell(p, i, table, kind) {
    var pickAct = kind === 'garden' ? 'pick' : 'rpick';
    if (!p) {
      return '空地<br><span class="em">—</span><br><a class="btn s" href="#/' + kind + '/seed/' + i + '">种</a>';
    }
    var f = table[p.k], end = p.t0 + f.grow * 1000, now = Date.now();
    if (now < end) {
      var act = kind === 'garden'
        ? (p.w ? '<span class="em">已浇水</span>'
               : '<a class="btn s" onclick="QH.act(\'water\',' + i + ')">浇水</a>')
        : '<span class="em">生长中</span>';
      return f.n + '<br><span class="em">' + leftStr(end - now) + '</span><br>' + act;
    }
    return '<span class="gb">' + f.n + '</span><br><span class="em">可收</span><br>' +
      '<a class="btn s" onclick="QH.act(\'' + pickAct + '\',' + i + ')">收</a>';
  }

  function seedList(seeds, table, buyAct) {
    var out = [];
    Object.keys(table).forEach(function (k) {
      var n = seeds[k] || 0;
      if (n > 0) out.push(table[k].n + '×' + n);
    });
    return out.length ? out.join('　') : '<span class="em">没有花种了</span>';
  }

  function seedPage(i, kind) {
    var s = S.get();
    var table = kind === 'garden' ? D.FLOWERS : D.CROPS;
    var seeds = kind === 'garden' ? s.d.garden.seeds : s.d.ranch.seeds;
    var buyAct = kind === 'garden' ? 'gbuy' : 'rbuy';
    var plantAct = kind === 'garden' ? 'gplant' : 'rplant';

    var h = '<div class="mt">【种子商店】<a href="#/' + kind + '"><span class="em">返回</span></a></div>';
    h += '<div class="p">要种在第' + (i + 1) + '块地。G币:' + s.gb + '</div>';

    Object.keys(table).forEach(function (k) {
      var f = table[k], have = seeds[k] || 0;
      h += '<div class="p">☆' + f.n + '<span class="em">（' + f.grow + '秒成熟，卖' + f.gain + 'G）</span><br>' +
        '　持有' + have + '　<a class="btn s" onclick="QH.act(\'' + buyAct + '\',\'' + k + '\')">买 ' + f.cost + 'G</a> ' +
        (have > 0 ? '<a class="btn s" onclick="QH.act(\'' + plantAct + '\',' + i + ',\'' + k + '\')">种下</a>' : '') +
        '</div>';
    });
    return h;
  }

  /* ---------------- 页面：阳光牧场 ---------------- */

  PAGES.ranch = function () {
    var s = S.get(), r = s.d.ranch;

    if (view.arg && view.arg.indexOf('seed') === 0) return seedPage(+view.arg.split('/')[1], 'ranch');

    var h = '<div class="mt">【阳光牧场】<a href="#/home"><span class="em">返回家园</span></a></div>';
    h += '<div class="p">牧场主：' + esc(s.nick) + '　牧民等级：' + Math.max(1, Math.floor(s.lv / 2)) + '</div>';

    h += '<table class="g"><tr>';
    for (var i = 0; i < 6; i++) {
      if (i === 3) h += '</tr><tr>';
      h += '<td>' + plotCell(r.plots[i], i, D.CROPS, 'ranch') + '</td>';
    }
    h += '</tr></table>';

    h += '<div class="p">种子：' + seedList(r.seeds, D.CROPS, 'rbuy') + '</div>';
    h += '<div class="p">（<a href="#/ranch/seed/0">买种子</a>|' +
      '<a onclick="QH.act(\'rsteal\')">去好友地里偷菜</a>）</div>';
    h += '<div class="tip">☆ 牧场传说：定好闹钟半夜三点起来收菜，被家里人抓到过的不止一个。</div>';
    return h;
  };

  /* ---------------- 页面：精武堂 ---------------- */

  PAGES.kf = function () {
    var s = S.get(), k = s.d.kf;
    var need = 60 + k.lv * 20;

    var h = '<div class="mt">【精武堂】<a href="#/home"><span class="em">返回家园</span></a></div>';
    h += '<div class="p">' + esc(s.nick) + ' Lv' + k.lv + '<br>' +
      '气血:' + k.hp + '　攻击:' + k.atk + '<br>' +
      '防御:' + k.def + '　精气:' + k.qi + '</div>';
    h += '<div class="p">功力:' + k.exp + '/' + need + ' ' + prog(k.exp, need) + '<br>' +
      '战绩:' + k.wins + '胜 ' + k.loses + '负　体力:' + s.energy + '/100</div>';
    h += '<div class="p">（<a onclick="QH.act(\'train\')">修炼</a>|' +
      '<a onclick="QH.act(\'fight\')">找人比武</a>|' +
      '<a href="#/bbs">武学交流</a>）</div>';

    h += '<div class="mt">【战报】</div>';
    if (k.log) {
      h += '<div class="log">' + esc(k.log) + '</div>';
    } else {
      h += '<div class="p"><span class="em">还没有打过。听老人说，二力一敏加点，前四十级刷怪最快。</span></div>';
    }
    return h;
  };

  /* ---------------- 页面：论坛 ---------------- */

  PAGES.bbs = function () {
    if (view.arg === 'new') return newPostPage();

    var h = '<div class="mt">【家园论坛】<a href="#/bbs/new"><span class="em">发帖</span></a></div>';
    h += '<div class="p">版块：<a href="#/bbs">全部</a>';
    B.BOARDS.forEach(function (b) {
      h += ' <a href="#/bbs/b/' + encodeURIComponent(b) + '">' + b + '</a>';
    });
    h += '</div>';

    var board = '全部';
    if (view.arg && view.arg.indexOf('b/') === 0) board = decodeURIComponent(view.arg.slice(2));

    var list = B.list(board);
    h += '<div class="mt">【' + board + '】<span class="em">共' + list.length + '篇</span></div>';

    list.forEach(function (p) {
      h += '<div class="p2">☆<a href="#/post/' + p.id + '">' + esc(p.title) + '</a>' +
        '<span class="em">(' + p.views + '阅/' + p.rep.length + '回)</span><br>' +
        '<span class="em">　' + esc(p.nick) + '　' + p.t + '　[' + p.board + ']</span></div>';
    });

    h += '<div class="pager">第1/1页</div>';
    return h;
  };

  function newPostPage() {
    var h = '<div class="mt">【发表帖子】<a href="#/bbs"><span class="em">返回</span></a></div>';
    h += '<div class="p">版块：<select id="pb">';
    B.BOARDS.forEach(function (b) { h += '<option>' + b + '</option>'; });
    h += '</select></div>';
    h += '<div class="p">标题：<input type="text" id="pt" maxlength="40"></div>';
    h += '<div class="p">正文：</div><div class="p"><textarea id="pd"></textarea></div>';
    h += '<div class="btnrow"><a class="btn" onclick="QH.act(\'post\')">发表</a> ' +
      '<a class="btn" href="#/bbs">取消</a></div>';
    h += '<div class="tip">☆ 发帖 +5 G币。广告、外链一律沉底。</div>';
    return h;
  }

  PAGES.post = function () {
    var id = view.arg;
    var p = B.get(id);
    if (!p) return '<div class="p">帖子不存在或已被删除。<a href="#/bbs">返回论坛</a></div>';

    var h = '<div class="mt">【' + esc(p.board) + '】<a href="#/bbs"><span class="em">返回</span></a></div>';
    h += '<div class="p"><b>' + esc(p.title) + '</b><br>' +
      '<span class="em">' + esc(p.nick) + '　' + p.t + '　' + p.views + '阅/' + p.rep.length + '回</span></div>';
    h += '<div class="hr"></div>';
    h += '<div class="body">' + esc(p.body) + '</div>';
    h += '<div class="hr"></div>';

    h += '<div class="mt">【回帖 ' + p.rep.length + '】</div>';
    if (!p.rep.length) {
      h += '<div class="p"><span class="em">还没有人回，抢个沙发。</span></div>';
    }
    p.rep.forEach(function (r, i) {
      h += '<div class="p2">' + (i + 1) + '楼　<b>' + esc(r.nick) + '</b>　<span class="em">' + r.t + '</span><br>' +
        '<span style="padding-left:6px">' + esc(r.body) + '</span></div>';
    });

    h += '<div class="mt">【我要回帖】</div>';
    h += '<div class="p"><textarea id="rp"></textarea></div>';
    h += '<div class="btnrow"><a class="btn" onclick="QH.act(\'reply\',' + p.id + ')">回帖</a> ' +
      '<a class="btn" href="#/bbs">返回列表</a></div>';
    return h;
  };

  /* ---------------- 页面：家族 ---------------- */

  PAGES.family = function () {
    var s = S.get(), f = s.d.family;
    var h = '<div class="mt">【★星月传说★】<a href="#/home"><span class="em">返回家园</span></a></div>';
    h += '<div class="p">家族等级：' + f.lv + '　家族贡献：' + f.contrib + '<br>' +
      '成员：' + D.MEMBERS.length + '/50　家族树：' + (f.lv * 3) + '级</div>';
    h += '<div class="p">（<a onclick="QH.act(\'famsign\')">每日签到</a>|' +
      '<a onclick="QH.act(\'famdonate\')">捐献50G</a>|' +
      '<a href="#/bbs/b/' + encodeURIComponent('家族天地') + '">家族帖</a>）</div>';

    h += '<div class="mt">【家族成员】</div>';
    D.MEMBERS.forEach(function (m) {
      h += '<div class="p2">' + m[0] + '　<b>' + m[1] + '</b>　<span class="em">' + m[2] + '级</span><br>' +
        '<span class="em">　签名：' + m[3] + '</span></div>';
    });
    return h;
  };

  /* ---------------- 页面：我的 ---------------- */

  PAGES.me = function () {
    var s = S.get();
    var days = Math.max(1, Math.floor((Date.now() - s.regAt) / 86400000));
    var h = '<div class="mt">【我的家园】<a href="#/home"><span class="em">返回</span></a></div>';
    h += '<div class="box">昵称：' + esc(s.nick) + '<br>' +
      '等级：' + s.lv + '　经验：' + s.exp + '/' + S.need(s.lv) + '<br>' +
      'G币：' + s.gb + '　体力：' + s.energy + '/100<br>' +
      '注册：' + days + '天　在线：' + Math.max(1, Math.floor((Date.now() - s.onlineAt) / 60000)) + '分钟</div>';

    h += '<div class="p">（<a onclick="QH.act(\'sign\')">签到</a>|' +
      '<a onclick="QH.act(\'work\')">打工</a>|' +
      '<a onclick="QH.act(\'speed\')">极速模式</a>）</div>';

    h += '<div class="mt">【存档】</div>';
    h += '<div class="p"><span class="em">数据存在本机浏览器 localStorage，换浏览器就没了。</span></div>';
    h += '<div class="btnrow"><a class="btn" onclick="QH.act(\'reset\')">重新开始</a></div>';
    return h;
  };

  /* ---------------- 动作 ---------------- */

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
  }

  var ACT = {
    sign: function () { return S.signIn(); },
    work: function () { return S.work(); },
    speed: function () {
      var s = S.get(); s.speed = !s.speed;
      document.body.classList.toggle('speed', s.speed);
      return s.speed ? '已开启极速模式，不显示图片，省流量。' : '已关闭极速模式。';
    },
    reset: function () {
      if (!confirm('要清空存档重新开始吗？')) return '';
      S.reset();
      location.hash = '#/home';
      return '存档已清空，一切从头开始。';
    },
    water: function (i) { return G.garden.water(i); },
    pick: function (i) {
      var page = view.page;
      return page === 'ranch' ? G.ranch.pick(i) : G.garden.pick(i);
    },
    gbuy: function (k) { return G.garden.buy(k); },
    gplant: function (i, k) { return G.garden.plant(i, k); },
    gsteal: function () { return G.garden.steal(); },
    rbuy: function (k) { return G.ranch.buy(k); },
    rplant: function (i, k) { return G.ranch.plant(i, k); },
    rsteal: function () { return G.ranch.steal(); },
    train: function () { return G.kf.train(); },
    fight: function () { return G.kf.fight(); },
    famsign: function () { return B.famSign(); },
    famdonate: function () { return B.famDonate(); },
    reply: function (id) { return B.reply(id, val('rp')); },
    post: function () {
      var r = B.add(val('pb'), val('pt'), val('pd'));
      if (r.indexOf('成功') >= 0) location.hash = '#/bbs';
      return r;
    }
  };

  /* 牧场收菜按钮走的是 pick，需要按当前页面区分：见 PAGES.ranch 生成时用 act('rpick') */
  ACT.rpick = function (i) { return G.ranch.pick(i); };

  QH.act = function (name) {
    var args = [].slice.call(arguments, 1);
    var r = '';
    try {
      if (ACT[name]) r = ACT[name].apply(null, args);
    } catch (e) {
      r = '操作失败：' + e.message;
    }
    if (r) flash = r;
    S.save();
    render();
  };

  /* ---------------- 渲染与路由 ---------------- */

  function render(keepScroll) {
    var s = S.get();
    S.tick();

    document.body.classList.toggle('speed', !!s.speed);

    var page = PAGES[view.page] || PAGES.home;
    var body = '';
    if (flash) {
      body += '<div class="tip">☆ ' + esc(flash) + '　<a onclick="QH.act(\'clr\')">知道了</a></div>';
    }
    body += page();

    document.getElementById('bar').innerHTML = barHTML();
    document.getElementById('page').innerHTML = body;
    document.getElementById('foot').innerHTML = footHTML();
    document.title = (TITLE[view.page] || '家园') + ' - QQ家园';

    if (!keepScroll) window.scrollTo(0, 0);
  }

  ACT.clr = function () { flash = ''; return ''; };

  function route() {
    var h = location.hash.replace(/^#\/?/, '') || 'home';
    var parts = h.split('/');
    view.page = PAGES[parts[0]] ? parts[0] : 'home';
    view.arg = parts.slice(1).join('/') || null;

    var s = S.get();
    s.flow = (s.flow || 0) + 2 + Math.floor(Math.random() * 6);
    S.save();

    flash = '';
    render();
  }

  window.addEventListener('hashchange', route);

  /* 倒计时页面每秒重绘一次，输入框有焦点时不打断 */
  setInterval(function () {
    if (['garden', 'ranch', 'kf'].indexOf(view.page) < 0) return;
    var a = document.activeElement;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) return;
    render(true);
  }, 1000);

  /* 启动 */
  S.load();
  S.tick();
  if (!location.hash) location.hash = '#/home';
  route();
})();
