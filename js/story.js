/* Witherholm — all the writing.

   You are Nell Corvin, a district nurse. Your sister Mara took a live-in post at
   Witherholm three weeks ago. The house is being eaten by the Bloom, a fungus
   that is also a mind. It feeds through families. It has Lady Hollis (the Matron),
   her husband Edmund (the Root under the chapel), and Mara. It needs one more
   kin to be complete: you. Every letter that lured you here was written in
   Mara's hand, with the Bloom's thumb on the pen.

   Notes are HTML fragments. Classes: .sig (signature), .smear (written in blood). */

const Story = {
  intro: [
    [
      'NELL CORVIN. District nurse, St Ada\'s Infirmary.',
      '',
      'Three weeks ago my sister Mara took a live-in post at Witherholm, a convalescent house out on the moor.',
      'Her letters came weekly. Then daily. Then all at once, forty pages in a single night, in a hand that was hers and not quite hers.',
    ],
    [
      'The last one was a single line.',
      '',
      'Come now, Nell. Bring your lamp.',
      '',
      'I brought the lamp.',
    ],
  ],

  chapters: {
    1: ['I', 'The Letter', 'Witherholm, near midnight'],
    2: ['II', 'A Table for Fourteen', 'The east wing'],
    3: ['III', 'The Chapel Door', 'Something waits behind it'],
    4: ['IV', 'The Root', 'Down, where it is warm'],
    5: ['V', 'The Way Out', 'Before the house decides'],
  },

  // First time you walk into an area. [x0, y0, x1, y1] in map cells.
  zones: [
    { id: 'foyer', rect: [15, 20, 24, 28], text: 'Mara? It is Nell. Mara?' },
    { id: 'hall', rect: [18, 10, 21, 19], text: 'The wallpaper is breathing. Slowly, in time with me.' },
    { id: 'dining', rect: [3, 18, 13, 28], text: 'Fourteen places laid. Every plate scraped clean.' },
    { id: 'kitchen', rect: [3, 10, 13, 15], text: 'Something has been stewing here for weeks. The smell is sweet.' },
    { id: 'pantry', rect: [4, 6, 9, 8], text: 'That humming. That is Mother\'s song. How does he know Mother\'s song?' },
    { id: 'closet', rect: [23, 14, 25, 16], text: 'A gramophone in a cupboard. Somebody wanted a place to rest.' },
    { id: 'library', rect: [26, 18, 36, 28], text: 'Every spine the same pale grey. Nobody has opened these in years.' },
    { id: 'conservatory', rect: [38, 12, 47, 24], text: 'Moonlight. And the plants are moving with no wind at all.' },
    { id: 'study', rect: [27, 5, 36, 13], text: 'My sister\'s handwriting. On every wall.' },
    { id: 'chapel', rect: [12, 1, 25, 8], text: 'Nobody prays here. They are fed.' },
    { id: 'root', rect: [1, 1, 10, 4], text: 'Mara.' },
  ],

  // Mara's voice, borrowed by the Bloom. Some of it is lies.
  whispers: {
    any: [
      'Nell? Is that your step?',
      'Mind the third stair. It sings.',
      'You brought the lamp. Good girl.',
      'I am not angry you came.',
      'Hum it with me, Nell. Mother\'s song.',
      'Come closer. It is so warm in here.',
      'The dark is friendlier than it looks.',
    ],
    moth: ['The east wing has books for you. Go and read.', 'Do you remember the stairs at home? I counted them for you.'],
    serpent: ['Open the chapel, Nell. I am just behind it.', 'Nearly there. Nearly home.'],
    bossDead: ['Down the stair, Nell. I am down the stair.', 'You are so close. Do not stop now.'],
    hollow: ['Put the light out, Nell. You are hurting them.', 'Turn it off. They only want to say hello.'],
  },

  lines: {
    bossRise: ['LADY HOLLIS', 'Nell Corvin. The third. Mara called you so sweetly.'],
    bossRage: ['LADY HOLLIS', 'You cannot burn a family, dear.'],
    bossDie: ['LADY HOLLIS', 'Tell her... the house was only lonely.'],
    rootDoor: 'Somewhere below the chapel, stone grinds against stone.',
    choice: 'The Root is breathing in time with you.',
  },

  notes: {
    arrival: {
      title: 'A letter on the floor',
      body: `<p>Nell,</p>
        <p>You came. I knew you would. You never could leave a knot alone.</p>
        <p>Forgive the hand. My fingers have gone strange and the ink keeps drying green. The house is kind to people who stop arguing with it. Walk in. The dark is friendlier than it looks, and it is so glad you brought the lamp.</p>
        <p>Mind the doors. They only open for people who are expected.</p>
        <p class="sig">Your Mara</p>`,
    },
    mara1: {
      title: 'Mara, four weeks ago',
      body: `<p>Dearest Nell,</p>
        <p>I have a room with a window over the garden and a bell-pull that actually works. Lady Hollis is tired and kind and forgets her own name when she is ill. Her husband, Lord Edmund, has been bedridden since spring. The doctor says consumption, but the noises in his chest are like nothing I know.</p>
        <p>They feed me until I cannot stand. The same thin broth at every meal, Nell, and it is the best thing I ever tasted.</p>
        <p>Write soon. Hum Mother's song when you do, so I can hear it.</p>
        <p class="sig">M.</p>`,
    },
    dining: {
      title: 'Menu card',
      body: `<p><b>Supper for fourteen.</b></p>
        <p>First course: clear broth, the Lady's own.<br>Second course: clear broth.<br>Third course: clear broth.</p>
        <p>Every plate is to be finished. Guests who decline are to be walked to the cellar and <span class="smear">given time to reconsider.</span></p>
        <p class="smear">they are still down there. they are still reconsidering.</p>`,
    },
    kitchen: {
      title: 'Notice in the kitchen',
      body: `<p><b>DO NOT OPEN THE PANTRY.</b></p>
        <p>Whatever is in there is not Tomas any more. It hums. Tomas never hummed before he was taken. Now he hums one song, over and over, and I do not know where he learned it.</p>
        <p>I have locked the east wing and left the Moth key on the island table where the Lady's people will not look. They do not look at anything now. They listen.</p>
        <p>Bright light makes them flinch. Aim for the head. God forgive me, it is kinder.</p>
        <p class="sig">Mrs. Pell, housekeeper</p>`,
    },
    mara2: {
      title: 'Mara, two weeks ago',
      body: `<p>Nell,</p>
        <p>Something is wrong with the broth, or with me. I taste it in my sleep. Yesterday I woke in the chapel with both palms flat on the stone and no memory of the stairs.</p>
        <p>Lady Hollis says I am "settling in." She asked about you today. Whether you were older or younger. Whether we shared a mother. Whether you were the sort to come, if I asked.</p>
        <p>I told her you would never come. I am not sure I am a good liar any more.</p>
        <p class="sig">M.</p>`,
    },
    recipe: {
      title: 'Recipe card',
      body: `<p><b>Clear Broth, for the House</b></p>
        <p>Six kettles of well water.<br>One cup of the grey from the cellar.<br>Stir nine times to the left. Hum while you stir. The Lady says it likes a tune.</p>
        <p>If the cook falls asleep at the pot, leave him. He is part of the recipe now.</p>
        <p class="smear">he is still stirring. i can hear him stirring.</p>`,
    },
    fenwick: {
      title: 'Dr. Fenwick\'s case file',
      body: `<p><b>Hollis, E. and A. Confidential.</b></p>
        <p>The organism, which I call the Bloom, is a fungus; more exactly, a mind spread across a fungus. It prefers the dark. Bright light frightens it, and whatever it has hollowed out. In lamplight those things freeze. In darkness they run.</p>
        <p>Fire kills it outright, and anything joined to it. Ashroot sap, <b>three measures</b> applied to a host cut free of the Root, dissolves the bond without killing the host. In theory. I have not had the nerve.</p>
        <p>I am leaving the house tonight. Whoever reads this: God help the girl in the chapel cellar. She was a nurse. She was good.</p>`,
    },
    library: {
      title: 'Journal of Lady A. Hollis, I',
      body: `<p>Edmund was given until autumn. In the crypt beneath the chapel we found the Root: older than the house, older than the moor, a knot of living grey as thick as a church pillar. When Edmund touched it, it <i>knew him</i>.</p>
        <p>He got well. Then he got quiet. Then he got attached. Now he is the Root, or it is him. I cannot tell any more, and neither, I think, can he.</p>
        <p>It asked for a family. Not food. A family: people joined by blood, a house in which it could keep them all. It is very lonely. I understand loneliness.</p>`,
    },
    mara3: {
      title: 'Mara, three days ago',
      body: `<p><b>NELL DO NOT COME.</b></p>
        <p>It writes with my hand now. I catch it in the middle of sentences. The letters I sent you last week were not mine, or were mine with its thumb on the pen.</p>
        <p>It has your name, Nell. It found it in me like a coin in a pocket. It says it is only calling you home.</p>
        <p>The Matron is Lady Hollis. Her chest glows where her heart was. That is where it feeds.</p>
        <p>Do not come. Do not come. Do not come.</p>`,
    },
    wren1: {
      title: 'Wren Attaway, field notebook',
      body: `<p><b>Botany, Thursday.</b> The Bloom is not one organism but a committee. The grey in the cellar is the root-mind; the gold spores are its hands. Everything it grows on, it learns. It learned the house in a month and the people in a week.</p>
        <p>It feeds through kin. Two of a family make it strong. Three make it whole. I have written to my mother and told her not to visit.</p>
        <p>Ashroot grows wild in the glasshouse. Nothing else will grow near it. I think the Bloom is afraid of it.</p>`,
    },
    wren2: {
      title: 'Wren, last entry',
      body: `<p>The Hollows are what is left when it takes the mind and keeps the body. Pale, tall, eyeless. They cannot bear lamplight; they freeze in it like deer. In the dark they are on you before the floor creaks.</p>
        <p>I am taking what I can to the glasshouse. If it comes for me here I will burn the lamp until the oil is gone.</p>
        <p class="smear">the lamp is out</p>`,
    },
    hollis2: {
      title: 'Journal of Lady A. Hollis, II',
      body: `<p>The third of the family has been under my roof for a month. She scrubs floors in a borrowed apron and sings under her breath, and the Root has taken to her like a cat to a warm lap.</p>
        <p>It needs one more: her kin. Blood calls blood. A sister, a cousin, it does not care whose. She will write, and the Root will steady her hand. When the sister arrives the house will be complete, and no one in it will ever be cold or ill or alone again.</p>
        <p>Edmund, my love, I think I finally understand what you meant when you said it was beautiful.</p>`,
    },
    study: {
      title: 'Mara\'s last page',
      body: `<p>If you are reading this with a clear head, I wrote it while the Root was sleeping. It sleeps after it feeds.</p>
        <p>Lady Hollis is in the chapel, and she is not a woman any longer. What glows in her chest is a piece of the Root. Break it and she falls.</p>
        <p>She wears the Crown key on a chain. It opens the front door. Take it.</p>
        <p>After, there is a door in the chapel's west wall that opens only when she is dead. Go down. At the bottom, me. I do not know what I will be by then. Fenwick's file in the closet says what can be done. Forgive me for whichever you choose.</p>
        <p>And Nell. If you hear me in the house, in my voice, asking you to come closer: it is not me. It borrows my voice, and all my mistakes.</p>
        <p class="sig">M.</p>`,
    },
    altar: {
      title: 'Carved into the altar',
      body: `<p><b>HERE THE ROOT TOOK EDMUND.</b></p>
        <p><b>HERE THE ROOT TOOK AGATHA.</b></p>
        <p><b>HERE THE ROOT WILL TAKE THE THIRD.</b></p>
        <p>The last line has been cut with a fresh blade. The dust still smells of wet earth.</p>`,
    },
    root: {
      title: 'Mara, tonight',
      body: `<p>Nell,</p>
        <p>I will not be able to keep the pen much longer, so I will be quick and plain. It made me call you. I am sorry. I could not stop my hand.</p>
        <p>I am in the Root now, up to the ribs. It does not hurt. That is the worst of it. It feels like being held.</p>
        <p>There are two ways to do this right and one way to do it easy. Burn it, and I burn with it. Cut me free with three measures of Ashroot, and I come back out, changed, but I come back. Or walk away, and I stay here, and it is kind to me forever.</p>
        <p>Whatever you choose is the right one. I love you. I have loved you since you taught me to count on the stairs.</p>
        <p class="sig">M.</p>`,
    },
  },

  // the order notes are listed in the Files screen
  noteOrder: ['arrival', 'mara1', 'dining', 'kitchen', 'mara2', 'recipe', 'fenwick', 'library', 'mara3', 'wren1', 'wren2', 'hollis2', 'study', 'altar', 'root'],

  endings: {
    ashes: {
      title: 'Ashes',
      text: [
        'The oil catches before the match does. The Root does not scream. It hums your mother\'s song in your sister\'s voice, slow and sweet, until the flames reach the ribs and the voice goes quiet.',
        'Witherholm burns until dawn, the colour of a summer afternoon. The moor keeps the smoke.',
        'You sleep with the lamp lit now. Some nights you hum. You always stop before the end of the verse, in case someone answers.',
      ],
    },
    kin: {
      title: 'Kin',
      text: [
        'The Ashroot hisses on the grey. The Root lets go the way a hand lets go in sleep, and Mara comes out of it in pieces that are still, somehow, her. She is light as a coat. She is breathing.',
        'You carry her across the moor until the sun is up. She sleeps for three days. On the fourth she asks for clear broth and laughs at the look on your face, and you laugh too.',
        'Neither of you mentions the pale gold haze lying along the horizon, low to the ground and against the wind. It is coming the way the tide comes. It is in no hurry.',
      ],
    },
    left: {
      title: 'Left Behind',
      text: [
        'You leave her there. You tell yourself she would want you alive, that you could never have got her out, that there will be men with lanterns and axes and a better plan.',
        'The front door opens easily. The moor is waiting, damp and ordinary.',
        'A letter comes at Christmas. The paper smells of wet earth and something sweet. It says only: Come now, Nell. Bring your lamp. You read it twice. You are already putting on your coat.',
      ],
    },
    fire: { title: 'Consumed', text: ['The house comes down on you as you run.', 'Somewhere in the warm dark a voice you know is still humming.'] },
  },
};

// older code refers to NOTES directly
const NOTES = Story.notes;
