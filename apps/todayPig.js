import { randomUUID } from "node:crypto"

import path from "node:path"
import { pathToFileURL } from "node:url"

import plugin from "../../../lib/plugins/plugin.js"
import common from "../../../lib/common/common.js"
import puppeteer from "../../../lib/puppeteer/puppeteer.js"
import {
  ensurePigHubSynced,
  findPigHubImage,
  getPigHubStore,
  isPigHubReady,
  selectRandomPigHubImage,
} from "../model/pighub.js"
import {
  initStorage,
  getUserRecords,
  recordDailyPig,
  getPigCollection,
  getTodayPigId,

  recordBreed,
  getBreedCount,
  summarizePigCollection,
} from "../model/pigCollection.js"
import {
  LOCAL_RESOURCE_DIR,
  IMAGE_DIR,
  findPigCard,
  findPigImage,
  getPigPool,
  getShanghaiDate,
  selectTodayPig,
} from "../model/todayPig.js"

import { PIG_DISHES } from "../model/dishes.js"
import { getButtons, calcCompatibility, getMatchDesc, normalizeCollected } from "../utils/helper.js"

import { generateRankHTML } from "../view/rank.js"

const PIG_GRID_TEMPLATE = path.join(LOCAL_RESOURCE_DIR, "pig-grid.html")

