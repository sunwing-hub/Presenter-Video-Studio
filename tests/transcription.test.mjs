import assert from 'node:assert/strict'
import { transcriptionRoute } from '../scripts/transcription-server.mjs'

const response = () => ({
  statusCode: 0,
  headers: {},
  body: '',
  setHeader(name, value) { this.headers[name] = value },
  end(value = '') { this.body = String(value) },
})

assert.equal(await transcriptionRoute({ method: 'GET', headers: {} }, response(), '/not-a-studio-route'), false)

const invalid = response()
assert.equal(await transcriptionRoute({ method: 'POST', headers: { 'content-type': 'text/plain' } }, invalid, '/__studio/transcribe'), true)
assert.equal(invalid.statusCode, 400)
assert.match(JSON.parse(invalid.body).error, /MP4|MOV|WebM/)

const missing = response()
assert.equal(await transcriptionRoute({ method: 'GET', headers: {} }, missing, '/__studio/transcribe/00000000-0000-0000-0000-000000000000'), true)
assert.equal(missing.statusCode, 404)

console.log('PASS: local transcription route matching, media validation and missing-job response.')
