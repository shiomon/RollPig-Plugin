import { createHash } from "node:crypto"
import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const MODEL_DIR = path.dirname(fileURLToPath(import.meta.url))
const DATE_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})
const PIG_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/
const REQUIRED_FIELDS = ["id", "name", "description", "analysis"]
const IMAGE_EXTENSIONS = [".png", ".webp", ".jpg", ".jpeg", ".gif"]

const PLUGIN_ROOT = path.resolve(MODEL_DIR, "..")
const RESOURCE_DIR = path.join(PLUGIN_ROOT, "resources")
export const LOCAL_RESOURCE_DIR = path.join(RESOURCE_DIR, "local")
const PIG_JSON_PATH = path.join(LOCAL_RESOURCE_DIR, "pig.json")

const IMAGE_DIR = path.join(LOCAL_RESOURCE_DIR, "image")

let cachedPigPool
let cachedPigMap

export function getShanghaiDate(timestamp = Date.now()) {
  const parts = Object.fromEntries(
    DATE_FORMATTER.formatToParts(timestamp)
      .filter(part => part.type !== "literal")
      .map(part => [part.type, part.value]),
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

function loadPigPool(file = PIG_JSON_PATH) {
  let data
  try {
    data = JSON.parse(readFileSync(file, "utf8"))
  } catch (error) {
    throw new Error(`读取小猪数据失败：${error.message}`)
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("小猪数据必须是非空数组")
  }

  const ids = new Set()
  for (const [index, pig] of data.entries()) {
    if (!pig || typeof pig !== "object" || Array.isArray(pig)) {
      throw new Error(`小猪数据第 ${index + 1} 项格式错误`)
    }
    for (const field of REQUIRED_FIELDS) {
      if (typeof pig[field] !== "string" || !pig[field].trim()) {
        throw new Error(`小猪数据第 ${index + 1} 项缺少有效字段：${field}`)
      }
    }
    if (!PIG_ID_PATTERN.test(pig.id)) {
      throw new Error(`小猪数据第 ${index + 1} 项 ID 非法：${pig.id}`)
    }
    if (ids.has(pig.id)) {
      throw new Error(`小猪数据存在重复 ID：${pig.id}`)
    }
    ids.add(pig.id)
  }

  return data
}

export function getPigPool() {
  cachedPigPool ??= loadPigPool()
  return cachedPigPool
}

export function getPigMap() {
  if (!cachedPigMap) {
    cachedPigMap = new Map(getPigPool().map(p => [p.id, p]))
  }
  return cachedPigMap
}

export function selectTodayPig(userId, date = getShanghaiDate(), pigPool = getPigPool()) {
  const normalizedUserId = String(userId ?? "").trim()
  if (!normalizedUserId) throw new Error("用户 ID 为空")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`日期格式错误：${date}`)
  if (!Array.isArray(pigPool) || pigPool.length === 0) throw new Error("小猪数据为空")

  const hash = createHash("sha256").update(`${date}:${normalizedUserId}`).digest()
  return pigPool[hash.readUInt32BE(0) % pigPool.length]
}


const IMAGE_INDEX_CACHE = new Map()

function buildImageIndex(imageDir) {
  const index = new Map()
  let names
  try {
    names = readdirSync(imageDir)
  } catch {
    return index
  }
  const ranked = []
  for (const name of names) {
    const dot = name.lastIndexOf(".")
    if (dot <= 0) continue
    const rank = IMAGE_EXTENSIONS.indexOf(name.slice(dot).toLowerCase())
    if (rank < 0) continue
    ranked.push({ id: name.slice(0, dot), rank, file: path.join(imageDir, name) })
  }
  ranked.sort((a, b) => a.rank - b.rank)
  for (const item of ranked) {
    if (!index.has(item.id)) index.set(item.id, item.file)
  }
  return index
}

export function findPigImage(pigId, imageDir = IMAGE_DIR) {
  if (!PIG_ID_PATTERN.test(pigId)) return null
  let index = IMAGE_INDEX_CACHE.get(imageDir)
  if (!index) {
    index = buildImageIndex(imageDir)
    IMAGE_INDEX_CACHE.set(imageDir, index)
  }
  return index.get(pigId) || null
}
