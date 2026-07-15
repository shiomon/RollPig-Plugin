import { randomUUID } from "node:crypto"
import { rm } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"

import plugin from "../../../lib/plugins/plugin.js"
import puppeteer from "../../../lib/puppeteer/puppeteer.js"
import {
  ensurePigHubSynced,
  findPigHubImage,
  isPigHubReady,
  selectRandomPigHubImage,
} from "../model/pighub.js"
import { getPigCollection, recordDailyPig, summarizePigCollection } from "../model/pigCollection.js"
import {
  LOCAL_RESOURCE_DIR,
  findPigCard,
  findPigImage,
  getPigPool,
  getShanghaiDate,
  selectTodayPig,
} from "../model/todayPig.js"
import { ensureAtlas } from "./generateAtlas.js"

const PIG_GRID_TEMPLATE = path.join(LOCAL_RESOURCE_DIR, "pig-grid.html")
const PIG_ATLAS_FILE = path.join(LOCAL_RESOURCE_DIR, "atlas.png")
const PIGPEN_RENDER_NAME = "rollpig-pigpen"

function makeStickerImage(file) {
  return {
    ...segment.image(pathToFileURL(file).href),
    asface: true,
    sub_type: 1,
    summary: "[动画表情]",
  }
}

function getUserName(event) {
  return (
    event.sender?.card ||
    event.sender?.nickname ||
    event.nickname ||
    String(event.user_id || "用户")
  )
}

function buildPigGridItems(items) {
  return items.map(pig => {
    const image = findPigImage(pig.id)
    if (!image) throw new Error(`猪猪原图缺失：${pig.id}`)
    return { ...pig, image: pathToFileURL(image).href, owned: pig.count > 0 }
  })
}

async function renderPigpen(data) {
  const saveId = randomUUID()
  const tempHtml = path.join(process.cwd(), "temp/html", PIGPEN_RENDER_NAME, `${saveId}.html`)
  try {
    return await puppeteer.screenshot(PIGPEN_RENDER_NAME, {
      tplFile: PIG_GRID_TEMPLATE,
      saveId,
      imgType: "png",
      ...data,
    })
  } finally {
    await rm(tempHtml, { force: true }).catch(error => {
      logger.warn(`[RollPig-Plugin] 清理猪圈临时 HTML 失败：${error.message}`)
    })
  }
}

function syncPigHubInBackground() {
  if (isPigHubReady()) return
  logger.info("[RollPig-Plugin] PigHub 资源缺失，开始后台同步")
  ensurePigHubSynced()
    .then(store => logger.info(`[RollPig-Plugin] PigHub 资源同步完成：${store.count} 个`))
    .catch(error => logger.error(`[RollPig-Plugin] PigHub 资源同步失败：${error.message}`, error))
}

export class TodayPig extends plugin {
  constructor() {
    super({
      name: "今日猪猪",
      dsc: "抽取每天属于自己的猪猪",
      event: "message",
      priority: 5000,
      rule: [
        { reg: "^#(今日|每日)猪猪$", fnc: "todayPig" },
        { reg: "^#随机猪猪$", fnc: "randomPig" },
        { reg: "^#猪猪图鉴$", fnc: "pigAtlas" },
        { reg: "^#我的猪圈$", fnc: "myPigpen" },
      ],
    })
  }

  async init() {
    await ensureAtlas()
      .then(file => logger.info(`[RollPig-Plugin] 静态猪猪图鉴已就绪：${file}`))
      .catch(error => logger.error(`[RollPig-Plugin] 静态猪猪图鉴生成失败：${error.message}`, error))
    syncPigHubInBackground()
  }

  async todayPig() {
    try {
      const date = getShanghaiDate()
      const pig = selectTodayPig(this.e.user_id, date, getPigPool())
      const cardFile = findPigCard(pig.id)
      if (!cardFile) throw new Error(`猪猪成品图缺失：${pig.id}`)

      await recordDailyPig(redis, this.e.user_id, date, pig.id).catch(error => {
        logger.warn(`[RollPig-Plugin] 今日猪猪收集记录失败：${error.message}`)
      })

      await this.reply(makeStickerImage(cardFile))
      return true
    } catch (error) {
      logger.error(`[RollPig-Plugin] 今日猪猪生成失败：${error.message}`, error)
      await this.reply(`今日猪猪生成失败：${error.message}`)
      return true
    }
  }

  async randomPig() {
    try {
      if (!isPigHubReady()) {
        syncPigHubInBackground()
        await this.reply("PigHub 猪猪资源正在同步，完成后再试")
        return true
      }

      const pig = selectRandomPigHubImage()
      const imageFile = findPigHubImage(pig.local_file)
      if (!imageFile) throw new Error(`PigHub 图片缺失：${pig.local_file}`)

      await this.reply(makeStickerImage(imageFile))
      return true
    } catch (error) {
      logger.error(`[RollPig-Plugin] 随机猪猪发送失败：${error.message}`, error)
      await this.reply(`随机猪猪发送失败：${error.message}`)
      return true
    }
  }

  async pigAtlas() {
    try {
      await this.reply(segment.image(pathToFileURL(PIG_ATLAS_FILE).href))
      return true
    } catch (error) {
      logger.error(`[RollPig-Plugin] 猪猪图鉴发送失败：${error.message}`, error)
      await this.reply(`猪猪图鉴发送失败：${error.message}`)
      return true
    }
  }

  async myPigpen() {
    try {
      const pigs = getPigPool()
      const counts = await getPigCollection(redis, this.e.user_id)
      const summary = summarizePigCollection(pigs, counts)
      const image = await renderPigpen({
        title: "我的猪圈",
        owner: `${getUserName(this.e)}的猪圈`,
        showStats: true,
        renderScale: 2,
        ownedCount: summary.ownedCount,
        total: pigs.length,
        rate: summary.rate,
        totalCount: summary.totalCount,
        favorite: summary.favorite,
        pigs: buildPigGridItems(summary.items),
      })
      if (!image) throw new Error("猪圈图片渲染失败")

      await this.reply(image)
      return true
    } catch (error) {
      logger.error(`[RollPig-Plugin] 我的猪圈生成失败：${error.message}`, error)
      await this.reply(`我的猪圈生成失败：${error.message}`)
      return true
    }
  }
}
