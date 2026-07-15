import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
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

export const PLUGIN_ROOT = path.resolve(MODEL_DIR, "..")
export const RESOURCE_DIR = path.join(PLUGIN_ROOT, "resources")
export const LOCAL_RESOURCE_DIR = path.join(RESOURCE_DIR, "local")
export const PIG_JSON_PATH = path.join(LOCAL_RESOURCE_DIR, "pig.json")
export const CARD_DIR = path.join(LOCAL_RESOURCE_DIR, "card")
export const IMAGE_DIR = path.join(LOCAL_RESOURCE_DIR, "image")

let cachedPigPool

export function getShanghaiDate(timestamp = Date.now()) {
  const parts = Object.fromEntries(
    DATE_FORMATTER.formatToParts(timestamp)
      .filter(part => part.type !== "literal")
      .map(part => [part.type, part.value]),
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function loadPigPool(file = PIG_JSON_PATH) {
  let data
  try {
    data = JSON.parse(readFileSync(file, "utf8"))
  } catch (error) {
    throw new Error(`读取猪猪数据失败：${error.message}`)
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("猪猪数据必须是非空数组")
  }

  const ids = new Set()
  for (const [index, pig] of data.entries()) {
    if (!pig || typeof pig !== "object" || Array.isArray(pig)) {
      throw new Error(`猪猪数据第 ${index + 1} 项格式错误`)
    }
    for (const field of REQUIRED_FIELDS) {
      if (typeof pig[field] !== "string" || !pig[field].trim()) {
        throw new Error(`猪猪数据第 ${index + 1} 项缺少有效字段：${field}`)
      }
    }
    if (!PIG_ID_PATTERN.test(pig.id)) {
      throw new Error(`猪猪数据第 ${index + 1} 项 ID 非法：${pig.id}`)
    }
    if (ids.has(pig.id)) {
      throw new Error(`猪猪数据存在重复 ID：${pig.id}`)
    }
    ids.add(pig.id)
  }

  return data
}

export function getPigPool() {
  cachedPigPool ??= loadPigPool()
  return cachedPigPool
}

export function selectTodayPig(userId, date = getShanghaiDate(), pigPool = getPigPool()) {
  const normalizedUserId = String(userId ?? "").trim()
  if (!normalizedUserId) throw new Error("用户 ID 为空")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`日期格式错误：${date}`)
  if (!Array.isArray(pigPool) || pigPool.length === 0) throw new Error("猪猪数据为空")

  const hash = createHash("sha256").update(`${date}:${normalizedUserId}`).digest()
  return pigPool[hash.readUInt32BE(0) % pigPool.length]
}

export function findPigCard(pigId, cardDir = CARD_DIR) {
  if (!PIG_ID_PATTERN.test(pigId)) return null
  const file = path.join(cardDir, `${pigId}.png`)
  return existsSync(file) ? file : null
}

export function findPigImage(pigId, imageDir = IMAGE_DIR) {
  if (!PIG_ID_PATTERN.test(pigId)) return null
  for (const extension of IMAGE_EXTENSIONS) {
    const file = path.join(imageDir, `${pigId}${extension}`)
    if (existsSync(file)) return file
  }
  return null
}
