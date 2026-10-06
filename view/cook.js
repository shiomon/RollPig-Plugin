import { esc, getFontLink, BASE_RESET_CSS, BODY_FONT, EMOJI_FONT } from "../utils/html.js"

export function generateCookHTML(data) {

  const subtitle = data.success
    ? `<div class="subtitle success">🎉 ${esc(data.source)}【${esc(data.pigName)}】做菜成功...</div>`
    : `<div class="subtitle fail">💨 ${esc(data.source)}【${esc(data.pigName)}】做菜失败...</div>`

  const dishImgStyle = data.success ? "" : "filter: grayscale(1) brightness(0.6);"
  const smokeIcon = data.success ? "" : `<div class="smoke-icon"><span class="puff" style="width:6px;height:6px;bottom:2px;opacity:0.7"></span><span class="puff" style="width:10px;height:10px;bottom:8px;opacity:0.5"></span><span class="puff" style="width:14px;height:14px;bottom:18px;opacity:0.3"></span><span class="puff" style="width:18px;height:18px;bottom:30px;opacity:0.15"></span></div>`

  const reviewSection = data.success
    ? `<div class="review">真香！评语：${esc(data.review)}</div>`
    : `<div class="review fail">${esc(data.failLine)}</div>`

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
${getFontLink()}
<style>
  ${BASE_RESET_CSS}
  body { margin: 0; }
  #container { background: linear-gradient(135deg, #fff8e1 0%, #fff3e0 50%, #ffe0b2 100%); ${BODY_FONT} padding: 24px; width: 520px; }
  .header { text-align: center; margin-bottom: 8px; font-size: 24px; color: #1a1a1a; font-weight: bold; ${EMOJI_FONT} }
  .subtitle { text-align: center; font-size: 17px; font-weight: bold; margin-bottom: 16px; ${EMOJI_FONT} }
  .subtitle.success { color: #e65100; }
  .subtitle.fail { color: #d32f2f; }
  .images { display: flex; align-items: center; justify-content: center; gap: 0; width: 100%; margin-bottom: 12px; }
  .img-box { text-align: center; flex-shrink: 0; width: 200px; }
  .img-wrap { width: 200px; height: 200px; border-radius: 12px; overflow: hidden; position: relative; box-shadow: 0 6px 20px rgba(0,0,0,0.18); }
  .img-box img { width: 100%; height: 100%; object-fit: cover; }
  .smoke-icon { position: absolute; top: 4px; right: 8px; width: 30px; height: 50px; }
  .puff { position: absolute; left: 50%; transform: translateX(-50%); background: rgba(180,180,180,0.8); border-radius: 50%; }
  .img-box .name { font-size: 17px; color: #1a1a1a; font-weight: bold; margin-top: 8px; }
  .img-box .desc { font-size: 13px; color: #777; margin-top: 4px; line-height: 1.4; padding: 0 8px; }
  .arrow { flex-shrink: 0; margin: 0 12px; }
  .divider { height: 1px; background: rgba(0,0,0,0.1); margin: 16px 0; }
  .review { text-align: center; font-size: 16px; color: #e65100; font-weight: bold; line-height: 1.6; }
  .review.fail { color: #d32f2f; }
  .footer { text-align: center; margin-top: 12px; font-size: 13px; color: #999; }
</style>
</head>
<body>
<div id="container">
  <div class="header">🐷 烤群友</div>
  ${subtitle}
  <div class="images">
    <div class="img-box">
      <div class="img-wrap">
        <img src="${esc(data.pigImage)}" onerror="this.style.display='none'">
      </div>
      <div class="name">${esc(data.pigName)}</div>
      <div class="desc">${esc(data.pigDesc)}</div>
    </div>
    <svg class="arrow" viewBox="0 0 24 24" width="40" height="40"><path d="M4 12h14M13 6l6 6-6 6" stroke="#ff8a65" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <div class="img-box">
      <div class="img-wrap">
        <img src="${esc(data.dishImage)}" style="${dishImgStyle}" onerror="this.style.display='none'">
        ${smokeIcon}
      </div>
      <div class="name">${esc(data.dishName)}</div>
      <div class="desc">${esc(data.dishDesc)}</div>
    </div>
  </div>
  <div class="divider"></div>
  ${reviewSection}
  <div class="footer">${data.success ? '下次还找你做菜~' : '明天洗个手试试~'}</div>
</div>
</body>
</html>`
}
