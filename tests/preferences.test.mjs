import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {readPreferences,savePreferences,validatePreferences} from '../scripts/preferences.mjs'
const root=await mkdtemp(join(tmpdir(),'overlay-settings-'))
try{assert.equal(await readPreferences(root),null);assert.throws(()=>validatePreferences({}),/选择/);const a=await savePreferences({mode:'default'},root);assert.equal(a.settings.bgmLibrary,'');assert.equal(a.settings.speed,1);const b=await savePreferences({mode:'custom',settings:{fontFamily:'Noto Sans CJK SC',sfx:'none',bgmLibrary:'/example/music'}},root);assert.equal((await readPreferences(root)).settings.sfx,'none');assert.equal(b.settings.fontFamily,'Noto Sans CJK SC');assert.throws(()=>validatePreferences({mode:'custom',settings:{loudnessLUFS:100}}),/范围/);assert.throws(()=>validatePreferences({mode:'custom',settings:{secret:'x'}}),/未知/)}finally{await rm(root,{recursive:true,force:true})}
console.log('PASS: first-use choice, default/custom settings, persistence, invalid settings rejection')
