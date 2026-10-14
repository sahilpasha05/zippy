"""Builds 1080x1920 photo frames from source images (blurred backdrop + rounded product card).
Sources: zippy repo (banners, categories) and sahilpasha05/imgsapi (mybite, nandini). Paths below point at local clones."""
from PIL import Image, ImageFilter, ImageDraw, ImageEnhance
import math, os
P='/home/user/zippy/public/'; I='/home/user/sahilpasha05/imgsapi/'; out='public/assets/images'; W,H=1080,1920
os.makedirs(out, exist_ok=True)
def crop(name, box):
    im=Image.open(P+name).convert('RGB'); w,h=im.size
    return im.crop((int(box[0]*w),int(box[1]*h),int(box[2]*w),int(box[3]*h)))
def photo(src,name,maxh=1150,maxw=1000,cy=690):
    r=max(W/src.width,H/src.height); bg=src.resize((int(src.width*r)+1,int(src.height*r)+1),Image.LANCZOS)
    bg=bg.crop(((bg.width-W)//2,(bg.height-H)//2,(bg.width-W)//2+W,(bg.height-H)//2+H)).filter(ImageFilter.GaussianBlur(48))
    bg=ImageEnhance.Brightness(bg).enhance(0.36)
    fw=min(maxw,int(maxh*src.width/src.height)); fg=src.resize((fw,int(src.height*fw/src.width)),Image.LANCZOS).filter(ImageFilter.UnsharpMask(2,55,2))
    m=Image.new('L',fg.size,0); ImageDraw.Draw(m).rounded_rectangle((0,0,fg.width-1,fg.height-1),40,fill=255)
    x=(W-fg.width)//2; y=cy-fg.height//2
    sm=Image.new('L',(W,H),0); sm.paste(m.point(lambda v:int(v*.7)),(x,y+30)); sm=sm.filter(ImageFilter.GaussianBlur(40)); bg.paste((0,0,0),(0,0),sm)
    bg.paste(fg,(x,y),m); bg.save(f'{out}/{name}.jpg',quality=93)
def studio(cy=700):
    bg=Image.new('RGB',(W,H),(8,16,11)); px=bg.load()
    for yy in range(H):
        for xx in range(0,W,2):
            d=math.hypot((xx-540)/700,(yy-cy)/760); v=max(0,1-d); c=(int(8+40*v),int(16+85*v),int(11+40*v)); px[xx,yy]=c; px[min(xx+1,W-1),yy]=c
    return bg.convert('RGBA')
def place(bg,p,cx,cy):
    x=cx-p.width//2; y=cy-p.height//2
    sm=Image.new('L',(W,H),0); sm.paste(p.split()[3].point(lambda v:int(v*.6)),(x+10,y+40)); sm=sm.filter(ImageFilter.GaussianBlur(30)); bg.paste((0,0,0,255),(0,0),sm); bg.alpha_composite(p,(x,y))
def cut(im,h=None,w=None):
    im=im.crop(im.getbbox())
    return im.resize((w,int(im.height*w/im.width)),Image.LANCZOS).filter(ImageFilter.UnsharpMask(2,60,2)) if w else im.resize((int(im.width*h/im.height),h),Image.LANCZOS)
photo(crop('banners/jaihind-biryani-b2g1.jpeg',(0.56,0.33,0.985,0.92)),'s2-biryani',maxh=980)
photo(Image.open(I+'mybite/pizza-fresh-juice-combo.jpg').convert('RGB'),'s2-pizza')
photo(Image.open(I+'mybite/peri-peri-veg-burger.jpg').convert('RGB'),'s2-burger')
photo(crop('banners/smileycafe-free-fries-200.jpeg',(0.67,0.36,0.965,0.90)),'s2-fries',maxh=980)
bg=studio(); place(bg,cut(Image.open(P+'categories/cat-fruits-vegetables.jpg').convert('RGBA'),w=960),540,700); bg.convert('RGB').save(f'{out}/s3-produce.jpg',quality=93)
bg=studio()
for f,rot,cx,cy,h in [('nandini/milk/nandini-homogenised-cow-s-pure-milk.png',8,250,780,520),('nandini/milk/nandini-double-toned-milk.png',-8,830,780,520),('nandini/milk/nandini-pasteurised-toned-milk.png',0,540,700,600)]:
    place(bg,cut(Image.open(I+f).convert('RGBA'),h=h).rotate(rot,expand=True,resample=Image.BICUBIC),cx,cy)
bg.convert('RGB').save(f'{out}/s3-shelves.jpg',quality=93); print('frames ok')
