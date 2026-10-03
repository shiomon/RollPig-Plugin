
import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

import plugin from "../../../lib/plugins/plugin.js"

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

  recordCook,
  recordSteal,
  getDishStats,
  loadBreedData,
  checkPair,
  commitBreed,
  getRankingList,
  summarizePigCollection,
} from "../model/pigCollection.js"
import {
  LOCAL_RESOURCE_DIR,
  findPigImage,
  getPigPool,
  getPigMap,
  getShanghaiDate,
  selectTodayPig,
} from "../model/todayPig.js"

import { PIG_DISHES, COOK_FAIL_LINES } from "../model/dishes.js"
import { buildHelpFallback } from "../model/helpData.js"
import {
  COMMAND_PREFIX,
  COOK_SUCCESS_RATE,
  RANDOM_PIG_MAX,
  RANK_LIMIT,
  STEAL_SUCCESS_RATE,
  at,
  calcCompatibility,
  getButtons,
  getMatchDesc,
  isBreedSuccess,
  normalizeAtId,
} from "../utils/helper.js"

import { generateRankHTML } from "../view/rank.js"
import { generateBreedHTML, BREED_TEXTS } from "../view/breed.js"
import { generateCookHTML } from "../view/cook.js"
import { generateHelpHTML } from "../view/help.js"


const PIG_GRID_TEMPLATE = path.join(LOCAL_RESOURCE_DIR, "pig-grid.html")
const RANK_TEMPLATE = path.join(LOCAL_RESOURCE_DIR, "rank.html")
const RENDER_NAME = "今日小猪"

function makeImage(file, asSticker = false) {
  if (!file) return null
  let buf = null
  try {
    buf = fs.readFileSync(file)
  } catch (err) {
    if (err.code !== "ENOENT") logger.warn(`[RollPig-Plugin] 读取图片失败：${file}`, err)
  }
  const image = segment.image(buf || pathToFileURL(file).href)
  if (!asSticker) return image
  return {
    ...image,
    asface: true,
    sub_type: 1,
    summary: "[动画表情]",
  }
}

