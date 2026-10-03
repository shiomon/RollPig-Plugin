export function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}
export const FONT_LINK = '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;800&family=Noto+Color+Emoji&display=swap" rel="stylesheet">'

export const BASE_RESET_CSS = "* { margin: 0; padding: 0; box-sizing: border-box; }"

export const BODY_FONT = "font-family: 'Noto Sans SC', 'Noto Color Emoji', 'Microsoft YaHei', 'PingFang SC', sans-serif;"