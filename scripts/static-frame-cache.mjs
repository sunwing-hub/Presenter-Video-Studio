// Experimental, opt-in. Conservatively rejects video/canvas/animated images and
// browser animations, including those currently paused by the renderer.
export async function staticFrameKey(){
 const layered=document.documentElement.dataset.overlayLayered==='1';const root=document.querySelector(layered?'.faceless-stage':'.canvas-screen');if(!root)return null
 if(root.querySelector('video,canvas,iframe,object,embed,animate,animateTransform,animateMotion'))return null
 if(document.getAnimations().length)return null
 for(const img of root.querySelectorAll('img'))if(!/^data:image\/(png|jpeg);/i.test(img.src)&&! /\.(png|jpe?g)(?:\?|$)/i.test(img.src))return null
 const nodes=[root,...root.querySelectorAll('*')].filter(e=>!layered||!e.closest('[data-caption]'));const clone=root.cloneNode(true);if(layered)clone.querySelectorAll('[data-caption]').forEach(e=>e.remove());let key=clone.outerHTML
 for(const node of nodes){
  for(const pseudo of [null,'::before','::after']){const s=getComputedStyle(node,pseudo);if(s.backgroundImage.includes('url(')||s.content.includes('url('))return null;key+=(layered?['transform','opacity','visibility','display','filter','clip-path','color','fill','stroke','stroke-width','font-family','font-size','font-weight','letter-spacing','text-shadow','background-color','width','height']:Array.from(s)).map(p=>s.getPropertyValue(p)).join('|')}
 }
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key))
 return Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('')
}
