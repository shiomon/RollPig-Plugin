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
import { getButtons, calcCompatibility, getMatchDesc } from "../utils/helper.js"

import { generateRankHTML } from "../view/rank.js"
import { generateBreedHTML } from "../view/breed.js"

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

async function getMemberName(e, userId) {
  try {
    const member = e.bot?.pickMember?.(e.group_id, userId)
    if (!member) return null
    if (member.card) return member.card
    if (member.nickname) return member.nickname
    const memberInfo = await member.getGroupMemberInfo?.()
    if (memberInfo?.nickname) return memberInfo.nickname
    if (memberInfo?.user_name) return memberInfo.user_name
    const info = await member.getInfo?.()
    return info?.nickname || info?.card || info?.user_name || null
  } catch {
    return null
  }
}

function getMemberAvatar(e, userId) {
  try {
    const member = e.bot?.pickMember?.(e.group_id, userId)
    if (!member) return null
    if (typeof member.getAvatarUrl === "function") return member.getAvatarUrl()
    if (member.avatar) return member.avatar
    return null
  } catch {
    return null
  }
}


export class TodayPig extends plugin {
  constructor() {
    super({
      name: "今日小猪",
      dsc: "抽取每天属于自己的小猪",
      event: "message",
      priority: 5000,
      rule: [
        { reg: "^[#/]?(今日猪猪|今日小猪|每日猪猪)$", fnc: "todayPig" },
        { reg: "^[#/]?(随机猪猪|随机小猪)\\s*(\\d+)?$", fnc: "randomPig" },
        { reg: "^[#/]?(找猪|搜猪)\\s+(.+)$", fnc: "findPig" },

        { reg: "^[#/]?我的猪圈$", fnc: "myPigpen" },
        { reg: "^[#/]?(猪猪|小猪)配种$", fnc: "pigBreed" },
        { reg: "^[#/]?(猪猪|小猪)排行$", fnc: "pigRank" },
        { reg: "^[#/]?(猪猪|小猪)(做菜|菜肴)$", fnc: "pigCook" },
        { reg: "^[#/]?(猪猪|小猪)同步$", fnc: "pigSync" },
      ],
    })
  }

  async init() {
    initStorage()
  }

