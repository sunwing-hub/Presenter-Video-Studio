import assert from 'node:assert/strict'
import {suggestEmphasis} from '../src/keywordEmphasis.ts'
import {makeSfxWav} from '../src/sfx.ts'

const cues=[
  {id:'cue-1',start:0,end:2,text:'我们可以一条命令，快速成片。'},
  {id:'cue-2',start:2.7,end:5,text:'第一步，读取脚本。'},
  {id:'cue-3',start:5.6,end:7.6,text:'预计节省30分钟。'},
  {id:'cue-4',start:7.8,end:9,text:'这句话没有明确的强调点。'},
]
const suggestions=suggestEmphasis(cues,9)
assert.deepEqual(suggestions.map(item=>item.text),['一条命令','读取脚本','30分钟'])
assert.ok(suggestions.every(item=>item.start>=cues.find(cue=>cue.id===item.cueId).start && item.end<=cues.find(cue=>cue.id===item.cueId).end+.12))
assert.ok(suggestions.every(item=>item.end>item.start))
assert.deepEqual(suggestEmphasis([{id:'cue-5',start:0,end:1,text:'最后，我们收尾。'}])[0].sound,'sweep')
for(const kind of ['pop','sweep']){
 const wav=new DataView(await makeSfxWav(kind).arrayBuffer())
 assert.equal(String.fromCharCode(...new Uint8Array(wav.buffer,0,4)),'RIFF')
 assert.equal(wav.getUint32(24,true),44100)
 assert.ok(wav.byteLength>10000)
}
console.log('PASS: sparse keyword cues, estimated timing, transition sound and local WAV format.')
