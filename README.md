# RollPig-Plugin

TRSS-Yunzai 猪猪插件，提供每日猪猪和 PigHub 随机猪猪。

## 使用

```text
#今日猪猪
#每日猪猪
#随机猪猪
#猪猪图鉴
#我的猪圈
```

- `#今日猪猪`、`#每日猪猪`：从 `resources/local` 选择每日稳定结果。
- `#随机猪猪`：从本地 PigHub 缓存中随机选择，首次启动缺失时自动后台同步。
- `#猪猪图鉴`：查看 `resources/local` 的完整 102 猪图鉴。
- `#我的猪圈`：查看个人已拥有猪猪、收集率、遇见总次数和每只猪猪的获得次数。

每日猪猪每天首次触发时记录一次收集。每日与随机猪猪使用表情包展示尺寸，图鉴与猪圈使用普通图片展示。

## 特点

- 102 种本地猪猪资源
- PigHub 图片首次启动自动同步到本地
- 群聊、私聊通用
- 本地稳定映射
- Redis 猪圈收集记录
- 完整图鉴使用预生成图片
- 个人猪圈使用 Yunzai 现有 Puppeteer 动态生成
- 零新增依赖

## 资源

- `resources/local/pig.json`：102 只每日猪猪的数据。
- `resources/local/card/`：102 张提前生成的 800×800 成品卡片。
- `resources/local/image/`：102 张图鉴与猪圈使用的原始猪猪图片。
- `resources/local/atlas.png`：提前生成的 2 倍分辨率完整猪猪图鉴。
- `resources/local/pig-grid.html`：个人猪圈动态图片模板。
- `resources/pighub/images.json`：自动同步生成的 PigHub `sort=1` 独立索引。
- `resources/pighub/image/`：自动同步生成的 PigHub 本地原始图片，使用 `ID.真实扩展名` 保存。

`resources/local` 对应 `#今日猪猪`、`#每日猪猪`，`resources/pighub` 对应 `#随机猪猪`。`resources/pighub` 是本地缓存目录，已加入 `.gitignore`，缺失时启动后自动同步。

PigHub 部分资源的原文件名扩展名与实际内容格式不同，`images.json` 使用 `filename` 保留原名，使用 `local_file` 指向按真实格式保存的本地文件。

启动时会检查 `resources/local/atlas.png`，存在则跳过，缺失则自动生成。更新 `resources/local/pig.json` 或 `resources/local/image/` 后，强制重新生成静态图鉴：

```bash
node plugins/RollPig-Plugin/apps/generateAtlas.js --force
```

## 来源

- [nonebot-plugin-rollpig](https://github.com/Bearlele/nonebot-plugin-rollpig)：猪猪数据与图片资源
- [astrbot_plugin_rollpig](https://github.com/MegSopern/astrbot_plugin_rollpig)：每日固定结果与失败降级逻辑参考

项目遵循 [MIT License](LICENSE)，保留原项目版权信息。
