import {createHash} from 'node:crypto'
import {mkdir,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
export async function captionRecorder(browser,width,height,directory){
 const dir=resolve(directory,'caption-layers');await mkdir(dir,{recursive:true});const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1}),files=new Map(),runs=[]
 return {async record(source){
  const {svg,bgKey}=await source.evaluate(async()=>{const root=document.querySelector('.faceless-stage svg'),g=root?.querySelector('[data-caption]');const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${root?.getAttribute('viewBox')??'0 0 1080 1920'}" width="100%" height="100%" style='font-family:"PingFang SC","Microsoft YaHei",sans-serif'>${g?.outerHTML??''}</svg>`;let bgKey=null;if(root&&!root.querySelector('image,video,canvas,animate,animateTransform,animateMotion')&&!document.getAnimations().length){const clone=root.cloneNode(true);clone.querySelectorAll('[data-caption]').forEach(e=>e.remove());const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(clone.outerHTML));bgKey=Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('')}return{svg,bgKey}})
  const key=createHash('sha256').update(svg).digest('hex');let file=files.get(key)
  if(!file){file=resolve(dir,key+'.png');await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;background:transparent}</style>${svg}`);await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:file,omitBackground:true});files.set(key,file)}
  const last=runs.at(-1);if(last?.key===key)last.frames++;else runs.push({key,file,frames:1});return bgKey
 },async finish(fps){const list=resolve(dir,'captions.ffconcat');await writeFile(list,'ffconcat version 1.0\n'+runs.map(r=>`file '${r.key}.png'\noption framerate ${fps}\nduration ${r.frames/fps}`).join('\n')+`\nfile '${runs.at(-1).key}.png'\noption framerate ${fps}\n`);await page.close();return{list,images:files.size,runs:runs.length}}}
}