function cleanupScreenshot(saveId) {
  try {
    const dir = path.join(process.cwd(), "temp", "html", RENDER_NAME)
    const htmlFile = path.join(dir, `${saveId}.html`)
    const pngFile = path.join(dir, `${saveId}.png`)
    if (fs.existsSync(htmlFile)) fs.unlinkSync(htmlFile)
    if (fs.existsSync(pngFile)) fs.unlinkSync(pngFile)
  } catch (err) {
    logger.warn(`[RollPig-Plugin] 清理截图缓存失败：${saveId}`, err)
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

function pigHubUnsyncedTip(e) {
  return e.isMaster
    ? "PigHub 小猪资源未同步\n请先发送「#小猪同步」下载资源"
    : "PigHub 小猪资源未同步，请联系管理员同步后再试~"
}

async function ensureGroup(e, label) {
  if (!e.group_id) {
    await e.reply(`${label}仅在群聊中可用~`)
    return false
  }
  return true
}

async function ensureNotSelf(e, targetId, message) {
  if (String(targetId) === String(e.user_id)) {
    await e.reply(message)
    return false
  }
  return true
}

async function ensureHasTodayPig(e, pig, message) {
  if (!pig) {
    await e.reply(message)
    return false
  }
  return true
}

function hasDoneToday(records, uid, date, field) {
  return records[String(uid)]?.[field] === date
}

async function getMemberName(e, userId) {
  try {
    const member = await e.bot?.pickMember?.(e.group_id, userId)
    if (!member) return null
    if (member.card) return member.card
    if (member.nickname) return member.nickname
    const info = await member.getInfo?.() || await member.getGroupMemberInfo?.()
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

function resolvePig(e, userId, date, userRecords) {
  const pigMap = getPigMap()
  const record = userRecords[String(userId)] || {}
  if (record.date === date && record.pig_id) {
    const pig = pigMap.get(record.pig_id)
    if (pig) return { pig, source: "今日小猪" }
  }
  const collectedIds = Object.keys(record.collected || {})
  if (collectedIds.length > 0) {
    const randomId = collectedIds[Math.floor(Math.random() * collectedIds.length)]
    const pig = pigMap.get(randomId)
    if (pig) return { pig, source: "小猪图鉴" }
  }
  return { pig: null, source: "" }
}


export class TodayPig extends plugin {
  constructor() {
    super({
      name: "今日小猪",
      dsc: "抽取每天属于自己的小猪",
      event: "message",
      priority: 5000,
      rule: [
        { reg: `${COMMAND_PREFIX}(今日猪猪|今日小猪|每日猪猪)$`, fnc: "todayPig" },
        { reg: `${COMMAND_PREFIX}(随机猪猪|随机小猪)\\s*(\\d+)?$`, fnc: "randomPig" },
        { reg: `${COMMAND_PREFIX}(找猪|搜猪)\\s*(\\S.*)$`, fnc: "findPig" },

        { reg: `${COMMAND_PREFIX}(我的猪圈|猪圈和菜)$`, fnc: "myPigpen" },
        { reg: `${COMMAND_PREFIX}(猪猪|小猪)配种$`, fnc: "pigBreed" },
        { reg: `${COMMAND_PREFIX}(猪猪|小猪)排行$`, fnc: "pigRank" },
        { reg: `${COMMAND_PREFIX}烤群友$`, fnc: "pigRoast" },
        { reg: `${COMMAND_PREFIX}(偷猪|偷小猪)$`, fnc: "pigSteal" },
        { reg: `${COMMAND_PREFIX}(猪猪|小猪)同步$`, fnc: "pigSync" },
        { reg: `${COMMAND_PREFIX}(猪猪|小猪)帮助$`, fnc: "pigHelp" },
      ],
    })
  }

  async init() {
    initStorage()
    try {
      const tempDir = path.join(process.cwd(), "temp", "html", RENDER_NAME)
      if (fs.existsSync(tempDir)) {
        for (const file of fs.readdirSync(tempDir)) {
          if (/^(breed_|cook_|steal_|help_|pigpen_|rank_)/.test(file) && /\.(html|png)$/.test(file)) {
            fs.unlinkSync(path.join(tempDir, file))
          }
        }
      }
    } catch (err) {
      logger.warn("[RollPig-Plugin] 初始化清理缓存失败:", err)
    }
  }

  async pigSync(e) {
    if (!e.isMaster) {
      await e.reply("仅Bot主人可使用此功能~")
      return true
    }

    try {
      if (isPigHubReady()) {
        const store = getPigHubStore()
        await e.reply([...at(e), `PigHub 资源已就绪：${store.count} 个小猪\n如需重新同步，请先删除 resources/pighub 目录`, getButtons()])
        return true
      }

      await e.reply("开始同步 PigHub 小猪资源，请稍等...")
      const store = await ensurePigHubSynced()
      const failed = store._failed || 0
      const failMsg = failed > 0 ? `\n${failed} 张下载失败已跳过` : ""
      await e.reply([...at(e), `PigHub 同步完成：${store.count} 个小猪${failMsg}\n现在可以使用「/随机小猪」和「/找猪」了~`, getButtons()])
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

      const userRecords = getUserRecords(e)
      const existing = userRecords[String(userId)] || {}
      if (existing.date === date && existing.pig_id) {
        const pig = getPigMap().get(existing.pig_id)
        if (pig) {
          const imagePath = findPigImage(pig.id)
          const msg = [...at(e), "今天已经抽过了~\n"]
          if (imagePath) msg.push(makeImage(imagePath))
          msg.push(`\n【${pig.name}】\n> ${pig.description}\n> ${pig.analysis}\n`, getButtons())
          await e.reply(msg)
          return true
        }
      }

      const pig = selectTodayPig(userId, date, pigPool)

      const result = recordDailyPig(e, userId, date, pig.id, {
        name: getUserName(e),
        avatar: getMemberAvatar(e, userId)
      })
      if (!result.claimed) {
        logger.warn(`[RollPig-Plugin] 今日小猪记录失败：已领取`)
        const storedPig = result.pig_id ? getPigMap().get(result.pig_id) : null
        const targetPig = storedPig || pig
        const storedImage = findPigImage(targetPig.id)
        const storedMsg = [...at(e), "今天已经抽过了~\n"]
        if (storedImage) storedMsg.push(makeImage(storedImage))
        storedMsg.push(`\n【${targetPig.name}】\n> ${targetPig.description}\n> ${targetPig.analysis}\n`, getButtons())
        await e.reply(storedMsg)
        return true
      }

      const prefix = result.count > 1 ? `🎉 第${result.count}次抽到这只小猪~\n` : "🎉 抓到一只新小猪啦~\n"
      const imagePath = findPigImage(pig.id)
      const msg = [...at(e), prefix]
      if (imagePath) msg.push(makeImage(imagePath))
      msg.push(`\n【${pig.name}】\n> ${pig.description}\n> ${pig.analysis}\n`, getButtons())
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
        await e.reply(pigHubUnsyncedTip(e))
        return true
      }

      const match = e.msg.match(new RegExp(`${COMMAND_PREFIX}(随机猪猪|随机小猪)\\s*(\\d+)?$`))
      let count = match?.[2] ? parseInt(match[2]) : 1
      count = Math.min(Math.max(count, 1), RANDOM_PIG_MAX)

      if (count === 1) {
        const pig = selectRandomPigHubImage()
        const imageFile = findPigHubImage(pig.local_file)
        if (!imageFile) throw new Error(`PigHub 图片缺失：${pig.local_file}`)
        await e.reply([...at(e), "\n", makeImage(imageFile, true), getButtons()])
      } else {
        const store = getPigHubStore()
        const selected = []
        const available = [...store.images]
        for (let i = 0; i < Math.min(count, available.length); i++) {
          const idx = Math.floor(Math.random() * available.length)
          selected.push(available.splice(idx, 1)[0])
        }
        const arr = [...at(e), "\n"]
        for (const pig of selected) {
          const imageFile = findPigHubImage(pig.local_file)
          arr.push(`【${pig.title}】\n`)
          arr.push(imageFile ? makeImage(imageFile) : segment.image(pig.url))
          arr.push("\n")
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
        await e.reply(pigHubUnsyncedTip(e))
        return true
      }

      const match = e.msg.match(new RegExp(`${COMMAND_PREFIX}(找猪|搜猪)\\s*(\\S.*)$`))
      const keyword = (match?.[2] || "").trim().toLowerCase()
      if (!keyword) {
        await e.reply("请输入要搜索的关键词~\n如：/找猪 安卓")
        return true
      }
      const store = getPigHubStore()
      const found = store.images.filter(pig => pig.title.toLowerCase().includes(keyword))

      if (!found.length) {
        await e.reply(`没有找到「${keyword}」相关的小猪~`)
        return true
      }

      if (found.length === 1) {
        const pig = found[0]
        const imageFile = findPigHubImage(pig.local_file)
        const img = imageFile ? makeImage(imageFile) : segment.image(pig.url)
        await e.reply([...at(e), `${pig.title}-${pig.id}`, img, getButtons()])
      } else {
        const arr = [...at(e), "\n"]
        for (const pig of found.slice(0, 20)) {
          const imageFile = findPigHubImage(pig.local_file)
          arr.push(`【${pig.title}】-${pig.id}\n`)
          arr.push(imageFile ? makeImage(imageFile) : segment.image(pig.url))
          arr.push("\n")
        }
        if (found.length > 20) {
          arr.push(`共 ${found.length} 个结果，仅展示前 20 个~\n`)
        }
        arr.push(getButtons())
        await e.reply(arr)
      }
      return true
    } catch (error) {
      logger.error(`[RollPig-Plugin] 找猪失败：${error.message}`, error)
      await e.reply("找猪失败了...")
      return true
    }

  }

  async myPigpen(e) {
    const saveId = `pigpen_${e.user_id}`
    try {
      const pigs = getPigPool()
      const counts = getPigCollection(e, e.user_id)
      const summary = summarizePigCollection(pigs, counts)

      const items = pigs.map(pig => {
        const image = findPigImage(pig.id)
        return { ...pig, image: image ? pathToFileURL(image).href : "", owned: (counts[pig.id] || 0) > 0, count: counts[pig.id] || 0 }
      })

      const userName = getUserName(e)
      const dishStats = getDishStats(e, e.user_id, PIG_DISHES.length)
      const dishItems = PIG_DISHES.map(dish => {
        const dishImage = path.join(LOCAL_RESOURCE_DIR, "dish", `${dish.name}.png`)
        return {
          name: dish.name,
          image: fs.existsSync(dishImage) ? pathToFileURL(dishImage).href : "",
          owned: (dishStats.dishes[dish.name] || 0) > 0,
          count: dishStats.dishes[dish.name] || 0,
        }
      })

      const image = await puppeteer.screenshot(RENDER_NAME, {
        tplFile: PIG_GRID_TEMPLATE,
        saveId,
        imgType: "png",
        pageGotoParams: { waitUntil: "load" },
        title: "🐷 我的猪圈",
        owner: `${userName}的猪圈`,
        showStats: true,
        renderScale: 2,
        ownedCount: summary.ownedCount,
        total: pigs.length,
        rate: summary.rate,
        totalCount: summary.totalCount,
        favorite: summary.favorite,
        pigs: items,
        dishTitle: `🍳 ${userName}的菜谱`,
        dishCollected: dishStats.collected,
        dishTotal: dishStats.total,
        dishRate: dishStats.rate,
        signatureDish: dishStats.signature || "暂无",
        cookCount: dishStats.cookCount,
        dishItems,
      })

      if (!image) throw new Error("猪圈图片渲染失败")
      await e.reply([...at(e), "\n", image, getButtons()])
      return true
    } catch (error) {
      logger.error(`[RollPig-Plugin] 我的猪圈失败：${error.message}`, error)
      await e.reply("我的猪圈渲染失败了...")
      return true
    } finally {
      cleanupScreenshot(saveId)
    }
  }

  async pigBreed(e) {
    if (!await ensureGroup(e, "小猪配种")) return true

    try {
      const date = getShanghaiDate()
      const myId = String(e.user_id)

      const targetId = normalizeAtId(e.at)
      if (!targetId) {
        await e.reply("请@群友进行配种~\n如：@群友/小猪配种")
        return true
      }

      const breedData = loadBreedData(e, myId, date)
      const userRecords = breedData.userRecords

      if (!await ensureNotSelf(e, targetId, "不能和自己配种哦~找别的群友试试吧！")) return true

      const pigPool = getPigPool()

      const { pig: myPig } = resolvePig(e, myId, date, userRecords)
      if (!await ensureHasTodayPig(e, myPig, "你还没有今日小猪，图鉴也是空的~\n请先发「/今日小猪」后再配种")) return true
      const { pig: targetPig } = resolvePig(e, targetId, date, userRecords)
      if (!await ensureHasTodayPig(e, targetPig, "TA还没有今日小猪，图鉴也是空的~\n请让TA发「/今日小猪」后再配种")) return true

      const score = calcCompatibility(myPig.id, targetPig.id, date)
      const desc = getMatchDesc(score)

      if (breedData.userBreedCount >= 1) {
        await e.reply([...at(e), "今天已经配种过了哦~", getButtons()])
        return true
      }

      const { pairKey, pairCount } = checkPair(userRecords, myId, targetId, date, "pair")
      if (pairCount >= 1) {
        await e.reply([...at(e), "之前已经和TA配种过了，换别的群友试试吧~", getButtons()])
        return true
      }

      const success = isBreedSuccess(score)
      let breedPig = null
      if (success) {
        breedPig = pigPool[Math.floor(Math.random() * pigPool.length)]
      }
      const commitResult = commitBreed(e, myId, targetId, breedPig ? breedPig.id : null, breedData.userKey, pairKey)
      if (!commitResult.committed) {
        await e.reply([...at(e), "刚刚已经配过种了哦~", getButtons()])
        return true
      }

      const myImage = findPigImage(myPig.id)
      const targetImage = findPigImage(targetPig.id)
      const breedImage = breedPig ? findPigImage(breedPig.id) : null

      const saveId = `breed_${e.user_id}`
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
        const img = await puppeteer.screenshot(RENDER_NAME, {
          tplFile: RANK_TEMPLATE,
          html,
          imgType: "png",
          saveId,
          pageGotoParams: { waitUntil: "load" },
        })
        if (!img) throw new Error("截图返回空")
        await e.reply([...at(e), `${success ? "🎉" : "💔"} 和对方的「${targetPig.name}」配种${success ? "成功" : "失败"}！\n`, img, getButtons()])
      } catch (renderErr) {
        logger.error("[RollPig-Plugin] 配种渲染失败:", renderErr)
        const msg = [`${success ? "🎉" : "💔"} 和对方的「${targetPig.name}」配种${success ? "成功" : "失败"}！\n`]
        if (myImage) msg.push(makeImage(myImage))
        msg.push(`【${myPig.name}】×`)
        if (targetImage) msg.push(makeImage(targetImage))
        msg.push(`【${targetPig.name}】\n\n般配度：${score}%\n${desc}\n\n`)
        if (success) {
          msg.push(`${BREED_TEXTS.successLabel}\n`)
          if (breedImage) msg.push(makeImage(breedImage))
          msg.push(`\n【${breedPig.name}】\n${breedPig.description}\n\n${breedPig.analysis}\n\n${BREED_TEXTS.successFooter}`)
        } else {
          msg.push(`${BREED_TEXTS.failLabel}\n${BREED_TEXTS.failMsg}\n${BREED_TEXTS.failSub}\n${BREED_TEXTS.failFooter}`)
        }
        await e.reply([...at(e), ...msg, getButtons()])
      } finally {
        cleanupScreenshot(saveId)
      }
      return true
    } catch (error) {
      logger.error(`[RollPig-Plugin] 小猪配种失败：${error.message}`, error)
      await e.reply("配种失败了...")
      return true
    }
  }

  async pigRank(e) {
    if (!await ensureGroup(e, "小猪排行")) return true

    try {
      const top = getRankingList(e, RANK_LIMIT)
      if (top.length === 0) {
        await e.reply("还没有排行数据哦~快发「/今日小猪」开始收集吧！")
        return true
      }

      const total = getPigPool().length

      for (let i = 0; i < top.length; i += 10) {
        await Promise.all(top.slice(i, i + 10).map(u => (async () => {
          let userName = u.userName || await getMemberName(e, u.userId) || `用户${u.userId.slice(-4)}`
          let userAvatar = u.userAvatar || getMemberAvatar(e, u.userId) || `https://q1.qlogo.cn/g?b=qq&nk=${u.userId}&s=100`
          u.userName = userName
          u.userAvatar = userAvatar
          u.isCurrent = String(u.userId) === String(e.user_id)
        })()))
      }

      const rankSaveId = `rank_${e.group_id}_${Date.now()}`
      try {
        const html = generateRankHTML(top, total)
        const img = await puppeteer.screenshot(RENDER_NAME, {
          tplFile: RANK_TEMPLATE,
          html,
          imgType: "png",
          saveId: rankSaveId,
          pageGotoParams: { waitUntil: "load" },
        })
        if (!img) throw new Error("截图返回空")
        await e.reply([...at(e), "\n", img, getButtons()])
      } catch (renderErr) {
        logger.error("[RollPig-Plugin] 排行渲染失败:", renderErr)
        const rankList = top.map((u, i) =>
          `第${i + 1}名：${u.userName}（${u.count}/${total}）${u.isCurrent ? " ← 你" : ""}`
        )
        await e.reply([...at(e), `小猪图鉴排行 Top50\n\n${rankList.join("\n")}`, getButtons()])
      } finally {
        cleanupScreenshot(rankSaveId)
      }
      return true
    } catch (error) {
      logger.error(`[RollPig-Plugin] 小猪排行失败：${error.message}`, error)
      await e.reply("获取排行失败了...")
      return true
    }
  }

  async pigRoast(e) {
    if (!await ensureGroup(e, "烤群友")) return true
    if (!e.at) {
      await e.reply("请@群友烤~\n如：@群友/烤群友")
      return true
    }

    try {
      const date = getShanghaiDate()
      const myId = String(e.user_id)

      const targetId = normalizeAtId(e.at)
      if (!await ensureNotSelf(e, targetId, "不能烤自己的小猪哦~找别的群友试试吧！")) return true
      const targetName = await getMemberName(e, targetId) || "群友"

      const userRecords = getUserRecords(e)
      if (hasDoneToday(userRecords, myId, date, "cookDate")) {
        await e.reply([...at(e), "今天烤过群友的小猪了，明天再来吧！", getButtons()])
        return true
      }

      const { pairKey, pairCount } = checkPair(userRecords, myId, targetId, date, "cookpair")
      if (pairCount >= 1) {
        await e.reply([...at(e), "之前已经烤过TA了，换别的群友试试吧~", getButtons()])
        return true
      }

      const { pig: myPig } = resolvePig(e, myId, date, userRecords)
      if (!await ensureHasTodayPig(e, myPig, "你还没有今日小猪，图鉴也是空的~\n请先发「/今日小猪」后再烤群友的小猪")) return true

      const { pig, source } = resolvePig(e, targetId, date, userRecords)

      if (!await ensureHasTodayPig(e, pig, "TA还没有今日小猪，图鉴也是空的~\n请让TA发「/今日小猪」后再烤TA的小猪")) return true

      const dish = PIG_DISHES[Math.floor(Math.random() * PIG_DISHES.length)]
      const dishImagePath = path.join(LOCAL_RESOURCE_DIR, "dish", `${dish.name}.png`)
      const dishImage = fs.existsSync(dishImagePath) ? pathToFileURL(dishImagePath).href : ""
      const pigImageFile = findPigImage(pig.id)
      const pigImage = pigImageFile ? pathToFileURL(pigImageFile).href : ""
      const success = Math.random() < COOK_SUCCESS_RATE

      let sourceText
      if (source === "今日小猪") {
        sourceText = `烤${targetName}的今日小猪`
      } else {
        sourceText = `烤${targetName}的小猪图鉴`
      }

      const failLine = COOK_FAIL_LINES[Math.floor(Math.random() * COOK_FAIL_LINES.length)]

      const cookResult = recordCook(e, myId, date, success ? dish.name : null, pairKey, targetId)
      if (!cookResult.recorded) {
        if (cookResult.alreadyPair) {
          await e.reply([...at(e), "刚刚已经烤过TA了，换别的群友试试吧~", getButtons()])
        } else {
          await e.reply([...at(e), "今天已经烤过了哦~", getButtons()])
        }
        return true
      }
      const saveId = `cook_${e.user_id}`
      try {
        const html = generateCookHTML({
          success,
          dishImage,
          dishName: dish.name,
          dishDesc: dish.desc,
          pigImage,
          pigName: pig.name,
          pigDesc: pig.description,
          source: sourceText,
          review: dish.review,
          failLine,
        })
        const img = await puppeteer.screenshot(RENDER_NAME, {
          tplFile: RANK_TEMPLATE,
          html,
          imgType: "png",
          saveId,
          pageGotoParams: { waitUntil: "load" },
        })
        if (!img) throw new Error("截图返回空")
        const head = success
          ? `烤${targetName}的「${pig.name}」成功！\n${dish.name}已出入菜谱\n`
          : `💔 烤${targetName}的「${pig.name}」失败！\n`
        await e.reply([...at(e), head, img, getButtons()])
      } catch (renderErr) {
        logger.error("[RollPig-Plugin] 烤群友渲染失败:", renderErr)
        const msg = []
        const fallbackImg = fs.existsSync(dishImagePath) ? dishImagePath : pigImageFile
        if (fallbackImg) msg.push(makeImage(fallbackImg))
        if (success) {
          msg.push(`\n🎉 烤${targetName}的「${pig.name}」成功！\n${sourceText}【${pig.name}】做成【${dish.name}】！\n> ${dish.desc}\n> ${pig.description}\n> 真香！评语：${dish.review}`)
        } else {
          msg.push(`\n💔 烤${targetName}的「${pig.name}」失败...\n${sourceText}【${pig.name}】做【${dish.name}】翻车了！\n> ${failLine}\n> ${pig.description}`)
        }
        await e.reply([...at(e), "\n", ...msg, getButtons()])
      } finally {
        cleanupScreenshot(saveId)
      }
      return true
    } catch (error) {
      logger.error(`[RollPig-Plugin] 烤群友失败：${error.message}`, error)
      await e.reply("烤群友失败了...")
      return true
    }
  }

  async pigSteal(e) {
    if (!await ensureGroup(e, "偷小猪")) return true
    try {
      const date = getShanghaiDate()
      const myId = String(e.user_id)
      const userRecords = getUserRecords(e)

      let targetId = normalizeAtId(e.at)
      if (targetId && String(targetId) === String(e.self_id)) targetId = null
      if (!targetId) {
        const candidates = Object.keys(userRecords).filter(id => {
          if (String(id) === myId || String(id) === String(e.self_id)) return false
          const record = userRecords[id]
          return Boolean(record?.pig_id) || Object.keys(record?.collected || {}).length > 0
        })
        if (candidates.length === 0) {
          await e.reply("本群还没有其他群友抽过小猪~\n可以先让群友发「/今日小猪」哦~")
          return true
        }
        targetId = candidates[Math.floor(Math.random() * candidates.length)]
      }
      if (!await ensureNotSelf(e, targetId, "不能偷自己的小猪哦~找别的群友试试吧！")) return true
      const targetName = await getMemberName(e, targetId) || "群友"

      if (hasDoneToday(userRecords, myId, date, "stealDate")) {
        await e.reply([...at(e), "今天已经偷过小猪了，明天再来吧！", getButtons()])
        return true
      }

      const { pig, source } = resolvePig(e, targetId, date, userRecords)
      if (!await ensureHasTodayPig(e, pig, "TA还没有今日小猪，图鉴也是空的~\n请让TA发「/今日小猪」后再偷TA的小猪")) return true

      const success = Math.random() < STEAL_SUCCESS_RATE

      const stealResult = recordSteal(e, myId, date, success ? pig.id : null)
      if (!stealResult.recorded) {
        await e.reply([...at(e), "今天已经偷过了哦~", getButtons()])
        return true
      }

      const pigImageFile = findPigImage(pig.id)
      const sourceText = source === "今日小猪" ? "今日小猪" : "小猪图鉴"

      const msg = [
        ...at(e),
        `${success ? "🎉" : "💔"} 偷${targetName}的${sourceText}「${pig.name}」${success ? "成功" : "失败"}！\n`,
      ]
      if (pigImageFile) msg.push(makeImage(pigImageFile))
      if (success) msg.push(`\n\n【${pig.name}】已存入你的图鉴`)
      msg.push(getButtons())
      await e.reply(msg)
      return true
    } catch (error) {
      logger.error(`[RollPig-Plugin] 偷小猪失败：${error.message}`, error)
      await e.reply("偷小猪失败了...")
      return true
    }
  }

  async pigHelp(e) {
    const fallback = buildHelpFallback()
    const saveId = `help_${e.user_id}`
    try {
      const html = generateHelpHTML()
      const img = await puppeteer.screenshot(RENDER_NAME, {
        tplFile: RANK_TEMPLATE,
        html,
        imgType: "png",
        saveId,
        pageGotoParams: { waitUntil: "load" },
      })
      if (!img) throw new Error("截图返回空")
      await e.reply([...at(e), "\n", img, getButtons()])
    } catch (renderErr) {
      logger.error("[RollPig-Plugin] 小猪帮助渲染失败:", renderErr)
      await e.reply([...at(e), fallback.join("\n"), getButtons()])
    } finally {
      cleanupScreenshot(saveId)
    }
    return true
  }
}
