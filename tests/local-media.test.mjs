import assert from 'node:assert/strict'
import {parseByteRange} from '../scripts/local-media.mjs'

assert.deepEqual(parseByteRange('bytes=0-1023',10000),{start:0,end:1023})
assert.deepEqual(parseByteRange('bytes=500-',10000),{start:500,end:9999})
assert.deepEqual(parseByteRange('bytes=-1024',10000),{start:8976,end:9999})
assert.deepEqual(parseByteRange('bytes=-20000',10000),{start:0,end:9999})
assert.deepEqual(parseByteRange('bytes=9998-20000',10000),{start:9998,end:9999})
for(const range of ['bytes=-0','bytes=10000-','bytes=500-499','bytes=-','bytes=0-1,4-5','garbage']){
 assert.equal(parseByteRange(range,10000),null,range)
}
console.log('PASS: video byte ranges including suffix seeks and 416 boundaries.')
