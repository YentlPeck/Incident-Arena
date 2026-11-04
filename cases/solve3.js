/* Family 3 reference solver. It reads ONLY what the apps show: the tables returned by
   PFCase3.views(C) (cell strings), never C.secret or generator fields.
   Studio rules (shown in the intro and the calendar app): every Hardware-room entry needs a booking of
   the badge holder; one Hardware-room booking per person per day; nobody is double-booked.
   Method: every Hardware-room door row on Friday after the morning shelf check is a moment the
   prototype could have left the room. Each one is explained by a second record or it is not:
     - a studio tour's route is at the "Hardware room corridor" within 5 minutes     -> a visitor slipped in
     - the badge holder's Hardware-room booking does not cover the time               -> took it home in a bag
     - the booking is a packing slot: the courier pickup handled by that person within 30 minutes
         quotes first a ticket that is open and not for the prototype                 -> harmless repair
         quotes first a closed ticket (or one for the prototype)                       -> fake pickup request
     - otherwise (a booked test)                                                       -> harmless
   Exactly one row must be unexplained. Evidence pairs: every logically sufficient pair (DESIGN-family3.md). */
'use strict';
const toMin = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
const PACK = 'Pack repair unit for courier';

function solve(V) {
  const door = V.door.rows.map((r) => ({ id: r.id, t: toMin(r.cells[0]), door: r.cells[1], person: r.cells[2] }));
  const cal = V.calendar.rows.map((r) => {
    const [a, b] = r.cells[0].split('–');
    const route = r.cells[4] ? r.cells[4].split(' → ').map((x) => ({ t: toMin(x.slice(0, 5)), place: x.slice(6) })) : [];
    return { id: r.id, start: toMin(a), end: toMin(b), title: r.cells[1], room: r.cells[2], people: r.cells[3].split(', '), route };
  });
  const chat = V.chat.rows.map((r) => ({ id: r.id, t: toMin(r.cells[0]), who: r.cells[1], text: r.cells[2] }));
  const courier = V.courier.rows.map((r) => ({ id: r.id, t: toMin(r.cells[0]), type: r.cells[1], company: r.cells[2], ref: r.cells[3].split(' ')[0], staff: r.cells[5] }));
  const visitors = V.visitors.rows.map((r) => ({ id: r.id, name: r.cells[0] }));
  const tickets = new Map(V.tickets.rows.map((r) => [r.cells[0], { id: r.id, item: r.cells[1], closed: r.cells[3] }]));
  const friCheck = V.checks.rows.find((r) => r.cells[0].startsWith(V.dates.fri) && /present/.test(r.cells[1]));
  const lastSeen = toMin(friCheck.cells[0].slice(-5));

  const verdicts = [];
  for (const d of door.filter((x) => x.door === 'Hardware room' && x.t > lastSeen)) {
    const tour = cal.find((c) => c.route.some((s) => s.place === 'Hardware room corridor' && Math.abs(s.t - d.t) <= 5));
    if (tour) {
      const stop = tour.route.find((s) => s.place === 'Hardware room corridor');
      const name = tour.title.slice('Studio tour: '.length, tour.title.lastIndexOf(' ('));
      const host = tour.people[0];
      const msg = chat.find((m) => m.who === host && m.t === stop.t && /Hardware room/.test(m.text));
      verdicts.push({ row: d.id, theft: 'visitor', who: name, flag2: visitors.find((v) => v.name === name).id, pairs: [[d.id, tour.id], [d.id, msg.id]] });
      continue;
    }
    const own = cal.filter((c) => c.room === 'Hardware room' && c.people.includes(d.person));
    const cover = own.find((c) => c.start <= d.t && d.t <= c.end);
    if (!cover) {
      const meet = cal.find((c) => c.room !== 'Hardware room' && !c.route.length && c.people.includes(d.person) && c.start <= d.t && d.t <= c.end);
      const msg = chat.find((m) => { if (m.who !== d.person) return false; const w = /(\d\d:\d\d)–(\d\d:\d\d)/.exec(m.text); return w && toMin(w[1]) <= d.t && d.t <= toMin(w[2]); });
      const exit = door.find((x) => x.door === 'Main exit' && x.person === d.person);
      const pairs = [meet && [d.id, meet.id], msg && [d.id, msg.id], ...own.map((b) => [d.id, b.id])].filter(Boolean);
      verdicts.push({ row: d.id, theft: 'bag', who: d.person, flag2: exit.id, pairs });
      continue;
    }
    if (cover.title === PACK) {
      const pick = courier.find((k) => k.type === 'Pickup' && k.staff === d.person && k.t >= d.t && k.t <= d.t + 30);
      const tk = pick && tickets.get(pick.ref);
      if (tk && tk.closed === '—' && tk.item !== 'Emberfall prototype') { verdicts.push({ row: d.id, theft: null, why: 'open repair ticket' }); continue; }
      verdicts.push({ row: d.id, theft: 'courier', who: pick.company, flag2: pick.id, pairs: [[pick.id, tk.id]] });
      continue;
    }
    verdicts.push({ row: d.id, theft: null, why: 'booked test' });
  }
  const thefts = verdicts.filter((v) => v.theft);
  const t = thefts[0] || {};
  const pairs = (t.pairs || []).map((p) => p.slice().sort()).sort((a, b) => (a.join() < b.join() ? -1 : 1));
  return { thefts: thefts.length, verdicts, layout: t.theft, who: t.who, flag1: t.row, flag2: t.flag2, pairs };
}
if (typeof module !== 'undefined' && module.exports) module.exports = { solve };
