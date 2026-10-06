import fs from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

export function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

const FONT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "resources", "fonts")

export function getFontLink() {
  try {
    const css = fs.readFileSync(path.join(FONT_DIR, "emoji.css"), "utf8")
    const fontDirUrl = pathToFileURL(FONT_DIR).href + "/"
    return css
      .replace(/font-display:\s*swap/g, "font-display:block")
      .replace(/url\("__FONT_DIR__\/([^"]+\.woff2)"\)/g, (_, name) =>
        `url("${fontDirUrl}${name}")`)
  } catch (e) {
    console.warn("[RollPig-Plugin] emoji 字体加载失败：", e?.message || e)
    return ""
  }
}

export const BASE_RESET_CSS = "* { margin: 0; padding: 0; box-sizing: border-box; }"

export const BODY_FONT = "font-family: 'Noto Sans CJK SC', 'Noto Sans SC', 'Microsoft YaHei', 'PingFang SC', sans-serif;"

export const EMOJI_FONT = "font-family: 'Noto Color Emoji', 'Noto Sans CJK SC', 'Noto Sans SC', 'Microsoft YaHei', 'PingFang SC', sans-serif;"