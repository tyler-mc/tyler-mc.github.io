/**
 * Tyler McCulloch Portfolio - Interactive Features
 */

// Project Case Study Data
const projectData = {
  pistolwhip: {
    title: "Pistol Whip",
    role: "Game Director",
    studio: "Cloudhead Games",
    dates: "2019 – Present",
    image: "images/pistol_whip_banner.jpg",
    tagline: "VR Rhythm-Shooter",
    accomplishment: "Award-winning, critically acclaimed VR rhythm shooter. Community created 500+ remixes.",
    bodyContent: '<p>Pistol Whip is an ongoing VR rhythm-shooter which I acted as Game Director for.</p><figure><img src="images/pistol_whip_content_1.jpg" alt=""></figure><p>I was responsible for planning new content releases and improvements that got added to the game. After it’s release the goal was to continually support the game with additional content releases and keep them free which generated a lot of goodwill with our loyal community.</p><figure><img src="images/pistolwhip_voidslayergif.gif" alt="Pistol Whip content"></figure><p>I also focused on how to expand both music taste as well as new ways to play the game while staying true to the raw simplicity of the base game.</p><p>One of our final updates included creating a pc-based level editor so players could create their own levels. I called this ‘Pistol Mix’ as a nod to song remixes as it allowed players to take preexisting content and remix the levels in new and creative ways.</p><figure><img src="images/pistolwhip_pisstolmix.avif" alt="Pistol Mix level editor"></figure>  It has been an incredible way to continue to keep the community engaged and they have released well over 500 remixes far surpassing our totaly relases over the years of 45 levels.',
    contributions: [
      "Directed post-launch content strategy, planning free content releases that generated community goodwill",
      "Expanded the game's musical diversity while maintaining gameplay simplicity",
      "Created 'Pistol Mix' - a PC-based level editor allowing players to remix existing content",
      "Managed live service model with regular content drops and progression tuning",
      "Identified workflow improvements in the content creation pipeline"
    ],
    skills: ["Live Service", "VR Design", "Team Leadership", "Content Strategy", "Level Editor Design"]
  },
  foundation: {
    title: "Journey To Foundation",
    role: "Co-Creative Director",
    studio: "Archiact Interactive",
    dates: "2022",
    image: "images/JourneyToFoundation_Banner.png",
    tagline: "VR Roleplaying Adventure based on Isaac Asimov's saga",
    accomplishment: "Narrative cited as 'main highlight' in critical reviews.",
    bodyContent: '<p>Overview</p><p>Based on Isaac Asimov’s groundbreaking literary saga, Journey to Foundation is an epic sci-fi VR Roleplaying Adventure.</p><figure><img src="images/JourneyToFoundation_shot1.webp" alt="Journey To Foundation gameplay"></figure><p>I operated as co-creative director on this project so that I could split my focus between this and the <a href="#" class="internal-project-link" data-project="horizon">Horizon World project</a></p><p>I had the amazing opportunity to work closely with Archiact’s Art Director and Executive Producer who had both previously worked on the Mass Effect and Dragon age series and I learnt a lot from them. One of my goals on this project was to make a larger narrative adventure built upon the tools and systems we originally built for <a href="#" class="internal-project-link" data-project="flourish">Flourish</a>. I laid out a lot of the core of the project setting processes, frameworks and goals. </p><figure><img src="images/JourneyToFoundation_GameLoops.jpg" alt="Game loops design"><figcaption>Early breakdown of the loops and the balance of the different gameplay I originally set for the game</figcaption></figure><p><figure><img src="images/JourneyToFoundation_shot2.webp" alt="Journey To Foundation environment"></figure><p>I was primarily responsible for directing and leading the narrative and UX teams and architeching their underlying interaction systems.  I’m particularly proud of the narrative we created as it was consistently given top marks in reviews. A mantra we used was "particpatory drama", where we wanted players to feel involved in the conversations through physical actions and not just menu selections. This ended up as part of the "boss fights" in the final product.</p><figure><img src="images/JourneyToFoundation_shot3.webp" alt="Journey To Foundation gameplay"></figure>',
    contributions: [
      "Co-directed creative vision alongside Mass Effect/Dragon Age veterans",
      "Led narrative, UX and gameplay teams through development",
      "Built upon tools and systems created for Flourish project",
      "Narrative was cited as the 'main highlight' in critical reviews",
      "Collaborated with Art Director and Executive Producer on world-building"
    ],
    skills: ["Narrative Design", "Creative Direction", "Team Leadership", "VR Design", "Story Systems"]
  },
  proximity: {
    title: "Proximity",
    role: "Creative Director / Co-founder",
    studio: "Inscape Studios",
    dates: "2022",
    image: "images/Proximity_Banner.png",
    tagline: "VR Narrative Adventure with AI-driven conversation",
    accomplishment: "Successfully pitched and raised funds. Grew from sole developer to team of 5.",
    bodyContent: '<p>Overview</p><p>Proximity is a prototype of a narrative adventure for Quest 2, featuring conversation-driven gameplay with an eccentric robot named Lou. Players can talk with Lou, whose voice is generated in real-time, allowing Lou to respond in potentially new and original ways each play session.</p><figure><img src="images/Proximity_Shot1.jpg" alt=""></figure><p>This was a passion project created with a team of around 5 people started by myself and my co-founder Matt.</p><p>With my experience in games and design and Matt\'s experience in writing and</p><p>narrative we set out to creative this interactive VR experience. We successfully pitched and funded the concept as well as hired a team to help create it.</p><p>I started with the thought \"What if you could go on a narratively-driven adventure but you had a companion that you turn to talk to at any point throughout it?\"</p><figure><img src="images/Proximity_Shot2.png" alt=""></figure><p>The goal was to create an interactive AI character that you could develop a relationship and bond with through conversation and working through challenging circumstances together.</p><figure class="video-embed"><iframe width="560" height="315" src="https://www.youtube.com/embed/vO_IZWPN50s" title="Proximity VR Gameplay" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></figure><p>Apart from the creative vision, my role was creating and implementing all the player interactions ,puzzle elements, as well as mission and story progression. I also created and setup up all of Lou’s interactions and animations with a combo of myself in a mocap suit, hand animating and FinalIK implementation</p>',
    contributions: [
      "Created and implemented all player interactions and puzzle elements",
      "Designed mission and story progression systems",
      "Created Lou's interactions and animations using motion capture and FinalIK",
      "Successfully pitched and funded the concept",
      "Built and managed a fully remote team of 5 developers"
    ],
    skills: ["AI/LLM Integration", "Conversational AI", "Remote Team Leadership", "Unity", "Motion Capture"]
  },
  horizon: {
    title: "Horizon Worlds",
    role: "Creative Director",
    studio: "Archiact Interactive (Meta contract)",
    dates: "2022",
    image: "images/HorizonWorld_Banner.jpeg",
    tagline: "Meta's social VR platform experiences",
    accomplishment: "Topped Meta's internal retention charts. Contract extended from 6 months to 2+ years.",
    bodyContent: '<p>Horizon Worlds is Meta’s online social platform and creation tool.</p><p>While at Archiact Interactive, we were tasked with seeding game and mini-game content in Meta’s social platform.</p><p>This was so the core platform team could focus on the platform itself as well as continue to develop the content creation tools.</p><p>We successfully negotiated the contract after I had initially put together a high level proposal for a number of VR-centric multiplayer games.</p><p>During production I lead our team through a series of multiple overlapping short production cycles (3-6 months) that would then ultimately be pushed live, put on hold, or cancelled by Meta.</p><p>Because the development tools were in a state of always being improved our work was occasionally subject to being depreciated or put on hold until key features were integrated into the platform.</p><p>Meta was extremely complimentary of our work and what was meant to be a 6 month contract extended out to over 2 years. We were able to expand and hire up more on the team. I implemented and used hiring and training procedures so we could have a healthy balance of experiences and those new to the industry.</p>',
    contributions: [
      "Put together initial high-level proposal that won the contract",
      "Led team through multiple overlapping 3-6 month production cycles",
      "Expanded team with healthy balance of experienced and new developers",
      "Implemented hiring and training procedures for team growth",
      "Extended 6-month contract to over 2 years through quality delivery"
    ],
    skills: ["Social Design", "Retention Systems", "Team Building", "Client Relations", "Platform Development"]
  },
  flourish: {
    title: "Flourish",
    role: "Creative Director",
    studio: "Archiact Interactive",
    dates: "2021",
    image: "images/Flourish_Banner.jpeg",
    tagline: "VR Physiotherapy Game",
    accomplishment: "Pioneered innovative approach to making repetitive exercise engaging.",
    bodyContent: '<p>The company I was working for was approached by a biomedical tech company with a question.</p><p>\'Can you make a VR game that makes Physiotherapy fun?\'</p><p>I created a pitch where the repetitive exercises required in physio transformed into magical spells.</p><p>The concept was as users literally healed their bodies, this would transform into magical energy that would heal the broken land around you.</p><p>The core inspiration was walking through my local community garden trying to think of a concept. Thinking of how these gardens grow and transform the land into something beautiful.</p><figure><img src="images/Flourish_totoroexample.gif" alt=""><figcaption>Then I remembered this scene from \'My Neighbour Totoro\' performing movements that grew plants and that became the basis for game.</figcaption></figure><p>The client loved the proposal, so we set out to achieve what we hoped would be an experience that would encourage users to continue to return to physio to engage with this experience again.</p><p>I worked closely with our narrative director to establish a basic story structure, including characters that would help guide the user through the experience.</p><p>Each of these characters represented a common reason people either don\'t go to or stop doing physio. As the user progresses, they overcome their own thoughts and are encouraged to continue their own health journeys.</p><figure><img src="images/Floursh_VornConcept.jpg" alt=""><figcaption>Vorn here helps the player through the the first of 4 different biomes that users restore in their journey.</figcaption></figure><p>The art director and I established a look that we felt inviting and would run on the target proprietary hardware. It was important to me that it looked like a fun and whimsical place but did not look too childish as our target audience was not children for this product.</p><figure><img src="images/Flourish_StoryboardExample.jpg" alt=""><figcaption>storyboard from the end of the first biome rescuing Vorn</figcaption></figure><p>One thing that was really important is that the game has the ability to be customizable by physiotherapists both before the game starts and during a patient session. I designed a \'playlist\'-like system which allowed therapists to swap in different exercises as needed. This proved</p><p>to be quite a technical challenge for our engineers but not only was this accomplished, we created a tool that gave the ability to make new exercise in the future by recording the movements in VR.</p>',
    contributions: [
      "Created original pitch transforming physio exercises into magical spells",
      "Designed customizable 'playlist' system for physiotherapists",
      "Worked with art director to establish inviting, non-childish visual style",
      "Collaborated with narrative director on story structure and characters",
      "Created tool for recording new exercises in VR"
    ],
    skills: ["Health Tech", "Gamification", "Progression Systems", "VR Design", "User Retention"]
  },
  marvel: {
    title: "Marvel: Dimension of Heroes",
    role: "Design Lead",
    studio: "Archiact Interactive (Lenovo)",
    dates: "2019",
    image: "images/Marvel_Banner.jpeg",
    tagline: "AR Marvel action brawler for Lenovo Mirage",
    accomplishment: "Delivered under tight timelines. Maintained Marvel/Disney IP quality standards.",
    bodyContent: '<p>Dimension of Heroes was a unique project for the first consumer facing AR headset, the Lenovo Mirage. This was a headset that required a user to insert their phone into the headset to use. Getting this game running on target hardware with an optimal framerate was quite a challenge!</p><figure><img src="images/Marvel_Shot1.jpg" alt=""></figure><p>It was a waved-based brawler/shooter with both a single player and separate co-operative mode. We created 8 total playable characters (two hidden unlockable)  each with their own unique playstyle and mini-campaign. It also had an arcade survival mode for each character</p><p>type. The team was in a difficult position creating a project without final hardware and shifting directives. This caused delays and a lot of stress on the team.</p><figure><img src="images/Marvel_Shot2.jpg" alt=""></figure><p>When I came on board, the team was fractured and trust on the design team was low.</p><p>It was my goal to restore this trust and unite the team.</p><p>My first step was understand how the design team was feeling and what challenges they were facing. My role was to champion them and their ideas and make sure they were all united to install confidence for the rest of the team.</p><p>In addition to the unification of the design team, I worked closely with the other team leads to understand their needs and how I could help them succeed in their roles as well.</p><figure><img src="images/Marvel_Shot3.jpg" alt=""></figure><p>Finally, I worked with the external sound and cinematics teams ensuring goals and ideas were clearly communicated both ways. I also became hands on integrating the cinematics and dynamic music into the game. Pictured above is one of the cinematics in which we created this great parallax</p><p>portal which simulated depth and was very performant. I only played one part in this healing and unification but I am proud of this team and what they made and there was positive team feeling by the end of the project.</p>',
    contributions: [
      "Restored trust and united a fractured design team",
      "Led team to deliver 8 playable characters with unique playstyles",
      "Integrated cinematics and dynamic music including parallax portal effect",
      "Worked closely with external sound and cinematics teams",
      "Championed designers' ideas to build team confidence"
    ],
    skills: ["Team Unification", "AR Design", "Combat Systems", "IP Management", "Cinematics Integration"]
  },
  form: {
    title: "FORM",
    role: "Lead Game Designer",
    studio: "Charm Games",
    dates: "Jun 2015 – July 2017",
    image: "images/FORM_banner.jpeg",
    tagline: "Surreal VR narrative puzzle experience",
    accomplishment: "Award-winning narrative puzzle game.",
    bodyContent: '<p>FORM was created by the talented folks folks at Charm Games and was our first released foray into VR. There were only 3 of us to start which expanded into 5-6 people by the time we launched the game. As the only designer on the project, I was responsible for figuring out most things. I scripted the game almost entirely using Playmaker, a visual scripting tool for Unity.</p><p>The core of the game is interactions, simple puzzles and surreal spectacle. It was designed to take you on a journey that could only be presented in VR.</p><figure><img src="images/FORM_Shot1.png" alt=""></figure><p>Designing puzzles that were surreal and \'alien\' but also gave off UX cues in order for players to understand was a great design challenge. Many of the design conventions that I expected to work fell flat in VR and I had to relearn a lot of my expectations.</p><figure><img src="images/FORM_Shot2.jpg" alt=""></figure><p>What I am particular proud of us accomplishing is the mood and feel of the game. The sound design was as equally important as the lighting design to draw players into this strange experience.</p>',
    contributions: [
      "Sole designer responsible for all game systems and puzzles",
      "Scripted entire game using Playmaker visual scripting",
      "Designed surreal 'alien' puzzles with clear UX cues for VR",
      "Established mood and feel through sound and lighting design",
      "Adapted design conventions to VR medium"
    ],
    skills: ["Puzzle Design", "Playmaker", "VR Interaction", "Visual Scripting", "UX Design"]
  },
  petras: {
    title: "Petra's Planet",
    role: "Lead Game Designer",
    studio: "Dramaforum",
    dates: "Feb 2014 – Nov 2014",
    image: "images/Petra_banner.png",
    tagline: "Online educational world for kids",
    accomplishment: "Transformed struggling platform into thriving social world. Significantly increased retention.",
    bodyContent: '<p>Petra\'s Planet was an online game platform for kids with the goal of educating them about real world cultures.</p><p>When I came aboard the game was already live but it was missing an element of \'magic\'.</p><p>It felt empty and disconnected. There was also no reward structure or sense of play when completed the education lessons</p><p>As Lead Designer on the project, it was my goal to design and pitch features that focused on social and retention features as well aimplemented multiple rewards for learning and exploring.</p><figure><img src="images/Petra_Shot1.png" alt=""></figure><p>First was the design of a main hub world where all players would load into. Previously, players would be loaded into a randomized location and left to explore from there.</p><p>Connecting everyone together encourages players to socialize and make friends to which they could then explore the world together.</p><p>Some common retention features were also implemented such as a \'members only\' mansion, daily prize chest, and a magical waterfall that pour coins to collect a couple times a day.</p><figure><img src="images/Petra_shot2.png" alt=""></figure><p>In order to reward players for exploring and completing missions, customizable avatars, personal spaces and later, pets were added to the game.</p><p>This allowed for many more things for players to buy as well as gave the ability for special objects to be given to players to wear,  display in their homes or dress their pets with</p><figure><img src="images/Petra_Shot3.png" alt=""></figure><p>And of course, will all of that, you needed something to carry it all in!</p><p>When first proposed these features were met with great apprehension because they were not educational.</p><p>When I first pitched the inventory (originally a backpack), it was met with \"that\'s silly! A couch can\'t fit in a backpack\"</p><p>The owners of the company did not have a games background so it took time  to explain the value of these features and how they made a complete game loop which would encourage players to engage in the educational components even more.</p><p>These features eventually became celebrated and paved the road for more magic in later updates</p>',
    contributions: [
      "Designed main hub world connecting all players together",
      "Created retention features: members mansion, daily prize chest, coin waterfall",
      "Added customizable avatars, personal spaces, and pets",
      "Designed inventory system for rewards and collectibles",
      "Pitched and defended game features to non-gaming stakeholders"
    ],
    skills: ["Live Ops", "Kids Games", "Social Design", "Retention Design", "Stakeholder Management"]
  },
  citizengrim: {
    title: "Citizen Grim",
    role: "Lead Designer",
    studio: "Eruptive Games",
    dates: "Feb 2013",
    image: "images/CitizenGrim_banner.jpeg",
    tagline: "F2P social wave-based shooter",
    accomplishment: "Improved retention and ratings through metrics-driven iteration.",
    bodyContent: '<p>Citizen Grim was a f2p social game that was basically a wave-based shooter.</p><p>When I came on board the game was already live and had a core user base.</p><figure><img src="images/CitizenGrim_shot1.png" alt=""></figure><p>My goal was to create an improved first-time user experience to allow players to immerse themselves into the game and also allow for a small amount of narrative context into the game.</p><p>Introducing the games first \'boss\' early allowed for some narrative pay-off once the player encountered the enemy later on.</p><figure><img src="images/CitizenGrim_Shot2.png" alt=""></figure><p>The next this was adding many different progression features, the game previously was just a never ending wave shooter with progressively harder enemies.</p><p>By adding progression to the waves, we could also have unlocks tied to them and it gave users something to look forward to.</p><p>In addition, we could name certain waves and given them different themes. This added more work on the design side to do a bit more hand-authoring but it also allowed the ability to create waves that were designed with certain weapons or mercenaries (AI companions) in mind, which were of</p><p>course featured in the store to purchase.</p><figure><img src="images/CitizenGrim_Shot3.png" alt=""></figure><p>Another core component of the game was building buildings that produced your</p><p>core resources. There were only limited places these could be built on the map so once they were created, that whole section of the game essentially game to a halt (enemies could still attack and destroy building however)</p><p>Another thing I introduced for this is multiple regions which means more places to build. These areas could also be scaled for more advanced players as they continues to grow in power with</p><p>XP and resource collection.</p>',
    contributions: [
      "Created improved first-time user experience with narrative context",
      "Added wave progression system with unlocks and themed waves",
      "Introduced game's first boss encounter for narrative payoff",
      "Designed multiple regions for expanded building and scaling",
      "Created hand-authored waves featuring store weapons and mercenaries"
    ],
    skills: ["F2P Design", "FTUE Design", "Progression Systems", "Live Ops", "Wave Design"]
  },
  woto: {
    title: "Whore of the Orient",
    role: "Senior Game Designer",
    studio: "Kennedy Miller Mitchell (Team Bondi)",
    dates: "Sept 2012 – Jan 2013",
    image: "images/WhoreOftheOrient_banner.webp",
    tagline: "Open-world game set in 1920s Shanghai (cancelled)",
    accomplishment: "Prototyped innovative Defendu combat and crowd cover systems.",
    bodyContent: '<p>This was an open-world game set in Shanghai in the 1920s that was unfortunately cancelled during our pre-production and prototyping phase.</p><figure><img src="images/WhoreOftheOrient_shot1.jpeg" alt="Untitled"></figure><p>My goal was primarily to design and build out the combat systems in the game.</p><p>1920s Shanghai was the birthplace of modern ‘Close Quarters Combat’ with the development of a martial art called <a href="https://en.wikipedia.org/wiki/Defendu" target="_blank">Defendu</a> by William Fairbairn for the Shanghai Municipal Police.</p><p>The idea was to design a combat system based around this brand new and untested martial art at the time and see it grow as your combat ability and skills also grow and unlock.</p><figure><img src="images/WhoreOftheOrient_shot2.jpeg" alt="Untitled"></figure><p>The prototype we put together consisted of early combat and shooting mechanics as well as a chase scene through crowded busy alleyways.</p><p>One thing we didn’t have time for but I wanted to prototype next was the concept of a seamless cover system where you could use crowds of pedestrians in a similar way to using walls to take cover or hide behind.</p>',
    contributions: [
      "Designed combat system based on historical Defendu martial art",
      "Prototyped early combat, shooting mechanics and chase sequences",
      "Conceptualized crowd-based cover system using pedestrians",
      "Designed skill growth and unlock progression for combat",
      "Created alleyway chase scene prototype"
    ],
    skills: ["Combat Design", "Historical Research", "Prototyping", "Systems Design", "Open World"]
  },
  re: {
    title: "Resident Evil: Operation Raccoon City",
    role: "Senior Game Designer",
    studio: "Slant Six Games",
    dates: "Aug 2006 – April 2012",
    image: "images/ResidentEvil_banner.jpeg",
    tagline: "Squad-based shooter in the Resident Evil universe",
    accomplishment: "Prototype level led to Capcom greenlight. Co-created proprietary scripting tools.",
    bodyContent: '<p>This was a whirlwind of a project, we developed our tools, engine and the game all from the ground up all within about a year.</p><p>I was part of the initial prototyping team which primarily consisted of myself, an artist and an engineer.</p><p>We put together a playable concept prototype that was presented to Capcom</p><p>and allowed for the official greenlight for production of the product. We had no design lead on the project, as well as went through 2 different design directors. I created the base narrative and mission structure for the game as well being the point person for design and scripting tools.</p><figure><img src="images/ResidentEvil_shot1.png" alt=""></figure><p>I designed the core combat and cover systems for the game. One of the design challenges I had is \'how do we make an engaging 3rd person cover-based shooter that also allows for easy melee-based combat?\'</p><p>The typical \'snap-to-cover\' was not ideal. Games that had this system would fall apart if swarmed with close quarter enemies because players would  panic and wrestle with the controls feeling \'stuck\' to cover. So I decided to make cover automated and context sensitive whenever you were near valid objects.</p><p>The players controls and movement remained exactly the same regardless of being in cover or not which reduced the cognitive load.</p><figure><img src="images/ResidentEvil_shot2.png" alt=""></figure><p>One fun feature of the combat system I worked on was the \'Quick draw\'. By holding down a button and rotating the analog stick, the player would quickly auto-aim in that direction without moving the camera.</p><p>This became very useful when engaging with cover-based shooting enemies in the distance and a sudden swarm of zombies attacked in the middle.</p><p>Players could also bleed which spawned swarms of zombies but fortunately you could also make enemies bleed which made for fun strategic advantages and mob management.</p><figure><img src="images/ResidentEvil_shot3.png" alt=""></figure><p>We also had a lot of finisher moves as well as the ability to take a nearby enemy as a shield.</p><p>All of these combat features were also available in the multiplayer mode which made for a unique take on standard third-person shooter fare of the day.</p>',
    contributions: [
      "Created prototype that secured Capcom greenlight",
      "Designed innovative automated context-sensitive cover system",
      "Created 'Quick draw' auto-aim feature for swarm management",
      "Designed bleeding mechanic for zombie mob management",
      "Created finisher moves and human shield mechanics"
    ],
    skills: ["Prototyping", "Combat Systems", "Cover Systems", "Tool Development", "AAA Production"]
  },
  starwars: {
    title: "Star Wars: Battlefront Online",
    role: "Game Designer",
    studio: "Slant Six Games",
    dates: "2010 (cancelled)",
    image: "images/StarWars_banner.jpeg",
    tagline: "Online multiplayer third-person shooter (cancelled)",
    accomplishment: "Contributed to vehicle physics system for in-house engine.",
    bodyContent: '<figure><img src="images/StarWars_shot1.webp" alt="Untitled"><figcaption>An online only multiplayer third-person shooter</figcaption></figure><p>This entry in the Star Wars Battlefront series was being developed for the X360/PS3 and was cancelled while in production due to Lucasarts restructuring back in 2010.</p><figure><img src="images/StarWars_shot2.webp" alt="Untitled"></figure><p>I split my time between reviewing and playtesting level design needs, general weapon balancing, and working on tuning speeder bike mechanics, the only vehicles we had implemented at the time and I recall taking forever to get it feeling ‘right’. A lot of this was because it was an in-house engine and a new vehicle physics system needed to be implemented. There was a ton of discussions between myself and the engineer responsible for creating the system to figure out what was required and was parameters needed to be created to achieve the feel we were looking to have.</p>',
    contributions: [
      "Reviewed and playtested level design for multiplayer maps",
      "Balanced weapon systems across character classes",
      "Tuned speeder bike mechanics and vehicle physics",
      "Collaborated with engineers on vehicle physics system",
      "Defined parameters for achieving desired vehicle feel"
    ],
    skills: ["Vehicle Design", "Weapon Balancing", "Level Playtesting", "Engineer Collaboration", "Multiplayer Design"]
  },
  socom_fb3: {
    title: "SOCOM: Fireteam Bravo 3",
    role: "Senior Game Designer",
    studio: "Slant Six Games",
    dates: "Aug 2006 – April 2012",
    image: "images/FireteamBravo_banner.png",
    tagline: "Squad-based 3rd person shooter with tactical elements",
    accomplishment: "Proposed 'gone wrong' narrative concept that became basis for entire game.",
    bodyContent: '<p>One of my goals with Fireteam Bravo 3 was to bring a new narrative perspective to the successful fireteam bravo series.</p><p>Previously the series had been about getting clear orders, going in, executing the orders and getting out all while being guided by a mission operator that knew everything that was going on.</p><figure><img src="images/FireteamBravo_shot1.png" alt=""></figure><p>I proposed the idea, \'what if something went wrong and the Seals had to figure out things on their own?\' which eventually became the basis for the game.</p><figure><img src="images/FireteamBravo_shot2.png" alt=""></figure><p>In the first two games, the front end and in-game UI were all high-tech.</p><p>I pushed for this notebook design to help reinforce this on-the-ground offline feel.</p><figure><img src="images/FireteamBravo_shot3.png" alt=""></figure><p>I was responsible for laying out the core mission structure, as well as implementing multiple level scenarios.</p><p>We also brought over tactical command elements that we had created in Tactical Strike where players could give commands to teammates, each level was also fully playable with online co-op where these commands would change to verbal orders.</p><p>I was also responsible for the AI design of teammates and enemies. Teammates were a particular design challenge because they needed to be always out of the way of the player shooting but always visible and looking effective.</p><p>I also designed a system where teammates would head towards where the player needed to go if no enemies threats were detected to naturally drive the player forward.</p>',
    contributions: [
      "Proposed 'gone wrong' narrative concept that became basis for the game",
      "Designed notebook UI to reinforce on-the-ground feel",
      "Created core mission structure and multiple level scenarios",
      "Designed teammate AI that supports without obstructing player",
      "Created system where teammates head toward objectives when no threats detected"
    ],
    skills: ["Narrative Design", "AI Design", "Level Design", "UI Concept", "Tactical Shooters"]
  },
  socom_conf: {
    title: "SOCOM: Confrontation",
    role: "Game Designer",
    studio: "Slant Six Games",
    dates: "Aug 2006 – April 2012",
    image: "images/Confrontation_banner.jpg",
    tagline: "Online multiplayer third-person shooter",
    accomplishment: "Designed Kasbah - rated best map in community votes. Launch overwhelmed Sony servers.",
    bodyContent: 'An online only multiplayer third-person shooter <p>SOCOM:Confrontation was the first entry for the series on the PS3.</p><p>At the time of it\'s release, its popularity took Sony by surprise. It not only took down Sony\'s servers for the game but for their entire online store front for a couple of days.</p><figure><img src="images/Confrontation_Kasbah2.png" alt=""></figure><p>I was responsible for the Kasbah map, one of the most popular maps on release. I focused on designing and balancing the level across all game modes</p><figure><img src="images/Confrontation_kasabah.jpg" alt=""><figcaption>The map I worked on Kasbah, rated best Confrontation map in in multiple community votes</figcaption></figure>',
    contributions: [
      "Designed Kasbah - one of the most popular maps on release",
      "Balanced map flow across all game modes",
      "Created level design documentation",
      "Contributed to launch that overwhelmed Sony's servers",
      "Playtested and iterated on competitive multiplayer balance"
    ],
    skills: ["Level Design", "Multiplayer Design", "Map Balancing", "Documentation", "Playtesting"]
  },
  socom_ts: {
    title: "SOCOM: Tactical Strike",
    role: "Game Designer",
    studio: "Slant Six Games",
    dates: "Aug 2006 – April 2012",
    image: "images/TacticalStike_banner.jpg",
    tagline: "Real-time tactical strategy shooter game",
    accomplishment: "BAFTA nominated.",
    bodyContent: '<figure><img src="images/TacticalStrike_shot1.png" alt=""></figure><p>Tactical Strike was a real-time tactics game where you controlled a team of 4 navy seals through various levels.</p><figure><img src="images/TacticalStrike_shot2.png" alt=""></figure><p>Pictured here shows one of the levels I worked on  displayed some of the attack options which you could either execute immediately or cue up to have all your Seals perform orders all at once.</p><p>The design of levels required multiple assault and stealth ways to navigate through</p><p>them allowing players to discover their own preferred ways to play. I was responsible for multiple level scenarios and discovering creative ways to use different tactics</p><figure><img src="images/TacticalStrike_shot1.png" alt=""></figure><p>In addition I was responsible for designing different enemy types to keep players on their toes. Some enemies would charge, some would hide and melee, some would move into a preferred range moving only from cover point to cover point while others would look to always flank the</p><p>player.</p><p>I believe other enemy types were variations of these base types.</p>',
    contributions: [
      "Designed multiple level scenarios with assault and stealth options",
      "Created diverse enemy AI types with unique behaviors",
      "Designed charging, flanking, and cover-using enemy patterns",
      "Balanced tactical options allowing player choice",
      "Implemented attack queuing and simultaneous order systems"
    ],
    skills: ["RTS Design", "Enemy AI Design", "Level Design", "Tactical Systems", "PSP Development"]
  },
  bully: {
    title: "Bully",
    role: "Game Designer",
    studio: "Rockstar Games",
    dates: "Sept 2003 – June 2006",
    image: "images/Bully_banner.jpeg",
    tagline: "Beloved open-world action-adventure",
    accomplishment: "Critically well received. Combat system influenced Sleeping Dogs and Arkham Asylum.",
    bodyContent: 'On Bully I worked on scripting mini-games and NPC navigation before moving on to bosses and combat.</p><figure><img src="images/Bully_shot1.png" alt=""></figure><p>Future Street Race 2165 was one of mini-games I created.</p><figure><img src="images/Bully_shot2.png" alt=""></figure><p>Multiple Enemies could surround you but they could only attack you based on a</p><p>token system we created inspired by classic kung fu movies where only one enemy would attack you at a time.</p><p>Originally we used all the face buttons for combat but we were given the challenge of retaining the</p><p>depth of combat while simplifying it to one button.</p><p>We successfully created a combat system which elements could be seen in later titles such as Sleeping Dogs and Arkham Asylum.</p>',
    contributions: [
      "Co-created influential one-button combat system",
      "Designed token-based multi-enemy combat inspired by kung fu films",
      "Created Future Street Race 2165 mini-game",
      "Scripted NPC navigation systems",
      "Combat system influenced later titles like Sleeping Dogs and Arkham Asylum"
    ],
    skills: ["Combat Design", "Boss Design", "Scripting", "Open World", "Mini-game Design"]
  },
  maxpayne2: {
    title: "Max Payne 2",
    role: "Development Support",
    studio: "Rockstar Games",
    dates: "2003",
    image: "images/MayPayne2_banner.jpeg",
    tagline: "Third-person shooter noir classic",
    accomplishment: "Contributed QA support to award-winning noir classic.",
    bodyContent: '<p>I worked as development support during the finalization of Max Payne 2, hunting down and wrriting up bug reports</p>',
    contributions: [
      "Supported final development phase with QA testing",
      "Documented and tracked bug reports",
      "Contributed to polish and finalization process"
    ],
    skills: ["QA", "Bug Reporting", "Development Support"]
  },
  mystery: {
    title: "???",
    role: "The Unreleased",
    studio: "Various Studios & Personal",
    dates: "Across the Years",
    image: "images/Mystery_banner.webp",
    tagline: "Seeds planted but not bloomed",
    isMystery: true, // Flag for special modal treatment
    bodyContent: '', // Content is in the modal HTML
    contributions: [],
    skills: []
  }
};

