// Replacement is inferred only from the story's explicit voice/mix binding,
// never from the presence of BGM or from filenames.
export function sourceAudioGain(project,duration){
 if(project.videoMuted===true)return 0
 const mode=project.sourceAudioMode??'auto'
 if(!['auto','keep','mute'].includes(mode))throw Error('原声模式无效')
 if(mode==='mute')return 0
 if(mode==='auto'){
  const stories=(project.canvasLayers??[]).filter(l=>l.visible!==false&&l.story).map(l=>l.story)
  if(stories.some(s=>s.audio?.id&&(project.audioClips??[]).some(c=>c.mediaId===s.audio.id&&c.start===0&&c.end>=duration-.01&&c.offset===0&&c.loop===false&&c.volume>0)))return 0
 }
 const volume=project.videoVolume??100
 if(!Number.isFinite(volume)||volume<0||volume>100)throw Error('原声音量无效')
 return volume/100
}
