/* The walk and run set for the Wake Up game's player (data only; game/ adopts it later). Unlike the tilted animations this needs no whole-frame art: a walk is built from
   parts. WALK_LOOKS is one full stride of 8 looks for compose(), two steps of 4: contact, down, passing, up (feet.js walkA..walkD). The two steps use the same shoe drawings;
   the arms see-saw the opposite way on the second step, so all 8 looks differ. Faces right; flip:1 for left.
   The legs: at contact the planted shoe is far forward (its centre 11 px ahead of the body's) and the trailing shoe pushes off behind; the planted shoe then slides back 6 px
   a look under the body (down, passing, up: its heel lifts) while the other shoe swings through IN FRONT of the body, lifted, and reaches forward for the next contact.
   The body is LOW on contact and down (`breath`) and TALL on passing and up (`rest`): a weight shift, 1 row.
   WIRING NOTE: pick the look by distance travelled in the facing direction: i = floor(d * face / WALK_STRIDE_PX) % 8 with WALK_STRIDE_PX = 6 (the game's FEEL.STRIDE): a step is 4 looks
   = 24 px, so the planted shoe moves back at the ground speed (no slide), and a footstep falls every 24 px on look 0 (contact). Walking left plays the same cycle: x falls,
   face is -1, so d*face still rises. Reduced motion / standing: the rest look. Start/stop: `WALK_START` and `WALK_STOP` (not wired in the game yet). */
export const ANIM_WALK={frames:[]};
export const WALK_STRIDE_PX=6;
const STEP=[{lv:'breath',ft:'walkA'},{lv:'breath',ft:'walkB'},{lv:'rest',ft:'walkC'},{lv:'rest',ft:'walkD'}];
const SWING=[[210,30],[210,0],[210,330],[180,330],[150,330],[180,330],[180,330],[210,0]];   /* [left, right] arm angles per look: a pendulum, one arm up then the other */
export const IDLE_TURN=3;   /* the standing look is 3/4 as well: the face slid IDLE_TURN px and the body IDLE_LEAN px toward the way he faces, so the walk (below) starts and stops without a snap */
export const IDLE_LEAN=1;
export const WALK_TURN=3;   /* px the face slides toward the way he walks (compose's s.turn): without it he walks facing the camera */
export const WALK_LEAN=2;   /* walking leans 1 px further than standing */   /* px the body leans over the front shoe (compose's s.lean): the shoes stay put, so he leans into the walk */
export const WALK_LOOKS=SWING.map((arms,i)=>({...STEP[i&3],arms,turn:WALK_TURN,lean:WALK_LEAN}));
export const WALK_START={lv:'T1',ft:'walkA',arms:[210,30]};
export const WALK_STOP={lv:'S1',ft:'stand',arms:[190,350]};
