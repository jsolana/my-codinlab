"""Generates assets/logo.svg (pixel art). Usage: python3 assets/generate_logo.py assets/logo.svg"""
import random, sys
W, H, S = 196, 52, 4  # grid units, scale
px = {}  # (x,y)->color, later draws overwrite

def put(x, y, c): 
    if 0 <= x < W and 0 <= y < H: px[(x, y)] = c
def rect(x, y, w, h, c):
    for j in range(h):
        for i in range(w): put(x+i, y+j, c)

# --- sky: stepped dusk bands + stars
bands = ['#0a0a28','#0d0b30','#120d38','#190f40','#211248','#2b154f']
for y in range(H):
    rect(0, y, W, 1, bands[min(len(bands)-1, y*len(bands)//H)])
random.seed(7)
for _ in range(46):
    x, y = random.randrange(W), random.randrange(0, 30)
    put(x, y, random.choice(['#ffffff','#bcd2ff','#ffe9a8']))
# ground
rect(0, 46, W, 6, '#0b0618'); rect(0, 46, W, 1, '#2a1a4a')

# --- moon-ish green meteor (Maniac Mansion nod)
for dx, dy, c in [(0,0,'#7dff6a'),(1,0,'#7dff6a'),(0,1,'#7dff6a'),(1,1,'#3fd13f'),(-1,-1,'#3fd13f'),(-2,-2,'#1f8f2f'),(-3,-3,'#1f6f2f')]:
    put(183+dx, 6+dy, c)

# --- mansion (right)
def mansion(ox, oy):
    dark, mid, roof = '#150c26', '#1f1238', '#3a1a5c'
    rect(ox+8, oy+14, 24, 18, dark)                    # main body
    for i in range(13):                                # gable roof
        rect(ox+8+i, oy+13-i, 24-2*i, 1, roof)
    rect(ox+0, oy+10, 8, 22, mid)                      # tower
    for i in range(5):                                 # tower cone roof
        rect(ox+0+i, oy+9-i, 8-2*i, 1, roof)
    rect(ox+3, oy+3, 1, 2, '#9a7bd6')                  # spire
    for wx, wy in [(2,14),(2,22),(11,17),(17,17),(24,17),(11,24),(24,24)]:
        rect(ox+wx, oy+wy, 3, 4, '#ffd24a'); put(ox+wx+1, oy+wy+1, '#fff3b0')
        rect(ox+wx+1, oy+wy, 1, 4, '#b8861f')          # window cross
    rect(ox+17, oy+24, 4, 8, '#3b200f'); put(ox+20, oy+28, '#ffd24a')  # door
    rect(ox+15, oy+32, 8, 1, '#2a1a4a')
mansion(158, 14)

# --- purple tentacle (left)
T = ["....PPPPPP....","...PPPPPPPP...","..PPPPPPPPPP..","..PWWPPPPWWP..","..PWKPPPPWKP..",
     "..PPPPPPPPPP..","...PPPMMPPP...","....PPPPPP....",".....PPPP.....","....PPPP......",
     "...PPPP.......","...PPPPP......","....PPPPP.....",".....PPPPP....","......PPPP....",
     ".....PPPP.....","....PPPP......","...PPPP.......","..PPPP........",".PPPPP........"]
col = {'P':'#a23fd6','W':'#ffffff','K':'#111111','M':'#7a2aa0'}
ox, oy, K2 = 3, 6, 2
for j, row in enumerate(T):
    for i, ch in enumerate(row):
        if ch == '.': continue
        c = col[ch]
        if ch == 'P':
            left = i == 0 or row[i-1] == '.'; right = i == len(row)-1 or row[i+1] == '.'
            c = '#c565f2' if left else ('#7a2aa0' if right else c)
        rect(ox+i*K2, oy+j*K2, K2, K2, c)

# --- title
G = {
 'C':[".XXX.","X...X","X....","X....","X....","X...X",".XXX."],
 'O':[".XXX.","X...X","X...X","X...X","X...X","X...X",".XXX."],
 'D':["XXXX.","X...X","X...X","X...X","X...X","X...X","XXXX."],
 'I':["XXXXX","..X..","..X..","..X..","..X..","..X..","XXXXX"],
 'N':["X...X","XX..X","XX..X","X.X.X","X..XX","X..XX","X...X"],
 'L':["X....","X....","X....","X....","X....","X....","XXXXX"],
 'A':[".XXX.","X...X","X...X","XXXXX","X...X","X...X","X...X"],
 'B':["XXXX.","X...X","X...X","XXXX.","X...X","X...X","XXXX."],
 'G':[".XXX.","X...X","X....","X.XXX","X...X","X...X",".XXX."],
 'H':["X...X","X...X","X...X","XXXXX","X...X","X...X","X...X"],
 'E':["XXXXX","X....","X....","XXXX.","X....","X....","XXXXX"],
 'S':[".XXXX","X....","X....",".XXX.","....X","....X","XXXX."],
}
def text_pixels(s, scale, gap):
    pts, x = [], 0
    for ch in s:
        if ch == ' ': x += 3*scale; continue
        for j, row in enumerate(G[ch]):
            for i, c in enumerate(row):
                if c == 'X':
                    for a in range(scale):
                        for b in range(scale): pts.append((x+i*scale+a, j*scale+b))
        x += 5*scale + gap
    return pts, x - gap

def draw_text(s, ox, oy, scale, gap, colors, shadow=True):
    pts, width = text_pixels(s, scale, gap)
    base = {(ox+x, oy+y) for x, y in pts}
    if shadow:
        for x, y in base: put(x+2, y+2, '#05030f')
    outline = {(x+dx, y+dy) for x, y in base for dx in (-1,0,1) for dy in (-1,0,1)} - base
    for x, y in outline: put(x, y, '#05030f')
    for x, y in base:
        put(x, y, colors[min(len(colors)-1, (y-oy)*len(colors)//(7*scale))])
    return width

title = 'CODINLAB'
_, tw = text_pixels(title, 2, 3)
tx = 34 + (120 - tw)//2
draw_text(title, tx, 12, 2, 3, ['#fff3a0','#ffd84a','#ffb02e','#ff7a2b','#e8452f','#b92b4a','#7a2a6a'])
sub = 'CODE CHALLENGES'
_, sw = text_pixels(sub, 1, 1)
draw_text(sub, 34 + (120 - sw)//2, 34, 1, 1, ['#9be8ff','#9be8ff','#5cc8f0','#5cc8f0','#3a9ad0','#3a9ad0','#2a6aa8'], shadow=False)
# little </> bracket accents
for (x, y) in [(0,0),(1,1),(2,2),(1,3),(0,4)]:
    pass

# --- emit svg (merge horizontal runs)
out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W*S} {H*S}" width="{W*S}" height="{H*S}" shape-rendering="crispEdges" role="img" aria-label="CodinLab — coding challenges">',
       '<title>CodinLab</title>']
for y in range(H):
    x = 0
    while x < W:
        c = px.get((x, y))
        if c is None: x += 1; continue
        x2 = x
        while x2+1 < W and px.get((x2+1, y)) == c: x2 += 1
        out.append(f'<rect x="{x*S}" y="{y*S}" width="{(x2-x+1)*S}" height="{S}" fill="{c}"/>')
        x = x2+1
out.append('</svg>')
open(sys.argv[1], 'w').write('\n'.join(out))