// Analytics Tracker - Virtual Pageview System with Cloudflare Custom Events
const AnalyticsTracker = {
  resetDelay: 150,

  // Check if Cloudflare Web Analytics is loaded
  isCloudflareLoaded() {
    return typeof __cfBeacon !== 'undefined';
  },

  track(category, action, label = '') {
    const trackingPath = label
      ? `/${category}/${action}/${this.sanitize(label)}`
      : `/${category}/${action}`;

    // Send custom event to Cloudflare Web Analytics
    // This creates a virtual pageview that Cloudflare will track separately
    if (this.isCloudflareLoaded()) {
      try {
        // Send as a virtual pageview using Cloudflare's SPA tracking
        __cfBeacon.sendEvent('pageview', {
          path: trackingPath,
          title: `${category} - ${action}${label ? ' - ' + label : ''}`
        });
      } catch (e) {
        console.warn('Cloudflare tracking failed:', e);
      }
    }

    // Also update browser history for local debugging
    const hashPath = '#' + trackingPath;
    window.history.pushState(null, '', hashPath);

    if (window.location.hostname === 'localhost') {
      console.log('📊', category, '>', action, label);
      console.log('   Virtual path:', trackingPath);
    }

    setTimeout(() => {
      window.history.replaceState(null, '', window.location.pathname);
    }, this.resetDelay);
  },

  // Track section scroll into view
  trackSection(sectionName) {
    this.track('section', 'view', sectionName);
  },

  // Track project modal opens
  trackProject(projectName) {
    this.track('project', 'view', projectName);
  },

  // Track navigation clicks
  trackNavigation(destination) {
    this.track('navigation', 'click', destination);
  },

  sanitize(str) {
    return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }
};


