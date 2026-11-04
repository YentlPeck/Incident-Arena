/* Pixelforge Level 2 — game content. Spoilers below: players should not read this file. */

ICONS.shield = [
  '...kkkkkk...',
  '.kkbbbbbbkk.',
  '.kbbbbbbbbk.',
  '.kbbbwwbbbk.',
  '.kbbwwwwbbk.',
  '.kbbbwwbbbk.',
  '.kbbbwwbbbk.',
  '..kbbbbbbk..',
  '..kbbbbbbk..',
  '...kbbbbk...',
  '....kbbk....',
  '.....kk.....',
];

const L2 = {
  incident: 'Incident #0413',
  tasks: ['Login detective', 'Photo clue', 'Hidden page', 'Cookie trick'],

  objectives: {
    1: 'Someone is selling an unreleased copy of Emberfall online. They must have used a staff account. Open the <b>Security Center</b>, find the one login that is impossible, and flag it.',
    2: 'The attacker knows Lena’s password. Find out how they got it, then sign in to the Staff Portal as Lena yourself.<div class="lead">Lena’s username: <b>lena.okafor</b></div>',
    3: 'IT thinks the attacker used an old admin page that was never deleted. Find it on the Staff Portal. Developers sometimes leave notes where visitors don’t normally look.',
    4: 'The old admin page only lets admins in. Find a way in, find out who downloaded the game copy, and name the seller in your Case File.',
  },

  team: [
    { name: 'Lena Okafor', role: 'Sound Designer', handle: 'lenamakesnoise' },
    { name: 'Marco Duarte', role: 'Junior QA Tester', handle: 'marco_d' },
    { name: 'Nadia Voss', role: 'QA Lead', handle: 'nadiaqa' },
    { name: 'Ravi Sethi', role: 'Build Engineer', handle: 'ravibuilds' },
  ],

  suspects: [
    { id: 'lena', name: 'Lena Okafor', role: 'Sound Designer' },
    { id: 'marco', name: 'Marco Duarte', role: 'Junior QA Tester' },
    { id: 'nadia', name: 'Nadia Voss', role: 'QA Lead' },
    { id: 'ravi', name: 'Ravi Sethi', role: 'Build Engineer' },
  ],

  chirper: {
    lenamakesnoise: {
      name: 'Lena Okafor', bio: 'Sound Designer @ Pixelforge · I make dragons roar',
      posts: [
        ['New desk setup! Finally a proper place to make dragon roars 🎧', 'Nov 18, 2026', 'desk'],
        ['Recorded a walrus for the dragon’s breathing sound. Don’t ask.', 'Nov 10, 2026'],
        ['Coffee count today: 4. Send help.', 'Nov 3, 2026'],
      ],
    },
    marco_d: {
      name: 'Marco Duarte', bio: 'Junior QA @ Pixelforge · gamer · always broke',
      posts: [
        ['Saving up for a new graphics card. Side hustle time 💸', 'Nov 15, 2026'],
        ['Testing the same level for the 40th time. My eyes.', 'Nov 9, 2026'],
        ['Fun fact: with a VPN you can look like you’re anywhere in the world 🌎', 'Nov 2, 2026'],
      ],
    },
    nadiaqa: {
      name: 'Nadia Voss', bio: 'QA Lead @ Pixelforge · I break games so you don’t have to',
      posts: [
        ['Day 3 of testing the beta. Found a bug where the dragon moonwalks.', 'Nov 20, 2026'],
        ['Train to Amsterdam for a QA meetup! 🚆', 'Nov 20, 2026'],
      ],
    },
    ravibuilds: {
      name: 'Ravi Sethi', bio: 'Build Engineer @ Pixelforge · if it compiles, ship it',
      posts: [
        ['Note to self: clean up the old admin stuff before launch 😅', 'Nov 12, 2026'],
        ['Working from Frankfurt this week, all through the company VPN.', 'Nov 19, 2026'],
      ],
    },
  },

  /* Security Center sign-in log. The one impossible login has `bad: true`; the others explain themselves when flagged. */
  log: [
    { t: 'Nov 18, 08:40', user: 'theo.brandt', loc: 'Ghent, Belgium', dev: 'TBRANDT-LT', ok: true },
    { t: 'Nov 19, 09:12', user: 'ravi.sethi', loc: 'Frankfurt, Germany (company VPN)', dev: 'RSETHI-LT', ok: true, why: 'Ravi works through the company VPN, which runs in Frankfurt.' },
    { t: 'Nov 20, 08:31', user: 'nadia.voss', loc: 'Ghent, Belgium', dev: 'QA-PC-07', ok: true },
    { t: 'Nov 20, 08:47', user: 'ravi.sethi', loc: 'Frankfurt, Germany (company VPN)', dev: 'RSETHI-LT', ok: true, why: 'Ravi works through the company VPN, which runs in Frankfurt.' },
    { t: 'Nov 20, 08:55', user: 'lena.okafor', loc: 'Ghent, Belgium', dev: 'LOKAFOR-MAC', ok: true },
    { t: 'Nov 20, 09:10', user: 'marco.duarte', loc: 'Ghent, Belgium', dev: 'MDUARTE-LT', ok: true },
    { t: 'Nov 20, 09:14', user: 'mira.kade', loc: 'Ghent, Belgium', dev: 'ART-PC-03', ok: true },
    { t: 'Nov 20, 11:02', user: 'admin', loc: 'Moscow, Russia', dev: 'unknown', ok: false, why: 'A failed login: somebody tried to guess the password, but nobody got in.' },
    { t: 'Nov 20, 11:02', user: 'admin', loc: 'Lagos, Nigeria', dev: 'unknown', ok: false, why: 'A failed login: somebody tried to guess the password, but nobody got in.' },
    { t: 'Nov 20, 11:03', user: 'admin', loc: 'Hanoi, Vietnam', dev: 'unknown', ok: false, why: 'A failed login: somebody tried to guess the password, but nobody got in.' },
    { t: 'Nov 20, 11:03', user: 'admin', loc: 'Lima, Peru', dev: 'unknown', ok: false, why: 'A failed login: somebody tried to guess the password, but nobody got in.' },
    { t: 'Nov 20, 12:30', user: 'theo.brandt', loc: 'Lisbon, Portugal', dev: 'TBRANDT-LT', ok: true, why: 'Theo was last seen in Ghent two days earlier: plenty of time to fly to Lisbon.' },
    { t: 'Nov 20, 13:15', user: 'nadia.voss', loc: 'Amsterdam, Netherlands', dev: 'QA-LT-02', ok: true, why: 'Ghent to Amsterdam is about 2.5 hours by train, and Nadia had more than 4 hours.' },
    { t: 'Nov 20, 18:05', user: 'marco.duarte', loc: 'Ghent, Belgium', dev: 'MDUARTE-LT', ok: true },
    { t: 'Nov 20, 22:48', user: 'lena.okafor', loc: 'Ghent, Belgium', dev: 'LOKAFOR-MAC', ok: false, why: 'One failed login from Lena’s own laptop at home: probably a typo.' },
    { t: 'Nov 21, 08:52', user: 'mira.kade', loc: 'Ghent, Belgium', dev: 'ART-PC-03', ok: true },
    { t: 'Nov 21, 09:02', user: 'lena.okafor', loc: 'Ghent, Belgium', dev: 'LOKAFOR-MAC', ok: true, why: 'This is Lena herself, at her usual desk. Look at what happens right after.' },
    { t: 'Nov 21, 09:07', user: 'lena.okafor', loc: 'São Paulo, Brazil', dev: 'DESKTOP-K7Q2', ok: true, bad: true },
    { t: 'Nov 21, 09:20', user: 'nadia.voss', loc: 'Ghent, Belgium', dev: 'QA-PC-07', ok: true },
    { t: 'Nov 21, 09:31', user: 'ravi.sethi', loc: 'Frankfurt, Germany (company VPN)', dev: 'RSETHI-LT', ok: true, why: 'Ravi works through the company VPN, which runs in Frankfurt.' },
    { t: 'Nov 21, 09:44', user: 'marco.duarte', loc: 'Ghent, Belgium', dev: 'MDUARTE-LT', ok: true },
    { t: 'Nov 21, 10:15', user: 'people.team', loc: 'Brussels, Belgium', dev: 'HR-PC-01', ok: true, why: 'Brussels is only 50 km from Ghent: the People team has an office there.' },
    { t: 'Nov 21, 11:40', user: 'admin', loc: 'Beijing, China', dev: 'unknown', ok: false, why: 'A failed login: somebody tried to guess the password, but nobody got in.' },
    { t: 'Nov 21, 11:41', user: 'admin', loc: 'São Paulo, Brazil', dev: 'unknown', ok: false, why: 'A failed login: somebody tried to guess the password, but nobody got in.' },
    { t: 'Nov 21, 14:05', user: 'theo.brandt', loc: 'Lisbon, Portugal', dev: 'TBRANDT-LT', ok: true, why: 'Theo has been in Lisbon since yesterday.' },
    { t: 'Nov 21, 16:30', user: 'mira.kade', loc: 'Ghent, Belgium', dev: 'ART-PC-03', ok: true },
  ],

  lenaFiles: ['Dragon_roar_v7.wav', 'Walrus_breathing_FINAL.wav', 'Sound_list_beta.xlsx'],

  downloads: [
    ['Nov 19, 10:02', 'emberfall_beta_0.9.zip', 'ravi.sethi', 'RSETHI-LT', 'Frankfurt (company VPN)'],
    ['Nov 20, 15:47', 'emberfall_beta_0.9.zip', 'nadia.voss', 'QA-LT-02', 'Amsterdam'],
    ['Nov 21, 09:11', 'emberfall_beta_0.9.zip', 'lena.okafor', 'DESKTOP-K7Q2', 'São Paulo (VPN)'],
    ['Nov 21, 09:50', 'patch_notes_0.9.txt', 'marco.duarte', 'MDUARTE-LT', 'Ghent'],
  ],

  devices: [
    ['LOKAFOR-MAC', 'lena.okafor', 'Work laptop'],
    ['MDUARTE-LT', 'marco.duarte', 'Work laptop'],
    ['DESKTOP-K7Q2', 'marco.duarte', 'Personal home PC (added Oct 2)'],
    ['QA-PC-07', 'nadia.voss', 'Office PC'],
    ['QA-LT-02', 'nadia.voss', 'Work laptop'],
    ['RSETHI-LT', 'ravi.sethi', 'Work laptop'],
    ['ART-PC-03', 'mira.kade', 'Office PC'],
    ['TBRANDT-LT', 'theo.brandt', 'Work laptop'],
  ],

  secret: { user: 'lena.okafor', passHash: 2655080496, sellerHash: 4119456757 },
};
