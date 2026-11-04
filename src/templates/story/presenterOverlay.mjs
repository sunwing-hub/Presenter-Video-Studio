export function validatePresenterOverlay(p,duration){
 if(p===undefined)return
 const finite=(...v)=>v.every(Number.isFinite)
 if(!p||!/^[a-f0-9-]{36}$/.test(p.mediaId??'')||!finite(p.x,p.y,p.size,p.sourceWidth,p.sourceHeight,p.crop?.x,p.crop?.y,p.crop?.width,p.crop?.height,p.border??0,p.shadow??0)||p.size<80||p.size>1000||p.x<0||p.y<0||p.x+p.size>1080||p.y+p.size>1920||p.sourceWidth<=0||p.sourceHeight<=0||p.crop.x<0||p.crop.y<0||p.crop.width<=0||p.crop.height<=0||Math.abs(p.crop.width-p.crop.height)>1||p.crop.x+p.crop.width>p.sourceWidth||p.crop.y+p.crop.height>p.sourceHeight||(p.border??0)<0||(p.border??0)>20||(p.shadow??0)<0||(p.shadow??0)>30)throw Error('人物圆窗裁切、样式或位置无效')
 if(!Array.isArray(p.segments)||!p.segments.length||p.segments.some((s,i)=>!finite(s.start,s.end,s.sourceStart,s.rate)||s.start<0||s.end<=s.start||s.sourceStart<0||s.rate<=0||s.rate>4||Math.abs(s.start-(i?p.segments[i-1].end:0))>.001)||Math.abs(p.segments.at(-1).end-duration)>.01)throw Error('人物圆窗时间映射必须连续覆盖全片')
}
export function overlaySourceAt(p,time){const s=p.segments.find(s=>time>=s.start&&time<s.end)??p.segments.at(-1);return s.sourceStart+Math.max(0,Math.min(time,s.end)-s.start)*s.rate}