document.addEventListener('DOMContentLoaded', () => {
  // Initialize all features
  initNavigation();
  initScrollAnimations();
  initSmoothScroll();
  initProjectModals();
  initGlitchText();
  setupSectionReveal();
  initAboutHoverEffect();
  initMysteryCard();

  // Analytics tracking
  initContactTracking();
  initCTATracking();

  // Phase 2: Hero enhancements
  initParticleField();
  initRotatingTagline();
  initAmbientGlitch();

  // Phase 3: Skills section
  initSkillBlocks();

  // Phase 4: Navigation & UX
  initDotNavigation();
  initModalNavigation();
  initMobileSwipe();
  initLogoCycling();
});

/**
 * Glitch Text Effect - Character scramble animation on scroll
 * Works on all elements with data-glitch="true" attribute
 * Triggers when the element scrolls into view
 */
function initGlitchText() {
  const glitchElements = document.querySelectorAll('[data-glitch="true"]');
  const chars = '!@#$%^&*()_+-=[]{}|;:<>?/\\~`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  function playGlitch(element, isInitial = false) {
    if (element.classList.contains('glitch-animate')) return;

    // Temporarily remove ambient glitch to prevent transform conflicts
    const hadAmbient = element.classList.contains('ambient-glitch');
    if (hadAmbient) {
      element.classList.remove('ambient-glitch');
    }

    const originalText = element.textContent.trim();
    const duration = 840; // Total animation duration (speeded up by 30%)
    const frameRate = 50; // ms between updates
    const frames = duration / frameRate;
    let currentFrame = 0;

    // Trigger section reveal after 80% of duration (only on initial scroll)
    if (isInitial) {
      const section = element.closest('section');
      if (section && section.id !== 'hero') {
        setTimeout(() => {
          triggerSectionReveal(section);
        }, duration * 0.8);
      }
    }

    // Lock dimensions to prevent layout shift
    const rect = element.getBoundingClientRect();
    element.style.width = `${rect.width}px`;
    element.style.height = `${rect.height}px`;
    // Ensure display is inline-block so width/height are respected if it was inline
    const originalDisplay = window.getComputedStyle(element).display;
    if (originalDisplay === 'inline') {
      element.style.display = 'inline-block';
    }

    // Start with scrambled text
    element.textContent = scrambleText(originalText, chars, 1);

    // Add the CSS animation class
    element.classList.add('glitch-animate');

    const interval = setInterval(() => {
      currentFrame++;
      const progress = currentFrame / frames;

      // Gradually reveal characters from left to right
      const revealIndex = Math.floor(progress * originalText.length);
      let newText = '';

      for (let i = 0; i < originalText.length; i++) {
        if (i < revealIndex) {
          newText += originalText[i];
        } else if (originalText[i] === ' ') {
          newText += ' ';
        } else {
          newText += chars[Math.floor(Math.random() * chars.length)];
        }
      }

      element.textContent = newText;

      if (currentFrame >= frames) {
        clearInterval(interval);
        element.textContent = originalText;

        // Remove animation class after it's done
        setTimeout(() => {
          element.classList.remove('glitch-animate');
          // Unlock dimensions
          element.style.width = '';
          element.style.height = '';
          if (originalDisplay === 'inline') {
            element.style.display = '';
          }

          // Restore or add ambient glitch effect
          element.classList.add('ambient-glitch');
        }, 300);
      }
    }, frameRate);
  }

  // Create an IntersectionObserver to trigger glitch on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.classList.contains('glitch-played')) {
        // Mark as played so it doesn't repeat scroll trigger
        entry.target.classList.add('glitch-played');
        playGlitch(entry.target, true);
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.5,
    rootMargin: '0px 0px -100px 0px'
  });

  // Setup elements
  glitchElements.forEach(element => {
    // Observe for scroll trigger
    observer.observe(element);
  });

  function scrambleText(text, chars, scrambleRatio) {
    return text.split('').map(char => {
      if (char === ' ') return ' ';
      return Math.random() < scrambleRatio
        ? chars[Math.floor(Math.random() * chars.length)]
        : char;
    }).join('');
  }
}

