const KEY_PREFIX = "RollPig"
const DAILY_TTL_SECONDS = 3 * 24 * 60 * 60
const COLLECTION_TTL_SECONDS = 10 * 365 * 24 * 60 * 60

function normalizeUserId(userId) {
  const value = String(userId ?? "").trim()
  if (!value) throw new Error("用户 ID 为空")
  return value
}

function collectionKey(userId) {
  return `${KEY_PREFIX}:collection:${normalizeUserId(userId)}`
}

export async function recordDailyPig(redisClient, userId, date, pigId) {
  const normalizedUserId = normalizeUserId(userId)
  const key = collectionKey(normalizedUserId)
  const dailyKey = `${KEY_PREFIX}:daily:${date}:${normalizedUserId}`
  const claimed = await redisClient.set(dailyKey, pigId, { NX: true, EX: DAILY_TTL_SECONDS })

  if (claimed) {
    const count = Number(await redisClient.hIncrBy(key, pigId, 1))
    await redisClient.expire(key, COLLECTION_TTL_SECONDS)
    return { claimed: true, count }
  }

  return { claimed: false, count: Number((await redisClient.hGet(key, pigId)) || 0) }
}

export async function getPigCollection(redisClient, userId) {
  const key = collectionKey(userId)
  const data = await redisClient.hGetAll(key)
  if (Object.keys(data).length) await redisClient.expire(key, COLLECTION_TTL_SECONDS)

  return Object.fromEntries(
    Object.entries(data)
      .map(([pigId, count]) => [pigId, Number(count)])
      .filter(([, count]) => Number.isInteger(count) && count > 0),
  )
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
