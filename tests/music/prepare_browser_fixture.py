"""Isolated33rd-track fixture for actual browser output. Never writes the real library."""
import pathlib,tempfile,shutil,sys,json
ROOT=pathlib.Path(__file__).resolve().parents[2];sys.path[:0]=[str(ROOT/'tools/music'),str(ROOT/'tests/music')]
from library import Library,atomic,read_json,sha
from test_library import MusicLibraryTests
root=pathlib.Path(tempfile.mkdtemp(prefix='music-browser33-'))
shutil.copytree(ROOT/'music',root/'music',ignore=shutil.ignore_patterns('.writer.lock'));shutil.copytree(ROOT/'assets/bgm',root/'assets/bgm')
L=Library(root);f=root/'music/mock-license.txt';f.write_text('CC0 test sine; not production music');sources=read_json(L.music/'sources.json');sources['test-source']={'license':'CC0-1.0','reviewed':True,'reference':'https://creativecommons.org/publicdomain/zero/1.0/','licenseFile':'music/mock-license.txt','licenseSha256':sha(f)};atomic(L.music/'sources.json',sources)
fixture=MusicLibraryTests();fixture.root=root;t=fixture.candidate();L.register(t);L.approve(t['id'],'automated mock approval, not production');atomic(L.music/'extensions.json',{'rows':[{'rowId':'mock-51','game':'test only','scene':'test','songs':[t['id']]}],'gameSongs':{'mock-new-game':t['id']}});L.build();L.preview(root/'trial');L.preserve();print(root)