const RANK_TEMPLATE = path.join(LOCAL_RESOURCE_DIR, "rank.html")
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
        { reg: "^[#/]?(今日猪猪|今日小猪|每日猪猪)$", fnc: "todayPig" },
        { reg: "^[#/]?(随机猪猪|随机小猪)\\s*(\\d+)?$", fnc: "randomPig" },
        { reg: "^[#/]?(找猪|搜猪)\\s+(.+)$", fnc: "findPig" },

        { reg: "^[#/]?我的猪圈$", fnc: "myPigpen" },
        { reg: "^[#/]?(猪猪|小猪)配种$", fnc: "pigBreed" },
        { reg: "^[#/]?(猪猪|小猪)排行$", fnc: "pigRank" },
        { reg: "^[#/]?(猪猪|小猪)菜肴$", fnc: "pigCook" },
      ],
    })
  }

  async init() {
    initStorage()

    syncPigHubInBackground()
  }

  async todayPig(e) {
    try {
      const date = getShanghaiDate()
      const userId = e.user_id
      const pigPool = getPigPool()

      const existingPigId = getTodayPigId(e, userId, date)
      if (existingPigId) {
        const pig = pigPool.find(p => p.id === existingPigId)
        if (pig) {
          const cardFile = findPigCard(pig.id)
          const msg = ["今天已经抽过了哦~\n"]
          if (cardFile) msg.push(makeStickerImage(cardFile))
          else msg.push(`\n【${pig.name}】\n${pig.description}\n\n${pig.analysis}`)
          msg.push(getButtons())
          await e.reply(msg)
          return true
        }
      }

      const pig = selectTodayPig(userId, date, pigPool)
      const cardFile = findPigCard(pig.id)
      if (!cardFile) throw new Error(`猪猪成品图缺失：${pig.id}`)

      const result = recordDailyPig(e, userId, date, pig.id)
      if (!result.claimed) {
        logger.warn(`[RollPig-Plugin] 今日猪猪记录失败：已领取`)
      }

      await e.reply([makeStickerImage(cardFile), getButtons()])
      return true
    } catch (error) {
      logger.error(`[RollPig-Plugin] 今日猪猪生成失败：${error.message}`, error)
      await e.reply(`今日猪猪生成失败：${error.message}`)
      return true
    }
  }

  async randomPig(e) {
    try {
      if (!isPigHubReady()) {
        syncPigHubInBackground()
        await e.reply("PigHub 猪猪资源正在同步，完成后再试")
        return true
      }

      const match = e.msg.match(/^[#/]?(随机猪猪|随机小猪)\s*(\d+)?$/)
      let count = match?.[2] ? parseInt(match[2]) : 1
      count = Math.min(Math.max(count, 1), 20)

      if (count === 1) {
        const pig = selectRandomPigHubImage()
        const imageFile = findPigHubImage(pig.local_file)
        if (!imageFile) throw new Error(`PigHub 图片缺失：${pig.local_file}`)
        await e.reply([makeStickerImage(imageFile), getButtons()])
      } else {
        const store = getPigHubStore()
        const selected = []
        const available = [...store.images]
        for (let i = 0; i < Math.min(count, available.length); i++) {
          const idx = Math.floor(Math.random() * available.length)
          selected.push(available.splice(idx, 1)[0])
        }
        const msgs = selected.map(pig => {
          const imageFile = findPigHubImage(pig.local_file)
          return {
            message: [pig.title, segment.image(imageFile ? pathToFileURL(imageFile).href : pig.url)],
            nickname: pig.title,
            user_id: e.self_id,
          }
        })
        await e.reply([await common.makeForwardMsg(e, msgs), getButtons()])
      }
      return true
    } catch (error) {
      logger.error(`[RollPig-Plugin] 随机猪猪失败：${error.message}`, error)
      await e.reply(`随机猪猪失败：${error.message}`)
      return true
    }
  }

  async findPig(e) {
    try {
      if (!isPigHubReady()) {
        syncPigHubInBackground()
        await e.reply("PigHub 猪猪资源正在同步，完成后再试")
        return true
      }

      const match = e.msg.match(/^[#/]?(找猪|搜猪)\s+(.+)$/)
      const keyword = match[2].trim().toLowerCase()
      const store = getPigHubStore()
      const found = store.images.filter(pig => pig.title.toLowerCase().includes(keyword))

      if (!found.length) {
        await e.reply("你要找的猪仔离家出走了~")
        return true
      }

      if (found.length === 1) {
        const pig = found[0]
        const imageFile = findPigHubImage(pig.local_file)
        const img = imageFile ? segment.image(pathToFileURL(imageFile).href) : segment.image(pig.url)
        await e.reply([`${pig.title}-${pig.id}`, img, getButtons()])
      } else {
        const msgs = found.slice(0, 20).map(pig => {
          const imageFile = findPigHubImage(pig.local_file)
          return {
            message: [`${pig.title}-${pig.id}`, segment.image(imageFile ? pathToFileURL(imageFile).href : pig.url)],
            nickname: pig.title,
            user_id: e.self_id,
          }
        })
        await e.reply([await common.makeForwardMsg(e, msgs), getButtons()])
      }
      return true
    } catch (error) {
      logger.error(`[RollPig-Plugin] 找猪失败：${error.message}`, error)
      await e.reply("找猪失败了...")
      return true
    }
  }


  async myPigpen(e) {
    try {
      const pigs = getPigPool()
      const counts = getPigCollection(e, e.user_id)
      const summary = summarizePigCollection(pigs, counts)

      const items = pigs.map(pig => {
        const image = findPigImage(pig.id)
        return { ...pig, image: image ? pathToFileURL(image).href : "", owned: (counts[pig.id] || 0) > 0, count: counts[pig.id] || 0 }
      })

      const saveId = randomUUID()
      const image = await puppeteer.screenshot(PIGPEN_RENDER_NAME, {
        tplFile: PIG_GRID_TEMPLATE,
        saveId,
        imgType: "png",
        title: "我的猪圈",
        owner: `${getUserName(e)}的猪圈`,
        showStats: true,
        renderScale: 2,
        ownedCount: summary.ownedCount,
        total: pigs.length,
        rate: summary.rate,
        totalCount: summary.totalCount,
        favorite: summary.favorite,
        pigs: items,
      })

      if (!image) throw new Error("猪圈图片渲染失败")
      await e.reply([image, getButtons()])
      return true
    } catch (error) {
      logger.error(`[RollPig-Plugin] 我的猪圈失败：${error.message}`, error)
      await e.reply(`我的猪圈失败：${error.message}`)
      return true
    }
  }

  async pigBreed(e) {
    try {
      const date = getShanghaiDate()
      const myId = String(e.user_id)
      const userRecords = getUserRecords(e)

      let targetId = e.at
      if (!targetId) {
        await e.reply("请@一位群友进行小猪配种~\n用法：#小猪配种 @某人")
        return true
      }
      targetId = targetId.toString()

      if (targetId === myId) {
        await e.reply("不能和自己配种哦~找别的群友试试吧！")
        return true
      }

      const myPigId = getTodayPigId(e, myId, date)
      const targetPigId = getTodayPigId(e, targetId, date)

      if (!myPigId) {
        await e.reply("你今天还没有抽取猪猪哦~快发「今日猪猪」抽取后再配种吧！")
        return true
      }
      if (!targetPigId) {
        await e.reply("对方今天还没有抽取猪猪哦~让TA发「今日猪猪」抽取后再配种吧！")
        return true
      }

      const pigPool = getPigPool()
      const myPig = pigPool.find(p => p.id === myPigId)
      const targetPig = pigPool.find(p => p.id === targetPigId)
      if (!myPig || !targetPig) {
        await e.reply("小猪数据异常，请重新抽取今日猪猪~")
        return true
      }

      const score = calcCompatibility(myPig.id, targetPig.id, date)
      const desc = getMatchDesc(score)

      const breedKey = `breed:${[myId, targetId].sort().join(":")}:${date}`
      const breedCount = getBreedCount(e, myId, breedKey)
      if (breedCount >= 1) {
        await e.reply(["今天已经配种过了哦~", getButtons()])
        return true
      }

      const breedPig = pigPool[Math.floor(Math.random() * pigPool.length)]
      recordBreed(e, [myId, targetId], breedPig.id, breedKey)

      const myImage = findPigImage(myPig.id)
      const targetImage = findPigImage(targetPig.id)
      const breedImage = findPigImage(breedPig.id)

      const msg = ["小猪配种结果\n"]
      if (myImage) msg.push(segment.image(pathToFileURL(myImage).href))
      msg.push(`【${myPig.name}】×`)
      if (targetImage) msg.push(segment.image(pathToFileURL(targetImage).href))
      msg.push(`【${targetPig.name}】\n\n般配度：${score}/100\n${desc}\n\n`)
      msg.push("配种诞生了新小猪！\n")
      if (breedImage) msg.push(segment.image(pathToFileURL(breedImage).href))
      msg.push(`\n【${breedPig.name}】\n${breedPig.description}\n\n${breedPig.analysis}\n\n双方图鉴已收录此小猪！`)

      await e.reply([...msg, getButtons()])
      return true
    } catch (error) {
      logger.error(`[RollPig-Plugin] 小猪配种失败：${error.message}`, error)
      await e.reply("配种失败了...")
      return true
    }
  }

  async pigRank(e) {
    if (!e.group_id) {
      await e.reply("小猪排行仅在群聊中可用~")
      return true
    }

    try {
      const userRecords = getUserRecords(e)
      const userIds = Object.keys(userRecords)
      if (userIds.length === 0) {
        await e.reply("还没有排行数据哦~快发「今日猪猪」开始收集吧！")
        return true
      }

      const total = getPigPool().length
      const userCounts = userIds.map(uid => {
        const record = userRecords[uid]
        return { userId: uid, count: Object.keys(record?.collected || {}).length }
      }).filter(u => u.count > 0).sort((a, b) => b.count - a.count)

      const top = userCounts.slice(0, 50)

      for (const u of top) {
        let userName = "未知用户"
        let userAvatar = ""
        try {
          const member = e.bot?.pickMember?.(e.group_id, Number(u.userId))
          if (member) {
            const info = await member.getInfo?.()
            if (info?.nickname) userName = info.nickname
            if (info?.avatar) userAvatar = info.avatar
          }
        } catch (_) {}
        if (!userAvatar) userAvatar = `https://q1.qlogo.cn/g?b=qq&nk=${u.userId}&s=100`
        u.userName = userName
        u.userAvatar = userAvatar
        u.isCurrent = String(u.userId) === String(e.user_id)
      }

      try {
        const html = generateRankHTML(top, total)
        const img = await puppeteer.screenshot("rollpig-rank", {
          tplFile: RANK_TEMPLATE,
          html,
          imgType: "png",
          saveId: String(e.group_id),
        })
        if (img) {
          await e.reply([img, getButtons()])
        } else {
          throw new Error("截图返回空")
        }
      } catch (renderErr) {
        logger.error("[RollPig-Plugin] 排行渲染失败:", renderErr)
        const rankList = top.map((u, i) =>
          `第${i + 1}名：${u.userName}（${u.count}/${total}）${u.isCurrent ? " ← 你" : ""}`
        )
        await e.reply([`小猪图鉴排行 Top50\n\n${rankList.join("\n")}`, getButtons()])
      }
      return true
    } catch (error) {
      logger.error(`[RollPig-Plugin] 小猪排行失败：${error.message}`, error)
      await e.reply("获取排行失败了...")
      return true
    }
  }

  async pigCook(e) {
    try {
      const date = getShanghaiDate()
      const myId = String(e.user_id)
      const userRecords = getUserRecords(e)

      let targetId = e.at ? e.at.toString() : myId
      const isTargetingOther = targetId !== myId

      const targetRecord = normalizeCollected(userRecords[targetId] || {})
      let targetName = "你"
      if (isTargetingOther) {
        try {
          const member = e.bot?.pickMember?.(e.group_id, Number(targetId))
          const info = await member?.getInfo?.()
          targetName = info?.nickname || "群友"
        } catch {
          targetName = "群友"
        }
      }

      const pigPool = getPigPool()
      let pig = null
      let source = ""

      if (targetRecord.date === date) {
        pig = pigPool.find(p => p.id === targetRecord.pig_id)
        source = "今日猪猪"
      }

      if (!pig) {
        const collectedIds = Object.keys(targetRecord.collected)
        if (collectedIds.length > 0) {
          const randomId = collectedIds[Math.floor(Math.random() * collectedIds.length)]
          pig = pigPool.find(p => p.id === randomId)
          source = "小猪图鉴"
        }
      }

      if (!pig) {
        if (isTargetingOther) {
          await e.reply("对方还没有今日猪猪，图鉴也是空的~\n请让TA发「今日猪猪」后再使用「小猪菜肴」做成菜肴")
        } else {
          await e.reply("你还没有今日猪猪，图鉴也是空的~\n请先发「今日猪猪」后再使用「小猪菜肴」做成菜肴")
        }
        return true
      }

      const dish = PIG_DISHES[Math.floor(Math.random() * PIG_DISHES.length)]
      const imagePath = findPigImage(pig.id)

      const msg = []
      if (imagePath) msg.push(segment.image(pathToFileURL(imagePath).href))

      let text = `\n小猪菜肴\n\n`
      if (source === "今日猪猪") {
        text += `用${targetName}的今日小猪【${pig.name}】做成【${dish.name}】！\n`
      } else {
        text += `${targetName}今天没有「今日猪猪」，从小猪图鉴获取【${pig.name}】做成【${dish.name}】！\n`
      }
      text += `\n${dish.desc}\n${pig.description}\n\n真香！\n\n评语：${dish.review}`
      msg.push(text)

      await e.reply([...msg, getButtons()])
      return true
    } catch (error) {
      logger.error(`[RollPig-Plugin] 小猪菜肴失败：${error.message}`, error)
      await e.reply("做菜失败了...")
      return true
    }
  }
}
