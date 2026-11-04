import fs from 'node:fs/promises'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {execFileSync} from 'node:child_process'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const [id,name,baseId]=process.argv.slice(2)
if(!/^[a-z][a-z0-9-]{1,50}$/.test(id??'')||!name||name.length>40||!baseId)throw Error('用法：create-user-template.mjs my-method 名称 team.yanye-faceless')
const catalog=JSON.parse(await fs.readFile(resolve(root,'templates/catalog.json'),'utf8')),base=catalog.templates.find(t=>t.id===baseId&&t.releaseChannel==='production')
if(!base)throw Error('未找到已发布基础模板')
const dest=resolve(root,'user-templates',id,'0.1.0');await fs.mkdir(dirname(dest),{recursive:true});await fs.mkdir(dest)
await fs.cp(resolve(root,base.paths.versionDir),dest,{recursive:true})
const file=resolve(dest,'manifest.json'),m=JSON.parse(await fs.readFile(file,'utf8'));m.id='user.'+id;m.name=name;m.version='0.1.0';m.releaseChannel='development';m.extends=baseId;m.description='用户自建模板：基于'+base.name;m.status='自建草稿，待用户修改与验收';m.previewUrl='/?storyLab';m.coverUrl=base.assets.coverUrl;m.runtimeTemplate=m.runtimeTemplate||(base.id+'@'+base.version);await fs.writeFile(file,JSON.stringify(m,null,2));
execFileSync(process.execPath,[resolve(root,'scripts/template-catalog.mjs')],{cwd:root,stdio:'inherit'});console.log(dest+'\n已创建草稿，修改与验收后再设置releaseChannel=production。运行时仍使用runtimeTemplate指定的基础渲染器。')
