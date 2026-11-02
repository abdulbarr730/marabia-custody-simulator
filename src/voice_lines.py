import re,json
s=open('d_sim.js',encoding='utf-8').read()
film=s[s.index('const STAGES=['):s.index('TAMPER SCENARIOS')]
out={}
for m in re.finditer(r"say\(\s*(?:'[^']*'|`[^`]*`)\s*,(.*?)\);",film,flags=re.S):
    for lit in re.findall(r"'([^']*)'|`([^`]*)`",m.group(1)):
        t=lit[0] or lit[1]
        for q in (['15,000 L','10,000 L','5,000 L'] if '${L()}' in t else [None]):
            k=t.replace('${L()}',q) if q else t
            sp=re.sub(r'(\d),(\d{3}) L',lambda x:x.group(1)+x.group(2)+' litres',k).replace('ppm','parts per million').replace('M Arabia','M Arabia')
            out[k]=sp
lines=[{'key':k,'speak':v,'file':'clip%02d.wav'%i} for i,(k,v) in enumerate(out.items())]
json.dump(lines,open('lines.json','w',encoding='utf-8'),ensure_ascii=False,indent=0)
print(len(lines));[print(l['file'],l['speak']) for l in lines]
