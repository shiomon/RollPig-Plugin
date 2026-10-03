import { esc, FONT_LINK, BASE_RESET_CSS, BODY_FONT } from "../utils/html.js"
import { HELP_GROUPS } from "../model/helpData.js"

export function generateHelpHTML() {
  const groups = HELP_GROUPS.map((group, gi) => `
    ${gi > 0 ? '<div class="divider"></div>' : ""}
    <div class="group">
      <div class="group-title">✦ ${esc(group.title)}</div>
      ${group.items.map(item => `
      <div class="item">
        <div class="icon">${item.icon}</div>
        <div class="text">
          <div class="cmd">${esc(item.cmd)}</div>
          <div class="desc">${esc(item.desc)}</div>
        </div>
      </div>`).join("")}
    </div>`).join("")

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
${FONT_LINK}
<style>
  ${BASE_RESET_CSS}
  body { width: 540px; padding: 24px; background: linear-gradient(150deg, #d3e4ff 0%, #c3d3ff 45%, #ffc6dc 100%); ${BODY_FONT} }
  .card { padding: 26px 24px 20px; border-radius: 22px; background: rgb(255 255 255 / 80%); box-shadow: 0 18px 44px rgb(120 140 170 / 38%); }
  .title { text-align: center; color: #e26c82; font-size: 34px; font-weight: 800; }
  .subtitle { margin: 8px 0 20px; text-align: center; color: #3f4d63; font-size: 14px; }
  .group-title { margin: 4px 0 12px; color: #5b6b7f; font-size: 15px; font-weight: 700; }
  .item { display: flex; align-items: center; gap: 14px; padding: 11px 14px; margin-bottom: 10px; border: 1px solid #e6eef7; border-radius: 14px; background: rgb(255 255 255 / 92%); box-shadow: 0 4px 14px rgb(120 140 170 / 18%); }
  .icon { display: flex; flex-shrink: 0; align-items: center; justify-content: center; width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, #ffe3ec, #e3f0ff); font-size: 24px; }
  .text { min-width: 0; }
  .cmd { color: #2b3a4a; font-size: 16px; font-weight: 700; }
  .desc { margin-top: 3px; color: #4a586e; font-size: 12.5px; }
  .divider { height: 1px; margin: 16px 0; background: linear-gradient(90deg, transparent, #dbe6f2, transparent); }
  .footer { margin-top: 14px; text-align: center; color: #626e7f; font-size: 12px; }
</style>
</head>
<body>
  <div class="card">
    <div class="title">🐷 小猪帮助</div>
    <div class="subtitle">收集小猪图鉴和菜谱吧，偷群友的也不错哦~</div>
    ${groups}
    <div class="footer">点击下方按钮或相应指令快速开始</div>
  </div>
</body>
</html>`
}