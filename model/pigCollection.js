import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { normalizeCollected } from '../utils/helper.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.join(__dirname, '..', 'data')
const GROUP_USERS_PATH = path.join(DATA_DIR, 'group', 'users.json')
const PRIVATE_USERS_PATH = path.join(DATA_DIR, 'private', 'users.json')
const OLD_RECORDS_PATH = path.join(DATA_DIR, 'records.json')

let groupUserRecords = {}
let privateUserRecords = {}
let dirty = false
let _saveTimer = null

function loadUsersFile(filePath) {
  if (fs.existsSync(filePath)) {
    const records = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    for (const userId of Object.keys(records)) {
      normalizeCollected(records[userId])
    }
    return records
  }
  return {}
}

function migrateOldRecords() {
  if (!fs.existsSync(OLD_RECORDS_PATH)) return
  try {
    const oldRecords = JSON.parse(fs.readFileSync(OLD_RECORDS_PATH, 'utf-8'))
    for (const userId of Object.keys(oldRecords)) {
      normalizeCollected(oldRecords[userId])
    }
    const groupDir = path.join(DATA_DIR, 'group')
    if (!fs.existsSync(groupDir)) fs.mkdirSync(groupDir, { recursive: true })
    fs.writeFileSync(GROUP_USERS_PATH, JSON.stringify(oldRecords, null, 2))
    fs.unlinkSync(OLD_RECORDS_PATH)
    logger.info(`[RollPig-Plugin] 迁移了 ${Object.keys(oldRecords).length} 条旧用户数据到 group/users.json`)
  } catch (err) {
    logger.error('[RollPig-Plugin] 旧数据迁移失败:', err)
  }
}

function loadData() {
  migrateOldRecords()
  groupUserRecords = loadUsersFile(GROUP_USERS_PATH)
  privateUserRecords = loadUsersFile(PRIVATE_USERS_PATH)
}

function saveData() {
  if (!dirty) return
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    const groupDir = path.join(DATA_DIR, 'group')
    const privateDir = path.join(DATA_DIR, 'private')
    if (!fs.existsSync(groupDir)) fs.mkdirSync(groupDir, { recursive: true })
    if (!fs.existsSync(privateDir)) fs.mkdirSync(privateDir, { recursive: true })
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
  loadData()
  process.on('beforeExit', () => saveData())
}

export function getUserRecords(e) {
  return e.group_id ? groupUserRecords : privateUserRecords
}

export function recordDailyPig(e, userId, date, pigId) {
  const userRecords = getUserRecords(e)
  const uid = String(userId)
  const record = normalizeCollected(userRecords[uid] || {})
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
  const record = normalizeCollected(userRecords[String(userId)] || {})
  return record.collected
}

export function getTodayPigId(e, userId, date) {
  const userRecords = getUserRecords(e)
  const record = userRecords[String(userId)]
  if (record?.date === date) return record.pig_id
  return null
}

export function getUserRecord(e, userId) {
  const userRecords = getUserRecords(e)
  return normalizeCollected(userRecords[String(userId)] || {})
}

export function recordBreed(e, userIds, breedPigId, breedKey) {
  const userRecords = getUserRecords(e)
  for (const uid of userIds) {
    const key = String(uid)
    const rec = normalizeCollected(userRecords[key] || {})
    rec.collected[breedPigId] = (rec.collected[breedPigId] || 0) + 1
    if (!rec.breedCount) rec.breedCount = {}
    rec.breedCount[breedKey] = (rec.breedCount[breedKey] || 0) + 1
    userRecords[key] = rec
  }
  markDirty()
}

export function getBreedCount(e, userId, breedKey) {
  const userRecords = getUserRecords(e)
  return parseInt(userRecords[String(userId)]?.breedCount?.[breedKey] || 0)
}

export function summarizePigCollection(pigs, counts) {
  const items = pigs.map((pig, index) => ({ ...pig, index: index + 1, count: counts[pig.id] || 0 }))
  const owned = items.filter(pig => pig.count > 0)
  const favorite = owned.reduce((best, pig) => (!best || pig.count > best.count ? pig : best), null)
  return {
    items,
    ownedCount: owned.length,
    totalCount: owned.reduce((sum, pig) => sum + pig.count, 0),
    rate: ((owned.length / pigs.length) * 100).toFixed(2),
    favorite,
  }
}
