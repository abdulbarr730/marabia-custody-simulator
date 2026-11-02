from PIL import Image
import base64,io,json,sys
src=Image.open(sys.argv[1]).convert('RGB')
print('bg',src.getpixel((20,20)),'size',src.size)
bg=src.getpixel((20,20))
# badge: tight crop of the white circle
badge=src.crop((155,595,553,993)).resize((256,256),Image.LANCZOS)
# wordmark: bg blue -> transparent, using the red channel as coverage
w=src.crop((585,705,1450,995)).convert('RGBA')
px=w.load()
for y in range(w.height):
  for x in range(w.width):
    r,g,b,_=px[x,y]
    a=min(1,r/255)
    if a<=0.01: px[x,y]=(255,255,255,0);continue
    un=lambda c,bc:max(0,min(255,int((c-(1-a)*bc)/a)))
    px[x,y]=(un(r,bg[0]),un(g,bg[1]),un(b,bg[2]),int(a*255))
w=w.resize((720,int(720*w.height/w.width)),Image.LANCZOS)
out={}
for n,i in (('badge',badge),('word',w)):
  buf=io.BytesIO();i.save(buf,'PNG',optimize=True);out[n]='data:image/png;base64,'+base64.b64encode(buf.getvalue()).decode();print(n,i.size,len(buf.getvalue()))
  i.save(n+'.png')
json.dump(out,open('logo.json','w'))
