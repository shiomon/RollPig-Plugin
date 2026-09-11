export function generateRankHTML(top, total) {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const medals = ['🥇', '🥈', '🥉']
  const rows = top.map((u, i) => {
    const percent = (u.count / total * 100).toFixed(1)
    const rankDisplay = i < 3 ? medals[i] : `<span class="rank-num">${i + 1}</span>`
    const cls = u.isCurrent ? 'row current' : 'row'
    const barWidth = Math.min(percent, 100)
    const name = esc(u.userName || '?')
    const initial = name.charAt(0)
    return `<div class="${cls}">
      <div class="rank">${rankDisplay}</div>
      <div class="avatar"><img src="${esc(u.userAvatar)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="avatar-fallback">${initial}</span></div>
      <div class="info">
        <span class="name">${name}${u.isCurrent ? ' <span class="tag">你</span>' : ''}</span>
        <div class="bar"><div class="bar-fill" style="width:${barWidth}%"></div></div>
      </div>
      <div class="count">${u.count}/${total}<span class="percent">${percent}%</span></div>
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
  .title { font-size: 26px; color: #1a1a1a; font-weight: bold; }
  .subtitle { font-size: 14px; color: #444; margin-top: 6px; }
  .row { display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.6); border-radius: 12px; padding: 10px 16px; margin-bottom: 8px; }
  .row.current { background: rgba(255,182,193,0.2); border: 2px solid #ffb6c1; }
  .rank { font-size: 24px; width: 36px; text-align: center; flex-shrink: 0; }
  .rank-num { font-size: 18px; color: #333; font-weight: bold; }
  .avatar { width: 40px; height: 40px; border-radius: 50%; overflow: hidden; flex-shrink: 0; position: relative; background: linear-gradient(135deg, #ffb6c1, #ffc8dd); }
  .avatar img { width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0; }
  .avatar-fallback { width: 100%; height: 100%; display: none; align-items: center; justify-content: center; font-size: 18px; color: #fff; font-weight: bold; }
  .info { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; }
  .name { font-size: 15px; color: #1a1a1a; white-space: nowrap; flex-shrink: 0; max-width: 120px; overflow: hidden; text-overflow: ellipsis; }
  .tag { background: #ff6b9d; color: white; font-size: 11px; padding: 1px 6px; border-radius: 6px; }
  .bar { flex: 1; height: 8px; background: rgba(0,0,0,0.06); border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 100%; background: linear-gradient(90deg, #ffb6c1, #ff6b9d); border-radius: 4px; }
  .count { font-size: 13px; color: #333; width: 80px; text-align: right; flex-shrink: 0; font-weight: bold; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
  .percent { font-size: 11px; color: #555; font-weight: normal; }
  .footer { text-align: center; margin-top: 16px; color: #555; font-size: 12px; }
</style>
</head>
<body>
  <div class="header">
    <div class="title">🐷 小猪图鉴排行</div>
    <div class="subtitle">共 ${top.length} 位用户 | 总数 ${total} 只小猪</div>
  </div>
  ${rows}
  <div class="footer">发送「/今日小猪」收集更多小猪~</div>
</body>
</html>`
}
