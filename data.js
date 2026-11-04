/* Pixelforge — game content. Spoilers below: players should not read this file. */

const PALETTE = {
  k: '#14151f', w: '#efe6d8', o: '#f2a97e', O: '#c9744f', y: '#f4d27a',
  b: '#7fb3e8', B: '#4c78b0', g: '#8fd6b4', G: '#4f9a7a', p: '#a99cf0',
  P: '#6f5fc0', r: '#e88a9a', R: '#b5566a', n: '#b88a62', N: '#7d5a3c', s: '#8b8ba3',
};

const ICONS = {
  spark: [
    '...o...',
    '..ooo..',
    '.ooyoo.',
    'ooyyyoo',
    '.ooyoo.',
    '..ooo..',
    '...o...',
  ],
  mail: [
    '............',
    'kkkkkkkkkkkk',
    'kwkwwwwwwkwk',
    'kwwkwwwwkwwk',
    'kwwwkwwkwwwk',
    'kwwwwkkwwwwk',
    'kwwwwwwwwwwk',
    'kwwwwwwwoOwk',
    'kwwwwwwwOowk',
    'kwwwwwwwwwwk',
    'kkkkkkkkkkkk',
    '............',
  ],
  browser: [
    'kkkkkkkkkkkk',
    'kPPPPPPPPPPk',
    'kPrPyPgPPPPk',
    'kkkkkkkkkkkk',
    'kbbbbbbbbbbk',
    'kbbbbggbbbbk',
    'kbbbggggbbbk',
    'kbbggggggbbk',
    'kbbbggggbbbk',
    'kbbbbggbbbbk',
    'kbbbbbbbbbbk',
    'kkkkkkkkkkkk',
  ],
  casefile: [
    '............',
    '.kkkkk......',
    'kyyyyykkkkk.',
    'kyyyyyyyyyyk',
    'kooooooooook',
    'kowwwwwwwwok',
    'kowkkkkkkwok',
    'kowwwwwwwwok',
    'kowkkkkwwwok',
    'kowwwwwwwwok',
    'kooooooooook',
    'kkkkkkkkkkkk',
  ],
  flag: [
    'kk......',
    'krrrrk..',
    'krrrrrrk',
    'krrrrrk.',
    'kk......',
    'k.......',
    'k.......',
    'k.......',
  ],
  dragon: [
    '.............R...R.............',
    '.R...........RrrrR...........R.',
    '.RRR.........RyryR.........RRR.',
    '.RRRRR.......RrrrR.......RRRRR.',
    '.RRRRRRR......RrR......RRRRRRR.',
    '.RRRRRRRRR..RrrorrR..RRRRRRRRR.',
    '.RRRRRRRRRRRRrooorRRRRRRRRRRRR.',
    '......RRRRRRRrooorRRRRRRR......',
    '.........RRRRrooorRRRR.........',
    '............RrrorrR............',
    '...........RR..R..RR...........',
    '..........RR...R...RR..........',
    '................R..............',
    '.................RR............',
    '...................o...........',
  ],
};

const OBJECTIVES = {
  1: 'Someone may have tricked Mira, our lead artist. Find the scam email in her inbox and report it.',
  2: 'Someone signed in to the Staff Portal as Theo at 02:14 last night, while Theo is on holiday. Work out how they guessed his password, then sign in to the Staff Portal as Theo yourself.<div class="lead">Theo’s username: <b>theo.brandt</b></div>',
  3: 'Find the secret file the leaker took, then name the leaker in your Case File.',
};

const REAL_DOMAIN = 'pixelforge.studio';

const EMAILS = [
  {
    id: 'm1', name: 'Pixelforge IT Helpdesk', addr: 'it-helpdesk@pixelforge-studio.net',
    subject: 'Action required: your Art Drive access expires tonight', time: 'Yesterday 18:42', scam: true,
    body: `<p>Hi Mira,</p>
<p>Because of a security upgrade, every Art Drive account must be re-verified before <b>23:59 today</b>.
If you do not verify, your access to all Emberfall files will be removed and unsaved work may be lost.</p>
<p><button type="button" class="linkish" data-act="link" data-url="https://pixelforge-studio.net/sso/verify">Verify my account</button></p>
<p>Thank you,<br>IT Helpdesk<br>Pixelforge Studios</p>`,
  },
  {
    id: 'm2', name: 'Pixelforge People Team', addr: 'people@pixelforge.studio',
    subject: 'Reminder: please sign your updated contract by Friday', time: 'Yesterday 11:05',
    body: `<p>Hi Mira,</p>
<p>Friendly reminder that your updated contract is waiting for your signature. The deadline is <b>this Friday</b>.</p>
<p><button type="button" class="linkish" data-act="link" data-url="https://people.pixelforge.studio/contracts">Open my contract</button></p>
<p>Thanks!<br>The People Team</p>`,
  },
  {
    id: 'm3', name: 'Luna Raven', addr: 'luna.raven@mailbox.com',
    subject: 'Your Emberfall art made my day!!', time: 'Yesterday 09:30',
    body: `<p>Hi!! I just saw your Emberfall concept art on the Pixelforge website and I had to write.
The colours are SO good. I'm learning pixel art myself and you are a huge inspiration.</p>
<p>No need to reply, just wanted to say thank you :)</p>
<p>Luna</p>`,
  },
  {
    id: 'm4', name: 'Pixelforge IT', addr: 'it@pixelforge.studio',
    subject: 'Planned maintenance this Saturday', time: 'Oct 31, 16:20',
    body: `<p>Hi all,</p>
<p>The Staff Portal will be offline on <b>Saturday 06:00–08:00</b> for planned maintenance. You don't need to do anything.</p>
<p>You can follow along on the <button type="button" class="linkish" data-act="link" data-url="https://status.pixelforge.studio">status page</button>.</p>
<p>Pixelforge IT</p>`,
  },
  {
    id: 'm5', name: 'Theo Brandt', addr: 'theo.brandt@pixelforge.studio',
    subject: 'Dragon boss — final version?', time: 'Oct 31, 09:12',
    body: `<p>Hey Mira!</p>
<p>Before I disappear on holiday: is the Cinderwyrm final concept uploaded to the Staff Portal yet?
I'll have a look when I'm back. Remember it's top secret until the reveal!</p>
<p>Theo</p>`,
  },
];

