# 🐷 RollPig-Plugin

TRSS-Yunzai 小猪插件，兼容 QQBot / icqq 等适配器。提供每日小猪、PigHub 随机小猪、配种、排行、菜肴等功能。

原项目：[QingYingX-Bot/RollPig-Plugin](https://github.com/QingYingX-Bot/RollPig-Plugin)

## 📦 安装

```bash
cd Yunzai
git clone --depth=1 https://github.com/shiomon/RollPig-Plugin.git plugins/RollPig-Plugin
```

国内环境可使用镜像：

```bash
cd Yunzai
git clone --depth=1 https://ghfast.top/https://github.com/shiomon/RollPig-Plugin.git plugins/RollPig-Plugin
```

安装后重启 Yunzai，发送 `#小猪同步` 下载 PigHub 图片资源。

## 📋 指令

所有指令支持 `#` 或 `/` 前缀，"猪猪"和"小猪"均可触发。

| 指令 | 说明 |
| --- | --- |
| `#今日小猪` | 基于 sha256(date:userId) 的每日稳定小猪，表情包发送，自动记录收集 |
| `#随机小猪` [数量] | 从 PigHub 本地缓存随机抽取，可指定数量（默认1，最大5），多张一次性发送 |
| `#找猪` 关键词 | 搜索 PigHub 本地缓存，单条直接发送，多条转发消息 |
| `#我的猪圈` | Puppeteer 动态渲染个人猪圈，含收集率、遇见次数、本命猪，未解锁灰色显示 |
| `#小猪配种` [@群友] | 计算两只小猪的般配度（≥40%成功），双方互收录对方今日猪，每人每日限1次 |
| `#小猪排行` | 群聊用户收集种类排行 Top50，含头像、昵称、进度条 |
| `#小猪菜肴` [@群友] | 用今日小猪做随机菜肴（30道菜），附小猪点评 |
| `#小猪同步` | 手动同步 PigHub 图片资源到本地 |

## 🔘 按钮

每条回复底部附带 5 个按钮（分 2 行），点击填入输入框后发送：

```
今日小猪 | 小猪做菜 | 小猪排行
我的猪圈 | 小猪配种
```

按钮在 icqq 等非 QQBot 适配器下自动忽略，不影响功能。

## ✨ 特点

- 102 种本地小猪资源，sha256 哈希选猪稳定可复现
- PigHub 图片手动同步（`#小猪同步`），6 路并发容错下载，离线可用
- 群聊、私聊通用，数据独立存储互不互通
- 本地 JSON 存储（内存缓冲 + debounce 1 秒落盘 + beforeExit 兜底），不使用 Redis
- 个人猪圈 Puppeteer 动态生成，未解锁灰色显示
- 配种般配度哈希算法 + 每日1次限制 + 双方共享图鉴
- 群排行 Top50 含头像与进度条
- 30 道随机菜肴 + 小猪点评
- 表情包发送（`asface:true`），猪圈与排行使用普通图片
- 零新增依赖，仅用 Node.js 内置模块和 Yunzai 内置库
- Google Fonts 加载 `Noto Color Emoji` 显示 emoji

## 📂 项目结构

```
RollPig-Plugin/
├── apps/todayPig.js        # 主逻辑（8个指令）
├── model/
│   ├── todayPig.js         # 每日选猪算法
│   ├── pighub.js           # PigHub 同步与缓存
│   ├── pigCollection.js    # 收集记录存储
│   └── dishes.js           # 30道菜肴数据
├── utils/helper.js         # 按钮 + 般配度算法
├── view/
│   ├── breed.js            # 配种结果渲染
│   └── rank.js             # 排行渲染
└── resources/
    ├── local/              # 102只本地小猪（pig.json + image/ + card/ + 模板）
    └── pighub/             # PigHub缓存（gitignore，需手动同步）
```

## 🖼️ 资源

| 目录 | 说明 |
| --- | --- |
| `resources/local/pig.json` | 102 只小猪数据 |
| `resources/local/image/` | 102 张原始小猪图片 |
| `resources/local/card/` | 102 张 800×800 成品卡片 |
| `resources/local/pig-grid.html` | 猪圈渲染模板（art-template） |
| `resources/local/rank.html` | 排行渲染模板 |
| `resources/pighub/` | PigHub 缓存（`.gitignore`，`#小猪同步` 下载） |

## 💾 数据存储

纯本地 JSON 文件，不使用 Redis：

- `data/group/{群号}/users.json` — 每个群独立的用户收集记录
- `data/private/users.json` — 私聊用户收集记录

内存缓冲 + debounce 1 秒落盘 + beforeExit 兜底。

## 📖 来源

- [nonebot-plugin-rollpig](https://github.com/Bearlele/nonebot-plugin-rollpig) — 小猪数据与图片资源
- [astrbot_plugin_rollpig](https://github.com/MegSopern/astrbot_plugin_rollpig) — 每日固定结果与失败降级逻辑参考

## 📄 License

[MIT](LICENSE)