  async pigSync(e) {
    try {
      if (isPigHubReady()) {
        const store = getPigHubStore()
        await e.reply([`PigHub 资源已就绪：${store.count} 个小猪\n如需重新同步，请先删除 resources/pighub 目录`, getButtons()])
        return true
      }

      await e.reply("开始同步 PigHub 小猪资源，请稍等...")
      const store = await ensurePigHubSynced()
      const failed = store._failed || 0
      const failMsg = failed > 0 ? `\n${failed} 张下载失败已跳过` : ""
      await e.reply([`PigHub 同步完成：${store.count} 个小猪${failMsg}\n现在可以使用「/随机小猪」和「/找猪」了~`, getButtons()])
      return true
    } catch (error) {
      logger.error(`[RollPig-Plugin] PigHub 同步失败：${error.message}`, error)
      await e.reply("PigHub 同步失败了...")
      return true
    }
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
          const imagePath = findPigImage(pig.id)
          const msg = ["今天已经抽过了~\n"]
          if (imagePath) msg.push(segment.image(pathToFileURL(imagePath).href))
          msg.push(`\n【${pig.name}】\n${pig.description}\n\n${pig.analysis}\n`, getButtons())
          await e.reply(msg)
          return true
        }
      }

      const pig = selectTodayPig(userId, date, pigPool)

      const result = recordDailyPig(e, userId, date, pig.id)
      if (!result.claimed) {
        logger.warn(`[RollPig-Plugin] 今日小猪记录失败：已领取`)
      }

      const prefix = result.count === 1 ? "🎉 抓到一只新小猪啦~\n" : `🎉 第${result.count}次抽到这只小猪~\n`
      const imagePath = findPigImage(pig.id)
      const msg = [prefix]
      if (imagePath) msg.push(segment.image(pathToFileURL(imagePath).href))
      msg.push(`\n【${pig.name}】\n${pig.description}\n\n${pig.analysis}\n`, getButtons())
      await e.reply(msg)
      return true
    } catch (error) {
      logger.error(`[RollPig-Plugin] 今日小猪生成失败：${error.message}`, error)
      await e.reply("今日小猪生成失败了...")
      return true
    }
  }

  async randomPig(e) {
    try {
      if (!isPigHubReady()) {
        await e.reply("PigHub 小猪资源未同步\n请先发送「#小猪同步」下载资源")
        return true
      }

      const match = e.msg.match(/^[#/]?(随机猪猪|随机小猪)\s*(\d+)?$/)
      let count = match?.[2] ? parseInt(match[2]) : 1
      count = Math.min(Math.max(count, 1), 5)

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
        const arr = []
        for (const pig of selected) {
          const imageFile = findPigHubImage(pig.local_file)
          arr.push(`【${pig.title}】`)
          arr.push(segment.image(imageFile ? pathToFileURL(imageFile).href : pig.url))
        }
        arr.push(getButtons())
        await e.reply(arr)
      }
      return true
    } catch (error) {
      logger.error(`[RollPig-Plugin] 随机小猪失败：${error.message}`, error)
      await e.reply("随机小猪失败了...")
      return true
    }
  }

  async findPig(e) {
    try {
      if (!isPigHubReady()) {
        await e.reply("PigHub 小猪资源未同步\n请先发送「#小猪同步」下载资源")
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
        title: "🐷 我的猪圈",
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
      await e.reply("我的猪圈渲染失败了...")
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
        await e.reply("请@一位群友进行小猪配种~\n用法：/小猪配种@某人")
        return true
      }
      targetId = targetId.toString()

      if (targetId === myId) {
        await e.reply("不能和自己配种哦~找别的群友试试吧！")
        return true
      }

      const pigPool = getPigPool()

      function resolvePig(userId) {
        const todayPigId = getTodayPigId(e, userId, date)
        if (todayPigId) {
          const pig = pigPool.find(p => p.id === todayPigId)
          if (pig) return pig
        }
        const record = userRecords[userId] || {}
        const collectedIds = Object.keys(record.collected || {})
        if (collectedIds.length > 0) {
          const randomId = collectedIds[Math.floor(Math.random() * collectedIds.length)]
          const pig = pigPool.find(p => p.id === randomId)
          if (pig) return pig
        }
        return null
      }

      const myPig = resolvePig(myId)
      if (!myPig) {
        await e.reply("你还没有抽取小猪哦~快发「/今日小猪」抽取后再配种吧！")
        return true
      }
      const targetPig = resolvePig(targetId)
      if (!targetPig) {
        await e.reply("对方还没有抽取小猪哦~让TA发「/今日小猪」抽取后再配种吧！")
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

      const success = score >= 40
      let breedPig = null
      if (success) {
        breedPig = pigPool[Math.floor(Math.random() * pigPool.length)]
      }
      recordBreed(e, [myId, targetId], breedPig ? breedPig.id : null, breedKey)

      const myImage = findPigImage(myPig.id)
      const targetImage = findPigImage(targetPig.id)
      const breedImage = breedPig ? findPigImage(breedPig.id) : null

      try {
        const html = generateBreedHTML({
          myImage: myImage ? pathToFileURL(myImage).href : "",
          myName: myPig.name,
          targetImage: targetImage ? pathToFileURL(targetImage).href : "",
          targetName: targetPig.name,
          score,
          desc,
          success,
          breedImage: breedImage ? pathToFileURL(breedImage).href : "",
          breedName: breedPig ? breedPig.name : "",
          breedDescription: breedPig ? breedPig.description : "",
          breedAnalysis: breedPig ? breedPig.analysis : "",
        })
        const img = await puppeteer.screenshot("rollpig-breed", {
          tplFile: RANK_TEMPLATE,
          html,
          imgType: "png",
          saveId: randomUUID(),
        })
        if (!img) throw new Error("截图返回空")
        await e.reply([img, getButtons()])
      } catch (renderErr) {
        logger.error("[RollPig-Plugin] 配种渲染失败:", renderErr)
        const msg = ["小猪配种结果\n"]
        if (myImage) msg.push(segment.image(pathToFileURL(myImage).href))
        msg.push(`【${myPig.name}】×`)
        if (targetImage) msg.push(segment.image(pathToFileURL(targetImage).href))
        msg.push(`【${targetPig.name}】\n\n般配度：${score}%\n${desc}\n\n`)
        if (success) {
          msg.push("配种诞生了新小猪！\n")
          if (breedImage) msg.push(segment.image(pathToFileURL(breedImage).href))
          msg.push(`\n【${breedPig.name}】\n${breedPig.description}\n\n${breedPig.analysis}\n\n双方图鉴已收录此小猪！`)
        } else {
          msg.push("配种失败...般配度太低，没有诞生小猪。")
        }
        await e.reply([...msg, getButtons()])
      }
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
        await e.reply("还没有排行数据哦~快发「/今日小猪」开始收集吧！")
        return true
      }

      const total = getPigPool().length
      const userCounts = userIds.map(uid => {
        const record = userRecords[uid]
        return { userId: uid, count: Object.keys(record?.collected || {}).length }
      }).filter(u => u.count > 0).sort((a, b) => b.count - a.count)

      const top = userCounts.slice(0, 50)

      await Promise.all(top.map(u => (async () => {
        let userName = await getMemberName(e, u.userId) || `用户${u.userId.slice(-4)}`
        let userAvatar = getMemberAvatar(e, u.userId) || `https://q1.qlogo.cn/g?b=qq&nk=${u.userId}&s=100`
        u.userName = userName
        u.userAvatar = userAvatar
        u.isCurrent = String(u.userId) === String(e.user_id)
      })()))

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

      const targetRecord = userRecords[targetId] || {}
      const targetCollected = targetRecord.collected || {}
      let targetName = "你"
      if (isTargetingOther) {
        targetName = await getMemberName(e, targetId) || "群友"
      }

      const pigPool = getPigPool()
      let pig = null
      let source = ""

      if (targetRecord.date === date) {
        pig = pigPool.find(p => p.id === targetRecord.pig_id)
        source = "今日小猪"
      }

      if (!pig) {
        const collectedIds = Object.keys(targetCollected)
        if (collectedIds.length > 0) {
          const randomId = collectedIds[Math.floor(Math.random() * collectedIds.length)]
          pig = pigPool.find(p => p.id === randomId)
          source = "小猪图鉴"
        }
      }

      if (!pig) {
        if (isTargetingOther) {
          await e.reply("对方还没有今日小猪，图鉴也是空的~\n请让TA发「/今日小猪」后再使用「/小猪做菜」做成菜肴")
        } else {
          await e.reply("你还没有今日小猪，图鉴也是空的~\n请先发「/今日小猪」后再使用「/小猪做菜」做成菜肴")
        }
        return true
      }

      const dish = PIG_DISHES[Math.floor(Math.random() * PIG_DISHES.length)]
      const imagePath = findPigImage(pig.id)

      const msg = []
      if (imagePath) msg.push(segment.image(pathToFileURL(imagePath).href))

      let text = `\n小猪做菜\n\n`
      if (source === "/今日小猪") {
        text += `用${targetName}的今日小猪【${pig.name}】做成【${dish.name}】！\n`
      } else {
        text += `${targetName}今天没有「/今日小猪」，从小猪图鉴获取【${pig.name}】做成【${dish.name}】！\n`
      }
      text += `\n${dish.desc}\n${pig.description}\n\n真香！\n\n评语：${dish.review}`
      msg.push(text)

      await e.reply([...msg, getButtons()])
      return true
    } catch (error) {
      logger.error(`[RollPig-Plugin] 小猪做菜失败：${error.message}`, error)
      await e.reply("做菜失败了...")
      return true
    }
  }
}
