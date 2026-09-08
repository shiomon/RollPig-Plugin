export function generateRankHTML(top, total) {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const rows = top.map((u, i) => {
    const percent = (u.count / total * 100).toFixed(1)
    const medalClass = i < 3 ? `rank rank-${i + 1}` : 'rank'
    const cls = u.isCurrent ? 'row current' : 'row'
    const barWidth = Math.min(percent, 100)
    const name = esc(u.userName || '?')
    const initial = name.charAt(0)
    return `<div class="${cls}">
      <div class="${medalClass}">${i + 1}</div>
      <div class="avatar"><img src="${esc(u.userAvatar)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="avatar-fallback">${initial}</span></div>
      <div class="info">
        <div class="name">${name}${u.isCurrent ? ' <span class="tag">你</span>' : ''}</div>
        <div class="bar"><div class="bar-fill" style="width:${barWidth}%"></div></div>
      </div>
      <div class="count">${u.count}/${total}</div>
    </div>`
  }).join('')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&family=Noto+Color+Emoji&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: linear-gradient(135deg, #e0f4ff 0%, #f0f8ff 50%, #fff5f8 100%); font-family: 'Noto Sans SC', 'Noto Color Emoji', 'Microsoft YaHei', 'PingFang SC', sans-serif; padding: 24px; width: 700px; }
  .header { text-align: center; margin-bottom: 20px; }
  .title { font-size: 26px; color: #4a4a4a; font-weight: bold; }
  .subtitle { font-size: 14px; color: #aaa; margin-top: 6px; }
  .row { display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.6); border-radius: 12px; padding: 10px 16px; margin-bottom: 8px; }
  .row.current { background: rgba(255,182,193,0.2); border: 2px solid #ffb6c1; }
  .rank { font-size: 18px; width: 36px; text-align: center; flex-shrink: 0; color: #888; font-weight: bold; }
  .rank-1 { color: #e6a817; font-size: 22px; }
  .rank-2 { color: #b0b0b0; font-size: 22px; }
  .rank-3 { color: #cd7f32; font-size: 22px; }
  .avatar { width: 40px; height: 40px; border-radius: 50%; overflow: hidden; flex-shrink: 0; position: relative; background: linear-gradient(135deg, #ffb6c1, #ffc8dd); }
  .avatar img { width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0; }
  .avatar-fallback { width: 100%; height: 100%; display: none; align-items: center; justify-content: center; font-size: 18px; color: #fff; font-weight: bold; }
  .info { flex: 1; min-width: 0; }
  .name { font-size: 15px; color: #4a4a4a; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tag { background: #ff6b9d; color: white; font-size: 11px; padding: 1px 6px; border-radius: 6px; }
  .bar { height: 6px; background: rgba(0,0,0,0.06); border-radius: 3px; overflow: hidden; }
  .bar-fill { height: 100%; background: linear-gradient(90deg, #ffb6c1, #ff6b9d); border-radius: 3px; }
  .count { font-size: 14px; color: #888; width: 70px; text-align: right; flex-shrink: 0; font-weight: bold; }
  .footer { text-align: center; margin-top: 16px; color: #ccc; font-size: 12px; }
</style>
</head>
<body>
  <div class="header">
    <div class="title">🐷 小猪图鉴排行</div>
    <div class="subtitle">共 ${top.length} 位用户 | 总数 ${total} 只小猪</div>
  </div>
  ${rows}
  <div class="footer">发送「今日猪猪」收集更多小猪~</div>
</body>
</html>`
}