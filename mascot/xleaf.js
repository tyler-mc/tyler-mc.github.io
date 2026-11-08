/* The extra growth on his sprout after he eats a plant in the game (game/feed.js): a second leaf, or a flower, in three growth steps.
   Rows are stamped with their top-left at (tip.x+3+dx, tip.y-3-lift+dy): (tip.x+3, tip.y-3) is the top of the stem, lift the hat's lift.
   The leaf points left (the main leaf sweeps right) and is stamped UNDER the main leaf; the flower is the stage 4 flower (mascot/leaf.js) and is stamped OVER it.
   Same palette letters as LEAF. Not used by the OS buddy: compose() only reads look.xl / look.xs, which default off. */
export const XLEAF={
  leaf:[
    {dx:-3,dy:-1,rows:[".hh.","hTnn"]},
    {dx:-5,dy:-2,rows:["..hh..",".hTTh.","hhhhnn"]},
    {dx:-7,dy:-3,rows:["..hhh...",".hTTTh..","hTTnnTh.",".hhhhhnn"]}
  ],
  flower:[
    {dx:-1,dy:-2,rows:[".k.","kYk"]},
    {dx:-2,dy:-4,rows:[".kkk.","kwYwk","kYoYk",".kkk."]},
    {dx:-3,dy:-6,rows:[".kk.kk.","kwwkwwk","kwoYowk",".kYrYk.","kwoYoBk","kwBkBBk",".kk.kk."]}
  ]
};
