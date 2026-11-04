import assert from 'node:assert/strict'
import {validateStory,storyAt,storyTextLines,storyCaptionAt,storyCaptionPhrases,storyCaptionTokens,withStoryTheme} from '../src/templates/story/storyModel.mjs'
import {validateExport} from '../scripts/export-server.mjs'
const video={id:'11111111-1111-1111-1111-111111111111',name:'test.mp4'}
const scenes=[0,2,6].map((start,i)=>({id:'S00'+(i+1),kind:['hook','paths','roots'][i],title:i?'测试':'千万不要\nAI 转型',labels:['专业','AI'],start,end:[2,6,10][i],events:[{at:start+.05,cueId:'cue-'+i}],theme:'dark',presenter:'pip',transition:'window'}))
const story={format:'team-story',version:1,template:'team.professional-extension@0.3.0-candidate',platform:'douyin',duration:10,video,scenes,cues:scenes.map((s,i)=>({id:'cue-'+i,start:s.start+.05,end:s.end-.05,text:'专业与AI'}))}
const payload={kind:'mp4',mainMediaId:video.id,fps:25,duration:10,project:{canvas:{width:1080,height:1920,aspectRatio:'9/16'},canvasLayers:[{id:'story',type:'card',sceneId:'team-story',start:0,end:10,story,x:0,y:0,width:1080,height:1920,fontSize:48,zIndex:1,visible:true}],audioClips:[],cues:story.cues,captionStyle:{enabled:false},layouts:[],presenter:{mode:'full',x:50,y:35,zoom:1,size:24}}},p=validateStory(story)
assert.equal(p.scenes.length,3);assert.equal(p.duration,10)
assert.equal(storyAt(p,0).scene.id,'S001');assert.equal(storyAt(p,p.scenes[1].start).scene.id,'S002');assert.equal(storyAt(p,p.duration).scene.id,'S003')
assert.equal(storyAt(p,p.scenes[1].start).enter,0);assert.equal(storyAt(p,p.scenes[1].start+.7).enter,1)
assert.doesNotThrow(()=>validateExport(structuredClone(payload)))
const gap=structuredClone(p);gap.scenes[1].start+=.1;gap.scenes[1].events[0].at+=.1;assert.throws(()=>validateStory(gap),/覆盖声音/)
const overlap=structuredClone(p);overlap.scenes[1].start-=.1;assert.throws(()=>validateStory(overlap),/边界/)
const invalid=structuredClone(p);invalid.video.id='../../input.mp4';assert.throws(()=>validateStory(invalid),/素材/)
const bad=structuredClone(p);bad.scenes[0].events[0].at=5;assert.throws(()=>validateStory(bad),/事件/)
const stale=structuredClone(payload);stale.project.canvasLayers[0].end-=1;assert.throws(()=>validateExport(stale),/完整覆盖/)
const foreign=structuredClone(payload);foreign.project.canvasLayers[0].story.video.id='22222222-2222-2222-2222-222222222222';assert.throws(()=>validateExport(foreign),/不一致/)
const lines=storyTextLines('你的专业AI工作流，才是核心资产。',5);assert.equal(lines.join(''),'你的专业AI工作流，才是核心资产。');assert(lines.some(x=>x.includes('AI')))
// Independent content substitution checks the template contract, not a claim of a second film's visual acceptance.
const next=structuredClone(p);next.scenes.forEach(s=>{s.title='财务专业与 AI';s.labels=s.labels.map(()=> '业务判断')});assert.doesNotThrow(()=>validateStory(next));assert.equal(p.scenes[0].title,'千万不要\nAI 转型')
console.log('PASS: continuous full-film coverage, exact boundaries, deterministic transitions, media rejection, audio/video identity, Unicode captions, independent content contract')

