/* Authored mascot feet for the hop (tools/lint_mascot_body.mjs lintFeet has the format and rules).
   FEET[pose] = [left, right], each [fx from cx, row offset under the body, rows of 'k']. Lopsided on purpose: the feet do not mirror. */
export const FEET={
  stand:   [[-7,0,['kkkk','kkkk']],[3,0,['kkkk','kkkk']]],
  together:[[-4,0,['kkkk','kkkk','.kk.']],[1,0,['kkk.','kkkk','.kkk']]],  /* push-off: both feet under the belly, toes down */
  tuck:    [[-5,0,['kkk','.kk']],[1,0,['kkk','kk.']]],                    /* rising: small nubs pulled up under the belly */
  loose:   [[-6,0,['.kkk','kkk.']],[2,1,['kkk.','.kkk']]],                /* apex: lazy dangle, right foot a row lower */
  spread:  [[-10,0,['..kk','.kkk','kkk.']],[5,0,['kk..','kkk.','.kkk']]],  /* falling: legs reach down and out, toes out (/ \) */
  splay:   [[-11,0,['..kkkk','kkkkkk']],[5,0,['kkkk.','kkkkk']]],         /* landing: flat feet pushed out wide */
};
