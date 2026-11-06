/* The dark room that becomes the hub. One screen, so its edges are the window edges.
   Legend (all rooms): # rock  = rubble  . air  ~ water  ^ thorns  S start  T torch  P pressure plate
   G gate (open while any plate is held)  I item  M Mossback  O Spore puff  F fragment pedestal  B perch (stand still)
   H hermit crab (Flood; ents on ~ tiles carry fish:1 and flow:<n>)
   The rubble exits differ in shape so each reads as its own place (R16): the top one hangs as a plug, the bottom one is a funnel.
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
  ents:[],
};
