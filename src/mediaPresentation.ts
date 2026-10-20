export const mediaFrames = [['plain','原始素材'],['phone','手机录屏卡'],['web','网页 / 软件窗口'],['rounded','圆角内容卡'],['brand','品牌标志浅底卡'],['fullscreen','全屏引用']] as const
export const mediaMotions = [['none','无'],['fade','淡入淡出'],['left','从左滑入'],['right','从右滑入'],['scale','缩放进出']] as const
export type MediaPresentation = {frame?:typeof mediaFrames[number][0];motion?:typeof mediaMotions[number][0];motionDuration?:number;fit?:'contain'|'cover';phoneAspect?:'9/16'|'9/19.5';title?:string;crop?:{x:number;y:number;width:number;height:number}}
export function mediaMotion(time:number,start:number,end:number,p:MediaPresentation){
 const duration=Math.min(Math.max(.1,p.motionDuration??.55),Math.max(.01,(end-start)/2))
 const progress=Math.max(0,Math.min(1,(time-start)/duration,(end-time)/duration))
 const eased=1-(1-progress)**3,remaining=1-eased
 if(!p.motion||p.motion==='none')return {opacity:1,transform:'none'}
 const x=p.motion==='left'?-12*remaining:p.motion==='right'?12*remaining:0
 return {opacity:eased,transform:`translateX(${x}%) scale(${p.motion==='scale'?1-.12*remaining:1})`}
}
export function validMediaPresentation(p:MediaPresentation|undefined){
 if(!p)return true
 if(p.crop&&(!Object.values(p.crop).every(Number.isFinite)||p.crop.x<0||p.crop.y<0||p.crop.width<=0||p.crop.height<=0||p.crop.x+p.crop.width>1.001||p.crop.y+p.crop.height>1.001))return false
 return (!p.frame||mediaFrames.some(([v])=>v===p.frame))&&(!p.motion||mediaMotions.some(([v])=>v===p.motion))&&(p.motionDuration===undefined||Number.isFinite(p.motionDuration)&&p.motionDuration>=.1&&p.motionDuration<=2)&&(!p.fit||['contain','cover'].includes(p.fit))&&(!p.phoneAspect||['9/16','9/19.5'].includes(p.phoneAspect))&&(p.title===undefined||typeof p.title==='string'&&p.title.length<=160)
}
