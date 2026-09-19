from PIL import Image, ImageDraw, ImageFont, ImageFilter

S="/System/Library/Fonts/Supplemental/"
def F(n,s): return ImageFont.truetype(S+n,s)
SER=lambda s: F("Georgia.ttf",s)
SERI=lambda s: F("Georgia Italic.ttf",s)
SANS=lambda s: F("Helvetica.ttc",s)
SANSB=lambda s: ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf",s)

BG=(242,239,233); INK=(20,20,20); MUT=(92,88,82); LINE=(217,212,201); GREY=(138,134,124)
ART=Image.open("artwork.png").convert("RGB")

def tw(d,t,f): 
    b=d.textbbox((0,0),t,font=f); return b[2]-b[0]
def center(d,t,f,y,w,fill=INK,track=0):
    if track:
        total=sum(tw(d,c,f)+track for c in t)-track
        x=(w-total)/2
        for c in t:
            d.text((x,y),c,font=f,fill=fill); x+=tw(d,c,f)+track
        return
    d.text(((w-tw(d,t,f))/2,y),t,font=f,fill=fill)
def track_text(d,xy,t,f,fill,track):
    x,y=xy
    for c in t:
        d.text((x,y),c,font=f,fill=fill); x+=tw(d,c,f)+track
    return x
def lines(d,xy,ls,f,fill,lh,align="left",w=None):
    x,y=xy
    for l in ls:
        if align=="center": d.text(((w-tw(d,l,f))/2,y),l,font=f,fill=fill)
        else: d.text((x,y),l,font=f,fill=fill)
        y+=lh
    return y

def shadow(canvas,box,blur=26,alpha=60,spread=16):
    x0,y0,x1,y1=box
    sh=Image.new("L",canvas.size,0)
    ImageDraw.Draw(sh).rectangle((x0+6,y0+spread,x1+6,y1+spread),fill=alpha)
    sh=sh.filter(ImageFilter.GaussianBlur(blur))
    canvas.paste(Image.new("RGB",canvas.size,(0,0,0)),(0,0),sh)

def poster(width, name="numele tău", cap=None, url=None, badge=False):
    """framed poster image of given outer width"""
    art_w = int(width*0.84)
    art = ART.resize((art_w, int(ART.height*art_w/ART.width)), Image.LANCZOS)
    pad_out = int(width*0.048)          # black frame
    mat_x   = int(width*0.08)
    top_mat = int(width*0.075)
    fn = SERI(int(width*0.072)); fc = SER(int(width*0.032)); fu = SER(int(width*0.026))
    tmp = Image.new("RGB",(10,10)); td=ImageDraw.Draw(tmp)
    h = pad_out*2 + top_mat + art.height + int(width*0.075)
    cap_lines = cap or []
    h += int(width*0.09)  # name
    if cap_lines: h += int(width*0.045)*len(cap_lines)+int(width*0.02)
    if url: h += int(width*0.075)
    im = Image.new("RGB",(width,h),(17,17,17))
    d = ImageDraw.Draw(im)
    mat_w = width-2*pad_out
    d.rectangle((pad_out,pad_out,width-pad_out,h-pad_out),fill=(247,245,240))
    im.paste(art,(int((width-art.width)/2),pad_out+top_mat))
    y = pad_out+top_mat+art.height+int(width*0.055)
    center(d,name,fn,y,width); y+=int(width*0.095)
    for l in cap_lines:
        center(d,l,fc,y,width,fill=(59,59,59)); y+=int(width*0.045)
    if url:
        y+=int(width*0.02); center(d,url,fu,y,width,fill=(90,90,90))
    return im

def kicker(d,xy,t,size,fill=GREY):
    return track_text(d,xy,t.upper(),SANSB(size),fill,size*0.20)

def cta(canvas,xy,label,fsize,pad=(34,22)):
    f=SANSB(fsize); d=ImageDraw.Draw(canvas)
    w=tw(d,label,f)+pad[0]*2; h=fsize+pad[1]*2
    x,y=xy
    d.rectangle((x,y,x+w,y+h),fill=INK)
    d.text((x+pad[0],y+pad[1]-fsize*0.12),label,font=f,fill=(255,255,255))
    return (w,h)

# ---------- AD 1 : 1080x1350 hero ----------
W,H=1080,1350
c=Image.new("RGB",(W,H),BG); d=ImageDraw.Draw(c)
kw=tw(d,"LAKATOSBANDI ART FAIR",SANSB(19))+19*0.20*21
kicker(d,((W-kw)/2,70),"Lakatosbandi Art Fair",19)
center(d,"Lucrarea ta.",SER(62),130,W)
center(d,"Cu numele tău pe ea.",SER(62),208,W)
p=poster(560,cap=["Lucrarea ta, tipărită și încadrată —","cu pagina ta de artist dedesubt."],url="lakatosbandi.com/numeletau")
px=int((W-p.width)/2); py=318
shadow(c,(px,py,px+p.width,py+p.height))
c.paste(p,(px,py))
by=1120
f=SANSB(28); lw=tw(d,"Încarcă 1–10 poze",f)+68
cta(c,((W-lw)/2,by),"Încarcă 1–10 poze",28)
d=ImageDraw.Draw(c)
center(d,"Gratuit. Întâi ne uităm la lucrările tale.",SANS(21),by+108,W,fill=MUT)
c.save("ad1_hero_4x5.png")

