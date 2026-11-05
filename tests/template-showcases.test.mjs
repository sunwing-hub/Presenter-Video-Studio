import assert from 'node:assert/strict';import {readFile,stat} from 'node:fs/promises';import {resolve} from 'node:path';import {validateExport} from '../scripts/export-server.mjs';import {bundledPath,createTemplateDraft} from '../scripts/template-starters.mjs'
const catalog=JSON.parse(await readFile('templates/catalog.json','utf8')),styles=new Set()
for(const t of catalog.templates.filter(t=>t.releaseChannel==='production')){
 assert(t.showcase.video.endsWith('.mp4'));assert(t.showcase.poster.endsWith('.jpg'));assert.equal(t.showcase.shots.length,4);for(const f of [t.showcase.video,t.showcase.poster,t.starterProject])assert((await stat(bundledPath(f))).size>0)
 const b=JSON.parse(await readFile(bundledPath(t.starterProject),'utf8'));assert.equal(b.templateId,t.id);assert.equal(b.templateVersion,t.version);const s=b.project.canvasLayers[0].story;styles.add(s.presentationStyle??s.presenterMode);assert.equal(s.duration,16);assert.equal(s.scenes.length,4);assert.equal(b.project.demoContent,undefined);assert.doesNotThrow(()=>validateExport({kind:'mp4',project:b.project,mainMediaId:s.video?.id,duration:16,fps:25,fileName:'test.mp4'}))
 for(const [id,a] of Object.entries(b.bindings)){assert.match(id,/^[a-f0-9-]{36}$/);assert((await stat(bundledPath(a.url))).size>0)}
}
assert.equal(styles.size,3);assert.throws(()=>bundledPath('/template-demos/../../.env'),/越界/);assert.throws(()=>bundledPath('/etc/passwd'),/无效/);await assert.rejects(()=>createTemplateDraft('unknown','1'),/没有找到/)
console.log('PASS: three real video/poster/starter sets, distinct native layouts, valid four-scene projects, distributable media, traversal and unknown-template rejection')
