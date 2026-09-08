import { randomInt } from "node:crypto"
import { existsSync, readFileSync, statSync } from "node:fs"
import { mkdir, rename, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const MODEL_DIR = path.dirname(fileURLToPath(import.meta.url))
const PIGHUB_SITE = "https://pighub.top"
const PIGHUB_API_URL = `${PIGHUB_SITE}/api/images?sort=1`
const SYNC_CONCURRENCY = 6
const CONTENT_TYPE_EXTENSIONS = {
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/bmp": ".bmp",
  "image/avif": ".avif",
  "image/svg+xml": ".svg",
}

export const PIGHUB_RESOURCE_DIR = path.resolve(MODEL_DIR, "../resources/pighub")
export const PIGHUB_JSON_PATH = path.join(PIGHUB_RESOURCE_DIR, "images.json")
export const PIGHUB_IMAGE_DIR = path.join(PIGHUB_RESOURCE_DIR, "image")

let cachedStore
let syncPromise

function normalizeExtension(extension) {
  return extension.toLowerCase() === ".jpeg" ? ".jpg" : extension.toLowerCase()
}

function detectImageExtension(buffer, contentType, url, filename) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return ".jpg"
  if (buffer.toString("ascii", 0, 3) === "GIF") return ".gif"
  if (buffer[0] === 0x89 && buffer.toString("ascii", 1, 4) === "PNG") return ".png"
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return ".webp"
  }

  const type = String(contentType || "").split(";")[0].toLowerCase()
  if (CONTENT_TYPE_EXTENSIONS[type]) return CONTENT_TYPE_EXTENSIONS[type]

  const urlExtension = normalizeExtension(path.extname(new URL(url).pathname))
  if (urlExtension) return urlExtension

  const filenameExtension = normalizeExtension(path.extname(filename))
  return filenameExtension || ".jpg"
}

function getPigHubImageUrl(image) {
  return new URL(image.image_url || `/images/${encodeURIComponent(image.filename)}`, PIGHUB_SITE).href
}

function getFileSize(file) {
  try {
    return statSync(file).size
  } catch {
    return 0
  }
}

export function loadPigHubStore(file = PIGHUB_JSON_PATH) {
  let store
  try {
    store = JSON.parse(readFileSync(file, "utf8"))
  } catch (error) {
    throw new Error(`读取 PigHub 数据失败：${error.message}`)
  }

  if (!store || !Array.isArray(store.images) || store.images.length === 0) {
    throw new Error("PigHub 数据必须包含非空 images 数组")
  }
  if (store.count !== store.images.length) {
    throw new Error(`PigHub 数据数量不一致：${store.count}/${store.images.length}`)
  }

  const ids = new Set()
  const filenames = new Set()
  const localFiles = new Set()
  for (const [index, image] of store.images.entries()) {
    if (!Number.isInteger(image.id) || typeof image.title !== "string") {
      throw new Error(`PigHub 数据第 ${index + 1} 项格式错误`)
    }
    if (
      typeof image.filename !== "string" ||
      !image.filename ||
      path.basename(image.filename) !== image.filename
    ) {
      throw new Error(`PigHub 数据第 ${index + 1} 项文件名非法`)
    }
    if (typeof image.url !== "string" || !image.url.startsWith("https://pighub.top/images/")) {
      throw new Error(`PigHub 数据第 ${index + 1} 项 URL 非法`)
    }
    if (
      typeof image.local_file !== "string" ||
      !image.local_file ||
      path.basename(image.local_file) !== image.local_file ||
      !Number.isInteger(image.size) ||
      image.size <= 0
    ) {
      throw new Error(`PigHub 数据第 ${index + 1} 项本地文件信息非法`)
    }
    if (ids.has(image.id)) throw new Error(`PigHub 数据存在重复 ID：${image.id}`)
    if (filenames.has(image.filename))
      throw new Error(`PigHub 数据存在重复文件名：${image.filename}`)
    if (localFiles.has(image.local_file))
      throw new Error(`PigHub 数据存在重复本地文件名：${image.local_file}`)
    ids.add(image.id)
    filenames.add(image.filename)
    localFiles.add(image.local_file)
  }

  return store
}

export function getPigHubStore() {
  cachedStore ??= loadPigHubStore()
  return cachedStore
}

export function isPigHubReady() {
  try {
    const store = getPigHubStore()
    return store.images.every(image => {
      const file = findPigHubImage(image.local_file)
      return file && getFileSize(file) === image.size
    })
  } catch {
    return false
  }
}

