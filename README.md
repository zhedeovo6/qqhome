# QQ家园 · 像素复刻

复刻 2008—2015 年腾讯 **3GQQ 手机家园**（wap.qq.com）的 WAP 社区。
宋体 12px、直角 1px 边框、点分导航、极速模式，全部按当年实机页面还原，
配色取自 3GQQ 家园社区样式表原值（`#004299 / #4c95e7 / #9FC6EC / #FFF9B7 / #E3EEF8`）。

**在线玩（全功能，带云端社区）：https://wbapp-pinyljbkapt2d3t8d9a8df.app.workbuddy.host/?sharecode=MJJACWNKR6**

> github.io 上的 [静态版](https://zhedeovo6.github.io/qqhome/) 是单机备份，只有本机存档，没有排行榜和跨服偷菜。
> 云端社区是 WorkBuddy 托管后端 + PostgreSQL，免登录，点开就玩。

## 能玩什么

| 页面 | 玩法 |
| --- | --- |
| 首页 | 每日签到、打工赚 G币、体力/经验、方块进度条 |
| 魔法花园 | 6 块花圃，种花/浇水/收花，花谱收集 |
| 阳光牧场 | 种菜收菜，60 秒—7 分钟成熟 |
| 精武堂 | 修炼、找人比武，输出完整文字战报（回合制模拟） |
| **全服排行** | 等级榜 / 比武榜 / 收花榜，每 15 秒刷新，自动上报 |
| **跨服偷菜** | 从榜单里随机摸进真人玩家的园子偷一朵，对方上线能在「我的」里看到你的名字 |
| 家园论坛 | **云端论坛**：4 个版块全服共享，发帖回帖人人可见，预置 2009 风格老帖 |
| 我的家族 | 家族签到、捐献、贡献值升级 |
| 我的 | 改名、存档码、云同步状态、清档重来 |

页脚有 **极速模式** 开关（隐藏全部图片图标），对应当年不显示图片省流量的用法。

## 云端架构

前端是纯静态；后端用 WorkBuddy 托管云服务（PostgreSQL + REST），
SDK 从 CDN 加载，**断网、CDN 挂了、接口超时都会静默降级成单机玩法**，不弹错误不白屏。

| 表 | 用途 | 权限 |
| --- | --- | --- |
| `qh_rank` | 排行榜 + 偷菜邻居池（NPC 老成员也在里面） | 公开读 / 写，无删除 |
| `qh_steal` | 偷菜流水（谁在何时偷走了谁的什么） | 公开读 / 写 |
| `qh_save` | 云存档（按存档码索引，8 秒防抖自动上报） | 公开读 / 写 |
| `qh_post` / `qh_reply` | 云论坛帖子 / 回帖 | 公开读 / 写，无删除 |

**身份模型**：不用注册登录。首次访问生成 40 位随机存档码（`qk…`）存 localStorage，
云存档、榜单、偷菜记录都挂在它上面。换手机时在「我的」页输入旧存档码即可续档。
代价是存档码等于账号密码，别发给别人；榜单数据在技术上可被篡改，图一乐。

部署到别处时改 `js/cloud-config.js`（服务端校验 Origin，非授权域名调不通接口，
会自动走单机模式）。

## 部署

**GitHub Pages（本仓库已配好，单机版）**

```bash
# Settings → Pages → Source: Deploy from a branch → main / (root)
```

**Cloudflare Pages**

```
构建命令：留空    输出目录：/（仓库根目录）
```

**nginx**

```nginx
server {
    listen 80;
    server_name your.domain.com;
    root /var/www/qqhome;
    index index.html;
}
```

## 目录结构

```
qqhome/
├── index.html            入口（含 SEO / OG 分享 meta）
├── favicon.svg           像素花图标
├── icon-180/192/512.png  PWA / 桌面图标
├── manifest.webmanifest  添加到主屏
├── css/wap.css           全部样式（WAP 复刻规范写在文件头注释）
├── js/
│   ├── data.js           花种/作物/对手/预置帖/像素点阵图标
│   ├── store.js          存档层（localStorage + 迁移 + 云回灌）
│   ├── cloud-config.js   云服务接入参数（publicConfig）
│   ├── cloud.js          云层：榜单/偷菜/云论坛/云存档，全接口降级
│   ├── games.js          花园/牧场/精武堂逻辑
│   ├── bbs.js            云论坛与家族
│   └── app.js            路由与页面渲染
├── share/                og.png 分享卡 / cover.png 抖音封面 / demo.mp4 演示视频 / 文案
├── CHANGELOG.md          改动记录
└── tools/                封面源文件、录屏与验证脚本（playwright）
```

## 本地开发

改完刷新即可。数值表集中在 `js/data.js`，平衡改那一个文件就行。

录演示视频（需要本机 Edge + playwright）：

```bash
NODE_PATH="$(npm root -g)/@playwright/cli/node_modules" node tools/record.js
ffmpeg -i tools/vid/*.webm -vf "crop=324:576:0:0,scale=720:1280:flags=lanczos,setsar=1" \
       -c:v libx264 -crf 20 -pix_fmt yuv420p -movflags +faststart share/demo.mp4
```

## 版权说明

「QQ家园」名称及相关商标归腾讯公司所有。本项目是个人怀旧性质的粉丝复刻，
不含任何腾讯代码与素材，界面为独立实现，仅作学习交流。
