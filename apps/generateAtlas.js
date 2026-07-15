import template from "art-template"
import { existsSync, readFileSync } from "node:fs"
import { rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"

import { LOCAL_RESOURCE_DIR, findPigImage, getPigPool } from "../model/todayPig.js"

const templateFile = path.join(LOCAL_RESOURCE_DIR, "pig-grid.html")
const outputFile = path.join(LOCAL_RESOURCE_DIR, "atlas.png")

export async function generateAtlas() {
  const tempFile = path.join(os.tmpdir(), "rollpig-atlas.html")
  const pigs = getPigPool().map((pig, index) => {
    const image = findPigImage(pig.id)
    if (!image) throw new Error(`猪猪原图缺失：${pig.id}`)
    return { ...pig, index: index + 1, image: pathToFileURL(image).href, owned: true, count: 0 }
  })

  const html = template.render(readFileSync(templateFile, "utf8"), {
    title: "猪猪图鉴",
    owner: "",
    showStats: false,
    renderScale: 2,
    pigs,
  })

  await writeFile(tempFile, html)
  const { default: puppeteer } = await import("puppeteer")
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 2240, height: 2400, deviceScaleFactor: 1 })
    await page.goto(pathToFileURL(tempFile).href, { waitUntil: "networkidle0" })
    await page.evaluate(() => document.fonts.ready)

    const brokenImages = await page.$$eval("img", images =>
      images.filter(image => !image.complete || image.naturalWidth === 0).map(image => image.src),
    )
    if (brokenImages.length) throw new Error(`图鉴图片加载失败：${brokenImages.join(", ")}`)

    const container = await page.$("#container")
    if (!container) throw new Error("图鉴容器缺失")
    await container.screenshot({ path: outputFile, type: "png" })
  } finally {
    await browser.close()
    await rm(tempFile, { force: true })
  }

  return outputFile
}

export async function ensureAtlas() {
  if (existsSync(outputFile)) return outputFile
  return generateAtlas()
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = process.argv.includes("--force") ? await generateAtlas() : await ensureAtlas()
  console.log(`静态猪猪图鉴已就绪：${file}`)
}