const TEAM = [
  { name: 'Mira Kade', role: 'Lead Artist', handle: 'mirakade' },
  { name: 'Theo Brandt', role: 'Producer', handle: 'theobrandt' },
  { name: 'Jonas Marsh', role: 'Community Manager', handle: 'jonasplays' },
  { name: 'Nadia Voss', role: 'QA Lead', handle: 'nadiaqa' },
];

const SUSPECTS = [
  { id: 'mira', name: 'Mira Kade', role: 'Lead Artist' },
  { id: 'theo', name: 'Theo Brandt', role: 'Producer (on holiday)' },
  { id: 'jonas', name: 'Jonas Marsh', role: 'Community Manager' },
  { id: 'nadia', name: 'Nadia Voss', role: 'QA Lead' },
];

const CHIRPER = {
  theobrandt: {
    name: 'Theo Brandt', bio: 'Producer @ Pixelforge · dog dad · too much coffee',
    posts: [
      ['Holiday mode ON 🌴 Two weeks, zero laptops. Don\'t call me.', '3 days ago'],
      ['5 years ago today I met my best buddy. Happy gotcha day, Biscuit! 🐶🎉', 'Oct 14, 2026'],
      ['Crunch week. Emberfall\'s boss fight is going to melt faces.', 'Oct 9, 2026'],
      ['Biscuit vs. my sandwich: Biscuit 1, me 0.', 'Sep 22, 2026'],
    ],
  },
  mirakade: {
    name: 'Mira Kade', bio: 'Lead Artist @ Pixelforge · drawing dragons for a living',
    posts: [
      ['Sketching dragons all week. My hand hurts but it\'s worth it.', 'Oct 28, 2026'],
      ['My plant Gerald is thriving. Unlike my sleep schedule.', 'Oct 20, 2026'],
    ],
  },
  jonasplays: {
    name: 'Jonas Marsh', bio: 'Community Manager @ Pixelforge · streamer · hype man',
    posts: [
      ['Something BIG is coming for Emberfall fans very soon 👀 stay tuned', 'Nov 1, 2026'],
      ['New laptop all set up. Late nights incoming 💻', 'Oct 25, 2026'],
      ['Reminder: leaks hurt the devs. Wait for the official reveal 😇', 'Oct 3, 2026'],
    ],
  },
  nadiaqa: {
    name: 'Nadia Voss', bio: 'QA Lead @ Pixelforge · I break games so you don\'t have to',
    posts: [
      ['Found 47 bugs today. New personal record.', 'Oct 30, 2026'],
      ['My cat Mochi turns 3 today! 🐱🎂', 'Oct 18, 2026'],
    ],
  },
};

