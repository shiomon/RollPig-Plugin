import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.join(__dirname, '..', 'data')
const PRIVATE_USERS_PATH = path.join(DATA_DIR, 'private', 'users.json')

const caches = new Map()
let _saveTimer = null

function loadUsersFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch (err) {
    logger.error(`[RollPig-Plugin] 数据文件解析失败：${filePath}`, err)
    return {}
  }
}

function getRecordKey(e) {
  return e.group_id ? `group:${e.group_id}` : 'private'
}

function getFilePath(key) {
  if (key === 'private') return PRIVATE_USERS_PATH
  return path.join(DATA_DIR, 'group', String(key.slice(6)), 'users.json')
}

function getCache(e) {
  const key = getRecordKey(e)
  let cache = caches.get(key)
  if (!cache) {
    cache = { data: loadUsersFile(getFilePath(key)), dirty: false }
    caches.set(key, cache)
  }
  return cache
}

function getUserRecords(e) {
  return getCache(e).data
}

function markDirty(e) {
  getCache(e).dirty = true
  if (_saveTimer) clearTimeout(_saveTimer)
  _saveTimer = setTimeout(() => saveData(), 1000)
}

function saveData() {
  for (const [key, cache] of caches) {
    if (!cache.dirty) continue
    try {
      const filePath = getFilePath(key)
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
      fs.writeFileSync(filePath, JSON.stringify(cache.data, null, 2))
      cache.dirty = false
    } catch (err) {
      logger.error(`[RollPig-Plugin] 数据保存失败：${key}`, err)
    }
  }
}

export function initStorage() {
  fs.mkdirSync(path.join(DATA_DIR, 'private'), { recursive: true })
  process.on('beforeExit', () => saveData())
}

export { getUserRecords }

export function recordDailyPig(e, userId, date, pigId) {
  const userRecords = getUserRecords(e)
  const uid = String(userId)
  const record = userRecords[uid] || { collected: {} }
  if (!record.collected) record.collected = {}
  if (record.date === date) {
    return { claimed: false, pig_id: record.pig_id, count: record.collected[pigId] || 0 }
  }
  record.pig_id = pigId
  record.date = date
  record.collected[pigId] = (record.collected[pigId] || 0) + 1
  userRecords[uid] = record
  markDirty(e)
  return { claimed: true, count: record.collected[pigId] }
}

export function getPigCollection(e, userId) {
  const userRecords = getUserRecords(e)
  const record = userRecords[String(userId)]
  return record?.collected || {}
}

export function getTodayPigId(e, userId, date) {
  const userRecords = getUserRecords(e)
  const record = userRecords[String(userId)]
  if (record?.date === date) return record.pig_id
  return null
}

export function recordBreed(e, userIds, breedPigId, breedKey) {
  const userRecords = getUserRecords(e)
  for (const uid of userIds) {
    const key = String(uid)
    const rec = userRecords[key] || { collected: {} }
    if (!rec.collected) rec.collected = {}
    rec.collected[breedPigId] = (rec.collected[breedPigId] || 0) + 1
    if (!rec.breedCount) rec.breedCount = {}
    rec.breedCount[breedKey] = (rec.breedCount[breedKey] || 0) + 1
    userRecords[key] = rec
  }
  markDirty(e)
}

export function getBreedCount(e, userId, breedKey) {
  const userRecords = getUserRecords(e)
  return userRecords[String(userId)]?.breedCount?.[breedKey] || 0
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
