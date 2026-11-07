/* The dark room that becomes the hub. One screen, so its edges are the window edges.
   Legend (all rooms): # rock  = rubble  . air  ~ water  ^ thorns  S start  T torch  P pressure plate
   G gate (open while any plate is held)  I item  M Mossback  O Spore puff  F fragment pedestal  B perch (stand still)
   H hermit crab (Flood; ents on ~ tiles carry fish:1 and flow:<n>)
   = with ent opens:<biome>: a seal, solid until that fragment is in the door.
   The rubble exits differ in shape so each reads as its own place (R16): the top one hangs as a plug, the bottom one is a funnel
   whose middle seals the way down to Molten until the Flood piece is placed (D1).
   The east exit (Flood) is open and has no rubble: a clean rock step with the tide sunk into its top, running on into Tideshore. */
export default {
  id:'hub',name:'Hub',biome:'hub',at:[0,0],
  grid:[
    '####=====###############',
    '#....===...............#',
    '#.....=................#',
    '#......................#',
    '#......................#',
    '##....................##',
    '#......................#',
    '#......................#',
    '####................####',
    '#......................#',
    '#......................#',
    '........................',
    '........................',
    '........................',
    '...................T..#~',
    '...........S..........##',
    '###################=====',
    '####################===#',
  ],
  ents:[{at:[20,16],opens:'flood'},{at:[21,16],opens:'flood'},{at:[22,16],opens:'flood'},{at:[20,17],opens:'flood'},{at:[21,17],opens:'flood'},{at:[22,17],opens:'flood'}],
};
