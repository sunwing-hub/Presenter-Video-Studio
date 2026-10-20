#!/usr/bin/env node
import {spawn} from 'node:child_process'
import {access,readFile,mkdir} from 'node:fs/promises'
import {resolve,dirname,join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {once} from 'node:events'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const windows=process.platform==='win32',args=new Set(process.argv.slice(2))
const [major,minor]=process.versions.node.split('.').map(Number)
if(major<22||(major===22&&minor<18)){
 console.error('请安装 Node.js 24 LTS，或至少 Node.js 22.18，再重新运行。https://nodejs.org/')
 process.exit(1)
}
process.chdir(root)
const exists=file=>access(file).then(()=>true,()=>false)
function run(command,argv,options={}){
 return new Promise((done,fail)=>{
  const child=spawn(command,argv,{cwd:root,stdio:'inherit',...options})
  child.once('error',fail)
  child.once('exit',(code,signal)=>code===0?done():fail(Error(`${command} 执行未完成（${signal??code}）`)))
 })
}
const node=(argv,options)=>run(process.execPath,argv,options)
const packageManager=await readFile(join(root,'package.json'),'utf8').then(JSON.parse)
async function install(){
 console.log('首次安装需要联网：正在安装锁定版本的项目依赖…')
 // The package ships a pnpm lockfile. Use the same pnpm release even when
 // the recipient has only the standard Node.js + npm installation.
 const pinned=packageManager.packageManager??'pnpm@11.25.0'
 let globalPnpm=false
 try{await run(windows?'pnpm.cmd':'pnpm',['--version'],{stdio:'ignore',shell:windows});globalPnpm=true}catch{}
 if(globalPnpm)await run(windows?'pnpm.cmd':'pnpm',['install','--frozen-lockfile'],{shell:windows})
 else await run(windows?'npm.cmd':'npm',['exec','--yes',`--package=${pinned}`,'--','pnpm','install','--frozen-lockfile'],{shell:windows})
 const ffmpeg=(await import('ffmpeg-static')).default
 if(!ffmpeg||!await exists(ffmpeg))await node(['node_modules/ffmpeg-static/install.js'])
 console.log('正在安装导出视频使用的 Chromium…')
 await node(['node_modules/playwright/cli.js','install','chromium'])
 await node(['node_modules/typescript/bin/tsc','-b'])
 await node(['node_modules/vite/bin/vite.js','build'])
 await doctor()
 console.log('\n安装完成。双击“启动工作台”，或运行 npm start。')
}
async function doctor(){
 console.log(`Node.js ${process.versions.node} / ${process.platform} ${process.arch}`)
 if(!await exists(join(root,'node_modules/vite/bin/vite.js')))throw Error('尚未安装依赖，请先运行安装工作台。')
 const ffmpeg=(await import('ffmpeg-static')).default
 if(!ffmpeg||!await exists(ffmpeg))throw Error('缺少 FFmpeg，请重新运行安装工作台。')
 await run(ffmpeg,['-version'],{stdio:'ignore'})
 const {chromium}=await import('playwright')
 const browser=await chromium.launch({headless:true})
 try{const page=await browser.newPage();await page.setContent('<p>Overlay Studio</p>');await page.screenshot()}finally{await browser.close()}
 console.log('编辑器、FFmpeg 和 Chromium：可用。')
 if(process.platform==='darwin'){
  try{await run('/usr/bin/xcrun',['--find','clang'],{stdio:'ignore'});console.log('透明 MOV 编译工具：可用。')}
  catch{console.log('透明 MOV 还需要 Apple Command Line Tools；请在终端运行 xcode-select --install。MP4 可先使用。')}
 }else console.log('此版本透明 ProRes MOV 导出仅支持 macOS；其他系统请使用 MP4。')
 console.log('自动识别字幕为可选功能，需单独准备 Python / Whisper；直接导入 SRT 不需要。')
}
function openBrowser(url){
 const command=windows?'rundll32':process.platform==='darwin'?'/usr/bin/open':'xdg-open'
 const argv=windows?['url.dll,FileProtocolHandler',url]:[url]
 const child=spawn(command,argv,{detached:true,stdio:'ignore'})
 child.once('error',()=>console.log(`请手动打开 ${url}`));child.unref()
}
async function ready(url){
 try{const response=await fetch(`${url}__studio/drafts`,{signal:AbortSignal.timeout(1000)});return response.ok&&Array.isArray(await response.json())}catch{return false}
}
async function start(){
 if(!await exists(join(root,'node_modules/vite/bin/vite.js')))throw Error('请先运行安装工作台。')
 const port=Number(process.env.OVERLAY_STUDIO_PORT||5173)
 if(!Number.isInteger(port)||port<1024||port>65535)throw Error('OVERLAY_STUDIO_PORT 需要是 1024–65535 的端口。')
 const url=`http://127.0.0.1:${port}/`
 if(await ready(url)){console.log(`已有工作台在运行：${url}`);if(!args.has('--no-open'))openBrowser(url);return}
 await Promise.all(['drafts','media','exports'].map(name=>mkdir(join(root,name),{recursive:true})))
 const child=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:root,stdio:'inherit'})
 const completion=once(child,'exit')
 child.once('error',error=>console.error(error.message))
 let stopping=false
 const stop=()=>{if(!stopping){stopping=true;child.kill('SIGTERM')}}
 process.once('SIGINT',stop);process.once('SIGTERM',stop)
 for(let n=0;n<60&&child.exitCode===null&&!stopping;n++){
  if(await ready(url)){console.log(`\n工作台已启动：${url}\n使用期间保留本窗口。退出时按 Ctrl+C。`);if(!args.has('--no-open'))openBrowser(url);break}
  await new Promise(resolve=>setTimeout(resolve,250))
 }
 const [code,signal]=await completion
 if(code!==0&&!stopping)throw Error(`启动失败（${signal??code}）。若端口已被占用，请关闭原服务或设置 OVERLAY_STUDIO_PORT。`)
}
try{
 if(args.has('--install'))await install()
 else if(args.has('--doctor'))await doctor()
 else await start()
}catch(error){console.error(`\n${error.message}\n详细安装说明请看“安装与使用说明.md”。`);process.exitCode=1}
