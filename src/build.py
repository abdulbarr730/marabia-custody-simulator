import json,os,base64
d=os.path.dirname(os.path.abspath(__file__))
r=lambda n:open(os.path.join(d,n),encoding='utf-8').read()
logo=json.load(open(os.path.join(d,'logo.json')))
clips={l['key']:base64.b64encode(open(os.path.join(d,'clips',l['file']),'rb').read()).decode() for l in json.load(open(os.path.join(d,'lines.json'),encoding='utf-8'))}
js=''.join(r(n)+'\n' for n in('b_world.js','c_rigs.js','d_sim.js','f_ops.js','g_driver.js','e_ui.js'))
open(os.path.join(d,'all.js'),'w',encoding='utf-8').write('const VOICE_CLIPS={};\n'+js)
html=r('a_head.html').replace('__BADGE__',logo['badge']).replace('__WORD__',logo['word'])
html+='<script>\nconst VOICE_CLIPS='+json.dumps(clips,ensure_ascii=False)+';\n</script>\n<script>\n'+js+'</script>\n</body>\n</html>\n'
out=os.path.join(d,'..','index.html')
open(out,'w',encoding='utf-8').write(html)
print('wrote',out,len(html)//1024,'KB',len(clips),'clips')