/* Staff portal files. The portal has a bug: it never checks who may open which file. */
const FILES = {
  1: { name: 'Welcome_pack.pdf', owner: 'people.team', team: 'People', text: 'Welcome to Pixelforge! Here is everything you need for your first week.', log: [['Jan 3', 'people.team', 'HR-PC-01', 'Uploaded']] },
  2: { name: 'Office_wifi_guide.txt', owner: 'it', team: 'IT', text: 'Connect to "Pixelforge-Staff" and sign in with your portal account.', log: [['Feb 11', 'it', 'IT-PC-02', 'Uploaded']] },
  3: { name: 'Lunch_menu_week44.pdf', owner: 'office', team: 'Office', text: 'Monday: lasagne. Tuesday: tacos. Wednesday: soup and bread.', log: [['Oct 27', 'office', 'OFFICE-PC', 'Uploaded']] },
  4: { name: 'Emberfall_logo_v3.png', owner: 'mira.kade', team: 'Art', text: 'Public logo, approved for the website.', log: [['Sep 2', 'mira.kade', 'ART-PC-03', 'Uploaded']] },
  5: { name: 'Bug_report_export.csv', owner: 'nadia.voss', team: 'QA', text: '412 open bugs, 38 critical. Top issue: dragon gets stuck in the ceiling.', log: [['Oct 30', 'nadia.voss', 'QA-PC-07', 'Uploaded']] },
  6: { name: 'Community_FAQ_draft.docx', owner: 'jonas.marsh', team: 'Community', text: 'Q: When is the boss reveal? A: Soon™', log: [['Oct 26', 'jonas.marsh', 'JMARSH-LT', 'Edited']] },
  7: { name: 'Payroll_october.xlsx', owner: 'finance', team: 'Finance', text: 'Salaries for October. Confidential.', secret: true, log: [['Oct 31', 'finance', 'FIN-PC-01', 'Uploaded']] },
  8: { name: 'Sound_effects_list.txt', owner: 'audio', team: 'Audio', text: 'roar_01.wav, roar_02.wav, wing_flap_big.wav', log: [['Oct 12', 'audio', 'AUDIO-PC', 'Uploaded']] },
  9: { name: 'Holiday_handover_notes.txt', owner: 'theo.brandt', team: 'Production', text: 'While I\'m away: Mira owns the boss art, Nadia owns the bug list. Back on the 14th!', log: [['Oct 31', 'theo.brandt', 'TBRANDT-LT', 'Uploaded']] },
  10: { name: 'Trailer_storyboard_v2.pdf', owner: 'marketing', team: 'Marketing', text: '12 frames. Frame 11: dragon silhouette (do NOT show the full design).', log: [['Oct 19', 'marketing', 'MKT-PC-02', 'Uploaded']] },
  11: { name: 'Studio_party_photos.zip', owner: 'office', team: 'Office', text: '84 photos. Someone dressed as the dragon.', log: [['Sep 30', 'office', 'OFFICE-PC', 'Uploaded']] },
  12: { name: 'Emberfall_milestone_schedule.pdf', owner: 'theo.brandt', team: 'Production', text: 'Boss reveal: Dec 5. Beta: Jan 20. Launch: spring 2027.', log: [['Oct 30', 'theo.brandt', 'TBRANDT-LT', 'Uploaded']] },
  13: { name: 'QA_test_plan_Emberfall.docx', owner: 'nadia.voss', team: 'QA', text: 'Test every boss attack 50 times. Yes, 50.', log: [['Oct 22', 'nadia.voss', 'QA-PC-07', 'Uploaded']] },
  14: { name: 'Discord_announcement_drafts.txt', owner: 'jonas.marsh', team: 'Community', text: 'Draft 1: "Big reveal coming soon 👀" — Draft 2: "You are NOT ready for this dragon."', log: [['Nov 1', 'jonas.marsh', 'JMARSH-LT', 'Edited']] },
  15: { name: 'Character_sheet_hero.png', owner: 'mira.kade', team: 'Art', text: 'Main hero, three outfits. Approved.', log: [['Oct 8', 'mira.kade', 'ART-PC-03', 'Uploaded']] },
  16: { name: 'Server_costs_2026.xlsx', owner: 'finance', team: 'Finance', text: 'Monthly server costs. Confidential.', secret: true, log: [['Oct 15', 'finance', 'FIN-PC-01', 'Uploaded']] },
  17: { name: 'Cinderwyrm_boss_FINAL.png', owner: 'mira.kade', team: 'Art', art: 'dragon', secret: true, key: true,
        text: 'FINAL boss concept for Emberfall. Top secret until the Dec 5 reveal.',
        log: [['Oct 30, 17:02', 'mira.kade', 'ART-PC-03', 'Uploaded'], ['Nov 2, 02:16', 'theo.brandt', 'JMARSH-LT', 'Downloaded']] },
  18: { name: 'Patch_notes_0.9.txt', owner: 'nadia.voss', team: 'QA', text: 'Fixed: dragon no longer stuck in the ceiling (mostly).', log: [['Oct 29', 'nadia.voss', 'QA-PC-07', 'Uploaded']] },
  19: { name: 'Press_contacts.xlsx', owner: 'marketing', team: 'Marketing', text: '23 journalists who get the boss reveal on Dec 5.', secret: true, log: [['Oct 20', 'marketing', 'MKT-PC-02', 'Uploaded']] },
  20: { name: 'Old_prototype_notes.txt', owner: 'theo.brandt', team: 'Production', text: 'The very first Emberfall prototype was a farming game. Long story.', log: [['Mar 4', 'theo.brandt', 'TBRANDT-LT', 'Uploaded']] },
};

const THEO_FILES = [12, 9];

/* Answers are stored as hashes so they don't jump out at a casual reader. */
const SECRET = {
  user: 'theo.brandt',
  passHash: 772789187,
  leakerHash: 2977598280,
};
