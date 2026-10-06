import { esc, getFontLink, BASE_RESET_CSS, BODY_FONT, EMOJI_FONT } from "../utils/html.js"

export const BREED_TEXTS = {
  successLabel: "配种诞生了新小猪！",
  successFooter: "双方图鉴已收录此小猪！",
  failLabel: "完全不搭...这两只小猪还是各走各的路吧。",
  failMsg: "配种失败...",
  failSub: "般配度太低，没有诞生小猪。",
  failFooter: "再找别的群友试试吧~",
}

export function generateBreedHTML(data) {

  const childSection = data.success
    ? `<div class="child-label">${BREED_TEXTS.successLabel}</div>
       <div class="child">
         <img src="${esc(data.breedImage)}" onerror="this.style.display='none'">
         <div class="name">${esc(data.breedName)}</div>
         <div class="description">${esc(data.breedDescription)}</div>
         <div class="analysis">${esc(data.breedAnalysis)}</div>
       </div>
       <div class="footer">${BREED_TEXTS.successFooter}</div>`
    : `<div class="child-label fail">${BREED_TEXTS.failLabel}</div>
       <div class="fail-msg">${BREED_TEXTS.failMsg}</div>
       <div class="fail-sub">${BREED_TEXTS.failSub}</div>
       <div class="footer">${BREED_TEXTS.failFooter}</div>`

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
${getFontLink()}
<style>
  ${BASE_RESET_CSS}
  body { margin: 0; }
  #container { background: linear-gradient(135deg, #e0f4ff 0%, #f0f8ff 50%, #fff5f8 100%); ${BODY_FONT} padding: 24px; width: 500px; }
  .header { text-align: center; margin-bottom: 16px; font-size: 24px; color: #1a1a1a; font-weight: bold; ${EMOJI_FONT} }
  .parents { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 12px; }
  .pig { text-align: center; }
  .pig img { width: 150px; height: 150px; object-fit: cover; border-radius: 12px; }
  .pig .name { font-size: 16px; color: #1a1a1a; margin-top: 6px; }
  .cross { font-size: 28px; color: #ff6b9d; font-weight: bold; }
  .score-box { text-align: center; margin-bottom: 16px; }
  .score { font-size: 18px; color: #ff6b9d; font-weight: bold; }
  .desc { font-size: 16px; color: #555; margin-top: 4px; }
  .divider { height: 1px; background: rgba(0,0,0,0.08); margin: 16px 0; }
  .child-label { text-align: center; font-size: 18px; color: #1a1a1a; margin-bottom: 12px; }
  .child-label.fail { color: #d32f2f; font-size: 20px; }
  .fail-msg { text-align: center; font-size: 18px; color: #d32f2f; margin-bottom: 8px; font-weight: bold; }
  .fail-sub { text-align: center; font-size: 16px; color: #555; margin-bottom: 16px; }
  .child { text-align: center; }
  .child img { width: 300px; height: 300px; object-fit: cover; border-radius: 16px; }
  .child .name { font-size: 20px; color: #1a1a1a; font-weight: bold; margin-top: 10px; }
  .child .description { font-size: 15px; color: #444; margin-top: 8px; line-height: 1.6; }
  .child .analysis { font-size: 15px; color: #555; margin-top: 6px; line-height: 1.6; }
  .footer { text-align: center; margin-top: 16px; font-size: 16px; color: #666; }
</style>
</head>
<body>
<div id="container">
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
    <div class="score">般配度：${data.score}%</div>
    <div class="desc">${esc(data.desc)}</div>
  </div>
  <div class="divider"></div>
  ${childSection}
</div>
</body>
</html>`
}