/**
 * Section Reveal Animations - Setup and Trigger
 */
function setupSectionReveal() {
  const sections = document.querySelectorAll('section:not(#hero)');

  sections.forEach(section => {
    // Hide all elements initially
    const elementsToHide = [
      section.querySelector('.section-label'),
      section.querySelector('.section-code'),
      section.querySelector('.decorative-circles'),
      ...section.querySelectorAll('.decorative-asterisk'),
      ...section.querySelectorAll('.corner-bracket'),
      ...section.querySelectorAll('.skill-block')
    ];

    elementsToHide.forEach(el => {
      if (el) {
        el.style.opacity = '0';
        // Add transform if it's a skill block for the slide up effect
        if (el.classList.contains('skill-block')) {
          el.style.transform = 'translateY(30px)';
        }
      }
    });
  });
}

function triggerSectionReveal(section) {
  if (!section || section.classList.contains('section-visible')) return;

  section.classList.add('section-visible');

  // Animate section label with expand effect
  const label = section.querySelector('.section-label');
  if (label) {
    label.style.animation = 'expandFromCenter 0.5s ease forwards';
  }

  // Animate section code with fade-in
  const sectionCode = section.querySelector('.section-code');
  if (sectionCode) {
    sectionCode.style.animation = 'fadeInUp 0.4s ease forwards';
  }

  // Animate decorative elements
  const asterisks = section.querySelectorAll('.decorative-asterisk');
  asterisks.forEach((asterisk, i) => {
    asterisk.style.animation = `fadeInUp 0.5s ease ${0.2 + i * 0.1}s forwards`;
  });

  // Animate corner brackets
  const brackets = section.querySelectorAll('.corner-bracket');
  brackets.forEach((bracket, i) => {
    bracket.style.animation = `fadeInUp 0.4s ease ${0.1 + i * 0.1}s forwards`;
    bracket.style.setProperty('--final-opacity', '0.15');
  });

  // Animate decorative circles
  const circles = section.querySelector('.decorative-circles');
  if (circles) {
    circles.style.animation = 'fadeInUp 0.6s ease 0.3s forwards';
    circles.style.setProperty('--final-opacity', '0.2');
  }

  // Animate skill blocks with stagger
  const skillBlocks = section.querySelectorAll('.skill-block');
  skillBlocks.forEach((block, i) => {
    block.style.transition = `opacity 0.5s ease ${i * 0.1}s, transform 0.5s ease ${i * 0.1}s`;
    // Trigger reflow/timeout to ensure transition plays
    setTimeout(() => {
      block.style.opacity = '1';
      block.style.transform = 'translateY(0)';
    }, 50);
  });
}

/**
 * Navigation - Scroll state & mobile toggle
 */
function initNavigation() {
  const nav = document.getElementById('nav');
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  // Add scroll state to nav
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });

  // Mobile menu toggle
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });

    // Close menu when clicking a link
    navLinks.querySelectorAll('.nav__link').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
      });
    });
  }
}

/**
 * Scroll-triggered animations using Intersection Observer
 * Note: Project cards are excluded to ensure immediate loading
 */
function initScrollAnimations() {
  const animatedElements = document.querySelectorAll('.glass-card, .timeline__item');
  const chars = '!@#$%^&*()_+-=[]{}|;:<>?/\\~`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';

        // Apply glitch effect to timeline items
        if (entry.target.classList.contains('timeline__item')) {
          applyTimelineGlitch(entry.target);
        }

        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  animatedElements.forEach((el, index) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
    observer.observe(el);
  });

  // Apply glitch effect to timeline text elements
  function applyTimelineGlitch(timelineItem) {
    const titleEl = timelineItem.querySelector('.timeline__title');
    const yearEl = timelineItem.querySelector('.timeline__year');

    if (titleEl) {
      glitchText(titleEl, 600); // Shorter duration for titles
    }
    if (yearEl) {
      glitchText(yearEl, 400); // Even shorter for years
    }
  }

  // Glitch text animation helper
  function glitchText(element, duration) {
    const originalText = element.textContent.trim();
    const frameRate = 40;
    const frames = duration / frameRate;
    let currentFrame = 0;

    // Lock dimensions to prevent layout shift
    const rect = element.getBoundingClientRect();
    element.style.width = `${rect.width}px`;
    element.style.height = `${rect.height}px`;
    // Ensure display is inline-block so width/height are respected if it was inline
    const originalDisplay = window.getComputedStyle(element).display;
    if (originalDisplay === 'inline') {
      element.style.display = 'inline-block';
    }

    // Start with partially scrambled text
    element.textContent = scrambleText(originalText, 0.7);

    const interval = setInterval(() => {
      currentFrame++;
      const progress = currentFrame / frames;

      // Gradually reveal characters
      const revealIndex = Math.floor(progress * originalText.length);
      let newText = '';

      for (let i = 0; i < originalText.length; i++) {
        if (i < revealIndex) {
          newText += originalText[i];
        } else if (originalText[i] === ' ') {
          newText += ' ';
        } else {
          newText += chars[Math.floor(Math.random() * chars.length)];
        }
      }

      element.textContent = newText;

      if (currentFrame >= frames) {
        clearInterval(interval);
        element.textContent = originalText;

        // Unlock dimensions
        element.style.width = '';
        element.style.height = '';
        if (originalDisplay === 'inline') {
          element.style.display = '';
        }
      }
    }, frameRate);
  }

  function scrambleText(text, scrambleRatio) {
    return text.split('').map(char => {
      if (char === ' ') return ' ';
      return Math.random() < scrambleRatio
        ? chars[Math.floor(Math.random() * chars.length)]
        : char;
    }).join('');
  }
}

