# RollPig-Plugin

TRSS-Yunzai 猪猪插件，提供每日猪猪、PigHub 随机猪猪、配种、排行、菜肴等功能。

## 安装

```bash
cd Yunzai
# 方式一：
git clone --depth=1 https://github.com/shiomon/RollPig-Plugin.git plugins/rollpig-plugin

# 方式二：国内环境
git clone --depth=1 https://ghfast.top/https://github.com/shiomon/RollPig-Plugin.git plugins/rollpig-plugin
```

安装后重启 Yunzai 即可，首次启动自动同步 PigHub 图片资源到本地。

## 使用

```text
#今日猪猪
#随机猪猪
#找猪 关键词
#我的猪圈
#猪猪配种 @某人
#猪猪排行
#猪猪菜肴 @群友
```

所有指令均支持 `#` 前缀或 `/` 前缀，且"猪猪"和"小猪"均可触发（如 `#猪猪配种`/`#小猪配种`/`/猪猪配种` 均可）。

### 指令说明

| 指令 | 说明 |
| --- | --- |
| `#今日猪猪` / `#今日小猪` / `#每日猪猪` | 基于 sha256(date:userId) 哈希取模的每日稳定猪猪，表情包发送，自动记录收集 |
| `#随机猪猪` / `#随机小猪` [数量] | 从 PigHub 本地缓存随机抽取，表情包发送，可指定数量（默认1，最大20） |
| `#找猪` / `#搜猪` 关键词 | 搜索 PigHub 本地缓存，单条直接发送，多条转发消息 |
| `#我的猪圈` | Puppeteer 动态渲染个人猪圈，含收集率、遇见次数、每只猪获得次数，未解锁灰色显示 |
| `#猪猪配种` @某人 | 计算两只猪猪的般配度，双方互相收录对方今日猪，每人每日限 1 次 |
| `#猪猪排行` | 群聊用户收集种类排行 Top50，含头像、昵称、进度条 |
| `#猪猪菜肴` [@群友] | 用今日猪猪（自己或指定群友的）做随机菜肴，附猪猪点评 |

### 按钮
官机QQBot用
每条猪猪消息底部附带 5 个按钮（分 2 行），点击直接触发对应指令：

```
今日猪猪 | 猪猪菜肴 | 猪猪排行
我的猪圈 | 猪猪配种
```

## 特点

- 102 种本地猪猪资源，sha256 哈希选猪稳定可复现
- PigHub 图片首次启动自动同步到本地，6 路并发增量更新，离线可用
- 群聊、私聊通用
- 本地 JSON 存储收集记录，内存缓冲 + debounce 1 秒落盘
- 个人猪圈使用 Puppeteer 动态生成，未解锁猪猪灰色显示
- 配种般配度算法 + 每日 1 次限制
- 用户排行 Top50，含头像与进度条
- 30 道随机菜肴 + 猪猪点评
- 表情包发送（`asface:true`），猪圈与排行使用普通图片
- 零新增依赖

## 资源

- `resources/local/pig.json`：102 只每日猪猪的数据。
- `resources/local/card/`：102 张提前生成的 800×800 成品卡片。
- `resources/local/image/`：102 张猪圈使用的原始猪猪图片。
- `resources/local/pig-grid.html`：个人猪圈动态图片模板（art-template）。
- `resources/local/rank.html`：排行渲染模板。
- `resources/pighub/images.json`：自动同步生成的 PigHub `sort=1` 独立索引。
- `resources/pighub/image/`：自动同步生成的 PigHub 本地原始图片，使用 `ID.真实扩展名` 保存。

`resources/local` 对应 `#今日猪猪`，`resources/pighub` 对应 `#随机猪猪` / `#找猪`。`resources/pighub` 是本地缓存目录，已加入 `.gitignore`，缺失时启动后自动同步。

PigHub 部分资源的原文件名扩展名与实际内容格式不同，`images.json` 使用 `filename` 保留原名，使用 `local_file` 指向按真实格式保存的本地文件。

## 数据存储

不使用 Redis，纯本地 JSON 文件：

- `data/group/users.json`：群聊用户收集记录
- `data/private/users.json`：私聊用户收集记录

内存缓冲 + debounce 1 秒落盘 + beforeExit 兜底，避免频繁 IO。

## 更新日志

### 2026-09-08

- 合并 `#猪猪图鉴` 到 `#我的猪圈`，删除预生成 `atlas.png` 和 `generateAtlas.js`
- 指令支持 `猪猪`/`小猪` 双名词前缀（如 `#猪猪配种`/`#小猪配种` 均可）
- 按钮文字统一 `猪猪` 前缀，排列：今日猪猪/猪猪菜肴/猪猪排行 + 我的猪圈/猪猪配种
- `pigCook` 获取真实昵称而非硬编码"群友"
- `pigRank` 成员信息获取改为并行 `Promise.all`
- `rank.js` 用户名/头像 URL 加 HTML 转义防注入
- `pigCollection.js` 防御性初始化 `record.collected`
- 删除死代码：`view/collection.js`、`collection.html`、`normalizeCollected`、旧数据迁移
- Redis 改为本地 JSON + debounce 1 秒落盘
- 新增 `#猪猪菜肴` 指令（30 道菜 + 猪猪点评）
- 新增 `#猪猪排行` 指令（Top50 头像+进度条）
- 新增 `#猪猪配种` 指令（般配度+双方共享图鉴+每日1次）
- 新增 `#找猪`/`#搜猪` 指令（PigHub 搜索）

## 来源

- [nonebot-plugin-rollpig](https://github.com/Bearlele/nonebot-plugin-rollpig)：猪猪数据与图片资源
- [astrbot_plugin_rollpig](https://github.com/MegSopern/astrbot_plugin_rollpig)：每日固定结果与失败降级逻辑参考

项目遵循 [MIT License](LICENSE)，保留原项目版权信息。
