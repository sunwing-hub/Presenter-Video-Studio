import assert from 'node:assert/strict'
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createDraftStore} from '../scripts/draft-store.mjs'
const directory=await mkdtemp(join(tmpdir(),'overlay-draft-unit-'))
try{
 const store=createDraftStore(directory),project={version:7,canvasLayers:[{id:'text',text:'第一次编辑',x:-50,fontSize:92}],draftMedia:{video:{name:'口播.mp4',url:'/__studio/media/11111111-1111-1111-1111-111111111111'}}}
 assert.deepEqual(await store.list(),[])
 const first=await store.save({title:'我的视频',project})
 assert.equal(first.revision,1)
 assert.deepEqual((await store.read(first.id)).project,project)
 const second=await store.save({...first,project:{...project,canvasLayers:[{id:'text',text:'改完的内容'}]}})
 assert.equal(second.revision,2)
 assert.deepEqual((await store.read(first.id,true)).project,project)
 await assert.rejects(store.save({...first,project}),/另一个窗口/)
 const race=await Promise.allSettled([store.save({...second,project}),store.save({...second,project})])
 assert.equal(race.filter(r=>r.status==='fulfilled').length,1)
 const reopened=createDraftStore(directory)
 assert.equal((await reopened.read(first.id)).revision,3)
 const copy=await reopened.save({title:'副本',project})
 assert.notEqual(copy.id,first.id);assert.equal((await reopened.list()).length,2)
 await assert.rejects(reopened.save({project:{version:7}}),/格式/)
 assert.throws(()=>reopened.read('../bad'),/编号/)
 for(const file of await readdir(directory)){assert.ok(file.endsWith('.json'));JSON.parse(await readFile(join(directory,file),'utf8'))}
 console.log('PASS: disk draft recovery, exact geometry/media persistence, previous version, copies, concurrent-write protection and atomic JSON writes.')
}finally{await rm(directory,{recursive:true,force:true})}
