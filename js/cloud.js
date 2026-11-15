/* 云层：排行榜 / 跨服偷菜 / 云论坛 / 云存档
   设计原则是"尽力而为"——任何一步失败都静默降级到本地，绝不阻塞玩法。
   所以断网、CDN 被墙、接口挂了，页面照样能打开、花园照样能种。 */

(function () {
  'use strict';

  var QH = window.QH, S = QH.S;
  var CFG = window.QH_CLOUD || null;

  var client = null;
  var status = 'init';        // init 未连 / on 已连 / off 连不上
  var lastErr = '';

  function sdkReady() {
    return !!(window.WorkBuddyCloud && CFG && CFG.endpoint && CFG.publishableKey);
  }

  function connect() {
    if (client) return client;
    if (!sdkReady()) {
      status = 'off';
      lastErr = '云服务脚本没加载上';
      return null;
    }
    try {
      client = window.WorkBuddyCloud.createWorkBuddyCloud({
        endpoint: CFG.endpoint,
        oauthRelayBaseUrl: CFG.oauthRelayBaseUrl,
        publishableKey: CFG.publishableKey
      });
      /* 注意：这里不置 'on'。SDK 造出来不代表服务器认你，
         要等第一次真实请求成功（syncOk）才算在线。 */
      status = 'init';
    } catch (e) {
      client = null;
      status = 'off';
      lastErr = (e && e.message) || '初始化失败';
    }
    return client;
  }

  function db() {
    var c = connect();
    return c ? c.database : null;
  }

  function fail(kind, e) {
    lastErr = (e && (e.message || e.hint || e.code)) || kind;
    throw e || new Error(kind);
  }

  /* ---------------- 身份：本机存档码 ---------------- */

  function key() {
    var s = S.get();
    if (!s.key) {
      s.key = 'qk' + Math.random().toString(36).slice(2, 10) +
        Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
      S.save();
    }
    return s.key;
  }

  /* ---------------- 工具 ---------------- */

  function ts(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ---------------- 帖子缓存（离线也能看，不进存档，避免存档膨胀） ---------------- */

  var FEED_KEY = 'qqhome_feed_v1';
  var feed = null;

  function readFeed() {
    if (feed) return feed;
    try {
      feed = JSON.parse(window.localStorage.getItem(FEED_KEY) || 'null') || { posts: [], t: 0 };
    } catch (e) { feed = { posts: [], t: 0 }; }
    return feed;
  }

  function writeFeed(posts) {
    feed = { posts: posts, t: Date.now() };
    try { window.localStorage.setItem(FEED_KEY, JSON.stringify(feed)); } catch (e) {}
  }

  /* ---------------- 存档同步 ---------------- */

  var timer = null, inflight = false, dirty = false, syncedAt = 0;

  function schedulePush(delay) {
    dirty = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () { pushSave(); }, delay == null ? 8000 : delay);
  }

  /* 存档里剔除体积大且可重建的字段 */
  function savePayload() {
    var s = S.get();
    return {
      nick: s.nick, lv: s.lv, exp: s.exp, gb: s.gb, energy: s.energy,
      energyAt: s.energyAt, regAt: s.regAt, onlineAt: s.onlineAt,
      signAt: s.signAt, workAt: s.workAt, speed: s.speed, flow: s.flow,
      key: s.key,
      d: s.d
    };
  }

  function pushSave() {
    var d = db();
    if (!d || inflight) return Promise.resolve(false);
    inflight = true;
    var k = key();
    var row = { nickname: S.get().nick, data: savePayload(), updated_at: new Date().toISOString() };

    return d.from('qh_save')
      .update(row).eq('device_key', k).select()
      .then(function (r) {
        if (r.error) throw r.error;
        if (r.data && r.data.length) return true;
        return d.from('qh_save').insert({ device_key: k, nickname: row.nickname, data: row.data, updated_at: row.updated_at })
          .then(function (i) {
            if (i.error && i.error.code !== '23505') throw i.error;
            return true;
          });
      })
      .then(function (ok) {
        syncOk();
        return ok;
      })
      .catch(function (e) {
        syncFail(e);
        return false;
      })
      .then(function (ok) {
        inflight = false;
        return ok;
      });
  }

  function syncOk() {
    dirty = false;
    syncedAt = Date.now();
    lastErr = '';
    if (status !== 'on') { status = 'on'; notify(); }
  }

  function syncFail(e) {
    lastErr = (e && (e.message || e.code)) || '同步失败';
    if (status !== 'off') { status = 'off'; notify(); }
  }

  function pullSave() {
    var d = db();
    if (!d) return Promise.resolve(null);
    return d.from('qh_save').select('data,updated_at').eq('device_key', key()).maybeSingle()
      .then(function (r) {
        if (r.error) throw r.error;
        return r.data ? r.data.data : null;
      })
      .catch(function (e) { syncFail(e); return null; });
  }

  /* 用存档码在另一台设备上接着玩 */
  function pullSaveByKey(k) {
    var d = db();
    if (!d) return Promise.reject(new Error('云服务未连接'));
    k = (k || '').trim();
    if (!/^qk[a-z0-9]{16,60}$/i.test(k)) return Promise.reject(new Error('存档码格式不对'));
    return d.from('qh_save').select('data,nickname,updated_at').eq('device_key', k).maybeSingle()
      .then(function (r) {
        if (r.error) throw r.error;
        if (!r.data) throw new Error('没找到这个存档码对应的存档');
        syncOk();
        var data = r.data.data || {};
        data.key = k;
        return data;
      })
      .catch(function (e) { syncFail(e); throw e; });
  }

  /* ---------------- 排行榜 ---------------- */

  function submitRank() {
    var d = db();
    if (!d) return Promise.resolve(false);
    var s = S.get(), k = s.d.kf;
    var flowers = 0, harvest = 0;
    Object.keys(s.d.garden.picks || {}).forEach(function (x) { flowers += s.d.garden.picks[x]; });
    Object.keys(s.d.ranch.picks || {}).forEach(function (x) { harvest += s.d.ranch.picks[x]; });

    var row = {
      nickname: s.nick, lv: s.lv, gold: s.gb,
      wins: k.wins || 0, loses: k.loses || 0,
      flowers: flowers, harvest: harvest,
      updated_at: new Date().toISOString()
    };
    var kid = key();

    return d.from('qh_rank').update(row).eq('device_key', kid).select()
      .then(function (r) {
        if (r.error) throw r.error;
        if (r.data && r.data.length) return true;
        return d.from('qh_rank').insert({ device_key: kid, nickname: row.nickname, lv: row.lv, gold: row.gold, wins: row.wins, loses: row.loses, flowers: row.flowers, harvest: row.harvest })
          .then(function (i) {
            if (i.error && i.error.code !== '23505') throw i.error;
            return true;
          });
      })
      .catch(function (e) { syncFail(e); return false; });
  }

  function loadRank(type) {
    var d = db();
    if (!d) return Promise.reject(new Error('云服务未连接'));
    var col = type === 'wins' ? 'wins' : (type === 'flowers' ? 'flowers' : 'lv');
    return d.from('qh_rank')
      .select('id,nickname,lv,wins,loses,gold,flowers,harvest,updated_at')
      .order(col, { ascending: false }).limit(30)
      .then(function (r) {
        if (r.error) throw r.error;
        syncOk();
        return r.data || [];
      })
      .catch(function (e) { syncFail(e); throw e; });
  }

  /* ---------------- 跨服偷菜 ---------------- */

  function targets(n) {
    var d = db();
    if (!d) return Promise.reject(new Error('云服务未连接'));
    return d.from('qh_rank')
      .select('id,nickname,lv,flowers,harvest')
      .neq('device_key', key())
      .order('updated_at', { ascending: false })
      .limit(40)
      .then(function (r) {
        if (r.error) throw r.error;
        syncOk();
        return shuffle(r.data || []).slice(0, n || 4);
      })
      .catch(function (e) { syncFail(e); throw e; });
  }

  function steal(targetId, item) {
    var d = db();
    if (!d) return Promise.reject(new Error('云服务未连接'));
    return d.from('qh_steal')
      .insert({ target_id: targetId, from_name: S.get().nick, item: item })
      .then(function (r) {
        if (r.error) throw r.error;
        syncOk();
        return true;
      })
      .catch(function (e) { syncFail(e); throw e; });
  }

  function mySteals() {
    var d = db();
    if (!d) return Promise.reject(new Error('云服务未连接'));
    var selfId = 0;
    return d.from('qh_rank').select('id').eq('device_key', key()).maybeSingle()
      .then(function (r) {
        if (r.error) throw r.error;
        if (!r.data) return [];
        selfId = r.data.id;
        return d.from('qh_steal')
          .select('from_name,item,created_at')
          .eq('target_id', selfId)
          .order('created_at', { ascending: false })
          .limit(12)
          .then(function (x) {
            if (x.error) throw x.error;
            syncOk();
            return x.data || [];
          });
      })
      .catch(function (e) { syncFail(e); throw e; });
  }

  /* ---------------- 云论坛 ---------------- */

  function mapPost(p) {
    var n = 0;
    if (p.qh_reply && p.qh_reply.length) n = p.qh_reply[0].count || 0;
    return {
      id: p.id, board: p.board, title: p.title, body: p.body,
      nick: p.author, t: ts(p.created_at), views: p.views || 0, rep: n
    };
  }

  function fetchPosts(board) {
    var d = db();
    if (!d) return Promise.reject(new Error('云服务未连接'));
    var q = d.from('qh_post')
      .select('id,board,title,body,author,views,created_at,qh_reply(count)')
      .order('created_at', { ascending: false })
      .limit(50);
    if (board && board !== '全部') q = q.eq('board', board);

    return q.then(function (r) {
      if (r.error) throw r.error;
      syncOk();
      var list = (r.data || []).map(mapPost);
      if (!board || board === '全部') writeFeed(list);
      return list;
    }).catch(function (e) { syncFail(e); throw e; });
  }

  function cachedPosts() {
    return readFeed().posts || [];
  }

  function fetchPost(id) {
    var d = db();
    if (!d) return Promise.reject(new Error('云服务未连接'));
    return d.from('qh_post').select('*').eq('id', id).maybeSingle()
      .then(function (r) {
        if (r.error) throw r.error;
        if (!r.data) return null;
        var p = r.data;
        return d.from('qh_reply').select('author,body,created_at')
          .eq('post_id', id).order('created_at', { ascending: true }).limit(200)
          .then(function (x) {
            if (x.error) throw x.error;
            syncOk();
            return {
              id: p.id, board: p.board, title: p.title, body: p.body,
              nick: p.author, t: ts(p.created_at), views: p.views || 0,
              rep: (x.data || []).map(function (y) {
                return { nick: y.author, body: y.body, t: ts(y.created_at) };
              })
            };
          });
      })
      .catch(function (e) { syncFail(e); throw e; });
  }

  function addPost(board, title, body) {
    var d = db();
    if (!d) return Promise.reject(new Error('云服务未连接'));
    return d.from('qh_post')
      .insert({ board: board || '家园广场', title: title, body: body, author: S.get().nick })
      .select()
      .then(function (r) {
        if (r.error) throw r.error;
        syncOk();
        return (r.data && r.data[0]) || null;
      })
      .catch(function (e) { syncFail(e); throw e; });
  }

  function addReply(postId, body) {
    var d = db();
    if (!d) return Promise.reject(new Error('云服务未连接'));
    return d.from('qh_reply')
      .insert({ post_id: postId, author: S.get().nick, body: body })
      .then(function (r) {
        if (r.error) throw r.error;
        syncOk();
        return true;
      })
      .catch(function (e) { syncFail(e); throw e; });
  }

  function markSeen(id, cur) {
    var d = db();
    if (!d) return Promise.resolve(false);
    return d.from('qh_post').update({ views: (cur || 0) + 1 }).eq('id', id)
      .then(function () { return true; }).catch(function () { return false; });
  }

  /* ---------------- 启动 ---------------- */

  var readyCb = null;

  function notify() {
    if (readyCb) { try { readyCb(); } catch (e) {} }
  }

  function boot(retry) {
    retry = retry || 0;
    if (!connect()) {
      /* SDK 可能还在路上（CDN 备线是动态插入的），重试几次再说 */
      if (retry < 5) setTimeout(function () { boot(retry + 1); }, 800);
      return;
    }
    key();

    var first = S.isFirstRun();
    (first ? pullSave().then(function (saved) {
      if (saved) { S.adopt(saved); syncOk(); }
    }) : Promise.resolve())
      .then(function () { return submitRank(); })
      /* 必须等帖子真的落到本地缓存，再通知界面重画，否则先画出来的是空列表 */
      .then(function () { return fetchPosts('全部').catch(function () {}); })
      .then(function () { notify(); });
  }

  QH.C = {
    boot: function () { boot(); },
    onReady: function (fn) { readyCb = fn; },
    status: function () { return status; },
    error: function () { return lastErr; },
    syncedAt: function () { return syncedAt; },
    key: key,

    pushSave: pushSave,
    touchSave: function () { if (status !== 'off') schedulePush(); },
    pullSave: pullSave,
    pullSaveByKey: pullSaveByKey,
    submitRank: submitRank,

    loadRank: loadRank,
    targets: targets,
    steal: steal,
    mySteals: mySteals,

    fetchPosts: fetchPosts,
    cachedPosts: cachedPosts,
    fetchPost: fetchPost,
    addPost: addPost,
    addReply: addReply,
    markSeen: markSeen,

    ts: ts
  };

  /* app.js 是先执行的同步脚本，它会把 onCloudReady 挂到 QH 上；
     cloud.js 是 defer，加载到这里时正好接得上，连完重画一次界面。 */
  if (QH.onCloudReady) readyCb = QH.onCloudReady;
  boot();
})();
