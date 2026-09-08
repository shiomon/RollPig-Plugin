export function generateBreedHTML(data) {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&family=Noto+Color+Emoji&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: linear-gradient(135deg, #e0f4ff 0%, #f0f8ff 50%, #fff5f8 100%); font-family: 'Noto Sans SC', 'Noto Color Emoji', 'Microsoft YaHei', 'PingFang SC', sans-serif; padding: 24px; width: 500px; }
  .header { text-align: center; margin-bottom: 16px; font-size: 20px; color: #4a4a4a; font-weight: bold; }
  .parents { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 12px; }
  .pig { text-align: center; }
  .pig img { width: 150px; height: 150px; object-fit: cover; border-radius: 12px; }
  .pig .name { font-size: 14px; color: #4a4a4a; margin-top: 6px; }
  .cross { font-size: 28px; color: #ff6b9d; font-weight: bold; }
  .score-box { text-align: center; margin-bottom: 16px; }
  .score { font-size: 16px; color: #ff6b9d; font-weight: bold; }
  .desc { font-size: 14px; color: #888; margin-top: 4px; }
  .divider { height: 1px; background: rgba(0,0,0,0.08); margin: 16px 0; }
  .child-label { text-align: center; font-size: 15px; color: #4a4a4a; margin-bottom: 12px; }
  .child { text-align: center; }
  .child img { width: 300px; height: 300px; object-fit: cover; border-radius: 16px; }
  .child .name { font-size: 18px; color: #4a4a4a; font-weight: bold; margin-top: 10px; }
  .child .description { font-size: 13px; color: #666; margin-top: 8px; line-height: 1.6; }
  .child .analysis { font-size: 13px; color: #888; margin-top: 6px; line-height: 1.6; }
  .footer { text-align: center; margin-top: 16px; font-size: 13px; color: #aaa; }
</style>
</head>
<body>
  <div class="header">🐷 小猪配种结果</div>
  <div class="parents">
    <div class="pig">
      <img src="${esc(data.myImage)}" onerror="this.style.display='none'">
      <div class="name">${esc(data.myName)}</div>
    </div>
    <div class="cross">×</div>
    <div class="pig">
      <img src="${esc(data.targetImage)}" onerror="this.style.display='none'">
      <div class="name">${esc(data.targetName)}</div>
    </div>
  </div>
  <div class="score-box">
    <div class="score">般配度：${data.score}/100</div>
    <div class="desc">${esc(data.desc)}</div>
  </div>
  <div class="divider"></div>
  <div class="child-label">配种诞生了新小猪！</div>
  <div class="child">
    <img src="${esc(data.breedImage)}" onerror="this.style.display='none'">
    <div class="name">${esc(data.breedName)}</div>
    <div class="description">${esc(data.breedDescription)}</div>
    <div class="analysis">${esc(data.breedAnalysis)}</div>
  </div>
  <div class="footer">双方图鉴已收录此小猪！</div>
</body>
</html>`
}