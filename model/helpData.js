export const HELP_TITLE = "🐷 小猪帮助"

export const HELP_GROUPS = [
  {
    title: "日常玩法",
    items: [
      { icon: "🐷", cmd: "/今日小猪", desc: "抽取今天属于你的小猪（每天一次）" },
      { icon: "🏆", cmd: "/小猪排行", desc: "查看本群图鉴收集排行榜" },
      { icon: "📖", cmd: "/猪圈和菜", desc: "查看已收集的小猪图鉴与菜谱" },
      { icon: "🧬", cmd: "@群友/小猪配种", desc: "和群友的小猪配种（失败可换另一人）" },
      { icon: "🔥", cmd: "@群友/烤群友", desc: "把群友的小猪做成菜（失败可换另一人）" },
      { icon: "🥷", cmd: "@群友/偷猪", desc: "偷群友的小猪存入自己图鉴（每天一次）" },
    ],
  },
  {
    title: "小猪工具",
    items: [
      { icon: "🎲", cmd: "/随机小猪 [数量]", desc: "随机来几只小猪看看（数量 1~5）" },
      { icon: "🔍", cmd: "/找猪 关键词", desc: "按名字搜索小猪，如/找猪 安卓" },
      { icon: "🔄", cmd: "/小猪同步", desc: "同步 PigHub 小猪资源（仅主人）" },
    ],
  },
]

export function buildHelpFallback() {
  const lines = [HELP_TITLE, ""]
  HELP_GROUPS.forEach((group, index) => {
    if (index > 0) lines.push("")
    lines.push(`【${group.title}】`)
    for (const item of group.items) {
      lines.push(`${item.icon}「${item.cmd}」—— ${item.desc}`)
    }
  })
  return lines
}