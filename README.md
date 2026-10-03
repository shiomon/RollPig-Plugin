# 🐷 RollPig-Plugin

TRSS-Yunzai 小猪插件，兼容 QQBot / icqq 等适配器。提供每日小猪、PigHub 随机小猪、配种、排行、烤群友、偷小猪、菜肴图鉴等功能。

原项目：[QingYingX-Bot/RollPig-Plugin](https://github.com/QingYingX-Bot/RollPig-Plugin)

## 📦 安装
cd Yunzai
```bash
git clone --depth=1 https://github.com/shiomon/RollPig-Plugin.git plugins/RollPig-Plugin
```

国内环境可使用镜像：

```bash
git clone --depth=1 https://ghfast.top/https://github.com/shiomon/RollPig-Plugin.git plugins/RollPig-Plugin
```

安装后重启 Yunzai，发送 `#小猪同步` 下载 PigHub 图片资源。

## 📋 指令

所有指令支持 `#` 或 `/` 前缀，"猪猪"和"小猪"均可触发。

### 日常玩法

| 指令 | 说明 |
| --- | --- |
| `#今日小猪` | 抽取今天属于自己的小猪，自动记录收集（每人每日 1 次） |
| `#小猪配种` [@群友] | 计算两只小猪的般配度（≥40% 成功），成功可诞生新小猪；**每天成功 1 次**（失败不消耗次数，可换群友再试）；与同一群友每天限 1 次；无 @ 时自动从群成员随机选 |
| `#小猪排行` | 群聊用户收集种类排行 Top50，含头像、昵称、进度条 |
| `#猪圈和菜` | 查看小猪图鉴与菜谱，含收集率、本命猪、共抓猪、拿手菜、共做菜，未解锁灰色显示（别名 `#我的猪圈`） |
| `#烤群友` [@群友] | 用群友今日小猪（或图鉴随机）做成随机菜肴（26 道菜，60% 成功率），附小猪点评；**成功才计次**（失败可重试） |
| `#偷小猪` [@群友] | 偷群友的小猪（30% 成功率），成功存入自己图鉴；每人每日限 1 次（无论成败） |

### 小猪工具

| 指令 | 说明 |
| --- | --- |
| `#随机小猪` [数量] | 从本地缓存随机抽取，可指定数量（默认 1，最大 5），多张一次性发送 |
| `#找猪` 关键词 | 搜索本地缓存，单条直接发送，多条转发消息 |
| `#小猪同步` | 手动同步 PigHub 图片资源到本地（仅 Bot 主人） |

其他：`#小猪帮助` 查看帮助图。

## 🔘 按钮

每条回复底部附带 6 个按钮（分 2 行，每行 3 个）：

```
今日小猪 | 猪圈和菜 | 小猪排行
小猪配种 | 烤群友   | 偷小猪
```

- 需要 @群友的按钮（小猪配种 / 烤群友 / 偷小猪）点击后进入输入态
- 按钮在 icqq 等非 QQBot 适配器下自动忽略，不影响功能

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
├── view/
│   ├── breed.js            # 配种结果渲染
│   ├── cook.js             # 烤群友渲染
│   ├── help.js             # 小猪帮助图渲染
│   └── rank.js             # 排行渲染
└── resources/
    ├── local/              # 102只本地小猪（pig.json + image/ + card/ + dish/ + 模板）
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