/**
 * Smooth scrolling for anchor links
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));

      if (target) {
        const navHeight = document.getElementById('nav').offsetHeight;
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

/**
 * Project Modal System
 */
function initProjectModals() {
  const modal = document.getElementById('projectModal');
  const modalContent = document.getElementById('modalContent');
  const closeBtn = document.getElementById('modalClose');

  if (!modal || !modalContent) return;

  // Click handlers for project cards
  document.querySelectorAll('.project-card[data-project]').forEach(card => {
    card.addEventListener('click', () => {
      const projectId = card.dataset.project;
      const projectName = projectData[projectId]?.title || projectId;
      AnalyticsTracker.trackProject(projectName);
      openProjectModal(projectId);
    });
  });

  // Click handlers for project items in the expanded list
  document.querySelectorAll('[data-project-item]').forEach(item => {
    item.style.cursor = 'pointer';
    item.addEventListener('click', () => {
      const projectId = item.dataset.projectItem;
      openProjectModal(projectId);
    });
  });

  // Close button
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  // Click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Escape key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });

  // Helper function to render paragraphs from array or string
  function renderParagraphs(content) {
    if (!content) return '';
    if (Array.isArray(content)) {
      return content.map(p => `<p>${p}</p>`).join('');
    }
    return `<p>${content}</p>`;
  }

  function openProjectModal(projectId) {
    const project = projectData[projectId];
    if (!project) {
      console.warn('Project not found:', projectId);
      return;
    }

    // Track case study opens
    AnalyticsTracker.track('case-study', 'open', project.title);

    // Handle mystery project specially
    if (project.isMystery) {
      openMysteryModal();
      return;
    }


    // Random selection of wave images for variety
    const vectorWaves = ['Wireframe 15.png', 'Wireframe 32.png', 'Wireframe 45.png', 'Wireframe 67.png', 'Wireframe 89.png'];
    const wavyLines = ['Wavy Line 23.png', 'Wavy Line 42.png', 'Wavy Line 56.png', 'Wavy Line 74.png', 'Wavy Line 88.png'];

    const randomVector1 = vectorWaves[Math.floor(Math.random() * vectorWaves.length)];
    const randomVector2 = vectorWaves[Math.floor(Math.random() * vectorWaves.length)];
    const randomWavy1 = wavyLines[Math.floor(Math.random() * wavyLines.length)];
    const randomWavy2 = wavyLines[Math.floor(Math.random() * wavyLines.length)];

    modalContent.innerHTML = `
      <div class="case-study">
        <!-- Wave decorations for modal -->
        <div class="wave-decoration wave-decoration--modal-top-left wave-decoration--red">
          <img src="images/VectorWaves/${randomVector1}" alt="">
        </div>
        <div class="wave-decoration wave-decoration--modal-top-right wave-decoration--dark">
          <img src="images/WavyLineCircles/${randomWavy1}" alt="">
        </div>
        <div class="wave-decoration wave-decoration--modal-mid-right wave-decoration--red">
          <img src="images/VectorWaves/${randomVector2}" alt="">
        </div>
        <div class="wave-decoration wave-decoration--modal-bottom-left wave-decoration--dark">
          <img src="images/WavyLineCircles/${randomWavy2}" alt="">
        </div>
        
        <div class="case-study__header" style="background-image: url('${project.image}')">
          <div class="case-study__header-overlay">
            <span class="case-study__role">${project.role}</span>
            <h2 class="case-study__title">${project.title}</h2>
            <p class="case-study__meta">${project.studio} • ${project.dates}</p>
          </div>
        </div>
        <div class="case-study__body">
          <p class="case-study__tagline">${project.tagline}</p>
          
          ${project.bodyContent || ''}
          
          <h3>Key Contributions</h3>
          <ul class="case-study__contributions">
            ${project.contributions.map(c => `<li>${c}</li>`).join('')}
          </ul>
          
          <h3>Skills Applied</h3>
          <div class="case-study__skills">
            ${project.skills.map(s => `<span class="tag tag--accent">${s}</span>`).join('')}
          </div>
        </div>
      </div>
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Handle internal project links within the modal
    setTimeout(() => {
      const internalLinks = modalContent.querySelectorAll('.internal-project-link');
      internalLinks.forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const targetProject = link.dataset.project;
          if (targetProject && projectData[targetProject]) {
            openProjectModal(targetProject);
          }
        });
      });
    }, 0);
  }

  // Expose openProjectModal globally for navigation
  window.openProjectModal = openProjectModal;

  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

/**
 * Contact Link Tracking - Email and LinkedIn
 */
function initContactTracking() {
  // Track email clicks
  document.querySelectorAll('a[href^="mailto:"]').forEach(link => {
    link.addEventListener('click', () => {
      AnalyticsTracker.track('contact', 'email');
    });
  });

  // Track LinkedIn clicks
  document.querySelectorAll('a[href*="linkedin.com"]').forEach(link => {
    link.addEventListener('click', () => {
      AnalyticsTracker.track('contact', 'linkedin');
    });
  });
}

/**
 * CTA Button Tracking - Hero section CTAs
 */
function initCTATracking() {
  document.querySelectorAll('.hero__cta .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.textContent.includes('View Work') ? 'view-work' : 'contact';
      AnalyticsTracker.track('cta', 'hero-click', type);
    });
  });
}

/**
 * About Section 4-Second Hover Effect
 * Hides non-keyword text, jiggles keywords, then animates them into poem layout
 */
function initAboutHoverEffect() {
  const glassCard = document.querySelector('#about .glass-card');
  if (!glassCard) return;

  let fadeTimer = null;
  let poemTimer = null;
  let isActivated = false;
  let poemContainer = null;
  let clonedKeywords = [];

  const paragraphs = glassCard.querySelectorAll('p');

  glassCard.addEventListener('mouseenter', () => {
    if (isActivated) return;

    // After 2 seconds, start fading out non-keyword text (fades over 2 seconds)
    fadeTimer = setTimeout(() => {
      glassCard.classList.add('text-fading');

      // After fade completes (2 more seconds), animate to poem
      poemTimer = setTimeout(() => {
        isActivated = true;
        glassCard.classList.add('keywords-activated');
        animateToPoem();
      }, 2000);
    }, 2000);
  });

  glassCard.addEventListener('mouseleave', () => {
    if (fadeTimer) {
      clearTimeout(fadeTimer);
      fadeTimer = null;
    }
    if (poemTimer) {
      clearTimeout(poemTimer);
      poemTimer = null;
    }

    // Remove fading class
    glassCard.classList.remove('text-fading');

    if (isActivated) {
      glassCard.classList.remove('keywords-activated', 'keywords-poem');

      // Reset glass card dimensions
      glassCard.style.height = '';
      glassCard.style.minHeight = '';

      // Remove cloned keywords
      clonedKeywords.forEach(el => el.remove());
      clonedKeywords = [];

      // Remove poem container
      if (poemContainer) {
        poemContainer.remove();
        poemContainer = null;
      }

      // Show paragraphs again
      paragraphs.forEach(p => {
        p.style.display = '';
        p.style.visibility = '';
      });

      // Show original keywords
      const keywords = glassCard.querySelectorAll('.about-keyword');
      keywords.forEach(kw => kw.style.visibility = '');

      isActivated = false;
    }
  });

  function animateToPoem() {
    const keywords = glassCard.querySelectorAll('.about-keyword');
    const glassCardRect = glassCard.getBoundingClientRect();

    // Lock the glass card height to prevent size change
    glassCard.style.height = glassCardRect.height + 'px';
    glassCard.style.minHeight = glassCardRect.height + 'px';

    // 1. Record starting positions of all keywords (FLIP First)
    const startPositions = [];
    keywords.forEach(kw => {
      const rect = kw.getBoundingClientRect();
      startPositions.push({
        el: kw,
        left: rect.left - glassCardRect.left,
        top: rect.top - glassCardRect.top,
        text: kw.textContent,
        line: kw.getAttribute('data-line')
      });
    });

    // 2. Group keywords by line
    const lines = {};
    startPositions.forEach(pos => {
      if (!lines[pos.line]) lines[pos.line] = [];
      lines[pos.line].push(pos);
    });

    // 3. Create poem container
    poemContainer = document.createElement('div');
    poemContainer.className = 'poem-container';

    // 4. Build poem lines
    const poemLines = [
      { num: '1', joiner: ' ' },   // lead with empath y
      { num: '2', joiner: '' },    // and collaborate
      { num: '3', joiner: ' ' },   // I thrive on upholding teams
      { num: '4', joiner: ' ' },   // with design vision and
      { num: '5', joiner: ' ' }    // technical fluency
    ];

    poemLines.forEach(lineInfo => {
      if (lines[lineInfo.num]) {
        const lineEl = document.createElement('div');
        lineEl.className = 'poem-line';
        lineEl.textContent = lines[lineInfo.num].map(p => p.text).join(lineInfo.joiner);
        poemContainer.appendChild(lineEl);
      }
    });

    // 5. Hide paragraphs completely
    paragraphs.forEach(p => p.style.visibility = 'hidden');

    // 6. Add poem container (invisible initially to measure)
    poemContainer.style.opacity = '0';
    glassCard.appendChild(poemContainer);

    // 7. Get final positions of poem lines
    const poemLineEls = poemContainer.querySelectorAll('.poem-line');
    const finalPositions = [];
    poemLineEls.forEach((el, idx) => {
      const rect = el.getBoundingClientRect();
      finalPositions.push({
        left: rect.left - glassCardRect.left,
        top: rect.top - glassCardRect.top,
        width: rect.width,
        lineNum: poemLines[idx].num
      });
    });

    // 8. Hide poem container, we'll animate clones instead
    poemContainer.style.display = 'none';

    // 9. Create animated clones for each keyword
    startPositions.forEach((pos, i) => {
      const clone = document.createElement('span');
      clone.className = 'keyword-clone';
      // Preserve whitespace in the text
      clone.textContent = pos.text;
      clone.style.cssText = `
        position: absolute;
        left: ${pos.left}px;
        top: ${pos.top}px;
        color: var(--accent-red);
        font-size: 1.1rem;
        font-weight: 400;
        transition: all 0.5s ease;
        pointer-events: none;
        white-space: pre;
      `;
      glassCard.appendChild(clone);
      clonedKeywords.push(clone);

      // Hide original keyword
      pos.el.style.visibility = 'hidden';
    });

    // 10. After a frame, animate to final positions
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Calculate final positions for each clone based on which line they belong to
        let lineOffsets = {};

        poemLines.forEach((lineInfo, lineIdx) => {
          if (lines[lineInfo.num]) {
            const finalPos = finalPositions[lineIdx];
            if (finalPos) {
              let offsetX = 0;
              lines[lineInfo.num].forEach((pos, wordIdx) => {
                const cloneIdx = startPositions.indexOf(pos);
                const clone = clonedKeywords[cloneIdx];
                if (clone) {
                  // Center the line
                  const lineText = lines[lineInfo.num].map(p => p.text).join(lineInfo.joiner);
                  const centerX = (glassCard.offsetWidth - finalPos.width) / 2;

                  clone.style.left = `${centerX + offsetX}px`;
                  clone.style.top = `${finalPos.top}px`;

                  // Estimate width of this word (preserve whitespace)
                  const tempSpan = document.createElement('span');
                  tempSpan.style.cssText = 'position:absolute;visibility:hidden;font-size:1.1rem;white-space:pre;';
                  tempSpan.textContent = pos.text + (wordIdx < lines[lineInfo.num].length - 1 ? lineInfo.joiner : '');
                  document.body.appendChild(tempSpan);
                  offsetX += tempSpan.offsetWidth;
                  tempSpan.remove();
                }
              });
            }
          }
        });

        // 11. After animation completes, just mark as poem state (clones stay visible)
        setTimeout(() => {
          glassCard.classList.add('keywords-poem');
        }, 550);
      });
    });
  }
}

/**
 * Mystery Card - Scroll reveal, special modal, and typewriter effect
 */
function initMysteryCard() {
  const mysteryCard = document.querySelector('.project-card--mystery');
  const mysteryModal = document.getElementById('mysteryModal');
  const mysteryCloseBtn = document.getElementById('mysteryModalClose');

  if (!mysteryCard || !mysteryModal) return;

  // Scroll reveal for mystery card
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  observer.observe(mysteryCard);

  // Close button handler
  if (mysteryCloseBtn) {
    mysteryCloseBtn.addEventListener('click', closeMysteryModal);
  }

  // Click outside to close
  mysteryModal.addEventListener('click', (e) => {
    if (e.target === mysteryModal) {
      closeMysteryModal();
    }
  });

  // Escape key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mysteryModal.classList.contains('active')) {
      closeMysteryModal();
    }
  });

  // Add touchstart for instant open on mobile
  mysteryCard.addEventListener('touchstart', (e) => {
    // If not already active, prevent default to avoid hover/click conflicts and open immediately
    if (!mysteryModal.classList.contains('active')) {
      e.preventDefault();
      openMysteryModal();
    }
  }, { passive: false });
}

// Track timeouts to allow cancellation
window.mysteryTimeouts = [];

/**
 * Open mystery modal and start typewriter effect
 */
function openMysteryModal() {
  const mysteryModal = document.getElementById('mysteryModal');
  const paragraphs = mysteryModal.querySelectorAll('.mystery-modal__text p');

  // Track mystery project opens
  AnalyticsTracker.track('mystery', 'open');

  mysteryModal.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Clear any existing timeouts to prevent overlapping typewriters
  if (window.mysteryTimeouts) {
    window.mysteryTimeouts.forEach(id => clearTimeout(id));
  }
  window.mysteryTimeouts = [];

  // Reset paragraphs
  paragraphs.forEach(p => {
    p.classList.remove('typing', 'complete');
    p.style.opacity = '0';
    // Store original HTML with spans
    if (!p.dataset.originalHtml) {
      p.dataset.originalHtml = p.innerHTML;
    }
    p.innerHTML = '';
  });

  // Start typewriter effect after a short delay
  const startTimeout = setTimeout(() => {
    typewriteParagraphs(paragraphs, 0);
  }, 1500);
  window.mysteryTimeouts.push(startTimeout);
}

/**
 * Typewriter effect for paragraphs - Layout-preserving version
 * Renders all text invisibly first, then reveals character by character
 */
function typewriteParagraphs(paragraphs, index) {
  if (index >= paragraphs.length) return;

  const p = paragraphs[index];
  const originalHtml = p.dataset.originalHtml;

  p.classList.add('typing');
  p.style.opacity = '1';

  // Wrap each character in a span with invisible class, preserving existing HTML structure
  const wrappedHtml = wrapCharactersForReveal(originalHtml);
  p.innerHTML = wrappedHtml;

  // Get all character spans
  const charSpans = p.querySelectorAll('.mystery-char');
  let charIndex = 0;
  const speed = 25; // ms per character

  function revealChar() {
    if (charIndex < charSpans.length) {
      charSpans[charIndex].classList.add('revealed');
      charIndex++;
      const timeoutId = setTimeout(revealChar, speed);
      window.mysteryTimeouts.push(timeoutId);
    } else {
      // Paragraph complete - restore original HTML
      p.classList.remove('typing');
      p.classList.add('complete');
      p.innerHTML = originalHtml;

      // Start next paragraph after a pause
      const nextTimeout = setTimeout(() => {
        typewriteParagraphs(paragraphs, index + 1);
      }, 800);
      window.mysteryTimeouts.push(nextTimeout);
    }
  }

  revealChar();
}

/**
 * Wrap each character in a span for reveal animation, preserving HTML structure
 */
function wrapCharactersForReveal(html) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      // Wrap each character in a span
      const text = node.textContent;
      if (text.trim() === '') {
        return node; // Keep whitespace-only nodes as-is
      }

      const fragment = document.createDocumentFragment();
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === ' ' || char === '\n') {
          // Keep spaces and newlines visible for layout
          const span = document.createElement('span');
          span.className = 'mystery-char revealed';
          span.textContent = char;
          fragment.appendChild(span);
        } else {
          const span = document.createElement('span');
          span.className = 'mystery-char';
          span.textContent = char;
          fragment.appendChild(span);
        }
      }
      return fragment;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Process child nodes
      const children = Array.from(node.childNodes);
      node.innerHTML = '';
      children.forEach(child => {
        const processed = processNode(child);
        node.appendChild(processed);
      });
      return node;
    }
    return node;
  }

  const children = Array.from(tempDiv.childNodes);
  tempDiv.innerHTML = '';
  children.forEach(child => {
    const processed = processNode(child);
    tempDiv.appendChild(processed);
  });

  return tempDiv.innerHTML;
}

/**
 * Close mystery modal
 */
function closeMysteryModal() {
  const mysteryModal = document.getElementById('mysteryModal');
  mysteryModal.classList.remove('active');
  document.body.style.overflow = '';

  // Clear all typing timeouts
  if (window.mysteryTimeouts) {
    window.mysteryTimeouts.forEach(id => clearTimeout(id));
  }
  window.mysteryTimeouts = [];

  // Reset all content immediately
  const paragraphs = mysteryModal.querySelectorAll('.mystery-modal__text p');
  paragraphs.forEach(p => {
    p.classList.remove('typing', 'complete');
    p.style.opacity = '0';
    p.innerHTML = '';
  });
}

/**
 * Particle Field - Mouse-responsive background particles (Global)
 * Updated with Neo-Brutalist geometric shapes (crosses, squares)
 */
/**
 * Particle Field - Mouse-responsive background particles (Global)
 * Updated with Neo-Brutalist geometric shapes (crosses, squares)
 * & Swirl effect on Contact text hover
 */
function initParticleField() {
  const canvas = document.getElementById('globalParticles');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let particles = [];
  let mouseX = 0;
  let mouseY = 0;
  let animationId;

  // Swirl target state
  let swirlActive = false;
  let swirlCenter = {
    x: 0,
    y: 0
  };
  const contactTitle = document.querySelector('#contact .section-title');

  // Particle configuration
  const config = {
    particleCount: 70,
    particleColor: '#FF3333', // Accent Red
    particleColorAlt: '#333333', // Dark Grey for contrast
    maxSize: 5,
    minSize: 2,
    speed: 0.4,
    mouseRadius: 200,
    mouseForce: 0.08,
    swirlForce: 0.0025, // Speed of attraction to swirl center (50% slower: 0.05 -> 0.025)
    swirlSpeed: 0.0020, // Rotation speed (50% slower: 0.005 -> 0.0025)
    swirlRadiusMin: 120, // Minimum orbit radius (creates empty center)
    swirlRadiusMax: 250, // Maximum orbit radius
    swirlEllipseRatio: 1.5 // Ellipse ratio (width/height)
  };

  // Resize canvas
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initParticles();
  }

  // Initialize particles
  function initParticles() {
    particles = [];
    for (let i = 0; i < config.particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * (config.maxSize - config.minSize) + config.minSize,
        speedX: (Math.random() - 0.5) * config.speed,
        speedY: (Math.random() - 0.5) * config.speed,
        color: Math.random() > 0.85 ? config.particleColor : config.particleColorAlt,
        shape: Math.random() > 0.6 ? 'cross' : (Math.random() > 0.5 ? 'square' : 'x'),
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        angle: Math.random() * Math.PI * 2, // For swirl orbit
        radius: Math.random() * (config.swirlRadiusMax - config.swirlRadiusMin) + config.swirlRadiusMin // Donut range
      });
    }
  }

  // Bind hover events for swirl effect
  if (contactTitle) {
    contactTitle.addEventListener('mouseenter', () => {
      swirlActive = true;
      const rect = contactTitle.getBoundingClientRect();
      swirlCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    });

    contactTitle.addEventListener('mouseleave', () => {
      swirlActive = false;
      // Give particles a little random push to disperse them naturally
      particles.forEach(p => {
        p.speedX = (Math.random() - 0.5) * 2;
        p.speedY = (Math.random() - 0.5) * 2;
      });
    });

    // Update swirl center on scroll/resize just in case
    window.addEventListener('scroll', () => {
      if (swirlActive) {
        const rect = contactTitle.getBoundingClientRect();
        swirlCenter = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
      }
    });
  }

  // Update and draw particles
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      if (swirlActive) {
        // Swirl Logic - Elliptical Donut Pattern

        // Move towards the orbit path with elliptical shape
        // Horizontal radius is wider than vertical (ellipse)
        const targetX = swirlCenter.x + Math.cos(p.angle) * p.radius * config.swirlEllipseRatio;
        const targetY = swirlCenter.y + Math.sin(p.angle) * p.radius;

        // Easing towards that position
        p.x += (targetX - p.x) * config.swirlForce;
        p.y += (targetY - p.y) * config.swirlForce;

        // Orbit rotation (10% of original speed)
        p.angle += config.swirlSpeed;

      } else {
        // Normal Floating Logic

        // Calculate distance from mouse
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Apply mouse repulsion
        if (dist < config.mouseRadius && dist > 0) {
          const force = (config.mouseRadius - dist) / config.mouseRadius;
          p.speedX -= (dx / dist) * force * config.mouseForce;
          p.speedY -= (dy / dist) * force * config.mouseForce;
        }

        // Apply friction
        p.speedX *= 0.98;
        p.speedY *= 0.98;

        // Add random drift
        p.speedX += (Math.random() - 0.5) * 0.02;
        p.speedY += (Math.random() - 0.5) * 0.02;

        // Update position
        p.x += p.speedX;
        p.y += p.speedY;

        // Wrap around edges
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
      }

      // Update rotation (always active)
      p.rotation += p.rotationSpeed;

      // Draw particle
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.5;

      ctx.beginPath();

      if (p.shape === 'cross') {
        // Plus sign
        const s = p.size;
        ctx.moveTo(-s, 0);
        ctx.lineTo(s, 0);
        ctx.moveTo(0, -s);
        ctx.lineTo(0, s);
      } else if (p.shape === 'x') {
        // X shape
        const s = p.size * 0.8;
        ctx.moveTo(-s, -s);
        ctx.lineTo(s, s);
        ctx.moveTo(s, -s);
        ctx.lineTo(-s, s);
      } else {
        // Square
        const s = p.size;
        ctx.strokeRect(-s / 2, -s / 2, s, s);
      }

      ctx.stroke();
      ctx.restore();
    });

    // Draw connections (Technical lines)
    particles.forEach((p1, i) => {
      particles.slice(i + 1).forEach(p2 => {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          // Faint technical lines
          const opacity = (1 - dist / 120) * 0.15;
          ctx.strokeStyle = `rgba(100, 100, 100, ${opacity})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      });
    });

    animationId = requestAnimationFrame(animate);
  }

  // Track mouse position
  document.addEventListener('mousemove', (e) => {
    // Canvas is fixed, so client coordinates are sufficient
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // Handle resize
  window.addEventListener('resize', resizeCanvas);

  // Initialize
  resizeCanvas();
  animate();
}

/**
 * Rotating Tagline - Cycles through inspirational phrases
 */
function initRotatingTagline() {
  const taglineEl = document.getElementById('heroTagline');
  if (!taglineEl) return;

  const taglines = [
    '→ I plant seeds knowing not all will bloom',
    '→ Creative leadership rooted in empathy, fluency, and flow',
    '→ Every project is a question. Design is how we listen',
    '→ I build worlds so others can find themselves within them'
  ];

  let currentIndex = 0;
  const interval = 5000; // 5 seconds between rotations

  function rotateTagline() {
    // Fade out
    taglineEl.classList.add('fade-out');

    setTimeout(() => {
      // Update text
      currentIndex = (currentIndex + 1) % taglines.length;
      taglineEl.textContent = taglines[currentIndex];

      // Fade in
      taglineEl.classList.remove('fade-out');
    }, 400);
  }

  // Start rotation after initial delay
  setTimeout(() => {
    setInterval(rotateTagline, interval);
  }, interval);
}

/**
 * Ambient Glitch Effect - Logic now integrated into initGlitchText
 * Kept for reference or future specific needs
 */
function initAmbientGlitch() {
  // Logic moved to initGlitchText to apply to all sections
}

/**
 * Skill Blocks - Expandable details with project links
 */
function initSkillBlocks() {
  const skillBlocks = document.querySelectorAll('.skill-block');

  skillBlocks.forEach(block => {
    const expandBtn = block.querySelector('.skill-block__expand-btn');
    const projectLinks = block.querySelectorAll('.skill-block__project-link');

    if (expandBtn) {
      expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();

        // Close other expanded blocks
        skillBlocks.forEach(other => {
          if (other !== block && other.classList.contains('expanded')) {
            other.classList.remove('expanded');
            const otherBtn = other.querySelector('.skill-block__expand-btn');
            if (otherBtn) otherBtn.textContent = '[+ See Projects]';
          }
        });

        // Toggle current block
        const isExpanded = block.classList.toggle('expanded');
        expandBtn.textContent = isExpanded ? '[− Hide Projects]' : '[+ See Projects]';

        // Track skill block expansions
        if (isExpanded) {
          AnalyticsTracker.track('skill', 'expand', block.dataset.skill);
        }
      });
    }

    // Handle project link clicks - open project modal
    projectLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.stopPropagation();
        const projectId = link.dataset.project;
        if (projectId && typeof openProjectModal === 'function') {
          // Get the modal open function from the projectModals scope
          const modal = document.getElementById('projectModal');
          const modalContent = document.getElementById('modalContent');
          const project = projectData[projectId];

          if (project && modal && modalContent) {
            // Trigger project modal open (reuse existing modal logic)
            const projectCard = document.querySelector(`[data-project="${projectId}"]`);
            if (projectCard) {
              projectCard.click();
            }
          }
        }
      });
    });
  });
}

