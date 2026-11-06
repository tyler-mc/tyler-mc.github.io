/* Edge bumps: pushed into a solid for a moment (dragged in the dark, or walked into a wall or the room's edge), he
   sometimes says so. All state is plain and counted in frames on S.bump, so pause, minimize and Undo keep it right.
   A bump is the rising edge of a push that lasted `need` frames; one line at most every CD frames, and "stuck" only
   after STUCK_N bumps inside WIN frames. Lines never cut in over another line (the intro's included). */
export const BUMP={DRAG:6,WALK:24,GAP:40,CD:240,WIN:600,STUCK_N:4,P_DRAG:.6,P_WALK:.3};
export const OUCH=['oof','oww'],STUCK="I think I'm stuck in here";
const rnd=(a,b)=>{let h=Math.imul(a|0,374761393)+Math.imul(b|0,668265263)|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296};

/* pushing: is he being pushed into a solid this frame; kind: 'drag' or 'walk'. Returns the line said, if any */
export function bumpStep(S,pushing,kind,ev){
  const B=S.bump||(S.bump={push:0,cd:0,hits:[]});
  if(B.cd>0)B.cd--;
  if(!pushing){B.push=0;return null}
  if(++B.push!==(kind==='drag'?BUMP.DRAG:BUMP.WALK))return null;
  if(B.hits.length&&S.t-B.hits[B.hits.length-1]<BUMP.GAP)return null;   /* one shove, not the jitter inside it */
  B.hits=B.hits.filter(t=>S.t-t<BUMP.WIN);B.hits.push(S.t);
  if(ev)ev.push('bump');
  if(S.say||B.cd>0||S.mode==='intro')return null;
  let text=null;
  if(B.hits.length>=BUMP.STUCK_N)text=STUCK;
  else if(rnd(S.t,B.hits.length)<(kind==='drag'?BUMP.P_DRAG:BUMP.P_WALK))text=OUCH[rnd(B.hits.length,S.t)<.5?0:1];
  if(!text)return null;
  S.say={text,t:text===STUCK?170:70,n:0};B.cd=BUMP.CD;if(text===STUCK)B.hits=[];
  return text;
}
