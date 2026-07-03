const { app, nativeImage } = require('electron')
const { readFileSync, writeFileSync } = require('node:fs')
const { resolve } = require('node:path')

app.whenReady().then(() => {
  const input = resolve(process.argv[2])
  const output = resolve(process.argv[3])
  const image = nativeImage.createFromBuffer(readFileSync(input))
  const { width, height } = image.getSize()
  const bitmap = image.toBitmap()

  const visited = new Uint8Array(width * height)
  const queue = new Int32Array(width * height)
  let head = 0
  let tail = 0
  const isBackdrop = (index) => {
    const offset = index * 4
    const blue = bitmap[offset]
    const green = bitmap[offset + 1]
    const red = bitmap[offset + 2]
    const pinkOrLilac = red > 140 && blue > 115 && red > green * 0.9 && blue > green * 0.82
    const nearWhite = red > 205 && green > 195 && blue > 205
    return pinkOrLilac || nearWhite
  }
  const enqueue = (index) => {
    if (visited[index] || !isBackdrop(index)) return
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
    bitmap[index * 4 + 3] = visited[index] ? 0 : 255
  }

  const result = nativeImage.createFromBitmap(bitmap, { width, height, scaleFactor: 1 })
  writeFileSync(output, result.toPNG())
  console.log(`${width}x${height} alpha PNG written to ${output}`)
  app.quit()
})
