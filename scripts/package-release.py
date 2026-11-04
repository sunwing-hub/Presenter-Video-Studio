# coding: utf-8
"""Build portable workbench + skill archives without personal state. Run in release repo."""
from pathlib import Path
import sys,json,hashlib,re,zipfile
root=Path(__file__).resolve().parent.parent
version=sys.argv[1] if len(sys.argv)>1 else ''
if len(sys.argv)<3 or not re.fullmatch(r'[0-9][A-Za-z0-9.-]{1,40}',version):raise SystemExit('Usage: python3 scripts/package-release.py VERSION OUT_DIR')
out=Path(sys.argv[2]).resolve();out.mkdir(parents=True,exist_ok=True)
blocked={'.git','node_modules','dist','media','drafts','exports','output','user-data','user-templates','.venv','__pycache__'}
roots=['src','scripts','templates','public','tests','skills','docs'];paths=[]
for name in roots:
 for p in (root/name).rglob('*'):
  rel=p.relative_to(root)
  if any(x in blocked for x in rel.parts) or not p.is_file() or p.suffix in ['.log','.pyc','.tsbuildinfo'] or p.name=='.DS_Store':continue
  if name=='templates' and len(rel.parts)>=4:
   manifest=root/rel.parts[0]/rel.parts[1]/rel.parts[2]/'manifest.json'
   if not manifest.exists() or json.loads(manifest.read_text()) .get('releaseChannel')!='production':raise SystemExit('Non-production template: '+str(rel))
  if p.is_symlink():raise SystemExit('Symlink forbidden: '+str(rel))
  paths.append(p)
for p in root.iterdir():
 if p.is_file() and p.name not in ['文件清单.json','.DS_Store'] and (p.suffix in ['.md','.json','.yaml','.html','.command','.cmd','.ts'] or p.name=='.gitignore'):paths.append(p)
files=[]
for p in sorted(set(paths)):
 rel=p.relative_to(root).as_posix();data=p.read_bytes()
 if p.suffix in ['.md','.mjs','.ts','.tsx','.json','.py','.html']:
  text=data.decode('utf8')
  if re.search(r'/(?:Users|home)/[A-Za-z0-9_.-]+/|gh[pousr]_[A-Za-z0-9]{30,}|sk-[A-Za-z0-9_-]{24,}|-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----',text):raise SystemExit('Review sensitive content: '+rel)
 files.append({'path':rel,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)})
manifest=root/'文件清单.json';manifest.write_text(json.dumps({'version':version,'files':files},ensure_ascii=False,indent=2))
archive=out/f'Presenter-Video-Studio-{version}.zip';skill=out/f'overlay-studio-editor-skill-{version}.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
 for f in files:z.write(root/f['path'],f'Presenter-Video-Studio-{version}/'+f['path'])
 z.write(manifest,f'Presenter-Video-Studio-{version}/文件清单.json')
with zipfile.ZipFile(skill,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted((root/'skills/overlay-studio-editor').rglob('*')):
  if p.is_file():z.write(p,p.relative_to(root/'skills').as_posix())
for p in [archive,skill]:
 with zipfile.ZipFile(p) as z:assert z.testzip() is None
checks=out/f'SHA256SUMS-{version}.txt';checks.write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n' for p in [archive,skill]))
print(json.dumps({'files':len(files)+1,'workbench':str(archive),'skill':str(skill)},ensure_ascii=False))
