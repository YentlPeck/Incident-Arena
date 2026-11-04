/* Pixelforge Level 3 — game content. Spoilers below: players should not read this file. */

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
ICONS.chat = [
  '............',
  '.kkkkkkkkkk.',
  '.kggggggggk.',
  '.kgwwwwwwgk.',
  '.kggggggggk.',
  '.kgwwwwgggk.',
  '.kggggggggk.',
  '.kkkkkggkkk.',
  '.....kgk....',
  '.....kk.....',
  '............',
  '............',
];
ICONS.files = [
  '............',
  '.kkkkk......',
  'kpppppkkkkk.',
  'kppppppppppk',
  'kPPPPPPPPPPk',
  'kPwwwwwwwwPk',
  'kPwkkkkkkwPk',
  'kPwwwwwwwwPk',
  'kPwkkkkwwwPk',
  'kPwwwwwwwwPk',
  'kPPPPPPPPPPk',
  'kkkkkkkkkkkk',
];

const L3 = {
  incident: 'Incident #0414',
  goal: 'It’s launch day and most of Pixelforge’s servers are locked by ransomware. Find out <b>how the attackers got in</b> and <b>whether someone inside helped them</b>. Nobody will tell you where to look. When you’re sure, file your report below. You can only file it once.',

  milestones: [
    { id: 'note', name: 'Read the ransom note' },
    { id: 'patient0', name: 'Found the first locked computer' },
    { id: 'mfa', name: 'Spotted the MFA fatigue attack' },
    { id: 'fakeit', name: 'Found the fake IT support chat' },
    { id: 'invite', name: 'Found who invited the fake IT support' },
    { id: 'leak', name: 'Found the reused, leaked password' },
    { id: 'backups', name: 'Found who deleted the backups' },
    { id: 'who', name: 'Report: named the insider' },
    { id: 'how', name: 'Report: explained how they got in' },
    { id: 'evidence', name: 'Report: picked the right evidence' },
  ],

  team: [
    { name: 'Kai Yilmaz', role: 'Backend Developer', handle: 'kaicodes', email: 'kai.yilmaz@pixelforge.studio' },
    { name: 'Sofia Romano', role: 'Release Manager', handle: 'sofia_ships', email: 'sofia.romano@pixelforge.studio' },
    { name: 'Ben Carter', role: 'Gameplay Developer', handle: 'bencarter', email: 'ben.carter@pixelforge.studio' },
    { name: 'Ines Morel', role: 'IT Administrator', handle: 'ines_it', email: 'ines.morel@pixelforge.studio' },
  ],

  emails: [
    { id: 'e1', name: 'Ines Morel (IT)', addr: 'ines.morel@pixelforge.studio', time: 'Today 07:12', subject: 'URGENT: servers locked, do not turn on your PC',
      body: '<p>Everyone,</p><p>Several servers were locked by ransomware during the night. Do not turn on your work PCs until IT says it is safe. A security expert is investigating with full access to our systems.</p><p>Ines</p>' },
    { id: 'e2', name: 'Ben Carter', addr: 'ben.carter@pixelforge.studio', time: 'Yesterday 16:40', subject: 'FW: Suspicious "invoice" email, reported',
      body: '<p>Ines, I got this weird invoice email with a login link. I did NOT click it, just reporting it like the training said.</p><p>Ben</p>' },
    { id: 'e3', name: 'Sofia Romano', addr: 'sofia.romano@pixelforge.studio', time: 'Yesterday 18:05', subject: 'Launch night plan',
      body: '<p>Hi team,</p><p>Launch is at 10:00 tomorrow. I’ll be online tonight to keep an eye on the release servers. Nobody else needs to stay up.</p><p>Sofia</p>' },
    { id: 'e4', name: 'Pixelforge People Team', addr: 'people@pixelforge.studio', time: 'Nov 27', subject: 'Reminder: no overtime pay this quarter',
      body: '<p>Hi all, as announced, overtime will not be paid out this quarter. Thanks for your understanding.</p>' },
  ],

  chats: [
    { id: 'c1', title: '# launch-day', kind: 'channel', msgs: [
      ['Sofia Romano', '23:50', 'Release servers look good. Signing off soon, see you at 10.'],
      ['Ben Carter', '23:52', 'still salty about the overtime thing tbh'],
      ['Ines Morel', '23:55', 'Backups ran fine at 22:00. Good night all.'],
    ] },
    { id: 'c2', title: 'Kai Yilmaz ↔ IT Support', kind: 'dm', key: 'fakeit', msgs: [
      ['IT Support', '01:38', 'Hi Kai, IT here. We’re running emergency VPN tests before the launch tonight.'],
      ['IT Support', '01:39', 'You’ll get some login pop-ups on your phone. Please just tap Approve when they come, it’s part of the test 🙏'],
      ['Kai Yilmaz', '02:11', 'its 2am and my phone keeps buzzing??'],
      ['IT Support', '02:12', 'Sorry! Just approve the next one and they stop.'],
      ['Kai Yilmaz', '02:13', 'ok approved. going back to sleep'],
    ] },
    { id: 'c3', title: 'Ben Carter ↔ Ines Morel', kind: 'dm', msgs: [
      ['Ben Carter', '16:41', 'forwarded you that invoice phishing mail'],
      ['Ines Morel', '16:50', 'Thanks Ben, blocked the sender. Good catch.'],
    ] },
    { id: 'c4', title: 'Sofia Romano ↔ Ines Morel', kind: 'dm', msgs: [
      ['Sofia Romano', '17:30', 'Can you give me backup admin rights for launch night? Just in case.'],
      ['Ines Morel', '17:44', 'Done, you’re backup admin until Monday.'],
    ] },
  ],

  people: {
    'IT Support': { title: 'IT Support', badge: 'Guest account', lines: ['Not a Pixelforge employee account.', 'Invited to chat on Nov 29, 21:14 by sofia.romano', 'Email: it-support@pixelforge-helpdesk.com'], key: 'invite' },
    'Kai Yilmaz': { title: 'Kai Yilmaz', badge: 'Backend Developer', lines: ['Email: kai.yilmaz@pixelforge.studio', 'Chirper: @kaicodes'] },
    'Sofia Romano': { title: 'Sofia Romano', badge: 'Release Manager', lines: ['Email: sofia.romano@pixelforge.studio', 'Chirper: @sofia_ships'] },
    'Ben Carter': { title: 'Ben Carter', badge: 'Gameplay Developer', lines: ['Email: ben.carter@pixelforge.studio', 'Chirper: @bencarter'] },
    'Ines Morel': { title: 'Ines Morel', badge: 'IT Administrator', lines: ['Email: ines.morel@pixelforge.studio', 'Chirper: @ines_it'] },
  },

  servers: [
    ['BUILD-SRV-01', 'Locked', 'Nov 30, 02:44'],
    ['RELEASE-SRV-01', 'Locked', 'Nov 30, 02:38'],
    ['BUILD-SRV-02', 'Locked', 'Nov 30, 02:31'],
    ['ASSETS-SRV-01', 'Locked', 'Nov 30, 02:52'],
    ['WEB-SRV-01', 'OK', '—'],
    ['MAIL-SRV-01', 'OK', '—'],
  ],

  sharedFiles: [
    { id: 'readme', name: 'README_RESTORE.txt', key: 'note',
      text: 'YOUR FILES ARE LOCKED BY NIGHTSHADE.\n\nAll Pixelforge servers we touched are encrypted. Your backups are gone too, don’t bother looking.\nPay 10 BTC within 48 hours or Emberfall never launches.\n\nPayment and proof: restore.nightshade.top/pf-0414\n\nYou let us in yourselves. Check your own people.' },
    { id: 'checklist', name: 'launch_checklist.docx.nightshade', text: '(encrypted: this file can no longer be opened)' },
    { id: 'press', name: 'press_kit.zip.nightshade', text: '(encrypted: this file can no longer be opened)' },
    { id: 'notes', name: 'meeting_notes_nov28.txt', text: 'Launch meeting, Nov 28.\n- Sofia is release manager for launch night.\n- Ines runs nightly backups at 22:00.\n- Reminder: overtime will not be paid this quarter (Ben not happy).' },
  ],

  backups: [
    ['Nov 28, 22:00', 'ines.morel', 'Nightly backup', 'OK'],
    ['Nov 29, 13:15', 'ines.morel', 'Backup check', 'Warning: one file skipped (temp file)'],
    ['Nov 29, 17:44', 'ines.morel', 'Rights change', 'sofia.romano made backup admin until Monday'],
    ['Nov 29, 22:00', 'ines.morel', 'Nightly backup', 'OK'],
    ['Nov 30, 01:52', 'sofia.romano', 'DELETE ALL BACKUPS', 'Done: 14 backups deleted'],
  ],

  devices: {
    'build-srv-02': {
      name: 'BUILD-SRV-02',
      rows: [
        { t: 'Nov 29, 18:02', what: 'VPN sign-in', acct: 'sofia.romano', from: 'Ghent, Belgium', res: 'Success' },
        { t: 'Nov 30, 01:40', what: 'MFA push sent', acct: 'kai.yilmaz', from: 'Rotterdam, NL (VPN exit)', res: 'Denied by user ×6' },
        { t: 'Nov 30, 01:51', what: 'MFA push sent', acct: 'kai.yilmaz', from: 'Rotterdam, NL (VPN exit)', res: 'Denied by user ×9' },
        { t: 'Nov 30, 02:05', what: 'MFA push sent', acct: 'kai.yilmaz', from: 'Rotterdam, NL (VPN exit)', res: 'Denied by user ×8' },
        { t: 'Nov 30, 02:13', what: 'MFA push sent', acct: 'kai.yilmaz', from: 'Rotterdam, NL (VPN exit)', res: 'APPROVED', bad: true },
        { t: 'Nov 30, 02:14', what: 'VPN sign-in', acct: 'kai.yilmaz', from: 'Rotterdam, NL (VPN exit)', res: 'Success' },
        { t: 'Nov 30, 02:31', what: 'Files encrypted', acct: 'kai.yilmaz', from: 'BUILD-SRV-02', res: '1,204 files' },
      ],
      why: 'Not this row. Look at what happened just before the attacker got in.',
    },
    'release-srv-01': { name: 'RELEASE-SRV-01', rows: [
      { t: 'Nov 30, 00:10', what: 'Deploy', acct: 'sofia.romano', from: 'Ghent, Belgium', res: 'Success' },
      { t: 'Nov 30, 02:38', what: 'Files encrypted', acct: 'kai.yilmaz', from: 'BUILD-SRV-02', res: '3,980 files' }] },
    'build-srv-01': { name: 'BUILD-SRV-01', rows: [
      { t: 'Nov 29, 19:20', what: 'Build', acct: 'ben.carter', from: 'Ghent, Belgium', res: 'Success' },
      { t: 'Nov 30, 02:44', what: 'Files encrypted', acct: 'kai.yilmaz', from: 'BUILD-SRV-02', res: '2,511 files' }] },
    'assets-srv-01': { name: 'ASSETS-SRV-01', rows: [
      { t: 'Nov 30, 02:52', what: 'Files encrypted', acct: 'kai.yilmaz', from: 'BUILD-SRV-02', res: '9,870 files' }] },
    'web-srv-01': { name: 'WEB-SRV-01', rows: [
      { t: 'Nov 30, 03:00', what: 'Health check', acct: 'system', from: 'local', res: 'OK' }] },
    'mail-srv-01': { name: 'MAIL-SRV-01', rows: [
      { t: 'Nov 29, 16:51', what: 'Sender blocked', acct: 'ines.morel', from: 'Ghent, Belgium', res: 'invoices@pay-portal.biz' }] },
  },

  chirper: {
    kaicodes: { name: 'Kai Yilmaz', bio: 'Backend dev @ Pixelforge · sleeps through anything', posts: [
      ['Password managers are overkill. One strong password for everything is fine 😎', 'Oct 2, 2026'],
      ['Old GamerForums account still works after all these years lol', 'Sep 14, 2026'],
    ] },
    sofia_ships: { name: 'Sofia Romano', bio: 'Release Manager @ Pixelforge · shipping things', posts: [
      ['Launch night tomorrow. I’ll be the only one online, wish me luck 🚀', 'Nov 29, 2026'],
      ['Some people get paid way more than they’re worth. Not me, apparently.', 'Nov 20, 2026'],
    ] },
    bencarter: { name: 'Ben Carter', bio: 'Gameplay dev @ Pixelforge · rants included', posts: [
      ['No overtime pay this quarter. Someone should teach management a lesson 😤', 'Nov 27, 2026'],
      ['Reported a phishing mail today like a good boy 🎣', 'Nov 29, 2026'],
    ] },
    ines_it: { name: 'Ines Morel', bio: 'IT Admin @ Pixelforge · turn it off and on again', posts: [
      ['PSA: nobody from IT will ever ask you to approve a login pop-up you didn’t start.', 'Nov 15, 2026'],
    ] },
  },

  leaks: {
    'kai.yilmaz@pixelforge.studio': { key: 'leak', found: [
      ['GamerForums', '2025', 'Email and password leaked. The same password was later used on a Pixelforge account.'],
      ['PixelArtHub', '2023', 'Email only.']] },
    'sofia.romano@pixelforge.studio': { found: [] },
    'ben.carter@pixelforge.studio': { found: [['PixelArtHub', '2023', 'Email only.']] },
    'ines.morel@pixelforge.studio': { found: [] },
  },

  report: {
    who: [['kai', 'Kai Yilmaz'], ['sofia', 'Sofia Romano'], ['ben', 'Ben Carter'], ['ines', 'Ines Morel'], ['nobody', 'Nobody inside helped']],
    how: [['phish', 'A phishing email with a fake login page'], ['reuse', 'Kai’s password leaked from another site, then MFA fatigue'],
      ['weak', 'Ben’s weak password was guessed'], ['usb', 'An infected USB stick']],
    evidence: [['note', 'What the ransom note says'], ['invite', 'Who invited the fake IT Support account'], ['backups', 'Who deleted the backups'],
      ['rant', 'Ben’s angry post about overtime'], ['approve', 'Kai approving the login at 02:13'], ['first', 'Which server was locked first']],
  },

  secret: { who: 2013308301, how: 788895187, evidence: 3038429432 },
};
