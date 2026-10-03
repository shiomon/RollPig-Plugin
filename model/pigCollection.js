import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { getShanghaiDate } from "./todayPig.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.join(__dirname, "..", "data")
const PRIVATE_USERS_PATH = path.join(DATA_DIR, "private", "users.json")

function loadUsersFile(filePath) {
  let raw
  try {
    raw = fs.readFileSync(filePath, "utf-8")
  } catch (err) {
    if (err.code === "ENOENT") return {}
    logger.error(`[RollPig-Plugin] 数据文件读取失败：${filePath}`, err)
    throw err
  }
  try {
    const data = JSON.parse(raw)
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("数据文件内容不是对象")
    }
    return data
  } catch (err) {
    logger.error(`[RollPig-Plugin] 数据文件解析失败，已阻止写入以免覆盖：${filePath}`, err)
    throw new Error(`数据文件损坏，已阻止写入：${filePath}`)
  }
}

function saveUsersFile(filePath, data) {
  const dir = path.dirname(filePath)
  const tmpFile = path.join(dir, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`)
  try {
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(tmpFile, JSON.stringify(data))
    fs.renameSync(tmpFile, filePath)
  } catch (err) {
    logger.error(`[RollPig-Plugin] 数据保存失败：${filePath}`, err)
    try {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
    } catch (cleanupErr) {
      logger.warn(`[RollPig-Plugin] 清理临时文件失败：${tmpFile}`, cleanupErr)
    }
    throw err
  }
}

function getRecordKey(e) {
  if (!e.group_id) return "private"
  return `group:${String(e.group_id)}`
}

function encodeGroupDir(groupId) {
  return String(groupId).replace(/[^A-Za-z0-9_-]/g, "_")
}

function getFilePath(key) {
  if (key === "private") return PRIVATE_USERS_PATH
  return path.join(DATA_DIR, "group", encodeGroupDir(key.slice(6)), "users.json")
}

function getFilePathByEvent(e) {
  return getFilePath(getRecordKey(e))
}

export function getUserRecords(e) {
  return loadUsersFile(getFilePathByEvent(e))
}

const CLEANUP_DAYS = 180
const CLEANUP_MS = CLEANUP_DAYS * 24 * 60 * 60 * 1000

function cleanOldBreedKeys(breedCount, todayDate) {
  for (const key of Object.keys(breedCount)) {
    const m = key.match(/(\d{4}-\d{2}-\d{2})$/)
    if (m && m[1] !== todayDate) delete breedCount[key]
  }
}

function cleanupBreedCountInFile(filePath, todayDate) {
  try {
    if (!fs.existsSync(filePath)) return
    const data = loadUsersFile(filePath)
    let cleaned = 0
    for (const uid of Object.keys(data)) {
      const rec = data[uid]
      if (!rec?.breedCount) continue
      const before = Object.keys(rec.breedCount).length
      cleanOldBreedKeys(rec.breedCount, todayDate)
      cleaned += before - Object.keys(rec.breedCount).length
      if (Object.keys(rec.breedCount).length === 0) delete rec.breedCount
    }
    if (cleaned > 0) {
      saveUsersFile(filePath, data)
      logger.mark(`[RollPig-Plugin] 清理跨天配种记录：${filePath} (${cleaned}条)`)
    }
  } catch (err) {
    logger.warn(`[RollPig-Plugin] 清理跨天配种记录失败：${filePath}`, err)
  }
}

function cleanupOldData() {
  try {
    const now = Date.now()
    const todayDate = getShanghaiDate()
    const checkFile = (filePath) => {
      if (!fs.existsSync(filePath)) return
      const stat = fs.statSync(filePath)
      if (now - stat.mtimeMs > CLEANUP_MS) {
        fs.unlinkSync(filePath)
        logger.mark(`[RollPig-Plugin] 清理${CLEANUP_DAYS}天过期数据：${filePath}`)
        return
      }
      cleanupBreedCountInFile(filePath, todayDate)
    }
    checkFile(PRIVATE_USERS_PATH)
    const groupDir = path.join(DATA_DIR, "group")
    if (!fs.existsSync(groupDir)) return
    for (const dir of fs.readdirSync(groupDir)) {
      checkFile(path.join(groupDir, dir, "users.json"))
    }
  } catch (err) {
    logger.warn("[RollPig-Plugin] 清理过期数据失败:", err)
  }
}

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000

function mergeUserRecords(a, b) {
  if (!a) return b
  if (!b) return a
  const r = { ...a }

  const collected = { ...(a.collected || {}) }
  for (const [k, v] of Object.entries(b.collected || {})) collected[k] = Math.max(collected[k] || 0, v)
  if (Object.keys(collected).length) r.collected = collected

  if (a.dishes || b.dishes) {
    const dishes = { ...(a.dishes || {}) }
    for (const [k, v] of Object.entries(b.dishes || {})) dishes[k] = Math.max(dishes[k] || 0, v)
    r.dishes = dishes
  }

  if (a.breedCount || b.breedCount) {
    const breedCount = { ...(a.breedCount || {}) }
    for (const [k, v] of Object.entries(b.breedCount || {})) breedCount[k] = Math.max(breedCount[k] || 0, v)
    r.breedCount = breedCount
  }

  for (const k of ["cookCount", "stealCount"]) {
    if (a[k] != null || b[k] != null) r[k] = Math.max(a[k] || 0, b[k] || 0)
  }
  for (const k of ["date", "pig_id", "cookDate", "stealDate", "userName", "userAvatar"]) {
    if (b[k] != null) r[k] = b[k]
  }
  return r
}

const decodeHexDir = name => name.replace(/_([0-9a-f]{2})_/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
const encodeHexDir = name => name.replace(/[^A-Za-z0-9_-]/g, ch => `_${ch.charCodeAt(0).toString(16)}_`)

function migrateGroupDir(groupDir, srcName, dstName) {
  const srcDir = path.join(groupDir, srcName)
  const dstDir = path.join(groupDir, dstName)
  try {
    const srcFile = path.join(srcDir, "users.json")
    if (!fs.existsSync(srcFile)) {
      if (!fs.existsSync(dstDir)) fs.renameSync(srcDir, dstDir)
      else fs.rmSync(srcDir, { recursive: true, force: true })
      return
    }
    if (!fs.existsSync(dstDir)) {
      fs.mkdirSync(dstDir, { recursive: true })
      saveUsersFile(path.join(dstDir, "users.json"), loadUsersFile(srcFile))
    } else {
      const merged = loadUsersFile(path.join(dstDir, "users.json"))
      for (const [uid, rec] of Object.entries(loadUsersFile(srcFile))) {
        merged[uid] = mergeUserRecords(merged[uid], rec)
      }
      saveUsersFile(path.join(dstDir, "users.json"), merged)
    }
    fs.rmSync(srcDir, { recursive: true, force: true })
    logger.mark(`[RollPig-Plugin] 已迁移群目录 ${srcName} → ${dstName}`)
  } catch (err) {
    logger.warn(`[RollPig-Plugin] 迁移群目录失败：${srcName}`, err)
  }
}

function migrateHexGroupDirs() {
  const groupDir = path.join(DATA_DIR, "group")
  if (!fs.existsSync(groupDir)) return
  for (const name of fs.readdirSync(groupDir)) {
    const decoded = decodeHexDir(name)
    if (decoded === name) continue
    if (encodeHexDir(decoded) !== name) continue
    const target = encodeGroupDir(decoded)
    if (target === name) continue
    migrateGroupDir(groupDir, name, target)
  }
}

export function initStorage() {
  fs.mkdirSync(path.join(DATA_DIR, "private"), { recursive: true })
  migrateHexGroupDirs()
  cleanupOldData()
  setInterval(cleanupOldData, CLEANUP_INTERVAL_MS).unref()
}

function countOwned(record) {
  return Object.keys(record?.collected || {}).length
}


function atomicUpdate(e, mutator) {
  const filePath = getFilePathByEvent(e)
  const userRecords = loadUsersFile(filePath)
  const outcome = mutator(userRecords) || {}
  if (outcome.changed !== false) saveUsersFile(filePath, userRecords)
  delete outcome.changed
  return outcome
}

export function recordDailyPig(e, userId, date, pigId, userInfo) {
  const uid = String(userId)
  return atomicUpdate(e, (userRecords) => {
    const record = userRecords[uid] || { collected: {} }
    if (!record.collected) record.collected = {}
    if (record.date === date) {
      const storedId = record.pig_id
      return { claimed: false, record, pig_id: storedId, count: record.collected[storedId] || 0 }
    }
    record.pig_id = pigId
    record.date = date
    record.collected[pigId] = (record.collected[pigId] || 0) + 1
    if (userInfo) {
      if (userInfo.name) record.userName = userInfo.name
      if (userInfo.avatar) record.userAvatar = userInfo.avatar
    }
    if (record.breedCount) {
      cleanOldBreedKeys(record.breedCount, date)
      if (Object.keys(record.breedCount).length === 0) delete record.breedCount
    }
    userRecords[uid] = record
    return { claimed: true, record, count: record.collected[pigId] }
  })
}

export function getPigCollection(e, userId) {
  const userRecords = loadUsersFile(getFilePathByEvent(e))
  const record = userRecords[String(userId)]
  return record?.collected || {}
}

export function recordCook(e, userId, date, dishName) {
  if (!dishName) return { recorded: false, record: null }
  const uid = String(userId)
  return atomicUpdate(e, (records) => {
    const record = records[uid] || { collected: {} }
    if (record.cookDate === date) return { changed: false, recorded: false, record }
    record.cookDate = date
    record.cookCount = (record.cookCount || 0) + 1
    if (!record.dishes) record.dishes = {}
    record.dishes[dishName] = (record.dishes[dishName] || 0) + 1
    records[uid] = record
    return { recorded: true, record }
  })
}

export function recordSteal(e, userId, date, stolenPigId) {
  const uid = String(userId)
  return atomicUpdate(e, (records) => {
    const record = records[uid] || { collected: {} }
    if (record.stealDate === date) return { changed: false, recorded: false, record }
    if (!record.collected) record.collected = {}
    record.stealDate = date
    record.stealCount = (record.stealCount || 0) + 1
    if (stolenPigId) {
      record.collected[stolenPigId] = (record.collected[stolenPigId] || 0) + 1
    }
    records[uid] = record
    return { recorded: true, record }
  })
}

export function getDishStats(e, userId, totalDishes) {
  const userRecords = loadUsersFile(getFilePathByEvent(e))
  const record = userRecords[String(userId)]
  const dishes = record?.dishes || {}
  const collected = Object.keys(dishes).length
  let signature = null
  let signatureCount = 0
  for (const [name, count] of Object.entries(dishes)) {
    if (count > signatureCount) {
      signature = name
      signatureCount = count
    }
  }
  return {
    dishes,
    collected,
    total: totalDishes,
    rate: totalDishes > 0 ? ((collected / totalDishes) * 100).toFixed(2) : "0.00",
    signature,
    signatureCount,
    cookCount: record?.cookCount || 0,
  }
}

export function loadBreedData(e, myId, date) {
  const userRecords = loadUsersFile(getFilePathByEvent(e))
  const uid = String(myId)
  const userKey = `breed:${uid}:${date}`
  const userBreedCount = userRecords[uid]?.breedCount?.[userKey] || 0
  return { userRecords, userKey, userBreedCount }
}

export function checkPairBreed(userRecords, myId, targetId, date) {
  const uid = String(myId)
  const pairKey = `pair:${[String(myId), String(targetId)].sort().join(":")}:${date}`
  const pairCount = userRecords[uid]?.breedCount?.[pairKey] || 0
  return { pairKey, pairCount }
}

export function commitBreed(e, myId, targetId, breedPigId, userKey, pairKey) {
  const uid = String(myId)
  const tid = String(targetId)
  const todayDate = userKey.slice(-10)
  return atomicUpdate(e, (userRecords) => {
    const myRec = userRecords[uid] || { collected: {} }
    if ((myRec.breedCount?.[userKey] || 0) >= 1) return { committed: false, record: myRec }
    if ((myRec.breedCount?.[pairKey] || 0) >= 1) return { committed: false, record: myRec }
    const success = breedPigId != null
    for (const id of [uid, tid]) {
      const rec = userRecords[id] || { collected: {} }
      if (!rec.collected) rec.collected = {}
      if (breedPigId) {
        rec.collected[breedPigId] = (rec.collected[breedPigId] || 0) + 1
      }
      if (!rec.breedCount) rec.breedCount = {}
      rec.breedCount[pairKey] = (rec.breedCount[pairKey] || 0) + 1
      cleanOldBreedKeys(rec.breedCount, todayDate)
      userRecords[id] = rec
    }
    if (success) {
      const rec = userRecords[uid] || { collected: {} }
      if (!rec.breedCount) rec.breedCount = {}
      rec.breedCount[userKey] = (rec.breedCount[userKey] || 0) + 1
      userRecords[uid] = rec
    }
    return { committed: true, record: userRecords[uid] }
  })
}

export function getRankingList(e, limit = 0) {
  const userRecords = loadUsersFile(getFilePathByEvent(e))
  const result = []
  for (const uid of Object.keys(userRecords)) {
    const record = userRecords[uid]
    const count = countOwned(record)
    if (count > 0) {
      result.push({
        userId: uid,
        count,
        userName: record?.userName || null,
        userAvatar: record?.userAvatar || null,
      })
    }
  }
  result.sort((a, b) => b.count - a.count)
  return limit > 0 ? result.slice(0, limit) : result
}

export function summarizePigCollection(pigs, counts) {
  const owned = pigs.filter(pig => (counts[pig.id] || 0) > 0)
  const favorite = owned.reduce((best, pig) => {
    const count = counts[pig.id] || 0
    return (!best || count > best.count) ? { ...pig, count } : best
  }, null)
  return {
    ownedCount: owned.length,
    totalCount: owned.reduce((sum, pig) => sum + (counts[pig.id] || 0), 0),
    rate: ((owned.length / pigs.length) * 100).toFixed(2),
    favorite,
  }
}