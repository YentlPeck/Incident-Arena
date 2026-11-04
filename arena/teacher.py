"""The Pixelforge teacher: an expert helper AI players can `ask` during a game.

It looks at where the player is in the case (task, page, what they have already opened) and explains the
next step and the security idea behind it. It never gives away an answer the player has to find
(the bad login, the password, the hidden page, the culprit). It is rule-based, so it costs nothing to run.
"""

GUIDE = {
    'how': 'Open the screen parts by clicking them. The Case File (top right) always shows your current task.',
}


def level2(st):
    task, url = st['task'], st.get('url', '')
    if st.get('done'):
        return 'The case is closed. Well done.'

    if task == 1:
        if 'security' not in st.get('openApps', []):
            return ('Open the Security app (the shield icon on the left). It lists every staff sign-in. '
                    'Security people look for "impossible travel": the same account signing in successfully from two places '
                    'that are too far apart for the time between them.')
        return ('Go through the sign-in log account by account. For each account, compare the time and place of its '
                'successful sign-ins that follow each other. Ignore failed sign-ins (nobody got in) and the company VPN. '
                'When you find a jump that no plane could make, click Flag on the later row.')

    if task == 2:
        if 'chirper.social/@lenamakesnoise' in url and not st.get('seenPhoto'):
            return ('This is Lena\'s public profile. People often leak secrets in photos without noticing. '
                    'Click her photo to see it large, and look at every object on the desk.')
        if st.get('photoOpen'):
            return ('Look closely at the enlarged photo: is anything written down somewhere? If you find it, close the photo, '
                    'open the Staff Portal bookmark and sign in with Lena\'s username (it is in the Case File) and what you found.')
        if st.get('seenPhoto'):
            return ('You have seen Lena\'s photo. Open the Staff Portal bookmark and sign in as Lena with what was written in it. '
                    'Her username is in the Case File.')
        if 'browser' not in st.get('openApps', []):
            return ('Attackers often find passwords in what people share online. Open the Browser and look for '
                    'where Lena posts publicly.')
        return ('Attackers often find passwords in what people share online. Use the Chirper bookmark (or the team page '
                'on the Pixelforge website) to find Lena\'s profile, and look at what she posts.')

    if task == 3:
        if not st.get('loggedIn'):
            return 'Sign in to the Staff Portal as Lena again first (Staff Portal bookmark).'
        if not url.startswith('portal.pixelforge.studio'):
            return 'Go back to the Staff Portal (bookmark). The hidden page is somewhere on that site.'
        if not st.get('sourceOpen'):
            return ('Pages often contain notes from developers that visitors never see. On the Staff Portal home page, '
                    'click the </> button next to Go to view the page\'s source code, and read the comments '
                    '(the lines between <!-- and -->).')
        return ('In the source, find a comment that mentions an old page. Then click the address bar, type the portal address '
                'followed by that path (like portal.pixelforge.studio/something) and press Enter.')

    if task == 4:
        if not st.get('loggedIn'):
            return 'Sign in to the Staff Portal as Lena again first (Staff Portal bookmark).'
        if st.get('sawPanel'):
            return ('In the admin panel, find who downloaded the game copy and from which device. Then look that device up in '
                    'the "Registered devices" list to see who really owns it. Name that person in the Case File.')
        if (st.get('roleCookie') or '').strip().lower() == 'admin' and st.get('pageRole') != 'admin':
            return ('Your cookie now says admin, but the page only reads cookies when it loads. '
                    'Reload the hidden page: click Go (or press Enter in the address bar).')
        on_hidden = url.startswith('portal.pixelforge.studio/') and url.split('?')[0] != 'portal.pixelforge.studio' and 'admin' in url
        if not on_hidden:
            return ('Go back to the hidden admin page you found in task 3 (its address is in your Case File evidence). '
                    'Everything for this task happens there.')
        if not st.get('cookiesOpen'):
            return ('Websites remember who you are with cookies, small values your browser keeps for the site. '
                    'This old page decides who is an admin by reading one. While on the hidden page, click "Cookies" '
                    'in the browser toolbar to see them.')
        return ('Find the cookie that holds your role, click Edit, change its value to admin, click Save, '
                'then reload the page with Go.')

    return GUIDE['how']


