// Shared by MP4 and transparent MOV; matches audioGain in the preview.
export function audioClipFilter(clip,input,label){
 const length=clip.end-clip.start,fadeIn=Math.min(clip.fadeIn??0,length),fadeOut=Math.min(clip.fadeOut??0,length)
 return `${input}atrim=start=${clip.offset}:duration=${length},asetpts=PTS-STARTPTS,volume=${clip.volume}`+
  (fadeIn?`,afade=t=in:st=0:d=${fadeIn}`:'')+
  (fadeOut?`,afade=t=out:st=${length-fadeOut}:d=${fadeOut}`:'')+
  `,adelay=${Math.round(clip.start*1000)}:all=1${label}`
}
