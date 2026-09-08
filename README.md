# RollPig-Plugin

TRSS-Yunzai 猪猪插件，提供每日猪猪、PigHub 随机猪猪、配种、排行、菜肴等功能。

## 使用

```text
#今日猪猪
#随机猪猪
#找猪 关键词
#猪猪图鉴
#我的猪圈
#小猪配种 @某人
#小猪排行
#小猪菜肴 @群友
```

所有指令均支持 `#` 前缀或无前缀触发。

### 指令说明

| 指令 | 说明 |
| --- | --- |
| `#今日猪猪` / `#今日小猪` / `#每日猪猪` | 基于 sha256(date:userId) 哈希取模的每日稳定猪猪，表情包发送，自动记录收集 |
| `#随机猪猪` / `#随机小猪` [数量] | 从 PigHub 本地缓存随机抽取，表情包发送，可指定数量 |
| `#找猪` / `#搜猪` 关键词 | 搜索 PigHub 本地缓存，单条直接发送，多条转发消息 |
| `#猪猪图鉴` / `#小猪图鉴` | 发送预生成的 102 猪完整图鉴 `atlas.png` |
| `#我的猪圈` | Puppeteer 动态渲染个人猪圈，含收集率、遇见次数、每只猪获得次数 |
| `#小猪配种` @某人 | 计算两只猪猪的般配度，双方互相收录对方今日猪，每人每日限 1 次 |
| `#小猪排行` | 用户收集种类排行 Top50，含头像、昵称、进度条 |
| `#小猪菜肴` [@群友] | 用今日猪猪（自己或指定群友的）做随机菜肴，附猪猪点评 |

### 按钮

每条猪猪消息底部附带 5 个按钮（分 2 行），点击直接触发对应指令：
- 今日猪猪 / 随机猪猪 / 猪猪图鉴
- 我的猪圈 / 小猪排行

## 特点

- 102 种本地猪猪资源，sha256 哈希选猪稳定可复现
- PigHub 图片首次启动自动同步到本地，6 路并发增量更新，离线可用
- 群聊、私聊通用
- 本地 JSON 存储收集记录，内存缓冲 + debounce 1 秒落盘
- 完整图鉴使用预生成图片，个人猪圈使用 Puppeteer 动态生成
- 配种般配度算法 + 每日 1 次限制
- 用户排行 Top50，含头像与进度条
- 30 道随机菜肴 + 猪猪点评
- 表情包发送（`asface:true`），图鉴与猪圈使用普通图片
- 零新增依赖

## 资源

- `resources/local/pig.json`：102 只每日猪猪的数据。
- `resources/local/card/`：102 张提前生成的 800×800 成品卡片。
- `resources/local/image/`：102 张图鉴与猪圈使用的原始猪猪图片。
- `resources/local/atlas.png`：提前生成的 2 倍分辨率完整猪猪图鉴。
- `resources/local/pig-grid.html`：个人猪圈动态图片模板（art-template）。
- `resources/local/collection.html`：图鉴渲染模板。
- `resources/local/rank.html`：排行渲染模板。
- `resources/pighub/images.json`：自动同步生成的 PigHub `sort=1` 独立索引。
- `resources/pighub/image/`：自动同步生成的 PigHub 本地原始图片，使用 `ID.真实扩展名` 保存。

`resources/local` 对应 `#今日猪猪`，`resources/pighub` 对应 `#随机猪猪` / `#找猪`。`resources/pighub` 是本地缓存目录，已加入 `.gitignore`，缺失时启动后自动同步。

PigHub 部分资源的原文件名扩展名与实际内容格式不同，`images.json` 使用 `filename` 保留原名，使用 `local_file` 指向按真实格式保存的本地文件。

启动时会检查 `resources/local/atlas.png`，存在则跳过，缺失则自动生成。更新 `resources/local/pig.json` 或 `resources/local/image/` 后，强制重新生成静态图鉴：

```bash
node plugins/rollpig-plugin/apps/generateAtlas.js --force
```

## 数据存储

不使用 Redis，纯本地 JSON 文件：

- `data/group/users.json`：群聊用户收集记录
- `data/private/users.json`：私聊用户收集记录

内存缓冲 + debounce 1 秒落盘 + beforeExit 兜底，避免频繁 IO。

## 来源

- [nonebot-plugin-rollpig](https://github.com/Bearlele/nonebot-plugin-rollpig)：猪猪数据与图片资源
- [astrbot_plugin_rollpig](https://github.com/MegSopern/astrbot_plugin_rollpig)：每日固定结果与失败降级逻辑参考

项目遵循 [MIT License](LICENSE)，保留原项目版权信息。
