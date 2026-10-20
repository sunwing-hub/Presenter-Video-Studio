import { mkdir, open, readFile, stat, unlink } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { homedir, tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { dirname } from 'node:path'
import ffmpegStatic from 'ffmpeg-static'

const root = resolve(import.meta.dirname, '..')
const tempDir = resolve(tmpdir(), 'overlay-studio-transcription')
const jobs = new Map()
const jobTtlMs = 60 * 60 * 1000
const acceptedVideoTypes = new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'])
const idPattern = /^[a-f0-9-]{36}$/

const pythonCandidates = [
  process.env.OVERLAY_WHISPER_PYTHON,
  resolve(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python'),
  resolve(homedir(), '.codex/skills/watch/.venv/bin/python'),
  resolve(homedir(), 'Documents/ChatGPT/自动剪辑/.venv/bin/python'),
  resolve(homedir(), '.codex/skills/video-use/.venv/bin/python'),
].filter(Boolean)
const modelDir = resolve(process.env.OVERLAY_WHISPER_MODEL_DIR || resolve(homedir(), '.cache/whisper'))
const modelName = process.env.OVERLAY_WHISPER_MODEL || 'small'

function pruneJobs() {
  const cutoff = Date.now() - jobTtlMs
  for (const [id, job] of jobs) if (job.createdAt < cutoff) jobs.delete(id)
}

async function findPython() {
  for (const candidate of pythonCandidates) {
    try { await stat(candidate); return candidate } catch {}
  }
  throw Error('没有找到本地 Whisper Python 环境。可设置 OVERLAY_WHISPER_PYTHON 指向 Python。')
}

async function runWhisper(job) {
  let child
  try {
    const python = await findPython()
    const input = resolve(tempDir, `${job.id}.input`)
    const output = resolve(tempDir, `${job.id}.srt`)
    const script = resolve(root, 'scripts/transcribe-local.py')
    const venvBin = resolve(python, '..')
    const ffmpegBin = ffmpegStatic ? dirname(ffmpegStatic) : ''
    child = spawn(python, [script, '--input', input, '--output', output, '--model', modelName, '--model-dir', modelDir], {
      env: { ...process.env, PATH: `${venvBin}:${ffmpegBin}:${process.env.PATH || ''}` },
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    job.status = 'running'
    let errors = ''
    child.stderr.on('data', chunk => { errors = `${errors}${chunk}`.slice(-5000) })
    const [code] = await new Promise((resolveExit, rejectExit) => {
      child.once('error', rejectExit)
      child.once('exit', (...values) => resolveExit(values))
    })
    if (code !== 0) throw Error(errors.trim() || 'Whisper 识别失败。')
    const srt = await readFile(output, 'utf8')
    if (!srt.trim()) throw Error('Whisper 没有生成字幕。')
    job.status = 'done'
    job.srt = srt
    job.fileName = `${job.sourceName.replace(/\.[^.]+$/, '')}.srt`
  } catch (error) {
    job.status = 'error'
    job.error = String(error?.message || error)
  } finally {
    child?.kill('SIGTERM')
    await unlink(resolve(tempDir, `${job.id}.input`)).catch(() => {})
    await unlink(resolve(tempDir, `${job.id}.srt`)).catch(() => {})
  }
}

async function startJob(req) {
  const mime = String(req.headers['content-type'] || '').split(';')[0].toLowerCase()
  const headerName = String(req.headers['x-media-name'] || '')
  const extensionLooksVideo = /\.(mp4|m4v|mov|webm)$/i.test(headerName)
  if (!acceptedVideoTypes.has(mime) && !(mime === 'application/octet-stream' && extensionLooksVideo)) throw Error('请选择 MP4、MOV 或 WebM 视频。')
  await mkdir(tempDir, { recursive: true })
  const id = randomUUID()
  const input = resolve(tempDir, `${id}.input`)
  const handle = await open(input, 'wx')
  let size = 0
  try {
    for await (const chunk of req) {
      size += chunk.length
      if (size > 4 * 1024 ** 3) throw Error('视频不能超过 4GB。')
      await handle.write(chunk)
    }
  } catch (error) {
    await handle.close()
    await unlink(input).catch(() => {})
    throw error
  }
  await handle.close()
  const sourceName = decodeURIComponent(headerName || '人物视频').slice(0, 250)
  const job = { id, status: 'queued', sourceName, createdAt: Date.now() }
  jobs.set(id, job)
  void runWhisper(job)
  return job
}

export async function transcriptionRoute(req, res, path) {
  pruneJobs()
  const reply = (status, data) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(data))
  }
  if (path === '/__studio/transcribe' && req.method === 'POST') {
    try {
      const job = await startJob(req)
      reply(202, { id: job.id, status: job.status })
    } catch (error) { reply(400, { error: String(error?.message || error) }) }
    return true
  }
  const match = path.match(/^\/__studio\/transcribe\/([a-f0-9-]{36})(?:\/(srt))?$/)
  if (!match) return false
  const job = jobs.get(match[1])
  if (!job) { reply(404, { error: '识别任务不存在，请重新开始。' }); return true }
  if (match[2] === 'srt' && req.method === 'GET') {
    if (job.status !== 'done') { reply(409, { error: '字幕还没有生成。' }); return true }
    reply(200, { srt: job.srt, fileName: job.fileName })
    return true
  }
  if (req.method === 'GET') {
    reply(200, { id: job.id, status: job.status, fileName: job.fileName, error: job.error })
    return true
  }
  reply(405, { error: '不支持此操作。' })
  return true
}
