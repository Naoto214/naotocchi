"""Create the owner-only downloadable catalog, preserving original artifact bytes and checksums."""
import argparse,hashlib,html,json,os,re,shutil,subprocess
from pathlib import Path
from urllib.parse import quote,unquote,urlsplit

here=Path(__file__).resolve().parent
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('out',type=Path)
p.add_argument('--trial',required=True)
p.add_argument('--inventory',type=Path,help='Verified GitHub archive inventory from all groups')
p.add_argument('--group',action='append',default=[],metavar='ID=DIR')
args=p.parse_args()
groups={'regional':'13地域の5分試験とタッチ入力','forest':'森28体の10分間と住民別記録',
        'performance':'WebKitの描画・経路探索・入力測定','atlas':'13地域の歩行地図の測定記録',
        'foot':'足元の再現と回帰試験','overview':'比較結果と照合記録'}
dest=args.out.resolve();dest.mkdir(parents=True,exist_ok=True)
record_dir=dest/'records'
index={}
def retain(group,name,src):
    if group not in groups or not src.is_file() or src.is_symlink():raise ValueError(str(src))
    path=record_dir/group/name
    if not path.resolve().is_relative_to(record_dir):raise ValueError(name)
    path.parent.mkdir(parents=True,exist_ok=True)
    if path.exists() and not os.path.samefile(path,src):path.unlink()
    if not path.exists():
        try:os.link(src,path)
        except OSError:shutil.copyfile(src,path)
    with path.open('rb') as f:digest=hashlib.file_digest(f,'sha256').hexdigest()
    key=path.relative_to(dest).as_posix();index[key]=dict(group=group,bytes=path.stat().st_size,sha256=digest)
for entry in args.group:
    group,loc=entry.split('=',1);root=Path(loc).resolve()
    if not root.is_dir():raise ValueError(root)
    for src in sorted(root.rglob('*')):
        if src.is_file() and not src.name.startswith('.') and src.suffix in {'.zip','.gz','.json','.csv','.md','.jpg','.patch'}:
            retain(group,src.relative_to(root),src)
if args.inventory:retain('overview','github-archives.json',args.inventory)
for src in sorted(here.glob('*.md')):
    if src.name!='README.md':retain('overview',src.name,src)
for src in sorted((here/'evidence').glob('*')):
    if src.is_file() and src.suffix in {'.json','.csv','.jpg'}:
        retain('foot' if src.name.startswith('foot-') else 'overview',src.name,src)
retain('foot','foot-only.patch',here/'foot-only.patch')
(dest/'checksums.json').write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n')
def h(s):return html.escape(str(s),quote=True)
repo=here.parents[1]
revision=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()
reports={p.name:p for p in here.glob('*.md') if p.name!='README.md'}
by_digest={}
for key,metadata in index.items():
    by_digest.setdefault((Path(key).name,metadata['sha256']),key)
readers=dest/'reports'
readers.mkdir(exist_ok=True)
for name,source in reports.items():
    def link(match):
        attr,raw=match.groups()
        url=urlsplit(html.unescape(raw))
        if url.scheme or url.netloc or not url.path:return match[0]
        local=(source.parent/unquote(url.path)).resolve()
        if local.parent==here and local.name in reports:
            target='./'+quote(local.stem)+'.html'
        elif local.is_file() and local.is_relative_to(repo):
            identity=(local.name,hashlib.sha256(local.read_bytes()).hexdigest())
            if identity in by_digest:target='../'+quote(by_digest[identity])
            else:target='https://github.com/Naoto214/naotocchi/blob/'+revision+'/'+quote(local.relative_to(repo).as_posix())
        else:raise ValueError(f'Unresolved report reference {name} -> {url.path}')
        return attr+'="'+h(target+('?' + url.query if url.query else '')+('#' + url.fragment if url.fragment else ''))+'"'
    rendered=subprocess.check_output(['pandoc','--from=gfm','--to=html5',str(source)],text=True)
    rendered=re.sub(r'(href|src)="([^"]+)"',link,rendered)
    style='body{max-width:64rem;margin:2rem auto;padding:0 1rem;font:1rem/1.7 system-ui,sans-serif;color:#25392e;background:#faf9f1}a{color:#285b43}h1,h2{font-family:serif}table{display:block;overflow-x:auto;border-collapse:collapse}td,th{padding:.35rem .6rem;border:1px solid #c4cdc3}code,pre{overflow-wrap:anywhere;white-space:pre-wrap}img{max-width:100%}'
    (readers/(source.stem+'.html')).write_text('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+h(source.stem)+'｜なおとっち</title><style>'+style+'</style><main><a href="../">検証記録に戻る</a>'+rendered+'</main></html>\n')
sections=[]
for group,label in groups.items():
    files=[(key,item) for key,item in sorted(index.items()) if item['group']==group]
    if not files:continue
    rows=[]
    for key,item in files:
        name=key.split('/',2)[2];size=item['bytes']
        formatted=f'{size/1048576:.1f} MB' if size>=1048576 else f'{max(1,round(size/1024)):,} KB'
        if group=='overview' and name in reports:
            rows.append(f'<li><a href="reports/{quote(Path(name).stem)}.html">{h(name)}</a><a href="{quote(key)}" download>原文</a></li>')
        else:rows.append(f'<li><a href="{quote(key)}" download>{h(name)}</a><small>{formatted}</small></li>')
    sections.append(f'<details id="{group}"><summary>{h(label)} <small>{len(files)}件</small></summary><ul>'+''.join(rows)+'</ul></details>')
page='''<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>なおとっち｜歩行空間の検証記録</title>
<style>*{box-sizing:border-box}body{font:1rem/1.65 system-ui,sans-serif;background:#f5f4e9;color:#26392c;margin:0}main{max-width:59rem;margin:auto;padding:2rem clamp(1rem,4vw,3rem) 4rem}h1{font-family:serif;font-size:clamp(1.5rem,5vw,2.5rem)}a{color:#255c44;text-underline-offset:.18rem;overflow-wrap:anywhere}nav{display:flex;gap:1rem;flex-wrap:wrap}details{background:#fffdf5;margin:.8rem 0;padding:.9rem 1rem;border:1px solid #c9cdbf;border-radius:.5rem}summary{font-weight:650;cursor:pointer}ul{padding:0;list-style:none}li{display:flex;align-items:baseline;gap:1rem;justify-content:space-between;padding:.4rem 0;border-bottom:1px solid #ddd}small{color:#526251;font-size:.8rem;white-space:nowrap}</style>
<main><nav><a href="TRIAL/v13/">試遊に戻る</a><a href="TRIAL/v13/map.html">歩行地図を見る</a><a href="TRIAL/v13/forest.html">住民別の歩行を見る</a></nav><h1>歩行空間の検証記録</h1>
<p>比較に使った合成世帯の入力と移動の記録をダウンロードできます。各ファイルのハッシュ値は <a href="./checksums.json">SHA-256一覧</a> で照合できます。</p>'''.replace('TRIAL',h(args.trial.rstrip('/')))+''.join(sections)+'</main></html>\n'
open_section="<script>function show(){const d=document.getElementById(location.hash.slice(1));if(d?.tagName==='DETAILS')d.open=true;}show();addEventListener('hashchange',show);</script>"
if 'RESULTS.md' in reports:page=page.replace('<h1>歩行空間の検証記録</h1>','<h1>歩行空間の検証記録</h1><p><a href="reports/RESULTS.html">検証結果と採用候補を読む</a></p>')
(dest/'index.html').write_text(page.replace('</main>',open_section+'</main>'))
print(len(index),'records',sum(x['bytes'] for x in index.values()),'bytes')
