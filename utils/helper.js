export function getButtons() {
  return segment.button(
    [
      { text: "今日小猪", input: "/今日小猪" },
      { text: "小猪菜肴", input: "/小猪菜肴" },
      { text: "小猪排行", input: "/小猪排行" }
    ],
    [
      { text: "我的猪圈", input: "/我的猪圈" },
      { text: "小猪配种", input: "（删@机器人，然后@群友）/小猪配种" }
    ]
  )
}

export function calcCompatibility(id1, id2, date) {
  const str = [id1, id2].sort().join('') + date
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % 101
}

export function getMatchDesc(score) {
  if (score >= 90) return '天作之合！这两只小猪简直是命中注定的小猪情侣！'
  if (score >= 75) return '非常般配！两只小猪在一起会很开心~'
  if (score >= 60) return '挺不错的配对，有一定默契度。'
  if (score >= 40) return '一般般吧，需要多磨合磨合。'
  if (score >= 20) return '配对度不高，两只小猪可能合不来。'
  return '完全不搭...这两只小猪还是各走各的路吧。'
}