/**
 * Dot Navigation - Section progress indicator with scroll tracking
 */
function initDotNavigation() {
  const dots = document.querySelectorAll('.dot-nav__dot');
  const sections = ['about', 'skills', 'experience', 'work', 'contact'];

  if (!dots.length) return;

  // Track which sections have been viewed
  let lastTrackedSection = null;

  // Click handlers for dots
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const sectionId = dot.dataset.section;
      const section = document.getElementById(sectionId);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
        // Track navigation click
        AnalyticsTracker.trackNavigation(sectionId);
      }
    });
  });

  // Update active dot based on scroll position
  function updateActiveDot() {
    const scrollPos = window.scrollY + window.innerHeight / 3;

    let activeSectionId = 'hero';
    sections.forEach(sectionId => {
      const section = document.getElementById(sectionId);
      if (section && section.offsetTop <= scrollPos) {
        activeSectionId = sectionId;
      }
    });

    dots.forEach(dot => {
      dot.classList.toggle('active', dot.dataset.section === activeSectionId);
    });

    // Track section view in Cloudflare (only once per section)
    if (activeSectionId !== lastTrackedSection) {
      AnalyticsTracker.trackSection(activeSectionId);
      lastTrackedSection = activeSectionId;
    }
  }

  // Initial update
  updateActiveDot();

  // Update on scroll with throttle
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    if (scrollTimeout) return;
    scrollTimeout = setTimeout(() => {
      updateActiveDot();
      scrollTimeout = null;
    }, 50);
  });
}

