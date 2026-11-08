/* The dark room that becomes the hub. One screen, so its edges are the window edges.
   Legend (names: game/dev/roomfmt.js): # rock = rubble . air ~ water ^ thorns S start T torch P plate G gate
   I item M Mossback O puff F pedestal B perch H crab L lava X cracked V vent E ember K beetle Q shard W platform
   Y prism R receiver D lock Z Echo. = with ent opens:<biome>: a seal till that fragment is in the door.
   The rubble exits differ in shape so each reads as its own place (R16): the top one hangs as a plug, the bottom one is a funnel
   whose middle seals the way down to Molten until the Flood piece is placed (D1). The plug seals Crystals till Molten is.
   The east exit (Flood) is open: a clean rock step with the tide sunk into its top, running on into Tideshore. */
export default {
  id:'hub',name:'Hub',biome:'hub',at:[0,0],
  grid:[
    '####=====###############',
    '#....===...............#',
    '#.....=................#',
    '#......................#',
    '#.##...................#',
    '##....................##',
    '#......................#',
    '#......................#',
    '####................####',
    '#......................#',
    '#......................#',
    '........................',
    '..##....................',
    '........................',
    '...................T..#~',
    '...........S..........##',
    '###################=====',
    '####################===#',
  ],
  ents:[{at:[4,0],opens:'molten'},{at:[5,0],opens:'molten'},{at:[6,0],opens:'molten'},{at:[7,0],opens:'molten'},{at:[8,0],opens:'molten'},{at:[5,1],opens:'molten'},{at:[6,1],opens:'molten'},{at:[7,1],opens:'molten'},{at:[6,2],opens:'molten'},{at:[20,16],opens:'flood'},{at:[21,16],opens:'flood'},{at:[22,16],opens:'flood'},{at:[20,17],opens:'flood'},{at:[21,17],opens:'flood'},{at:[22,17],opens:'flood'}],
};