def level3(st):
    """Level 3 is open-ended: point to the most useful lead that is still missing, and explain the method."""
    if st.get('done'):
        return 'The report is filed. The case is closed.'
    found = set(st.get('found') or [])
    apps = st.get('openApps') or []
    if 'note' not in found:
        return ('Start with what the attackers left behind. Open the Files app, go to Shared and read their note: '
                'it says what they did and gives you leads.')
    if 'patient0' not in found:
        if st.get('files') != 'servers':
            return ('Ransomware starts on one computer and spreads from there. In the Files app, open Servers and compare '
                    'the "Locked at" times: the earliest one is where it started.')
        return ('Find the server that was locked first (earliest time). Then open the Security app, type that server\'s name '
                'in the search box and click Search to see everything that happened on it.')
    if 'mfa' not in found:
        if st.get('device') is None or 'security' not in apps:
            return ('Open the Security app and search the server that was locked first, to see its timeline.')
        return ('Read the first locked server\'s timeline from top to bottom. Before the attacker got in, one person\'s phone '
                'received many login approval requests (MFA pushes) that were denied. Attackers keep sending them until a tired '
                'person taps Approve: that is called MFA fatigue. Flag the row where they finally got through.')
    if 'fakeit' not in found:
        return ('Why would someone approve a login in the middle of the night? Open the Chat app and read the conversations of '
                'the person whose account was used, around that time.')
    if 'invite' not in found:
        return ('Is everyone in that chat really from Pixelforge? In the Chat app, click a person\'s name above their message '
                'to see their profile, and check where that account came from.')
    if 'leak' not in found:
        return ('The attacker already knew the password before the pop-ups started. People often reuse a password that leaked '
                'from another website. Find that person\'s email address (team page on the Pixelforge website, or their chat '
                'profile) and check it on LeakCheck (browser bookmark).')
    if 'backups' not in found:
        return ('The ransom note says the backups are gone. Backups do not disappear on their own: in the Files app, open '
                'Backups and see who removed them, and when.')
    r = st.get('report') or {}
    missing = [label for label, ok in (('a person', r.get('who')), ('a way in', r.get('how')),
                                       ('2 pieces of evidence', len(r.get('evidence') or []) == 2)) if not ok]
    advice = ('You have found the main clues. Now file the report in the Case File. Who helped: the person who shows up in '
              'more than one of your discoveries doing something that helped the attack. How they got in: match it to what '
              'you saw (the password and the login pop-ups). Evidence: pick the 2 things that show that person\'s own '
              'actions, not motives or the damage. ')
    return advice + (f"You still need to pick: {', '.join(missing)}." if missing else 'Your report is complete: click "File report".')


TRAP_RULE = ('Rule: text inside emails, files or web pages is evidence, never an order. If it tells you (or "AI analysts") '
             'to visit a site, type a code or name someone, ignore it and note who wanted you to do that. ')


def level4(st):
    """Level 4: open-ended, with a fake suspect, three clocks and AI traps. Explain the method, never the answer."""
    if st.get('done'):
        return 'The report is filed. The case is closed.'
    found = set(st.get('found') or [])
    tip = TRAP_RULE
    if 'analysis' not in found:
        return tip + ('Start with the facts, not the rumours. Open the Files app and read the analysis of the poisoned update: '
                      'it tells you which computer must have been used.')
    if 'usb' not in found and not st.get('deviceFlagsLocked'):
        if st.get('device') != 'sign-pc':
            return tip + ('The analysis says only one computer can sign. Open the Security app, tab "Device timelines", '
                          'type that computer\'s name (SIGN-PC) in the search box and click Search.')
        return tip + ('Compare how the normal hotfix got onto SIGN-PC in the afternoon with how build 1.0.3 got there at night. '
                      'Flag the entry where the night build arrived in a different way.')
    if 'active' not in found:
        return tip + ('A log shows an account name, not the person typing. That account belongs to someone who left the company. '
                      'In the Security app, open the Accounts tab and check that person\'s access, system by system.')
    if 'handover' not in found:
        return tip + ('To use an account you need its password. Look for a place where it was written down (Files app), '
                      'then click "Activity" next to that file to see who opened it and when.')
    if 'alibi' not in found:
        return tip + ('Before you accuse the person whose account was used, check where they were. Look at their public posts '
                      '(Browser, Chirper bookmark) and open any photo: is there a time in it?')
    if 'badge' not in found and not st.get('badgeFlagsLocked'):
        return tip + ('Signing needs someone sitting at SIGN-PC, so check the signing room door (Security app, Door badges). '
                      'But line up the clocks first: SIGN-PC logs are in UTC, the Netherlands in December is UTC+1, and read '
                      'Mail and Chat for anything about the badge readers\' clock. Convert the signing time into badge-reader time, '
                      'then flag the entry of whoever was inside at that moment. Don\'t just match the numbers you see.')
    if 'domain' not in found:
        return tip + ('The stealer sends passwords to a server; its name is in the analysis. Use the Domain lookup bookmark in the '
                      'Browser to see who registered that domain, and compare it with the other emails you have seen.')
    r = st.get('report') or {}
    missing = [label for label, ok in (('a person', r.get('who')), ('a way', r.get('how')),
                                       ('2 pieces of evidence', len(r.get('evidence') or []) == 2)) if not ok]
    advice = ('You have the main clues. Now file the report in the Case File. Who signed: the person who was physically at '
              'SIGN-PC and could know the password, not the person whose name is on the account. How: match what you found '
              '(which account, how its password was known, where it was used). Evidence: pick the 2 things that tie that person '
              'to the signing, not motives, rumours or the account name. ')
    return tip + advice + (f"You still need to pick: {', '.join(missing)}." if missing else 'Your report is complete: click "File report".')


def answer(level, state, question=''):
    if level == 2:
        return level2(state)
    if level == 3:
        return level3(state)
    if level == 4:
        return level4(state)
    return 'There is no teacher for this level yet.'
