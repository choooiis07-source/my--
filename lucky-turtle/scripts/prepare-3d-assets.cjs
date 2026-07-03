const { app, nativeImage } = require('electron')
const { readFileSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')

function floodRemove(image, isBackground) {
  const { width, height } = image.getSize()
  const bitmap = image.toBitmap()
  const visited = new Uint8Array(width * height)
  const queue = new Int32Array(width * height)
  let head = 0
  let tail = 0
  const enqueue = (index) => {
    if (visited[index]) return
    const offset = index * 4
    if (!isBackground(bitmap[offset + 2], bitmap[offset + 1], bitmap[offset])) return
    visited[index] = 1
    queue[tail++] = index
  }
  for (let x = 0; x < width; x += 1) { enqueue(x); enqueue((height - 1) * width + x) }
  for (let y = 0; y < height; y += 1) { enqueue(y * width); enqueue(y * width + width - 1) }
  while (head < tail) {
    const index = queue[head++]
    const x = index % width
    const y = Math.floor(index / width)
    if (x > 0) enqueue(index - 1)
    if (x + 1 < width) enqueue(index + 1)
    if (y > 0) enqueue(index - width)
    if (y + 1 < height) enqueue(index + width)
  }
  for (let index = 0; index < visited.length; index += 1) {
    if (visited[index]) bitmap[index * 4 + 3] = 0
  }
  return nativeImage.createFromBitmap(bitmap, { width, height, scaleFactor: 1 })
}

function load(path) {
  return nativeImage.createFromBuffer(readFileSync(path))
}

app.whenReady().then(() => {
  const root = join(__dirname, '..')
  const assets = join(root, 'public', 'assets')
  const magenta = (red, green, blue) => red > 135 && blue > 110 && red > green * .88 && blue > green * .8
  const neutral = (red, green, blue) => {
    const max = Math.max(red, green, blue)
    const min = Math.min(red, green, blue)
    return min > 108 && max - min < 42
  }

  for (const name of ['normal', 'step2', 'hidden']) {
    const input = load(join(assets, `turtle-3d-${name}-chroma.png`))
    writeFileSync(join(assets, `turtle-3d-${name}.png`), floodRemove(input, magenta).toPNG())
  }

  const sheet = load(join(root, 'design', 'character-sheets', 'lucky-turtle-3d-turnaround-v1.png'))
  const size = sheet.getSize()
  const halfWidth = Math.floor(size.width / 2)
  const halfHeight = Math.floor(size.height / 2)
  const views = {
    front: { x: 0, y: 0, width: halfWidth, height: halfHeight },
    back: { x: halfWidth, y: 0, width: size.width - halfWidth, height: halfHeight },
    left: { x: 0, y: halfHeight, width: halfWidth, height: size.height - halfHeight },
    right: { x: halfWidth, y: halfHeight, width: size.width - halfWidth, height: size.height - halfHeight },
  }
  for (const [name, rectangle] of Object.entries(views)) {
    const view = floodRemove(sheet.crop(rectangle), neutral)
    writeFileSync(join(assets, `turtle-3d-${name}.png`), view.toPNG())
  }
  app.quit()
})
