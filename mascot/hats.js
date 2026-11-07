/* Authored head gear at twice the old size, drawn at native resolution (never upscaled). Lint: node tools/lint_anim_head.mjs.
   HATS[name] = {rows, ax, ay, lift}: the hat sits OVER the head tip; (ax,ay) is the pixel of rows stamped on BODY[level].tip; lift = how many rows compose extends the
   stem straight up (from the stem's top pixel) so the stem and leaf poke out above the hat; the leaf is stamped at (tip.x+ox, tip.y+oy-lift). Compose order: stem base,
   hat over it, stem extension, leaf on top. Keep the stem column (tip.x+3) clear in the hat above the stem top, or the extension paints over the hat.
     crown  19x12  gold Y / light o / pink jewel H, k outline: three spikes and a jewelled band. Rows tip-6..tip+5 at rest (26..37): brim 5 rows below the tip, 19 px
                   wide (10..28) over the 17 px head row beneath it. lift 5: the stem rises out of the valley right of the centre spike and shows 2 px above the spikes.
     party  19x16  pink H / yellow o diagonal stripes, k outline, white pom pom (w, B shade) on the tip. Rows tip-10..tip+5 (22..37): brim 5 rows below the tip,
                   19 px wide. lift 9: the stem comes out from behind the cone's right flank and its top shows above the pom pom.
   GEAR[name] = {rows, ox, oy}: stamped unmirrored at (cx+ox, cy+oy) over the face (cx = the face anchor column, 20 plain / 21 flipped; cy = BODY[level].cy), so
   each is symmetric about column cx-1 (the eye pair's centre) and fits the body both ways.
     shades 21x7   (look.hat='shades') black k lenses 7x7 (outer bottom corner rounded) covering both 6x7 eye boxes entirely with a w glint top left, a bridge and short side arms; rows cy-6..cy, x cx-11..cx+9.
     mask   19x15  (look.mask=1) the skull mask from the game's unreleased sequence: bone B with b shade (right and bottom), k outline, black oval eye sockets with a
                   w glint, an inverted-V nose and a grinning row of teeth. Rows cy-8..cy+6, x cx-10..cx+8: inside the body fill on every level, so the body's own
                   outline (and on most rows a 1 px red rim) stays visible around it. The face is still composed underneath; the mask covers eyes, cheeks and mouth.
   WIRING NOTE (os.js). These are static props: no frames, no hold times; they ride on whatever body/pose is shown; hats mirror with it, gear is re-placed.
     hats + shades: the OS buddy's hat menu (HATS list: none / Party hat / Tiny crown / Sunglasses) -> setHat() sets BS.hat, persisted as 'tos_hat'; the Read Me
                    window poses the arms differently when the party hat is on. Worn until changed.
     mask:          after the system crash (the unreleased sequence) the skull is unlocked in the Trash; setMask() sets BS.mask (persisted 'tos_mask'), worn until removed.
     Wake Up game:  not wired yet (no game call site in this repo).
     Reduced motion: unchanged (static). Baked pose frames (PF.baked) draw their own head and ignore these. */
export const HATS={
  crown:{ax:10,ay:6,lift:5,rows:[
    "kk.......k.......kk",
    "kok.....kok.....kok",
    "kok....kkokk....kok",
    "kYk....kYoYk....kYk",
    "kYYkkkkYYoYYkkkkYYk",
    "kYoYYYYYYYYYYYYYYYk",
    "koYYYYYYYYYYYYYYYYk",
    "kkkkkkkkkkkkkkkkkkk",
    "koYYYYYYkkkYYYYYYYk",
    "kYoHYYYkHwHkYYYHYYk",
    "kYYYYYYYkHkYYYYYYYk",
    "kkkkkkkkkkkkkkkkkkk"
  ]},
  party:{ax:10,ay:10,lift:9,rows:[
    "........kkk........",
    ".......kwwwk.......",
    "......kwwwwBk......",
    ".......kwBBk.......",
    "........kHk........",
    ".......kHHok.......",
    ".......kHook.......",
    "......kHoooHk......",
    ".....kHoooHHHk.....",
    "....kHoooHHHook....",
    "....koooHHHoook....",
    "...koooHHHoooHHk...",
    "..koooHHHoooHHHok..",
    ".koooHHHoooHHHoook.",
    ".kooHHHoooHHHoooHk.",
    "kkkkkkkkkkkkkkkkkkk"
  ]},
};
export const GEAR={
  shades:{ox:-11,oy:-6,rows:[
    "..kkkkkkk...kkkkkkk..",
    "kkkkwwkkkkkkkkwwkkkkk",
    "..kwkkkkk...kwkkkkk..",
    "..kkkkkkk...kkkkkkk..",
    "..kkkkkkk...kkkkkkk..",
    "..kkkkkkk...kkkkkkk..",
    "...kkkkkk...kkkkkk..."
  ]},
  mask:{ox:-10,oy:-8,rows:[
    "....kkkkkkkkkkk....",
    "..kkBBBBBBBBBBbkk..",
    ".kBBBBBBBBBBBBBBbk.",
    "kBBkkkkBBBBBkkkkBbk",
    "kBkwkkkkBBBkwkkkkbk",
    "kBkkkkkkBBBkkkkkkbk",
    "kBkkkkkkBBBkkkkkkbk",
    "kBkkkkkkBBBkkkkkkbk",
    "kBBkkkkBBkBBkkkkBbk",
    "kBBBBBBBkBkBBBBBBbk",
    "kBkBBBBBBBBBBBBBkbk",
    ".kBkkkkkkkkkkkkkbk.",
    ".kBkBBkBBkBBkBBkbk.",
    ".kkkbbkbbkbbkbbkkk.",
    "...kkkkkkkkkkkkk..."
  ]},
};
