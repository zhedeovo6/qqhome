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
    bbs: '家园论坛', post: '帖子', family: '家族', me: '我的家园',
    rank: '全服排行', steal: '跨服偷菜'
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
      ['rank', '排行'], ['steal', '偷菜'], ['bbs', '论坛'], ['me', '我的']
    ].map(function (x) {
      return '<a href="#/' + x[0] + '">' + x[1] + '</a>';
    }).join('.');

    var net = '';
    if (QH.C) {
      var st = QH.C.status();
      net = '　<a href="#/me">' + (st === 'on' ? '在线' : (st === 'off' ? '离线' : '连接中')) + '</a>';
    }

    return l +
      '<br>小Q报时：' + S.stamp() + '　G币:' + s.gb + net +
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
      ['star', '全服排行', '等级榜　比武榜　收花榜', 'rank'],
      ['mail', '跨服偷菜', '去别人家偷，他上线能看到', 'steal'],
      ['book', '家园论坛', Math.max(0, B.list('全部').length) + '篇帖子　全服共享', 'bbs'],
      ['home', '我的家族', '★星月传说★　' + s.d.family.lv + '级　贡献' + s.d.family.contrib, 'family'],
      ['coin', '我的资料', 'G币' + s.gb + '　等级' + s.lv, 'me']
    ];
    games.forEach(function (g) {
      h += '<div class="p">' + px(g[0], 12) + ' <a href="#/' + g[3] + '">' + g[1] + '</a><br>' +
        '<span class="em">　' + g[2] + '</span></div>';
    });

    h += '<div class="mt">【社区热帖】</div>';
    var hot = B.list('全部').slice(0, 5);
    if (!hot.length) {
      h += '<div class="p2"><span class="em">正在从服务器读取帖子…</span></div>';
    }
    hot.forEach(function (p) {
      h += '<div class="p2">☆<a href="#/post/' + p.id + '">' + esc(p.title) + '</a>' +
        '<span class="em">(' + p.views + '阅/' + p.rep + '回)</span></div>';
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
      '<a href="#/steal">去别人家偷花</a>|' +
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
      '<a href="#/steal">去别人地里偷菜</a>）</div>';
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

  /* ---------------- 页面：全服排行 ---------------- */

  var rankCache = { type: '', at: 0, rows: [], busy: '', err: '' };

  function needRank(type) {
    if (rankCache.type === type && rankCache.at && Date.now() - rankCache.at < 15000) return;
    if (rankCache.busy === type) return;
    if (!QH.C || QH.C.status() === 'off') {
      rankCache.type = type; rankCache.at = Date.now(); rankCache.rows = [];
      rankCache.err = '连不上服务器，榜单要联网才看得到。';
      return;
    }
    rankCache.busy = type;
    rankCache.type = type;
    QH.C.loadRank(type).then(function (rows) {
      rankCache.rows = rows || [];
      rankCache.at = Date.now();
      rankCache.err = '';
      rankCache.busy = '';
      render(true);
    }).catch(function (e) {
      rankCache.rows = [];
      rankCache.at = Date.now();
      rankCache.err = '读取失败：' + ((e && (e.message || e.code)) || '网络不给力');
      rankCache.busy = '';
      render(true);
    });
  }

  var RANK_TABS = [['lv', '等级榜'], ['wins', '比武榜'], ['flowers', '收花榜']];

  PAGES.rank = function () {
    var type = view.arg || 'lv';
    if (!RANK_TABS.some(function (x) { return x[0] === type; })) type = 'lv';
    needRank(type);

    var h = '<div class="mt">【全服排行】<a href="#/home"><span class="em">返回家园</span></a></div>';
    h += '<div class="p">';
    h += RANK_TABS.map(function (x) {
      return x[0] === type ? '<b>[' + x[1] + ']</b>' : '<a href="#/rank/' + x[0] + '">' + x[1] + '</a>';
    }).join('　');
    h += '</div>';

    if (rankCache.err) {
      h += '<div class="tip">☆ ' + esc(rankCache.err) + '</div>';
    }
    if (!rankCache.at) {
      h += '<div class="p"><span class="em">正在连服务器读取榜单…</span></div>';
      return h;
    }

    var rows = rankCache.rows;
    if (!rows.length) {
      h += '<div class="p"><span class="em">榜上还没有人。你先玩两步，8 秒后自动上榜。</span></div>';
      return h;
    }

    h += '<div class="mt">【' + (RANK_TABS.filter(function (x) { return x[0] === type; })[0] || [0, '榜'])[1] +
      '】<span class="em">共' + rows.length + '人</span></div>';

    var me = S.get().nick;
    rows.forEach(function (r, i) {
      var no = i + 1;
      var mark = no <= 3 ? '★' : '　';
      var extra = type === 'wins' ? ('胜' + r.wins + '负' + r.loses)
        : type === 'flowers' ? ('收花' + r.flowers + '朵')
          : ('G币' + r.gold);
      var mine = r.nickname === me;
      h += '<div class="p2">' + mark + no + '.' +
        (mine ? '<b>' : '') + esc(r.nickname) + (mine ? '（你）</b>' : '') +
        '<span class="em">　Lv' + r.lv + '　' + extra + '</span></div>';
    });

    h += '<div class="p"><span class="em">榜单每 15 秒刷新。等级、比武、收花都实时上报。</span></div>';
    h += '<div class="btnrow"><a class="btn" href="#/rank/' + type + '">刷新</a> ' +
      '<a class="btn" href="#/steal">去偷菜</a></div>';
    return h;
  };

  /* ---------------- 页面：跨服偷菜 ---------------- */

  var stealCache = { at: 0, rows: [], busy: false, err: '', mine: null };

  function needTargets() {
    if (stealCache.at && Date.now() - stealCache.at < 30000) return;
    if (stealCache.busy) return;
    if (!QH.C || QH.C.status() === 'off') {
      stealCache.at = Date.now();
      stealCache.err = '连不上服务器，跨服偷菜要联网。';
      return;
    }
    stealCache.busy = true;
    QH.C.targets(4).then(function (rows) {
      stealCache.rows = rows || [];
      stealCache.at = Date.now();
      stealCache.err = rows && rows.length ? '' : '服务器上还没有别的玩家，你先去论坛喊一嗓子。';
      stealCache.busy = false;
      render(true);
    }).catch(function (e) {
      stealCache.rows = [];
      stealCache.at = Date.now();
      stealCache.err = '读取失败：' + ((e && (e.message || e.code)) || '网络不给力');
      stealCache.busy = false;
      render(true);
    });
  }

  var STEAL_GAP = 30000;

  PAGES.steal = function () {
    needTargets();
    var s = S.get();
    var last = s.d.garden.xstealAt || 0;
    var wait = Math.max(0, Math.ceil((STEAL_GAP - (Date.now() - last)) / 1000));

    var h = '<div class="mt">【跨服偷菜】<a href="#/home"><span class="em">返回家园</span></a></div>';
    h += '<div class="p">你摸到了别人的家园边上。四处看看谁家花开着。<br>' +
      '<span class="em">' + (wait > 0 ? '刚得手，手还热着，' + wait + '秒后才能再偷。' : '可以下手了，小心狗。') + '</span></div>';

    if (stealCache.err) h += '<div class="tip">☆ ' + esc(stealCache.err) + '</div>';
    if (!stealCache.at) {
      h += '<div class="p"><span class="em">正在打听谁家花开了…</span></div>';
      return h;
    }

    if (stealCache.rows.length) {
      h += '<div class="mt">【这几家园子没锁门】</div>';
      stealCache.rows.forEach(function (r, i) {
        var can = Math.max(1, Math.min(9, Math.round((r.flowers || 0) / 3) + 1));
        h += '<div class="p">☆<b>' + esc(r.nickname) + '</b> <span class="em">Lv' + r.lv + '</span><br>' +
          '<span class="em">　园里开着 ' + can + ' 朵，收过 ' + (r.flowers || 0) + ' 朵花</span><br>' +
          '　' + (wait > 0
            ? '<span class="em">' + wait + '秒后可偷</span>'
            : '<a class="btn s" onclick="QH.act(\'xsteal\',' + i + ')">偷一朵</a>') +
          '</div>';
      });
    }

    h += '<div class="mt">【谁偷过我】</div>';
    if (!stealCache.mine) {
      if (!stealCache.mineBusy && QH.C && QH.C.mySteals) {
        stealCache.mineBusy = true;
        QH.C.mySteals().then(function (list) {
          stealCache.mine = list || [];
          stealCache.mineBusy = false;
          render(true);
        }).catch(function () {
          stealCache.mine = [];
          stealCache.mineBusy = false;
          render(true);
        });
      }
      h += '<div class="p"><span class="em">正在翻账本…</span></div>';
    } else if (!stealCache.mine.length) {
      h += '<div class="p"><span class="em">还没人偷过你。也可能偷了你没留名。</span></div>';
    } else {
      stealCache.mine.forEach(function (x) {
        h += '<div class="p2">☆<b>' + esc(x.from_name) + '</b> 偷走了你的' + esc(x.item) +
          '<span class="em">　' + QH.C.ts(x.created_at) + '</span></div>';
      });
    }

    h += '<div class="tip">☆ 偷的是别人家的园子。他下次打开家园，会在「我的」里看到你的名字。</div>';
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
    h += '<div class="mt">【' + esc(board) + '】<span class="em">共' + list.length + '篇　全服共享</span></div>';

    if (!list.length) {
      h += '<div class="p"><span class="em">' +
        (B.err() ? '读取失败：' + esc(B.err()) : (B.ready() ? '这个版块还没有帖子，你来发第一帖。' : '正在从服务器读取帖子…')) +
        '</span></div>';
    }

    list.forEach(function (p) {
      h += '<div class="p2">☆<a href="#/post/' + p.id + '">' + esc(p.title) + '</a>' +
        '<span class="em">(' + p.views + '阅/' + p.rep + '回)</span><br>' +
        '<span class="em">　' + esc(p.nick) + '　' + p.t + '　[' + esc(p.board) + ']</span></div>';
    });

    h += '<div class="pager">第1/1页</div>';
    h += '<div class="btnrow"><a class="btn" href="#/bbs/new">发帖</a> <a class="btn" href="#/bbs">刷新</a></div>';
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

  var postState = { id: 0, p: null, busy: false, err: '', seen: false };

  PAGES.post = function () {
    var id = +view.arg;
    if (postState.id !== id) postState = { id: id, p: null, busy: false, err: '', seen: false };

    if (!postState.p && !postState.busy) {
      if (!QH.C || QH.C.status() === 'off') {
        postState.err = '连不上服务器，帖子打不开。';
      } else {
        postState.busy = true;
        QH.C.fetchPost(id).then(function (p) {
          postState.p = p;
          postState.busy = false;
          if (p && !postState.seen) {
            postState.seen = true;
            QH.C.markSeen(p.id, p.views);
            p.views++;
          }
          render(true);
        }).catch(function (e) {
          postState.err = '读取失败：' + ((e && (e.message || e.code)) || '网络不给力');
          postState.busy = false;
          render(true);
        });
      }
    }

    if (postState.err) {
      return '<div class="p">' + esc(postState.err) + '<br><a href="#/bbs">返回论坛</a></div>';
    }
    if (!postState.p) {
      return '<div class="p"><span class="em">正在读取帖子…</span></div>';
    }

    var p = postState.p;
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

    h += '<div class="p">改个名：<input type="text" id="nk" maxlength="12" value="' + esc(s.nick) + '" style="width:90px"> ' +
      '<a class="btn s" onclick="QH.act(\'nick\')">改</a></div>';

    h += '<div class="p">（<a onclick="QH.act(\'sign\')">签到</a>|' +
      '<a onclick="QH.act(\'work\')">打工</a>|' +
      '<a onclick="QH.act(\'speed\')">极速模式</a>|' +
      '<a href="#/rank">排行</a>）</div>';

    /* ---- 云存档 ---- */
    var st = QH.C ? QH.C.status() : 'off';
    var stTxt = st === 'on' ? '在线，已同步' : (st === 'connecting' || st === 'init' ? '正在连接…' : '离线，只存本机');
    var last = QH.C ? QH.C.syncedAt() : 0;
    var myKey = QH.C ? QH.C.key() : (s.key || '');

    h += '<div class="mt">【存档 · 云同步】</div>';
    h += '<div class="p">存档码：<br><b style="font-size:11px;word-break:break-all">' + esc(myKey) + '</b><br>' +
      '<span class="em">状态：' + stTxt + (last ? '　上次 ' + S.stamp(last) : '') + '</span></div>';
    h += '<div class="tip">☆ 存档码就是你家的钥匙：换手机或换浏览器时，在新设备这里填上它，进度接着玩。</div>';

    h += '<div class="p">恢复存档：<input type="text" id="ck" placeholder="粘贴存档码" style="width:150px"> ' +
      '<a class="btn s" onclick="QH.act(\'loadkey\')">接上</a></div>';

    h += '<div class="mt">【我的记录】</div>';
    h += '<div class="p2">发帖：' + (s.d.bbs.posted || 0) + '　回帖：' + (s.d.bbs.replied || 0) +
      '　比武：' + s.d.kf.wins + '胜' + s.d.kf.loses + '负<br>' +
      '<span class="em">　<a href="#/steal">看看谁偷过我的花</a></span></div>';

    h += '<div class="btnrow"><a class="btn" onclick="QH.act(\'syncnow\')">立即同步</a> ' +
      '<a class="btn" onclick="QH.act(\'reset\')">重新开始</a></div>';
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
    reply: function (id) {
      return B.reply(id, val('rp')).then(function (msg) {
        if (msg.indexOf('成功') >= 0) postState.busy = false, postState.p = null;
        return msg;
      });
    },
    post: function () {
      return B.add(val('pb'), val('pt'), val('pd')).then(function (msg) {
        if (msg.indexOf('成功') >= 0) location.hash = '#/bbs';
        return msg;
      });
    },
    nick: function () {
      var v = (val('nk') || '').trim();
      if (!v) return '名字不能空着。';
      if (v.length > 12) return '名字最多 12 个字。';
      S.get().nick = v;
      if (QH.C) QH.C.submitRank();
      return '改好了，现在叫[' + v + ']。';
    },
    syncnow: function () {
      if (!QH.C) return '云服务没加载上。';
      return QH.C.pushSave().then(function (ok) {
        return ok ? '已同步到服务器。' : '同步失败：' + (QH.C.error() || '网络不给力');
      });
    },
    loadkey: function () {
      var code = (val('ck') || '').trim();
      if (!code) return '先填存档码。';
      if (!QH.C) return '云服务没加载上。';
      return QH.C.pullSaveByKey(code).then(function (data) {
        if (!S.adopt(data)) return '存档格式不对，没敢接。';
        location.hash = '#/home';
        return '接上了，继续你的家园。';
      }).catch(function (e) {
        return '没接上：' + ((e && (e.message || e.code)) || '网络不给力');
      });
    },
    xsteal: function (i) {
      var r = stealCache.rows[i];
      if (!r) return '这家搬走了，刷新看看别人家。';
      var s = S.get();
      if (Date.now() - (s.d.garden.xstealAt || 0) < STEAL_GAP) {
        return '手还热着，等会儿再偷。';
      }
      s.d.garden.xstealAt = Date.now();

      var items = ['一支红玫瑰', '两朵白百合', '一棵大白菜', '一把薰衣草', '三颗草莓', '一朵郁金香', '两个白萝卜'];
      var item = items[Math.floor(Math.random() * items.length)];
      var gain = 8 + Math.floor(Math.random() * 22);
      S.addGB(gain);
      S.addExp(3);
      stealCache.rows = [];      // 这轮挑好的目标作废，下次重新打听
      stealCache.at = 0;
      stealCache.mine = null;

      var msg = '得手了！从[' + r.nickname + ']家偷走' + item + '，卖了 G币' + gain + '。';
      if (QH.C && QH.C.status() !== 'off') {
        return QH.C.steal(r.id, item).then(function () {
          return msg + '他上线就能看到你的名字。';
        }).catch(function () {
          return msg + '（这一笔没记上账，对方看不到，G币照样到手。）';
        });
      }
      return msg + '（离线，对方看不到。）';
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

    /* 异步动作（发帖、云同步、偷菜记账）先给个"处理中"再回填结果 */
    if (r && typeof r.then === 'function') {
      flash = '处理中…';
      render();
      r.then(function (msg) {
        flash = msg || '';
        S.save();
        render();
      }, function (e) {
        flash = '操作失败：' + ((e && (e.message || e.code)) || e);
        S.save();
        render();
      });
      return;
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

  var feedAt = 0, feedBusy = false;

  function refreshFeed() {
    if (feedBusy || Date.now() - feedAt < 20000) return;
    if (!QH.C || QH.C.status() === 'off') return;
    feedBusy = true;
    B.refresh().then(function () {
      feedAt = Date.now(); feedBusy = false; render(true);
    }).catch(function () {
      feedAt = Date.now(); feedBusy = false;
    });
  }

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

    if (view.page === 'home' || view.page === 'bbs' || view.page === 'post') refreshFeed();
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

  /* 云服务连上以后重画一次，把在线数据顶上来 */
  QH.onCloudReady = function () {
    feedAt = 0;
    rankCache.at = 0;
    stealCache.at = 0;
    render(true);
    refreshFeed();
  };
  if (QH.C && QH.C.onReady) QH.C.onReady(QH.onCloudReady);
})();
