import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {resolve} from 'node:path'
const root=resolve(import.meta.dirname,'..')
const names=['arrangement','export','shapes','layout','tracks','drafts','local-media','audio-sync','audio-sync-loop','transcription','keyword-emphasis','mov-audio']
for(const name of names){
 const child=spawn(process.execPath,[`tests/${name}.test.mjs`],{cwd:root,stdio:'inherit'})
 const [code]=await once(child,'exit')
 if(code!==0)process.exit(code||1)
}