/**
 * Modal Navigation - Prev/Next project browsing
 */
let currentProjectIndex = 0;
const projectOrder = [
  'pistolwhip', 'foundation', 'proximity', 'horizon', 'flourish',
  'marvel', 'form', 'petras', 'citizengrim', 'woto', 're',
  'starwars', 'socom_fb3', 'socom_conf', 'socom_ts', 'bully', 'maxpayne2'
];

function initModalNavigation() {
  const prevBtn = document.getElementById('modalPrev');
  const nextBtn = document.getElementById('modalNext');
  const modal = document.getElementById('projectModal');

  if (!prevBtn || !nextBtn || !modal) return;

  prevBtn.addEventListener('click', () => navigateProject(-1));
  nextBtn.addEventListener('click', () => navigateProject(1));

  // Track current project when modal opens
  const observer = new MutationObserver(() => {
    if (modal.classList.contains('active')) {
      updateNavButtons();
    }
  });
  observer.observe(modal, { attributes: true, attributeFilter: ['class'] });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('active')) return;
    if (e.key === 'ArrowLeft') navigateProject(-1);
    if (e.key === 'ArrowRight') navigateProject(1);
  });
}

function navigateProject(direction) {
  const modal = document.getElementById('projectModal');
  if (!modal.classList.contains('active')) return;

  // Find current project from modal content
  const modalContent = document.getElementById('modalContent');
  const currentTitle = modalContent.querySelector('.case-study__title');
  if (!currentTitle) return;

  // Find current index based on title match
  for (let i = 0; i < projectOrder.length; i++) {
    const project = projectData[projectOrder[i]];
    if (project && project.title === currentTitle.textContent) {
      currentProjectIndex = i;
      break;
    }
  }

  // Calculate new index
  let newIndex = currentProjectIndex + direction;
  if (newIndex < 0) newIndex = 0;
  if (newIndex >= projectOrder.length) newIndex = projectOrder.length - 1;

  if (newIndex !== currentProjectIndex) {
    currentProjectIndex = newIndex;
    const newProjectId = projectOrder[newIndex];

    // Use the global openProjectModal function if available
    if (typeof window.openProjectModal === 'function') {
      window.openProjectModal(newProjectId);
    } else {
      // Fallback: click on the project card
      const projectCard = document.querySelector(`[data-project="${newProjectId}"]`);
      if (projectCard) {
        projectCard.click();
      }
    }
  }

  updateNavButtons();
}

function updateNavButtons() {
  const prevBtn = document.getElementById('modalPrev');
  const nextBtn = document.getElementById('modalNext');

  if (prevBtn) prevBtn.disabled = currentProjectIndex === 0;
  if (nextBtn) nextBtn.disabled = currentProjectIndex >= projectOrder.length - 1;
}

/**
 * Mobile Swipe - Touch gesture support for project browsing
 */
function initMobileSwipe() {
  const modal = document.getElementById('projectModal');
  const projectsGrid = document.querySelector('.grid--3');

  if (!modal) return;

  let touchStartX = 0;
  let touchEndX = 0;
  const minSwipeDistance = 50;

  // Swipe in modal for prev/next project
  modal.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  modal.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleModalSwipe();
  }, { passive: true });

  function handleModalSwipe() {
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0) {
        // Swipe left - next project
        navigateProject(1);
      } else {
        // Swipe right - previous project
        navigateProject(-1);
      }
    }
  }

  // Swipe on project cards to open them (mobile UX)
  if (projectsGrid) {
    let cardTouchStartX = 0;
    let cardTouchStartY = 0;
    let activeCard = null;

    projectsGrid.addEventListener('touchstart', (e) => {
      const card = e.target.closest('.project-card');
      if (card) {
        activeCard = card;
        cardTouchStartX = e.changedTouches[0].screenX;
        cardTouchStartY = e.changedTouches[0].screenY;
      }
    }, { passive: true });

    projectsGrid.addEventListener('touchend', (e) => {
      if (!activeCard) return;

      const diffX = Math.abs(e.changedTouches[0].screenX - cardTouchStartX);
      const diffY = Math.abs(e.changedTouches[0].screenY - cardTouchStartY);

      // If it's a tap (minimal movement), open the card
      if (diffX < 30 && diffY < 30) {
        activeCard.click();
      }

      activeCard = null;
    }, { passive: true });
  }
}

