/* 玩法层：魔法花园 / 阳光牧场 / 精武堂
   所有函数返回一句提示文字，由 app 层弹到页面顶部 */

(function () {
  'use strict';

  var QH = window.QH, D = QH.DATA, S = QH.S;

  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }

  function left(ms) {
    if (ms <= 0) return '可收';
    var t = Math.ceil(ms / 1000);
    if (t < 60) return t + '秒';
    var m = Math.floor(t / 60), sec = t % 60;
    if (m < 60) return m + '分' + (sec ? sec + '秒' : '');
    return Math.floor(m / 60) + '小时' + (m % 60) + '分钟';
  }

  var G = { left: left };

  /* ================= 魔法花园 ================= */
  G.garden = {

    plant: function (i, k) {
      var g = S.get().d.garden, f = D.FLOWERS[k];
      if (!f) return '没有这种花种。';
      if (g.plots[i]) return '这块地已经种上了。';
      if (!g.seeds[k]) return '你的[' + f.n + ']花种不够，先去买。';
      g.seeds[k]--;
      g.plots[i] = { k: k, t0: Date.now(), w: false };
      S.addExp(2);
      return '你在第' + (i + 1) + '块地种下了[' + f.n + ']，' + f.grow + '秒后开花。';
    },

    water: function (i) {
      var g = S.get().d.garden, p = g.plots[i];
      if (!p) return '空地浇什么水。';
      if (p.w) return '这块地今天已经浇过了。';
      var f = D.FLOWERS[p.k];
      p.w = true;
      p.t0 -= f.grow * 1000 * 0.25;   /* 浇水提前 25% 成熟 */
      S.addExp(1);
      return '浇了一瓢水，[' + f.n + ']提前四分之一时间开花。';
    },

    pick: function (i) {
      var g = S.get().d.garden, p = g.plots[i];
      if (!p) return '空地，没什么可收的。';
      var f = D.FLOWERS[p.k];
      if (Date.now() < p.t0 + f.grow * 1000) {
        return '还没开，再等 ' + left(p.t0 + f.grow * 1000 - Date.now()) + '。';
      }
      g.plots[i] = null;
      g.picks[p.k] = (g.picks[p.k] || 0) + 1;
      S.addGB(f.gain);
      var up = S.addExp(f.exp);
      var back = Math.random() < 0.3;
      if (back) g.seeds[p.k] = (g.seeds[p.k] || 0) + 1;
      return '收下[' + f.n + ']，卖了 G币' + f.gain + '，经验+' + f.exp
        + (back ? '，还留了个花种。' : '。')
        + (up ? ' 等级升到 ' + S.get().lv + ' 级！' : '');
    },

    buy: function (k) {
      var f = D.FLOWERS[k], g = S.get().d.garden;
      if (!f) return '没有这种花种。';
      if (!S.spendGB(f.cost)) return 'G币不足，还差 ' + (f.cost - S.get().gb) + '。';
      g.seeds[k] = (g.seeds[k] || 0) + 1;
      return '买了一个[' + f.n + ']花种，花掉 G币' + f.cost + '。';
    },

    steal: function () {
      var g = S.get().d.garden, t = Date.now();
      if (t - (g.stealAt || 0) < 60000) {
        return '刚偷完，人家还没反应过来呢，' + Math.ceil((60000 - (t - g.stealAt)) / 1000) + '秒后再去。';
      }
      var who = pick(D.MEMBERS)[1];
      var gain = 8 + rnd(22);
      g.stealAt = t;
      S.addGB(gain);
      S.addExp(3);
      return '你溜进[' + who + ']的花园，顺手掐了一朵花，卖了 G币' + gain + '。';
    }
  };

  /* ================= 阳光牧场 ================= */
  G.ranch = {

    plant: function (i, k) {
      var r = S.get().d.ranch, c = D.CROPS[k];
      if (!c) return '没有这种种子。';
      if (r.plots[i]) return '这块地还占着。';
      if (!r.seeds[k]) return '[' + c.n + ']种子不够。';
      r.seeds[k]--;
      r.plots[i] = { k: k, t0: Date.now() };
      S.addExp(2);
      return '播下[' + c.n + ']，' + c.grow + '秒后能收。';
    },

    pick: function (i) {
      var r = S.get().d.ranch, p = r.plots[i];
      if (!p) return '空地。';
      var c = D.CROPS[p.k];
      if (Date.now() < p.t0 + c.grow * 1000) {
        return '还没熟，再等 ' + left(p.t0 + c.grow * 1000 - Date.now()) + '。';
      }
      r.plots[i] = null;
      S.addGB(c.gain);
      var up = S.addExp(c.exp);
      return '收了[' + c.n + ']，卖得 G币' + c.gain + '，经验+' + c.exp +
        (up ? '，等级升到 ' + S.get().lv + ' 级！' : '。');
    },

    buy: function (k) {
      var c = D.CROPS[k], r = S.get().d.ranch;
      if (!c) return '没有这种种子。';
      if (!S.spendGB(c.cost)) return 'G币不足。';
      r.seeds[k] = (r.seeds[k] || 0) + 1;
      return '买了一包[' + c.n + ']种子，花掉 G币' + c.cost + '。';
    },

    steal: function () {
      var r = S.get().d.ranch, t = Date.now();
      if (t - (r.stealAt || 0) < 60000) {
        return '偷太勤了，' + Math.ceil((60000 - (t - r.stealAt)) / 1000) + '秒后再来。';
      }
      r.stealAt = t;
      var who = pick(D.MEMBERS)[1], gain = 10 + rnd(25);
      S.addGB(gain);
      S.addExp(3);
      return '你去[' + who + ']的地里转了一圈，抱走两颗菜，卖了 G币' + gain + '。';
    }
  };

  /* ================= 精武堂 ================= */
  G.kf = {

    train: function () {
      var k = S.get().d.kf, t = Date.now();
      if (t - (k.trainAt || 0) < 45000) {
        return '刚收完功，经脉还没缓过来（' + Math.ceil((45000 - (t - k.trainAt)) / 1000) + '秒）。';
      }
      k.trainAt = t;
      var gain = 10 + k.lv;
      k.exp += gain;
      while (k.exp >= 60 + k.lv * 20) {
        k.exp -= 60 + k.lv * 20;
        k.lv++;
        k.hp += 18; k.atk += 3; k.def += 2; k.qi += 10;
      }
      S.addExp(4);
      return '你在练功房打坐片刻，功力+经验' + gain + '，当前 ' + k.lv + ' 级。';
    },

    fight: function () {
      var s = S.get(), k = s.d.kf;

      if (s.energy < 5) return '体力不足 5 点，先歇会儿。';
      s.energy -= 5;

      var foe = {
        n: pick(D.FOES),
        hp: Math.round(k.hp * (0.7 + Math.random() * 0.7)),
        atk: Math.round(k.atk * (0.65 + Math.random() * 0.55)),
        def: Math.round(k.def * (0.65 + Math.random() * 0.55))
      };

      var L = [];
      L.push('【比武对象】');
      L.push(s.nick + ' VS. ' + foe.n);
      L.push('气血:' + k.hp + ' VS. ' + foe.hp);
      L.push('【现场直播】');
      L.push('(比武开始)体力-5,剩余体力:' + s.energy + '。');

      var my = k.hp, fo = foe.hp, round = 0;

      while (my > 0 && fo > 0 && round < 9) {
        round++;
        L.push('[回合' + round + ']');
        var sk = pick(D.SKILLS);
        var dmg = Math.max(8, Math.round(k.atk - foe.def * 0.5 + rnd(14) - 4));
        if (Math.random() < 0.22) {
          dmg = Math.round(dmg * 1.7);
          L.push('[' + s.nick + ']使用技能[' + sk + ']，【' + foe.n + '】被击中，气血-' + dmg + '(余' + Math.max(0, fo - dmg) + ')。');
        } else {
          L.push('[' + s.nick + ']使出一招[' + sk + ']，【' + foe.n + '】气血-' + dmg + '(余' + Math.max(0, fo - dmg) + ')。');
        }
        fo -= dmg;
        if (fo <= 0) break;

        var back = Math.max(5, Math.round(foe.atk - k.def * 0.5 + rnd(10) - 5));
        L.push('【' + foe.n + '】反击，[' + s.nick + ']气血-' + back + '(余' + Math.max(0, my - back) + ')。');
        my -= back;
      }

      if (fo <= 0 && my > 0) {
        var exp = 16 + rnd(14), gb = 30 + rnd(40), mat = Math.random() < 0.35 ? pick(D.MATS) : '';
        k.wins++;
        k.exp += exp;
        S.addGB(gb);
        S.addExp(8);
        L.push('(PK结束)我胜利!【' + s.nick + '】获得:经验x' + exp + ' 金币x' + gb + (mat ? ' ' + mat + 'x1' : '') + '。');
        while (k.exp >= 60 + k.lv * 20) { k.exp -= 60 + k.lv * 20; k.lv++; k.hp += 18; k.atk += 3; k.def += 2; }
      } else if (my <= 0 && fo > 0) {
        k.loses++;
        k.exp = Math.max(0, k.exp - 20);
        L.push('(PK结束)我输了。【' + s.nick + '】被送回客栈，损失经验20。');
      } else {
        k.wins++;
        S.addGB(12);
        L.push('(PK结束)未分胜负，双方收手，各得经验5。');
      }

      k.log = L.join('\n');
      return '比武结束，战报已记录。';
    }
  };

  QH.G = G;
})();
