# 🐷 RollPig-Plugin

TRSS-Yunzai 小猪插件，兼容 QQBot / icqq 等适配器。提供每日小猪、PigHub 随机小猪、配种、排行、烤群友、偷小猪、菜肴图鉴等功能。

原项目：[QingYingX-Bot/RollPig-Plugin](https://github.com/QingYingX-Bot/RollPig-Plugin)

## 📦 安装
```bash
cd Yunzai
```
```bash
git clone --depth=1 https://github.com/shiomon/RollPig-Plugin.git plugins/RollPig-Plugin
```

国内环境可使用镜像：

```bash
git clone --depth=1 https://ghfast.top/https://github.com/shiomon/RollPig-Plugin.git plugins/RollPig-Plugin
```

安装后重启 Yunzai，发送 `#小猪同步` 下载 PigHub 1000多图片资源，资源278M无必要可不同步。

## 📋 指令

所有指令支持 `#` 或 `/` 前缀，"猪猪"和"小猪"均可触发。

### 日常玩法

| 指令 | 说明 |
| --- | --- |
| `#今日小猪` | 抽取今天属于自己的小猪，自动记录收集（每人每日1次） |
| `#小猪排行` | 群聊用户收集种类排行Top50，含头像、昵称、进度条 |
| `#小猪图鉴` | 查看小猪图鉴与菜谱，含收集率、本命猪、共抓猪、拿手菜、共做菜 |
| `@群友#小猪配种`| 两只小猪的般配度（≥40%成功），成功则新小猪，失败可换群友再试 |
| `@群友#烤群友` | 用群友今日小猪（或图鉴随机）做成随机菜肴（26道菜，60%成功率,失败可换群友再试）|
| `@群友#偷猪` | 偷群友的小猪（30%成功率），成功存入自己图鉴；每人每日限1次（无论成败） |
| `#随机小猪 5`| 从本地缓存随机抽取，可指定数量（默认1，最大5），多张一次性发送 |
| `#找猪 安卓 `| 搜索本地缓存，单条直接发送，多条转发消息 |
| `#小猪同步` | 手动同步 PigHub图片资源到本地（仅Bot主人） |
| `#小猪帮助` |查看帮助图。 |
<img width="540" height="1021" alt="436554084719e85d188e6fa94f87cf56" src="https://github.com/user-attachments/assets/c413970e-ed3f-45e9-9ce1-00f405346ec6" />


## 🔘 按钮

每条回复底部附带 6 个按钮（分 2 行，每行 3 个）：

```
今日小猪 | 小猪图鉴 | 小猪排行
小猪配种 | 烤群友   | 偷猪
```

- 需要 @群友的按钮（小猪配种 / 烤群友 / 偷小猪）点击后进入输入态
- 非 QQBot 适配器自动替换为文字指令提示

## 📂 项目结构

```
RollPig-Plugin/
├── apps/todayPig.js        # 主逻辑（10个指令）
├── model/
│   ├── todayPig.js         # 每日选猪算法
│   ├── pighub.js           # PigHub 同步与缓存
│   ├── pigCollection.js    # 收集记录存储
│   └── dishes.js           # 26道菜肴数据
├── utils/helper.js         # 按钮 + 般配度算法
├── utils/html.js           # emoji字体 + XSS转义
├── view/
│   ├── breed.js            # 配种结果渲染
│   ├── cook.js             # 烤群友渲染
│   ├── help.js             # 小猪帮助图渲染
│   └── rank.js             # 排行渲染
└── resources/
    ├── local/              # 102只本地小猪（pig.json + image/ + card/ + dish/ + 模板）
    ├── fonts/              # emoji 字体（Noto Color Emoji woff2 + emoji.css）
    └── pighub/             # PigHub缓存（gitignore，需手动同步）
```

## 🖼️ 资源

| 目录 | 说明 |
| --- | --- |
| `resources/local/pig.json` | 102 只小猪数据 |
| `resources/local/image/` | 102 张原始小猪图片 |
| `resources/local/card/` | 102 张 800×800 成品卡片 |
| `resources/local/dish/` | 26 张菜肴图片 |
| `resources/local/pig-grid.html` | 猪圈/菜谱渲染模板（art-template） |
| `resources/local/rank.html` | 排行/配种/烤群友/帮助渲染模板 |
| `resources/fonts/` | emoji 字体（本地化，不依赖外网） |
| `resources/pighub/` | PigHub 缓存（`.gitignore`，`#小猪同步` 下载） |

## 💾 数据存储

纯本地 JSON 文件，不使用 Redis：

- `data/group/{群号}/users.json` — 每个群独立的用户收集记录
- `data/private/users.json` — 私聊用户收集记录

写入采用「临时文件 + 原子重命名」，数据文件损坏时拒绝写入，避免被空数据覆盖。

用户记录包含：收集图鉴、本命猪与抓猪次数、配种记录、菜肴收集与做菜次数、偷小猪日期等。180 天过期清理。

截图文件统一存储到 `temp/html/今日小猪/`，固定 saveId 覆盖不累积。

## 📖 来源

- [nonebot-plugin-rollpig](https://github.com/Bearlele/nonebot-plugin-rollpig) — 小猪数据与图片资源
- [astrbot_plugin_rollpig](https://github.com/MegSopern/astrbot_plugin_rollpig) — 每日固定结果与失败降级逻辑参考

## 📄 License

[MIT](LICENSE)
