import fs from 'fs'
import path from 'path'
import { findPigImage } from '../utils/helper.js'

export function generateCollectionHTML({ pigData, imageDir, targetName, collected, total, collectedCount, percent, bestPigName, bestCount }) {
  const cells = pigData.map(pig => {
    const isCollected = collected[pig.id] !== undefined
    if (isCollected) {
      const imagePath = findPigImage(imageDir, pig.id)
      let imgTag = '<div class="placeholder">猪</div>'
      if (imagePath) {
        try {
          const ext = imagePath.split('.').pop() || 'png'
          const base64 = fs.readFileSync(imagePath).toString('base64')
          imgTag = `<img src="data:image/${ext};base64,${base64}" alt="${pig.name}">`
        } catch (_) {}
      }
      const cnt = collected[pig.id]
      const cntBadge = cnt > 1 ? `<span class="count-badge">x${cnt}</span>` : ''
      return `<div class="cell collected">${imgTag}${cntBadge}<div class="name">${pig.name}</div></div>`
    } else {
      return `<div class="cell"><div class="lock-icon"></div><div class="name">???</div></div>`
    }
  }).join('')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&family=Noto+Color+Emoji&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: linear-gradient(135deg, #e0f4ff 0%, #f0f8ff 50%, #fff5f8 100%); font-family: 'Noto Sans SC', 'Microsoft YaHei', 'PingFang SC', sans-serif; padding: 24px; width: 820px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .title { font-size: 28px; color: #4a4a4a; display: flex; align-items: center; gap: 12px; font-weight: bold; }
  .pig-icon { width: 44px; height: 44px; background: linear-gradient(135deg, #ffb6c1, #ffc8dd); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; box-shadow: 0 2px 8px rgba(255,182,193,0.5); font-family: 'Noto Color Emoji', sans-serif; }
  .progress-bar { background: rgba(255,255,255,0.85); padding: 10px 20px; border-radius: 20px; font-size: 15px; color: #666; box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
  .progress-bar b { color: #ff6b9d; }
  .info-bar { background: rgba(255,255,255,0.7); border-radius: 16px; padding: 14px 24px; margin-bottom: 22px; display: flex; justify-content: space-around; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
  .info-item { text-align: center; }
  .info-label { color: #aaa; font-size: 13px; margin-bottom: 4px; }
  .info-value { color: #4a4a4a; font-size: 18px; font-weight: bold; }
  .info-value.highlight { color: #ff6b9d; }
  .grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 10px; }
  .cell { background: rgba(255,255,255,0.4); border-radius: 12px; padding: 6px; text-align: center; aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; }
  .cell.collected { background: rgba(255,255,255,0.95); box-shadow: 0 3px 10px rgba(0,0,0,0.1); border: 2px solid #ffe0ec; }
  .cell img { width: 48px; height: 48px; object-fit: contain; border-radius: 8px; }
  .cell .placeholder { font-size: 24px; color: #ffb6c1; font-weight: bold; }
  .lock-icon { width: 18px; height: 14px; background: #bbb; border-radius: 3px; position: relative; opacity: 0.3; }
  .lock-icon::before { content: ''; position: absolute; top: -7px; left: 50%; transform: translateX(-50%); width: 8px; height: 6px; border: 2px solid #bbb; border-bottom: none; border-radius: 4px 4px 0 0; }
  .cell .count-badge { position: absolute; top: 2px; right: 2px; background: #ff6b9d; color: white; font-size: 10px; padding: 1px 5px; border-radius: 8px; font-weight: bold; }
  .cell .name { font-size: 10px; color: #ccc; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 72px; }
  .cell.collected .name { color: #666; }
  .footer { text-align: center; margin-top: 18px; color: #ccc; font-size: 12px; }
</style>
</head>
<body>
  <div class="header">
    <div class="title"><span class="pig-icon">🐷</span><span>${targetName}小猪图鉴</span></div>
    <div class="progress-bar">已收集 <b>${collectedCount}</b> / ${total} | ${percent}%</div>
  </div>
  <div class="info-bar">
    <div class="info-item"><div class="info-label">已收集</div><div class="info-value">${collectedCount} / ${total}</div></div>
    <div class="info-item"><div class="info-label">收集率</div><div class="info-value">${percent}%</div></div>
    <div class="info-item"><div class="info-label">本命猪</div><div class="info-value highlight">${bestPigName} Lv.${bestCount}</div></div>
  </div>
  <div class="grid">${cells}</div>
  <div class="footer">发送「今日猪猪」抽取属于你的小猪~</div>
</body>
</html>`
}