import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.join(__dirname, '..', 'data')
const GROUP_USERS_PATH = path.join(DATA_DIR, 'group', 'users.json')
const PRIVATE_USERS_PATH = path.join(DATA_DIR, 'private', 'users.json')

let groupUserRecords = {}
let privateUserRecords = {}
let dirty = false
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

function ensureDataDirs() {
  fs.mkdirSync(path.join(DATA_DIR, 'group'), { recursive: true })
  fs.mkdirSync(path.join(DATA_DIR, 'private'), { recursive: true })
}

function loadData() {
  groupUserRecords = loadUsersFile(GROUP_USERS_PATH)
  privateUserRecords = loadUsersFile(PRIVATE_USERS_PATH)
}

function saveData() {
  if (!dirty) return
  try {
    fs.writeFileSync(GROUP_USERS_PATH, JSON.stringify(groupUserRecords, null, 2))
    fs.writeFileSync(PRIVATE_USERS_PATH, JSON.stringify(privateUserRecords, null, 2))
    dirty = false
    logger.debug('[RollPig-Plugin] 数据已落盘')
  } catch (err) {
    logger.error('[RollPig-Plugin] 数据保存失败:', err)
  }
}

function markDirty() {
  dirty = true
  if (_saveTimer) clearTimeout(_saveTimer)
  _saveTimer = setTimeout(() => saveData(), 1000)
}

export function initStorage() {
  ensureDataDirs()
  loadData()
  process.on('beforeExit', () => saveData())
}

export function getUserRecords(e) {
  return e.group_id ? groupUserRecords : privateUserRecords
}

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
  markDirty()
  return { claimed: true, count: record.collected[pigId] }
}

export function getPigCollection(e, userId) {
  const userRecords = getUserRecords(e)
  const record = userRecords[String(userId)]
  return record?.collected || {}
}

export function getTodayPigId(e, userId, date) {
  const uid = String(userId)
  const record = (e.group_id ? groupUserRecords : privateUserRecords)[uid]
  if (record?.date === date) return record.pig_id
  const otherRecord = (e.group_id ? privateUserRecords : groupUserRecords)[uid]
  if (otherRecord?.date === date) return otherRecord.pig_id
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
  markDirty()
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
