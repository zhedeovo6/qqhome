# QQ家园 · 像素复刻

复刻 2008—2015 年腾讯 **3GQQ 手机家园**（wap.qq.com）的 WAP 社区。
宋体 12px、直角 1px 边框、点分导航、极速模式，全部按当年实机页面还原，
配色取自 3GQQ 家园社区样式表原值（`#004299 / #4c95e7 / #9FC6EC / #FFF9B7 / #E3EEF8`）。

**在线玩：https://zhedeovo6.github.io/qqhome/**

> 纯静态、无依赖、无构建，`index.html` 双击就能玩。存档存在浏览器 localStorage。

## 能玩什么

| 页面 | 玩法 |
| --- | --- |
| 首页 | 每日签到、打工赚 G币、体力/经验、方块进度条 |
| 魔法花园 | 6 块花圃，种花/浇水/收花/偷花，花谱收集 |
| 阳光牧场 | 种菜收菜偷菜，60 秒—7 分钟成熟 |
| 精武堂 | 修炼、找人比武，输出完整文字战报（回合制模拟） |
| 家园论坛 | 4 个版块，预置 2009 风格老帖，发帖回帖计 G币 |
| 我的家族 | 家族签到、捐献、贡献值升级 |
| 我的 | 资料、清档重来 |

页脚有 **极速模式** 开关（隐藏全部图片图标），对应当年不显示图片省流量的用法。

## 部署

任意静态托管都能跑，上传整个目录即可。

**GitHub Pages（本仓库已配好）**

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
│   ├── store.js          localStorage 存档 + 时间推进 + 迁移
│   ├── games.js          花园/牧场/精武堂逻辑
│   ├── bbs.js            论坛与家族
│   └── app.js            路由与页面渲染
├── share/                og.png 分享卡 / cover.png 抖音封面 / demo.mp4 演示视频
└── tools/                og、封面源文件与录屏脚本（playwright）
```

## 本地开发

改完刷新即可。数据表（花种、作物、对手、帖子）集中在 `js/data.js`，
平衡数值改那一个文件就行。

录演示视频（需要本机 Edge + playwright）：

```bash
NODE_PATH="$(npm root -g)/@playwright/cli/node_modules" node tools/record.js
ffmpeg -i tools/vid/*.webm -vf "crop=324:576:0:0,scale=720:1280:flags=lanczos,setsar=1" \
       -c:v libx264 -crf 20 -pix_fmt yuv420p -movflags +faststart share/demo.mp4
```

## 版权说明

「QQ家园」名称及相关商标归腾讯公司所有。本项目是个人怀旧性质的粉丝复刻，
不含任何腾讯代码与素材，界面为独立实现，仅作学习交流。