const captionCues=[{id:'long',start:0,end:6,text:'绕了一大圈，才发现：我最值钱的，还是那十年交付攒下的东西。'}]
for(let t=0;t<6;t+=.04){const c=storyCaptionAt(captionCues,t,15);assert(c);assert(Array.from(c.text).length<=15);assert(!/[，。！？；：、,.!?;:]$/.test(c.text));assert(!c.text.includes('\n'))}
assert.equal(storyCaptionAt(captionCues,6),null)
assert.equal(storyCaptionPhrases('专业与AI，主动交付。').join(''),'专业与AI主动交付')
assert(storyCaptionTokens('专业与AI').filter(x=>x.emphasis).length===2)
console.log('PASS: single-line phrase captions, punctuation stripping, semantic emphasis, source cues preserved')

const aligned=[{id:'aligned',start:0,end:4,text:'专业，接上AI。',captionSegments:[{text:'专业',start:0,end:2.4},{text:'接上AI',start:2.4,end:4}]}]
assert.equal(storyCaptionAt(aligned,2).text,'专业');assert.equal(storyCaptionAt(aligned,2.5).text,'接上AI');assert.equal(storyCaptionAt(aligned,2).timing,'local-forced-word-boundary')
const invalidPhrase=structuredClone(p);invalidPhrase.cues[0].captionSegments=[{text:'越界',start:0,end:20}];assert.throws(()=>validateStory(invalidPhrase),/短句时间/)

const darkFilm=withStoryTheme(p,'dark-tech'),whiteFilm=withStoryTheme(p,'white-flow')
assert.equal(darkFilm.template,'team.dark-tech@0.1.0-candidate');assert.equal(whiteFilm.template,'team.white-flow@0.1.0-candidate')
assert(whiteFilm.scenes.every(s=>s.theme==='light'));assert(darkFilm.scenes.every(s=>s.theme==='dark'))
assert.deepEqual(whiteFilm.cues,p.cues);assert.deepEqual(whiteFilm.video,p.video);assert.deepEqual(whiteFilm.scenes.map(s=>[s.id,s.start,s.end,s.events]),p.scenes.map(s=>[s.id,s.start,s.end,s.events]));assert(p.scenes.every(s=>s.theme==='dark'))
const mixedFilm=structuredClone(whiteFilm);mixedFilm.scenes[1].theme='dark';assert.throws(()=>validateStory(mixedFilm),/不能在镜头之间切换/)
const legacyFilm=structuredClone(p);legacyFilm.scenes[1].theme='light';assert.doesNotThrow(()=>validateStory(legacyFilm))
const invalidTheme=structuredClone(p);invalidTheme.visualTheme='unknown';assert.throws(()=>validateStory(invalidTheme),/主题无效/)
console.log('PASS: independent theme presets, full-film palette lock, no mixed-theme export, cue/media timing preserved, legacy project compatibility')

// Audio-only composition must neither require nor accidentally render presenter footage.
const faceless=structuredClone(story);delete faceless.video;faceless.presenterMode='none';faceless.visualTheme='white-flow';faceless.audio={id:video.id,name:'voice.wav'}
faceless.scenes.forEach(s=>{s.presenter='none';s.diagram='questions';s.theme='light'})
assert.doesNotThrow(()=>validateStory(faceless))
const audioPayload=structuredClone(payload);delete audioPayload.mainMediaId;audioPayload.project.canvasLayers[0].story=faceless;audioPayload.project.audioClips=[{id:'voice-mix',track:'music',mediaId:video.id,name:'mix.wav',start:0,end:10,offset:0,volume:1,loop:false}]
assert.doesNotThrow(()=>validateExport(structuredClone(audioPayload)))
const missingVoice=structuredClone(audioPayload);missingVoice.project.audioClips=[];assert.throws(()=>validateExport(missingVoice),/同步音轨/)
const accidentalPresenter=structuredClone(faceless);accidentalPresenter.video=video;assert.throws(()=>validateStory(accidentalPresenter),/不应绑定人物/)
const wrongLayout=structuredClone(faceless);wrongLayout.scenes[0].presenter='pip';assert.throws(()=>validateStory(wrongLayout),/不一致/)
console.log('PASS: audio-only full-film export, required synchronized audio, absent presenter, and presenter/video rejection')