export function selectRandomPigHubImage(store = getPigHubStore()) {
  if (!Array.isArray(store.images) || store.images.length === 0) throw new Error("PigHub 图片为空")
  return store.images[randomInt(store.images.length)]
}

export function findPigHubImage(localFile, imageDir = PIGHUB_IMAGE_DIR) {
  if (typeof localFile !== "string" || path.basename(localFile) !== localFile) return null
  const file = path.join(imageDir, localFile)
  return existsSync(file) ? file : null
}

async function fetchWithRetry(url, retries = 3, timeout = 30000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(timeout) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response
    } catch (error) {
      if (attempt === retries) throw error
      await new Promise(r => setTimeout(r, 1000 * attempt))
    }
  }
}

async function buildPigHubRecord(image, index, previousById) {
  const id = Number(image.id)
  const title = String(image.title || "").trim()
  const filename = String(image.filename || "").trim()
  if (!Number.isInteger(id) || id <= 0 || !title || !filename || path.basename(filename) !== filename) {
    throw new Error(`PigHub 接口第 ${index + 1} 项格式错误`)
  }

  const url = getPigHubImageUrl({ ...image, filename })
  const base = {
    id,
    title,
    filename,
    mtime: Number(image.mtime || 0),
    view_count: Number(image.view_count || 0),
    download_count: Number(image.download_count || 0),
    url,
  }

  const previous = previousById.get(id)
  const previousFile = previous && findPigHubImage(previous.local_file)
  if (previousFile) {
    return {
      ...base,
      local_file: previous.local_file,
      content_type: previous.content_type || "application/octet-stream",
      size: getFileSize(previousFile),
    }
  }

  const response = await fetchWithRetry(url, 3, 30000)
  const contentType = response.headers.get("content-type") || "application/octet-stream"
  const buffer = Buffer.from(await response.arrayBuffer())
  if (!buffer.length) throw new Error(`下载 PigHub 图片为空：${filename}`)

  const extension = detectImageExtension(buffer, contentType, url, filename)
  const localFile = `${id}${extension}`
  await writeFile(path.join(PIGHUB_IMAGE_DIR, localFile), buffer)

  return { ...base, local_file: localFile, content_type: contentType.split(";")[0], size: buffer.length }
}

export async function syncPigHubStore() {
  await mkdir(PIGHUB_IMAGE_DIR, { recursive: true })

  let previousById = new Map()
  try {
    previousById = new Map(loadPigHubStore().images.map(image => [image.id, image]))
  } catch {}

  const response = await fetchWithRetry(PIGHUB_API_URL, 3, 30000)
  const body = await response.json()
  const images = Array.isArray(body.data) ? body.data : []
  if (!images.length) throw new Error("PigHub 接口未返回图片数据")

  let next = 0
  let done = 0
  let failed = 0
  const total = images.length
  const records = new Array(total)
  const workers = Array.from({ length: Math.min(SYNC_CONCURRENCY, total) }, async () => {
    while (next < total) {
      const index = next++
      try {
        records[index] = await buildPigHubRecord(images[index], index, previousById)
      } catch (error) {
        failed++
        logger.warn(`[RollPig-Plugin] PigHub 跳过第 ${index + 1} 张：${error.message}`)
      }
      done++
      if (done % 100 === 0) logger.info(`[RollPig-Plugin] PigHub 同步进度：${done}/${total}`)
    }
  })
  await Promise.all(workers)

  const validRecords = records.filter(Boolean)
  if (!validRecords.length) throw new Error("PigHub 所有图片下载失败")

  const store = {
    source: PIGHUB_API_URL,
    synced_at: new Date().toISOString(),
    count: validRecords.length,
    images: validRecords,
    local_bytes: validRecords.reduce((sum, image) => sum + image.size, 0),
  }
  const tempFile = `${PIGHUB_JSON_PATH}.tmp`
  await writeFile(tempFile, `${JSON.stringify(store, null, 2)}\n`, "utf8")
  await rename(tempFile, PIGHUB_JSON_PATH)
  cachedStore = loadPigHubStore()
  return { ...cachedStore, _failed: failed }
}

export function ensurePigHubSynced() {
  if (isPigHubReady()) return Promise.resolve(getPigHubStore())
  syncPromise ??= syncPigHubStore().finally(() => {
    syncPromise = null
  })
  return syncPromise
}