/**
 * Logo Cycling - Click to glitch and cycle through wavy line images
 * Easter Egg System - Progressive rewards for persistent clickers
 */
function initLogoCycling() {
  const navLogo = document.getElementById('navLogo');
  const logoImage = document.getElementById('logoImage');
  const logoMessage = document.getElementById('logoMessage');

  if (!navLogo || !logoImage) return;

  // Generate array of all 100 wavy line images
  const wavyLines = [];
  for (let i = 1; i <= 100; i++) {
    wavyLines.push(`images/WavyLineCircles/Wavy Line ${i}.png`);
  }

  // Start with index 6 (Wavy Line 7.png, zero-indexed)
  let currentIndex = 6;
  let clickCount = 0;
  let messageTimeout = null;
  let achievementContainer = null;
  let achievementFill = null;

  // Progressive messages aligned with portfolio philosophy
  const messages = {
    3: "...Oh? What you clicking this for?",
    //10: "...",
    15: "Curious one aren't you?",
    //25: " ",
    35: "Every click plants a seed... ",
    45: "wow, you've clicked 45 times...",
    //55: " ",
    65: "...what lies beyond the final seed?",
    //75: " ",
    //85: " ",
    95: "The final seed awaits..."
  };

  navLogo.addEventListener('click', (e) => {
    e.preventDefault();

    // Don't allow clicks after completion
    if (navLogo.classList.contains('completed')) return;

    clickCount++;

    // Track milestone clicks
    if ([10, 25, 50, 75, 100].includes(clickCount)) {
      AnalyticsTracker.track('easter-egg', 'milestone', `clicks-${clickCount}`);
    }

    // Add glitch class
    navLogo.classList.add('glitching');

    // Change image after glitch animation starts (200ms into the animation)
    setTimeout(() => {
      currentIndex = (currentIndex + 1) % wavyLines.length;
      logoImage.src = wavyLines[currentIndex];
    }, 200);

    // Remove glitch class after animation completes
    setTimeout(() => {
      navLogo.classList.remove('glitching');
    }, 400);

    // Handle Easter egg progression
    handleEasterEgg(clickCount);
  });

  function handleEasterEgg(count) {
    // Show messages at milestones
    if (messages[count]) {
      showMessage(messages[count]);
    }

    // Create progress bar at 50 clicks
    if (count === 50) {
      createAchievementBar();
    }

    // Update progress bar from 50-100
    if (count >= 50 && count < 100) {
      updateProgressBar(count);
    }

    // Transform to button at 100 clicks
    if (count === 100) {
      transformToButton();
    }
  }

  function showMessage(text) {
    if (!logoMessage) return;

    // Clear existing timeout
    if (messageTimeout) {
      clearTimeout(messageTimeout);
    }

    const chars = '!@#$%^&*()_+-=[]{}|;:<>?/\\~`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const duration = 600;
    const frameRate = 50;
    const frames = duration / frameRate;
    let currentFrame = 0;

    // Start with scrambled text
    logoMessage.textContent = scrambleText(text, chars, 1);
    logoMessage.classList.add('visible', 'glitching');

    // Scramble animation
    const interval = setInterval(() => {
      currentFrame++;
      const progress = currentFrame / frames;

      // Gradually reveal characters from left to right
      const revealIndex = Math.floor(progress * text.length);
      let newText = '';

      for (let i = 0; i < text.length; i++) {
        if (i < revealIndex) {
          newText += text[i];
        } else if (text[i] === ' ') {
          newText += ' ';
        } else {
          newText += chars[Math.floor(Math.random() * chars.length)];
        }
      }

      logoMessage.textContent = newText;

      if (currentFrame >= frames) {
        clearInterval(interval);
        logoMessage.textContent = text;

        // Remove glitching after scramble completes
        setTimeout(() => {
          logoMessage.classList.remove('glitching');
        }, 100);
      }
    }, frameRate);

    // Fade out after 3 seconds
    messageTimeout = setTimeout(() => {
      logoMessage.classList.remove('visible');
    }, 3000);
  }

  function scrambleText(text, chars, scrambleRatio) {
    return text.split('').map(char => {
      if (char === ' ') return ' ';
      return Math.random() < scrambleRatio
        ? chars[Math.floor(Math.random() * chars.length)]
        : char;
    }).join('');
  }

  function createAchievementBar() {
    // Create container
    achievementContainer = document.createElement('div');
    achievementContainer.className = 'achievement-container';
    achievementContainer.innerHTML = `
      <div class="achievement-label">Achievement Unlocked!</div>
      <div class="achievement-bar" id="achievementBar">
        <div class="achievement-fill" id="achievementFill"></div>
      </div>
    `;

    document.body.appendChild(achievementContainer);

    // Get fill element reference
    achievementFill = document.getElementById('achievementFill');

    // Show with fade-in
    setTimeout(() => {
      achievementContainer.classList.add('visible');
    }, 100);

    // Fade out label after 3 seconds
    setTimeout(() => {
      const label = achievementContainer.querySelector('.achievement-label');
      if (label) {
        label.classList.add('fade-out');
      }
    }, 3000);

    // Initial fill at 50%
    achievementFill.style.width = '0%';
  }

  function updateProgressBar(count) {
    if (!achievementFill) return;

    // Calculate percentage from 50 to 100 clicks
    const percentage = ((count - 50) / 50) * 100;
    achievementFill.style.width = `${percentage}%`;
  }

  function transformToButton() {
    if (!achievementContainer) return;

    const achievementBar = document.getElementById('achievementBar');
    if (!achievementBar) return;

    // Hide message if showing
    if (logoMessage) {
      logoMessage.classList.remove('visible');
    }

    // Get bar position for explosion origin
    const rect = achievementBar.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Trigger particle explosion
    createParticleExplosion(centerX, centerY);

    // Transform bar after explosion starts
    setTimeout(() => {
      // Make bar clickable (label stays red and visible above logo)
      achievementBar.classList.add('complete');
      achievementBar.style.cursor = 'pointer';
    }, 400);

    // Add click handler
    achievementBar.addEventListener('click', () => {
      openCelebrationModal();
    });
  }

  function createParticleExplosion(x, y) {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = x + 'px';
    container.style.top = y + 'px';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '200';
    document.body.appendChild(container);

    // Create 30 particles bursting outward
    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div');
      particle.className = 'explosion-particle';

      // Calculate random angle and velocity
      const angle = (Math.PI * 2 * i) / 30 + (Math.random() - 0.5) * 0.3;
      const velocity = 80 + Math.random() * 40;
      const tx = Math.cos(angle) * velocity;
      const ty = Math.sin(angle) * velocity;

      particle.style.setProperty('--tx', tx + 'px');
      particle.style.setProperty('--ty', ty + 'px');

      container.appendChild(particle);
    }

    // Remove after animation completes
    setTimeout(() => {
      container.remove();
    }, 1000);
  }
}


/**
 * Celebration Modal - Full-screen particle celebration with typewriter message
 */
function openCelebrationModal() {
  const modal = document.getElementById('celebrationModal');
  const canvas = document.getElementById('celebrationParticles');
  const textContainer = document.getElementById('celebrationText');
  const closeBtn = document.getElementById('celebrationClose');

  if (!modal || !canvas || !textContainer) return;

  // Show modal
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Initialize particle animation
  initCelebrationParticles(canvas);

  // Prepare typewriter text
  const celebrationMessage = [
    "....",
    "Wow.",
    "",
    "I didn't expect to see you here.",
    "",
    "Design and Interactions can be so simple",
    "yet they can still captivate us,",
    "drawn in by our curiosity we want to see what could possibly be next.",
    "This desire connects us, makes us human.",
    "We create to connect to others, to send a part of us out into the world.",
    "",
    "Thank you for engaging and spending a moment with me."
  ];

  // Create paragraph elements
  textContainer.innerHTML = '';
  celebrationMessage.forEach(line => {
    const p = document.createElement('p');
    p.textContent = line;
    p.dataset.originalText = line;
    textContainer.appendChild(p);
  });

  // Start typewriter effect
  setTimeout(() => {
    typewriteCelebration(textContainer.querySelectorAll('p'), 0);
  }, 1000);

  // Close button handler (only way to close)
  if (closeBtn) {
    closeBtn.addEventListener('click', closeCelebrationModal);
  }
}


function closeCelebrationModal() {
  const modal = document.getElementById('celebrationModal');
  const navLogo = document.getElementById('navLogo');

  modal.classList.remove('active');
  document.body.style.overflow = '';

  // Transform logo to asterisk
  if (navLogo) {
    navLogo.classList.add('completed');
  }

  // Remove achievement bar
  const achievementContainer = document.querySelector('.achievement-container');
  if (achievementContainer) {
    achievementContainer.style.opacity = '0';
    setTimeout(() => {
      achievementContainer.remove();
    }, 500);
  }
}

/**
 * Typewriter effect for celebration text
 */
function typewriteCelebration(paragraphs, index) {
  if (index >= paragraphs.length) return;

  const p = paragraphs[index];
  const text = p.dataset.originalText;

  // Skip empty paragraphs
  if (!text.trim()) {
    p.classList.add('complete');
    p.style.opacity = '1';
    setTimeout(() => {
      typewriteCelebration(paragraphs, index + 1);
    }, 200);
    return;
  }

  p.classList.add('typing');
  p.style.opacity = '1';
  p.textContent = '';

  let charIndex = 0;
  const speed = 30; // ms per character

  function typeChar() {
    if (charIndex < text.length) {
      p.textContent += text[charIndex];
      charIndex++;
      setTimeout(typeChar, speed);
    } else {
      // Paragraph complete
      p.classList.remove('typing');
      p.classList.add('complete');

      // Start next paragraph after pause
      setTimeout(() => {
        typewriteCelebration(paragraphs, index + 1);
      }, 400);
    }
  }

  typeChar();
}

/**
 * Celebration Particles - Dense star field animation
 */
function initCelebrationParticles(canvas) {
  const ctx = canvas.getContext('2d');
  let particles = [];
  let animationId;

  // Resize canvas
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initParticles();
  }

  // Initialize particles
  function initParticles() {
    particles = [];
    const colors = ['#FFFFFF', '#FFD700', '#00CED1', '#FF3333'];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.5 + 0.5
      });
    }
  }

  // Animate particles
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      // Update position
      p.x += p.speedX;
      p.y += p.speedY;

      // Wrap around edges
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      // Draw particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Draw connections
    particles.forEach((p1, i) => {
      particles.slice(i + 1, i + 10).forEach(p2 => {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 * (1 - dist / 120)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
    });

    animationId = requestAnimationFrame(animate);
  }

  // Initialize and start
  resizeCanvas();
  animate();

  // Resize handler
  window.addEventListener('resize', resizeCanvas);

  // Cleanup on modal close
  const modal = document.getElementById('celebrationModal');
  const observer = new MutationObserver(() => {
    if (!modal.classList.contains('active') && animationId) {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
      observer.disconnect();
    }
  });
  observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
}