# ---------- AD 2 : 1080x1080 before / after ----------
W,H=1080,1080
c=Image.new("RGB",(W,H),BG); d=ImageDraw.Draw(c)
kw=tw(d,"LAKATOSBANDI ART FAIR",SANSB(17))+17*0.20*21
kicker(d,((W-kw)/2,56),"Lakatosbandi Art Fair",17)
# left raw photo
lw_=400
raw=ART.resize((lw_,int(ART.height*lw_/ART.width)),Image.LANCZOS).rotate(-1.6,expand=True,fillcolor=BG,resample=Image.BICUBIC)
lx,ly=62,246
shadow(c,(lx,ly,lx+raw.width,ly+raw.height),blur=18,alpha=45,spread=10)
c.paste(raw,(lx,ly))
d=ImageDraw.Draw(c)
lab="POZA DIN TELEFON"; f=SANSB(15)
kicker(d,(lx+(raw.width-(tw(d,lab,f)+15*0.2*len(lab)))/2, ly+raw.height+34),"Poza din telefon",15)
# drawn arrow
ax,ay=505,378; d.line((ax,ay,ax+58,ay),fill=(154,149,138),width=3)
d.line((ax+40,ay-16,ax+58,ay),fill=(154,149,138),width=3)
d.line((ax+40,ay+16,ax+58,ay),fill=(154,149,138),width=3)
p=poster(400,url="lakatosbandi.com/numeletau")
pxr,pyr=596,206
shadow(c,(pxr,pyr,pxr+p.width,pyr+p.height),blur=22,alpha=55,spread=12)
c.paste(p,(pxr,pyr))
d=ImageDraw.Draw(c)
lab2="PRODUSUL TĂU"; f=SANSB(15)
kicker(d,(pxr+(p.width-(tw(d,lab2,f)+15*0.2*len(lab2)))/2, pyr+p.height+34),"Produsul tău",15,fill=INK)
center(d,"Lucrările tale devin produse.",SER(45),772,W)
center(d,"Din fiecare comandă câștigi și tu.",SER(45),834,W)
center(d,"Încarcă 1–10 poze · gratuit",SANS(20),926,W,fill=MUT)
c.save("ad2_beforeafter_1x1.png")

# ---------- AD 3 : 1080x1350 three steps ----------
W,H=1080,1350
c=Image.new("RGB",(W,H),BG); d=ImageDraw.Draw(c)
kicker(d,(76,72),"Lakatosbandi Art Fair",19)
d.text((76,124),"Trei pași până la",font=SER(60),fill=INK)
d.text((76,196),"pagina ta de artist.",font=SER(60),fill=INK)
steps=[("1","Încarci 1–10 poze","Poze din telefon sunt suficiente."),
       ("2","Ne uităm la lucrările tale","Fără costuri, fără obligații."),
       ("3","Primești pagina și produsele","Din fiecare comandă câștigi și tu.")]
y=352
for n,t,s in steps:
    d.line((76,y,W-76,y),fill=LINE,width=1)
    d.text((76,y+30),n,font=SER(42),fill=GREY)
    d.text((160,y+26),t,font=SER(34),fill=INK)
    d.text((160,y+80),s,font=SANS(21),fill=MUT)
    y+=156
d.line((76,y,W-76,y),fill=LINE,width=1)
p=poster(300,url=None)
PY3=900
c.paste(p,(76,PY3))
d=ImageDraw.Draw(c)
cx=76+p.width+64
cta(c,(cx,PY3+p.height-176),"Încarcă 1–10 poze",26)
d=ImageDraw.Draw(c)
d.text((cx,PY3+p.height-88),"Acum nu te costă nimic.",font=SANS(20),fill=MUT)
c.save("ad3_steps_4x5.png")

# ---------- AD 4 : 1080x1080 statement ----------
W,H=1080,1080
c=Image.new("RGB",(W,H),BG)
p=poster(392,url="lakatosbandi.com/numeletau")
px,py=W-392-70,int((H-p.height)/2)
shadow(c,(px,py,px+p.width,py+p.height),blur=24,alpha=55,spread=14)
c.paste(p,(px,py))
d=ImageDraw.Draw(c)
kicker(d,(78,120),"Lakatosbandi Art Fair",17)
lines(d,(78,176),["Pictezi.","Noi facem","restul."],SER(72),INK,86)
lines(d,(78,470),["Lucrările tale devin","produse, cu pagina ta","de artist. Din fiecare","comandă câștigi și tu."],SANS(24),(74,71,64),40)
cta(c,(78,H-250),"Încarcă 1–10 poze",27)
d=ImageDraw.Draw(c)
d.text((78,H-132),"Gratuit · fără obligații",font=SANS(20),fill=MUT)
c.save("ad4_statement_1x1.png")
print("done")
