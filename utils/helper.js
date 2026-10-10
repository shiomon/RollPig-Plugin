export const COMMAND_PREFIX = "^(?:（[^）]*）)?[/／#]?"

export const BREED_SUCCESS_SCORE = 40
export const COOK_SUCCESS_RATE = 0.6
export const STEAL_SUCCESS_RATE = 0.3
export const RANDOM_PIG_MAX = 5
export const RANK_LIMIT = 50

export function isQQBot(e) {
  return e?.bot?.version?.id === "QQBot" || e?.adapter_id === "QQBot"
}

const NON_QQ_TIP = "可发：/今日小猪 /小猪图鉴 /小猪排行\n可@人：/小猪配种 /烤群友 /偷猪"

export function getButtons(e) {
  if (!isQQBot(e)) return NON_QQ_TIP
  return segment.button(
    [
      { text: "今日小猪", callback: "/今日小猪" },
      { text: "小猪图鉴", callback: "/小猪图鉴" },
      { text: "小猪排行", callback: "/小猪排行" }
    ],
    [
      { text: "小猪配种", input: "（请@群友）/小猪配种" },
      { text: "烤群友", input: "（请@群友）/烤群友" },
      { text: "偷猪", input: "（请@群友）/偷猪" }
    ]
  )
}

export function at(e) {
  return e.group_id ? [segment.at(e.user_id)] : []
}

export function calcCompatibility(id1, id2, date) {
  const str = [id1, id2].sort().join("") + date
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % 101
}

export function getMatchDesc(score) {
  if (score >= 90) return "天作之合！这两只小猪简直是命中注定的小猪情侣！"
  if (score >= 75) return "非常般配！两只小猪在一起会很开心~"
  if (score >= 60) return "挺不错的配对，有一定默契度。"
  if (score >= 40) return "刚好擦出火花，这对小猪意外地合得来~"
  if (score >= 20) return "配对度不高，两只小猪可能合不来。"
  return "完全不搭...这两只小猪还是各走各的路吧。"
}

export function isBreedSuccess(score) {
  return Number(score) >= BREED_SUCCESS_SCORE
}

export function normalizeAtId(at) {
  if (at == null) return null
  const raw = Array.isArray(at) ? at[0] : String(at).split(",")[0]
  const id = String(raw ?? "").trim()
  return id || null
}
