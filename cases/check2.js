/* node cases/check2.js [from] [to]
   Read-only generator and rendered-text audit; no external AI/player runs. */
'use strict';
const { generate } = require(require('path').resolve(process.env.GEN2 || require('path').join(__dirname, 'gen2.js')));
const { solve, text, iban, ibans, stamp, nearDomain } = require('./solve2.js');
const from = Number(process.argv[2] || 1), to = Number(process.argv[3] || 5000);
if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 1 || to < from) {
  console.error('Usage: node cases/check2.js [positive from] [to >= from]'); process.exit(2);
}
const layouts = ['insider', 'lookalike', 'mfa'];
const pairFor = { insider: ['changelog+ownership', 'ownership+payment'], lookalike: ['changelog+mail', 'mail+ownership'], mfa: ['auth+changelog', 'auth+ownership'] };
const problems = [], counts = {}, clocks = {}, plain = {}, sessionClocks = {}, shortcuts = {}, fingerprints = {}, positions = {}, commands = {};
// Round 5 preserves the Round 4 evidential policy (pf-audit4 findings 1a/1d/1e and 2):
// Invoice -> payment, invoice destination != current supplier master account,
// beneficiary holder != supplier, genuine-supplier complaint
// naming an unauthorized account, exact beneficiary director name + full home,
// and request -> destination are honest evidential routes. They may predict the
// answer; exact REQ/session joins corroborate them but are not mandatory gates
// on human reasoning. Full-name ownership is evidence, namesake/surname tricks
// are forbidden. Counts, order, timing gaps, formats and prominence never get
// this exemption. The solver still checks the full corroborated evidence pair.
// Once an unpaid invoice is known, an ordering-only probe's prior is 1 / that
// invoice's payment candidates, not 1 / all payments. Singleton invoices already
// identify their payment evidentially; do not mislabel that lookup an order leak.
// All invoices now have exactly one execution. The supplier's dated website
// schedule establishes authorization at that time. A legitimate collection
// company must be independent; a staff-owned paid beneficiary is insider evidence.
// The sole website mismatch and its paid-to-IBAN change are allowed evidence;
// time/age/preceding-change classifiers below may not use those account joins.
const conditional = {}, evidenceRules = {};
function probe(store, name, hit, prior) {
  const r=store[name] ||= {hits:0,n:0,prior:0}; r.hits+=+hit; r.n++; r.prior+=prior;
}
function round4Audit(C,S,seed) {
  const P=C.finance.payments.rows,H=C.finance.changes.rows;
  const u=C.emails.find(m=>/^Still unpaid:/.test(m.subject));
  const invoice=u.subject.match(/INV-\d+/)[0];
  const candidates=P.map((r,i)=>({r,i,t:stamp(r[0],C.finance.payments.tz)})).filter(x=>x.r[2]===invoice).sort((a,b)=>a.t-b.t);
  add(C.emails.length>=15&&C.emails.length<=17&&P.length===11&&H.length===14,seed,'Round 4 size budget');
  add(C.finance.suppliers.length>=3&&C.finance.suppliers.length<=4,seed,'Round 4 supplier budget');
  add(candidates.length===1&&candidates[0].i===S.paymentRow,seed,'unpaid invoice must have exactly one executed payment');
  add(new Set(P.map(p=>p[2])).size===P.length,seed,'each execution must have an independent invoice');
  add(P.every(p=>P.filter(q=>iban(p[6])===iban(q[6])).length===1),seed,'destination frequency imbalance');
  add(C.emails.filter(m=>/^(Still unpaid|Settlement confirmation):/.test(m.subject)).every(m=>ibans(m.body).length===0),seed,'complaint/confirmation account policy differs');
  const T=Object.fromEntries(C.security.tabs.map(t=>[t.id,t]));
  const accounts=T.accounts.accounts;
  const home=p=>accounts[p.id].find(r=>r[0]==='Home address')[1];
  for(const co of C.web.registry.companies) {
    const owner=C.staff.find(p=>p.name===co.director);
    if(owner)add(co.address===home(owner),seed,'staff director has namesake/different-unit address');
    else add(!C.staff.some(p=>p.name.split(' ').at(-1)===co.director.split(' ').at(-1)),seed,'non-staff director shares staff surname');
  }
  const paid=P[S.paymentRow],supplier=C.finance.suppliers.find(s=>s.id===paid[3]);
  const co=C.web.registry.companies.find(c=>c.id===C.web.banklookup[iban(paid[6])].companyId);
  const owner=C.staff.find(p=>p.name===co.director&&co.address===home(p));
  add(!!owner===(S.layout==='insider'),seed,'receiving staff ownership does not match route');
  probe(evidenceRules,'beneficiary full name AND home -> insider',!!owner===(S.layout==='insider'),0);
  if(owner)probe(evidenceRules,'beneficiary owner -> insider identity',owner.id===S.who,0);
  const requested=C.emails.some(m=>/^Bank details update /.test(m.subject)&&ibans(m.body).includes(iban(paid[6])));
  probe(evidenceRules,'request names incident destination -> lookalike',requested===(S.layout==='lookalike'),0);
  const mismatch=candidates.filter(x=>C.web.banklookup[iban(x.r[6])]?.holder!==supplier.name);
  probe(evidenceRules,'bank holder differs from supplier -> payment',mismatch.length===1&&mismatch[0].i===S.paymentRow,0);
  if(candidates.length>1) {
    const prior=1/candidates.length;
    for(const [name,x] of [['earlier',candidates[0]],['later',candidates.at(-1)]])probe(conditional,name+' invoice payment',x.i===S.paymentRow,prior);
    const singleton=candidates.filter(x=>P.filter(p=>iban(p[6])===iban(x.r[6])).length===1);
    probe(conditional,'unique singleton destination',singleton.length===1&&singleton[0].i===S.paymentRow,prior);
    for(const cutoff of [180,245,300,400,500,600]) {
      const xs=candidates.filter(x=>stamp(u.time,C.mailTz)-x.t>=cutoff);
      probe(conditional,'unique complaint gap >= '+cutoff,xs.length===1&&xs[0].i===S.paymentRow,prior);
    }
  }
}
// Independent website reader for consistency checks (not solve2.genuineAt).
function publishedAt(C,supplier,at) {
  const html=C.web.suppliers[supplier.domain].html;
  const rows=[...html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].flatMap(m=>{
    const cells=[...m[1].matchAll(/<td>([\s\S]*?)<\/td>/g)].map(x=>text(x[1]));
    return cells.length===2?[{t:stamp(cells[0],'UTC+1'),bank:ibans(cells[1])[0]}]:[];
  }).filter(x=>x.t<=at).sort((a,b)=>b.t-a.t);
  return rows[0]?.bank;
}
let crimeCases=0,ordinaryPayments=0,unusedWrongChanges=0;
function exactlyOneCrime(C,S,seed) {
  const P=C.finance.payments.rows,H=C.finance.changes.rows;
  const unauthorized=[];
  P.forEach((p,i)=>{
    const s=C.finance.suppliers.find(s=>s.id===p[3]),t=stamp(p[0],C.finance.payments.tz);
    const genuine=publishedAt(C,s,t);
    add(!!genuine,seed,'missing independently published account at payment time');
    if(iban(p[6])!==genuine)unauthorized.push(i); else {
      ordinaryPayments++;
      add(C.web.banklookup[iban(p[6])]?.holder===s.name,seed,'Round 6 genuine payment not to supplier itself');
    }
  });
  add(eq(unauthorized,[S.paymentRow]),seed,'exactly-one-crime: non-incident payment to non-genuine account');
  H.forEach((c,i)=>{
    if(c[3]!=='IBAN'||i===S.changeRow)return;
    const s=C.finance.suppliers.find(s=>s.id===c[2]),t=stamp(c[0],C.finance.changes.tz);
    if(iban(c[5])===publishedAt(C,s,t))return;
    const next=H.filter(h=>h[2]===c[2]&&h[3]==='IBAN'&&stamp(h[0],C.finance.changes.tz)>t)
      .sort((a,b)=>stamp(a[0],C.finance.changes.tz)-stamp(b[0],C.finance.changes.tz))[0];
    const end=next?stamp(next[0],C.finance.changes.tz):Infinity;
    add(!P.some(p=>p[3]===c[2]&&iban(p[6])===iban(c[5])&&stamp(p[0],C.finance.payments.tz)>=t&&stamp(p[0],C.finance.payments.tz)<end),seed,'non-incident wrong change used before reversion');
    unusedWrongChanges++;
  });
  crimeCases++;
}
// Independent Round 6 enumeration: consumes visible records only, with its own
// date, HTML, bank-history and ownership readers. Never calls solve/hypotheses.
function secondaryCrimes(C) {
  const plain=s=>String(s).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  const bank=s=>String(s).replace(/\s/g,'').toUpperCase();
  const minute=(value,zone)=>{
    const m=/(\d+) (\w+) (\d{4}) (\d\d):(\d\d)/.exec(value);
    const z=/UTC(?:([+-])(\d+))?/.exec(value)||/UTC(?:([+-])(\d+))?/.exec(zone);
    return m?Date.UTC(+m[3],['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(m[2]),+m[1],+m[4],+m[5])/60000-(z?.[1]?(z[1]==='+'?1:-1)*Number(z[2])*60:0):NaN;
  };
  const T=Object.fromEntries(C.security.tabs.map(t=>[t.id,t])),H=C.finance.changes.rows,P=C.finance.payments.rows;
  const result={nonGenuine:[],staffPaid:[],unsolicitedChanges:[],unsolicitedAccess:[],lookalikePaid:[],crimes:[]},keys=new Set();
  const changeAt=c=>minute(c[0],C.finance.changes.tz),paidAt=p=>minute(p[0],C.finance.payments.tz);
  const effective=p=>H.filter(c=>c[2]===p[3]&&c[3]==='IBAN'&&changeAt(c)<=paidAt(p)).sort((a,b)=>changeAt(b)-changeAt(a))[0];
  const flag=(category,p,c)=>{result[category].push(p?P.indexOf(p):H.indexOf(c));keys.add(c?'change:'+H.indexOf(c):'payment:'+P.indexOf(p));};
  const owner=account=>{
    const hit=C.web.banklookup[bank(account)],co=C.web.registry.companies.find(c=>c.id===hit?.companyId&&c.name===hit.holder);
    // Even a staff-name affiliation without a matching home may never be paid.
    return co&&C.staff.some(s=>s.name===co.director);
  };
  for(const p of P.filter(p=>p[5]==='Executed')) {
    const supplier=C.finance.suppliers.find(s=>s.id===p[3]),html=C.web.suppliers[supplier.domain].html;
    const rows=[...html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(m=>[...m[1].matchAll(/<td>([\s\S]*?)<\/td>/g)].map(x=>plain(x[1]))).filter(c=>c.length===2);
    const history=rows.map(r=>({at:minute(r[0],'UTC+1'),iban:bank(r[1])})).filter(r=>r.at<=paidAt(p)).sort((a,b)=>b.at-a.at);
    if(!history.length||history[0].iban!==bank(p[6]))flag('nonGenuine',p,effective(p));
    if(owner(p[6]))flag('staffPaid',p,effective(p));
  }
  for(const person of C.staff)for(const session of T.signins.byUser[person.user]||[]) {
    if(session[5]!=='Success')continue;
    const approved=(T.mfa.byUser[person.user]||[]).some(r=>r[1]===session[4]&&r[2]==='Approved');
    const unsolicited=C.chats.flatMap(ch=>ch.msgs).some(m=>m[0]===person.name&&m[2].includes(session[4])&&/did not initiate a sign-in/.test(m[2]));
    if(approved&&unsolicited) {
      result.unsolicitedAccess.push(session[1]);
      const uses=H.filter(c=>c[6]===person.user&&c[7]===session[1]&&/IBAN|bank|contact|email|phone|address/i.test(c[3]));
      if(!uses.length)keys.add('access:'+session[1]);
      for(const c of uses)flag('unsolicitedChanges',null,c);
    }
  }
  for(const m of C.emails) {
    const supplier=C.finance.suppliers.find(s=>plain(m.body).includes(s.id));
    if(!supplier||m.addr.split('@').pop()===supplier.domain)continue;
    const refs=plain(m.body).match(/\bREQ-\d{4}\b/g)||[],requested=[...String(m.body).matchAll(/<b>([A-Z]{2}\d{2}(?: [A-Z0-9]+)+)<\/b>/g)].map(x=>bank(x[1]));
    for(const c of H.filter(c=>c[2]===supplier.id&&refs.some(r=>c[8].includes(r))&&requested.includes(bank(c[5])))) {
      for(const i of result.nonGenuine)if(P[i][3]===supplier.id&&bank(P[i][6])===bank(c[5])&&effective(P[i])===c)flag('lookalikePaid',P[i],c);
    }
  }
  result.crimes=[...keys];return result;
}
let secondaryCases=0,secondaryMutations=0;
const crimeTotals={nonGenuine:0,staffPaid:0,unsolicitedChanges:0,lookalikePaid:0};
function noSecondaryCrimeAudit(C,S,seed) {
  const visible=JSON.parse(JSON.stringify(C));delete visible.secret;delete visible.twists;delete visible.traps;
  const r=secondaryCrimes(visible);
  add(eq(r.crimes,['change:'+S.changeRow]),seed,'Round 6: secondary crime or missing incident: '+JSON.stringify(r));
  add(eq(r.nonGenuine,[S.paymentRow]),seed,'Round 6: non-genuine payment enumeration');
  add(eq(r.staffPaid,S.layout==='insider'?[S.paymentRow]:[]),seed,'Round 6: staff affiliation received non-incident money');
  add(eq(r.unsolicitedChanges,S.layout==='mfa'?[S.changeRow]:[]),seed,'Round 6: non-incident unsolicited approval changed important data');
  add(eq(r.lookalikePaid,S.layout==='lookalike'?[S.paymentRow]:[]),seed,'Round 6: non-incident lookalike request paid a non-genuine IBAN');
  const T=Object.fromEntries(C.security.tabs.map(t=>[t.id,t]));
  const cos=C.web.registry.companies,home=p=>T.accounts.accounts[p.id].find(r=>r[0]==='Home address')[1];
  add(new Set([...C.staff.map(p=>p.name),...cos.map(c=>c.director)].map(s=>s.length)).size===1,seed,'Round 6 person name length imbalance');
  for(const part of [0,1])add(new Set([...C.staff.map(p=>p.name),...cos.map(c=>c.director)].map(s=>s.split(' ')[part].length)).size===1,seed,'Round 6 name component length imbalance');
  add(new Set([...C.staff.map(home),...cos.map(c=>c.address)].map(s=>s.length)).size===1,seed,'Round 6 address length imbalance');
  add(new Set(cos.map(c=>c.name.length)).size===1,seed,'Round 6 company name length imbalance');
  add(new Set(Object.keys(C.web.banklookup).map(s=>s.slice(0,2)+':'+s.length)).size===1,seed,'Round 6 IBAN country/length imbalance');
  for(const m of C.emails.filter(m=>/^Bank details update /.test(m.subject))) {
    const requested=ibans(m.body)[0],ref=text(m.body).match(/REQ-\d{4}/)[0];
    const acted=C.finance.changes.rows.filter(c=>c[8].includes(ref)&&iban(c[5])===requested);
    if(acted.length)add(S.layout==='lookalike'&&acted.length===1&&acted[0]===C.finance.changes.rows[S.changeRow],seed,'Round 6 acted-on decoy lookalike request');
    else add(!C.finance.payments.rows.some(p=>iban(p[6])===requested)&&!C.finance.changes.rows.some(c=>iban(c[5])===requested),seed,'Round 6 rejected requested account was changed or paid');
  }
  add(eq(r.unsolicitedAccess,S.layout==='mfa'?[C.finance.changes.rows[S.changeRow][7]]:[]),seed,'Round 7: successful unsolicited access outside the MFA incident');
  const approved=[];
  for(const p of C.staff)for(const prompt of T.mfa.byUser[p.user].filter(r=>r[2]==='Approved')) {
    const sign=T.signins.byUser[p.user].find(r=>r[4]===prompt[1]&&r[5]==='Success');
    const incident=S.layout==='mfa'&&sign?.[1]===C.finance.changes.rows[S.changeRow][7];
    if(!incident) {
      approved.push(prompt);
      add(sign?.[2]===p.pc&&prompt[3].includes(p.pc)&&/office/.test(prompt[3])&&/That was me, logging in for the payment run/.test(prompt[4]),seed,'Round 7 benign approval missing usual-device and inline user initiation');
    }
  }
  add(approved.length>=1&&approved.length<=2,seed,'Round 7 expected one or two successful benign approvals');
  add(C.chats.every(ch=>ch.msgs.every(m=>!/SES-\d+/.test(m[2]))),seed,'Round 7 session ID quoted in Chat');
  for(const m of C.emails.filter(m=>/^Bank details update /.test(m.subject))) {
    const requested=ibans(m.body)[0],ref=text(m.body).match(/REQ-\d+/)[0];
    const acted=C.finance.changes.rows.some(c=>c[8].includes(ref)&&iban(c[5])===requested);
    if(!acted) {
      const holder=C.web.banklookup[requested],co=cos.find(c=>c.id===holder?.companyId);
      add(!co||!C.staff.some(p=>p.name===co.director),seed,'Round 7 rejected lookalike request belongs to staff');
      add(/\[Reported to IT as suspicious\]/.test(m.body)&&/Phone verification: not from the supplier/.test(m.body),seed,'Round 7 missing inline rejection marker');
      add(C.finance.changes.rows.filter(c=>c[8].includes(ref)).every(c=>/phone check confirmed not from supplier|Scheduled supplier account rotation/.test(c[8])),seed,'Round 7 missing inline change explanation');
    }
  }
  for(const k of Object.keys(crimeTotals))crimeTotals[k]+=r[k].length;
  // Test each detector independently by planting a SECOND offense in a clone.
  if(!secondaryMutations) {
    const pi=C.finance.payments.rows.findIndex((p,i)=>i!==S.paymentRow),ci=C.finance.changes.rows.findIndex(c=>c[2]===C.finance.payments.rows[pi][3]&&iban(c[5])===iban(C.finance.payments.rows[pi][6]));
    const mutate=(category,edit)=>{const b=JSON.parse(JSON.stringify(visible));edit(b);add(secondaryCrimes(b)[category].some(i=>i===(category==='unsolicitedChanges'?ci:pi)),seed,'Round 6 independent detector failed injected '+category);secondaryMutations++;};
    mutate('nonGenuine',b=>{b.finance.payments.rows[pi][6]=Object.keys(b.web.banklookup).find(k=>k!==iban(b.finance.payments.rows[pi][6]));});
    mutate('staffPaid',b=>{const p=b.finance.payments.rows[pi],hit=b.web.banklookup[iban(p[6])];b.web.registry.companies.find(co=>co.id===hit.companyId).director=b.staff[0].name;});
    mutate('unsolicitedChanges',b=>{const c=b.finance.changes.rows[ci],p=b.staff.find(p=>p.user===c[6]);const ss=b.security.tabs.find(t=>t.id==='signins').byUser[p.user].find(s=>s[2]==='Web browser');ss[5]='Success';b.security.tabs.find(t=>t.id==='mfa').byUser[p.user].find(r=>r[1]===ss[4])[2]='Approved';c[7]=ss[1];});
    mutate('lookalikePaid',b=>{const c=b.finance.changes.rows[ci],p=b.finance.payments.rows[pi],s=b.finance.suppliers.find(s=>s.id===c[2]);p[6]=c[5]='BE00 0000 0000 0000';b.emails.push({addr:'accounts@fake.example',body:`${s.id} ${c[8].match(/REQ-\d{4}/)[0]} <b>${p[6]}</b>`});});
    const access=JSON.parse(JSON.stringify(visible)),person=access.staff.find(p=>access.security.tabs[0].byUser[p.user].some(r=>r[2]==='Web browser'&&r[5]==='Blocked'));
    const ss=access.security.tabs[0].byUser[person.user].find(r=>r[2]==='Web browser'&&r[5]==='Blocked');ss[5]='Success';access.security.tabs[1].byUser[person.user].find(r=>r[1]===ss[4])[2]='Approved';
    add(secondaryCrimes(access).crimes.includes('access:'+ss[1]),seed,'Round 7 independent detector missed reports-only unauthorized access');secondaryMutations++;

  }
  secondaryCases++;
}
// pf-audit5 attacks, generalized beyond the now-singleton invoice lookup.
// Extract from visible timestamps + invoice/supplier IDs ONLY. No IBAN values,
// authorization status, request, actor, session or beneficiary enters a model.
function timingCase(C) {
  const invoice=C.emails.find(m=>/^Still unpaid:/.test(m.subject)).subject.match(/INV-\d+/)[0];
  const P=C.finance.payments,H=C.finance.changes;
  const times=H.rows.map(h=>({supplier:h[2],t:stamp(h[0],H.tz)}));
  const ps=P.rows.map((p,i)=>{
    const t=stamp(p[0],P.tz),before=times.filter(h=>h.supplier===p[3]&&h.t<=t).sort((a,b)=>b.t-a.t);
    const after=times.filter(h=>h.supplier===p[3]&&h.t>t).sort((a,b)=>a.t-b.t);
    const office=((t+60)%1440+1440)%1440, gap=before.length?t-before[0].t:1e8;
    return {i,supplier:p[3],invoice:p[2],t,gap,office,overnight:office<720?office+1440:office,
      before:before.length,after:after.length,next:after.length?after[0].t-t:1e8,
      interval:before.length>1?before[0].t-before[1].t:1e8};
  });
  const supplier=ps.find(p=>p.invoice===invoice).supplier;
  return {ps,invoice,supplier};
}
function timingFeatures(p,ps) {
  const peers=ps.filter(q=>q.supplier===p.supplier),sorted=ps.slice().sort((a,b)=>a.t-b.t),local=peers.slice().sort((a,b)=>a.t-b.t);
  const rank=sorted.indexOf(p),lr=local.indexOf(p),q=n=>Math.round(n/5)*5;
  return [Math.floor(p.office/60),p.office%60,Math.floor(p.overnight/60),q(p.gap),+(p.before>0),
    p.before,p.after,q(p.next),q(p.interval),rank,lr,peers.length,
    Math.floor((p.t-sorted[0].t)/1440),Math.floor((p.t-local[0].t)/1440),
    rank/(ps.length-1||1),lr/(peers.length-1||1),
    q(rank?p.t-sorted[rank-1].t:1e8),q(rank+1<ps.length?sorted[rank+1].t-p.t:1e8),
    q(lr?p.t-local[lr-1].t:1e8),q(lr+1<peers.length?local[lr+1].t-p.t:1e8)];
}
function timingAudit() {
  const {treeFit,treeScore,nbFit,nbScore}=require('./check2-adversarial.js');
  const argmax=a=>a.reduce((j,v,i)=>v>a[j]?i:j,0),training=[];
  const row=seed=>{
    const C=generate(seed),truth=C.secret.paymentRow,change=C.secret.changeRow;
    delete C.secret;delete C.traps;delete C.twists;
    return {...timingCase(C),truth,change,changes:C.finance.changes};
  };
  // Exact audit5 split plus a disjoint training set for the requested ranges.
  // Never score a fitted classifier on its own training seeds.
  const external=[];
  for(let s=1;s<=4000;s++)training.push(row(s));
  for(let s=100001;s<=104000;s++)external.push(row(s));
  const ranges=[[4001,6000],[from,to]],summaries=[];
  for(const scope of ['invoice','supplier','all']) {
    const candidates=r=>r.ps.filter(p=>scope==='all'||(scope==='invoice'?p.invoice===r.invoice:p.supplier===r.supplier));
    for(let rangeIndex=0;rangeIndex<ranges.length;rangeIndex++) {
    const fitting=rangeIndex===0?training:external;
    const bestCenter=(centers,key)=>centers.reduce((best,c)=>{
      const hits=fitting.reduce((n,r)=>{const ps=candidates(r);return n+(ps[argmax(ps.map(p=>-Math.abs(p[key]-c)))].i===r.truth);},0);
      return hits>best.hits?{center:c,hits}:best;
    },{center:centers[0],hits:-1}).center;
    const clock=bestCenter(Array.from({length:145},(_,i)=>1200+5*i),'overnight');
    const gap=bestCenter(Array.from({length:61},(_,i)=>5*i),'gap');
    const rules={
      'pf-audit5 fixed clock 02:05':ps=>argmax(ps.map(p=>-Math.abs(p.overnight-1565))),
      'pf-audit5 trained overnight clock':ps=>argmax(ps.map(p=>-Math.abs(p.overnight-clock))),
      'pf-audit5 fixed gap 140':ps=>argmax(ps.map(p=>-Math.abs(p.gap-140))),
      'pf-audit5 trained preceding-change gap':ps=>argmax(ps.map(p=>-Math.abs(p.gap-gap))),
      'preceding-change presence':ps=>argmax(ps.map(p=>+(p.before>0))),
      'missing preceding change':ps=>argmax(ps.map(p=>+(p.before===0))),
      'earliest payment':ps=>argmax(ps.map(p=>-p.t)),
      'latest payment':ps=>argmax(ps.map(p=>p.t)),
      'shortest preceding gap':ps=>argmax(ps.map(p=>-p.gap)),
      'longest preceding gap':ps=>argmax(ps.map(p=>p.gap)),
    };
    if(scope!=='invoice') {
      const tr=fitting.flatMap(r=>candidates(r).map(p=>({x:timingFeatures(p,r.ps),y:+(p.i===r.truth)})));
      const tree=treeFit(tr,2,4),nb=nbFit(tr,2);
      rules['invoice-conditioned timing depth4-tree']= (ps,r)=>argmax(ps.map(p=>treeScore(tree,timingFeatures(p,r.ps))[1]));
      rules['invoice-conditioned timing NB']= (ps,r)=>argmax(ps.map(p=>{const a=nbScore(nb,timingFeatures(p,r.ps));return a[1]-a[0];}));
    }
    const range=ranges[rangeIndex];
    {
      const stats={};
      for(let seed=range[0];seed<=range[1];seed++) {
        const r=row(seed),ps=candidates(r);
        for(const [name,pick] of Object.entries(rules)) {
          const p=ps[pick(ps,r)],s=stats[name]||={hits:0,changeHits:0,n:0,prior:0};
          s.hits+=+(p.i===r.truth);s.n++;s.prior+=1/ps.length;
          const last=r.changes.rows.map((c,i)=>({c,i,t:stamp(c[0],r.changes.tz)}))
            .filter(h=>h.c[2]===p.supplier&&h.t<=p.t).sort((a,b)=>b.t-a.t)[0];
          s.changeHits+=+(last?.i===r.change);
        }
      }
      for(const [name,s] of Object.entries(stats)) {
        const prior=s.prior/s.n,accuracy=s.hits/s.n,changeAccuracy=s.changeHits/s.n,limit=Math.min(1,prior+.1);
        const label=`${range.join('..')} ${scope} / ${name}`;
        console.log(`ROUND5 timing ${label}: payment ${s.hits}/${s.n} ${pct(s.hits,s.n)}%; change ${s.changeHits}/${s.n} ${pct(s.changeHits,s.n)}%; prior ${(100*prior).toFixed(2)}%, limit ${(100*limit).toFixed(2)}%`);
        if(accuracy>limit||changeAccuracy>limit)problems.push('timing '+label+' exceeds conditional prior+10pp');
        summaries.push({range,training:rangeIndex===0?[1,4000]:[100001,104000],scope,name,clockCenter:clock,gapCenter:gap,...s,prior,accuracy,changeAccuracy,limit});
      }
    }
    }
  }
  if(process.env.PF_CASE2_TIMING_JSON)require('fs').writeFileSync(process.env.PF_CASE2_TIMING_JSON,JSON.stringify({training:[1,4000],features:20,results:summaries},null,2));
  return summaries;
}
let checked = 0, ambiguityChecks = 0, distributionChecks = 0, mutations = 0;
const shapes = {}, chainFacts = {}, oracleTraining = {}, oracleTests = [];
let visibleChainChecks = 0;
const bump = (obj, key, n = 1) => { obj[key] = (obj[key] || 0) + n; };
const add = (condition, seed, message) => { if (!condition) problems.push(`${seed}: ${message}`); };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const pct = (n, d) => d ? (100 * n / d).toFixed(2) : 'n/a';
const normalize = (s) => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
const emailHost = (m) => m.addr.split('@')[1];
function distribution(store, scope, feature, layout, value) {
  const name = `${scope} | ${feature}`;
  const bucket = ((store[name] ||= {})[layout] ||= {});
  bump(bucket, String(value));
}
const shape = (value) => String(value).replace(/[0-9]/g, '9').replace(/[A-Z]/g, 'A').replace(/[a-z]/g, 'a').replace(/([9Aa])\1+/g, '$1');
function fingerprint(scope, field, value, layout, legitimateChainFact = false) {
  if (typeof value !== 'string') return;
  const store = legitimateChainFact ? chainFacts : shapes;
  distribution(store, scope, `${field}:SHAPE`, layout, shape(value));
  for (const token of value.split(/\s+/).filter(Boolean)) distribution(store, scope, `${field}:TOKEN`, layout, shape(token));
}
// Only these three fields on the EXACT session joined from the change record
// are intended evidence. We still measure/report their raw shapes. They are
// checked by the visible-chain assertions and destructive join mutations below.
// Neighborhood sign-in oracles do not use that join and have no exemptions.
const chainColumns = new Set(['Device', 'Location / IP', 'MFA challenge']);
function shapeAudit(C) {
  const layout = C.secret.layout, change = C.finance.changes.rows[C.secret.changeRow];
  const payment = C.finance.payments.rows[C.secret.paymentRow];
  for (const [name, log] of Object.entries(C.finance)) {
    if (Array.isArray(log)) {
      for (const row of log) for (const [field, value] of Object.entries(row)) fingerprint(`all finance ${name}`, field, value, layout);
    } else {
      for (const row of log.rows) row.forEach((v, i) => fingerprint(`all finance ${name}`, log.columns[i], v, layout));
      const target = name === 'changes' ? change : payment;
      target.forEach((v, i) => fingerprint(`target ${name}`, log.columns[i], v, layout));
      const hour = new Date((stamp(target[0], log.tz) + 60) * 60000).getUTCHours();
      distribution(shapes, `target ${name}`, 'office hour', layout, hour);
      distribution(shapes, `target ${name}`, 'night (20..06)', layout, hour >= 20 || hour < 6);
    }
  }
  for (const tab of C.security.tabs) {
    const rows = tab.byUser ? Object.values(tab.byUser).flat() : Object.values(tab.accounts).flat();
    for (const row of rows) row.forEach((v, i) => fingerprint(`all security ${tab.id}`, tab.columns?.[i] || ['Field', 'Value'][i], v, layout));
  }
  const signins = C.security.tabs.find((t) => t.id === 'signins');
  const mfa = C.security.tabs.find((t) => t.id === 'mfa');
  const session = signins.byUser[change[6]].find((r) => r[1] === change[7]);
  session.forEach((v, i) => fingerprint('target session', signins.columns[i], v, layout, chainColumns.has(signins.columns[i])));
  // All layouts contain the same nearby challenge episode. Also measure the
  // actual linked challenge when there is one; its presence is intended evidence.
  const nearby = signins.byUser[change[6]].find((r) => r[2] === 'Web browser' && /cloud server/.test(r[3]));
  const challenge = mfa.byUser[change[6]].find((r) => r[1] === nearby[4]);
  challenge.forEach((v, i) => fingerprint('nearby approved challenge', mfa.columns[i], v, layout));
  if (session[4] !== 'Existing trusted device') {
    const linked = mfa.byUser[change[6]].find((r) => r[1] === session[4]);
    linked.forEach((v, i) => fingerprint('target linked challenge', mfa.columns[i], v, layout, true));
  }
  for (const mail of C.emails) {
    for (const field of ['name', 'addr', 'to', 'time', 'subject']) fingerprint('all mail', field, mail[field], layout);
    for (const token of text(mail.subject + ' ' + mail.body).match(/\b(?:REQ|INV|SES|CH|CHG|PAY|SUP|EU)-[A-Za-z0-9-]+\b/g) || [])
      fingerprint('all mail', 'reference tokens', token, layout);
  }
  for (const [host, rows] of Object.entries(C.web.whois)) {
    fingerprint('all whois', 'host', host, layout);
    for (const [field, value] of rows) fingerprint('all whois', field, value, layout);
  }
  for (const row of C.web.registry.companies) for (const [field, value] of Object.entries(row)) fingerprint('all registry', field, value, layout);
  for (const [account, row] of Object.entries(C.web.banklookup)) {
    fingerprint('all banklookup', 'IBAN', account, layout);
    for (const [field, value] of Object.entries(row)) fingerprint('all banklookup', field, value, layout);
  }
}
function oracleFeatures(C) {
  const features = {};
  for (const name of ['changes', 'payments']) {
    const log = C.finance[name], row = log.rows[C.secret[name === 'changes' ? 'changeRow' : 'paymentRow']];
    row.forEach((value, i) => {
      const key = `${name}.${log.columns[i]}`;
      features[`${key}:value`] = value; features[`${key}:shape`] = shape(value);
      // Components expose semantic suffixes even when complete random/seed IDs
      // are unique and a whole-value holdout learner cannot memorize them.
      features[`${key}:tokens`] = value.split(/\s+|-/).map((t) => /\d/.test(t) ? shape(t) : t).join('|');
      if (i === 0) {
        const d = new Date((stamp(value, log.tz) + 60) * 60000), hour = d.getUTCHours();
        features[`${key}:office hour`] = String(hour);
        features[`${key}:office minute`] = String(d.getUTCMinutes());
        features[`${key}:night`] = String(hour >= 20 || hour < 6);
      }
    });
  }
  const change = C.finance.changes.rows[C.secret.changeRow], tab = C.security.tabs.find((t) => t.id === 'signins');
  const near = tab.byUser[change[6]].filter((r) => Math.abs(stamp(r[0], tab.tz) - stamp(change[0], C.finance.changes.tz)) <= 120);
  for (const i of [2, 3]) {
    const values = near.map((r) => r[i]).sort();
    features[`nearby signins.${tab.columns[i]}:value`] = JSON.stringify(values);
    features[`nearby signins.${tab.columns[i]}:shape`] = JSON.stringify(values.map(shape).sort());
    // Test individual time-ordered rows as well as the whole neighborhood.
    near.forEach((r, n) => {
      features[`nearby signins[${n}].${tab.columns[i]}:value`] = r[i];
      features[`nearby signins[${n}].${tab.columns[i]}:shape`] = shape(r[i]);
    });
  }
  return features;
}
function validIban(raw) {
  const lengths = { NL: 18, BE: 16, DE: 22, FR: 27 };
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(raw) || raw.length !== lengths[raw.slice(0, 2)]) return false;
  let rem = 0;
  for (const c of (raw.slice(4) + raw.slice(0, 4)).replace(/[A-Z]/g, (x) => String(x.charCodeAt(0) - 55))) rem = (rem * 10 + Number(c)) % 97;
  return rem === 1;
}

// Separate exhaustive audit over rendered facts: no solver branch helper, no hidden fields.
// This deliberately does not stop after the first positive branch.
function auditRendered(C) {
  const answers = [];
  const visibleInvoice = [...new Set(C.emails.filter((m) => /unpaid/i.test(text(m.body))).flatMap((m) => text(m.body).match(/INV-\d{4}/g) || []))];
  const tabs = Object.fromEntries(C.security.tabs.map((t) => [t.id, t]));
  const lifetime = Number(/sessions expire exactly (\d+) minutes/i.exec(C.files.map((f) => text(f.text)).join(' '))?.[1]);
  for (let pi = 0; pi < C.finance.payments.rows.length; pi++) {
    const p = C.finance.payments.rows[pi];
    if (!visibleInvoice.includes(p[2]) || p[5] !== 'Executed') continue;
    const supplier = C.finance.suppliers.find((s) => s.id === p[3]);
    if (!supplier || !C.emails.some((m) => emailHost(m) === supplier.domain && /unpaid/i.test(text(m.body)))) continue;
    const genuine = publishedAt(C,supplier,stamp(p[0],C.finance.payments.tz));
    if (iban(p[6]) === genuine) continue;
    const before = C.finance.changes.rows.map((r, i) => ({ r, i, t: stamp(r[0], C.finance.changes.tz) }))
      .filter((x) => x.r[2] === p[3] && x.r[3] === 'IBAN' && x.t <= stamp(p[0], C.finance.payments.tz)).sort((a, b) => b.t - a.t);
    if (!before.length || iban(before[0].r[5]) !== iban(p[6])) continue;
    const { r: c, i: ci, t: when } = before[0];
    const person = C.staff.find((s) => s.user === c[6]);
    if (!person) continue;
    const sessions = (tabs.signins.byUser[person.user] || []).filter((s) => s[1] === c[7] && s[5] === 'Success' && stamp(s[0], tabs.signins.tz) <= when && when - stamp(s[0], tabs.signins.tz) < lifetime);
    if (sessions.length !== 1) continue;
    const s = sessions[0];
    const own = s[2] === person.pc && /office/i.test(s[3]) && s[4] === 'Existing trusted device';
    const base = { paymentRow: pi, changeRow: ci };
    const receiving = C.web.banklookup[iban(c[5])];
    const owner = receiving && C.web.registry.companies.find((co) => co.id === receiving.companyId && normalize(co.name) === normalize(receiving.holder));
    const home = tabs.accounts.accounts[person.id].find((x) => x[0] === 'Home address')[1];
    if (own && owner && normalize(owner.director) === normalize(person.name) && normalize(owner.address) === normalize(home))
      answers.push({ ...base, who: person.id, how: 'self', evidence: [...pairFor.insider] });
    const refs = c[8].match(/REQ-[A-Z0-9-]+/g) || [];
    const matchingMails = C.emails.filter((m) => own && m.to === person.email && emailHost(m) !== supplier.domain &&
      nearDomain(emailHost(m), supplier.domain) && C.web.whois[emailHost(m)] && text(m.body).includes(supplier.id) &&
      refs.some((ref) => new RegExp(`\\b${ref}\\b`).test(text(m.body))) && ibans(m.body).includes(iban(c[5])) && stamp(m.time, C.mailTz) <= when);
    if (matchingMails.length === 1) answers.push({ ...base, who: 'outsider', how: 'lookalike', evidence: [...pairFor.lookalike] });
    const approvals = tabs.mfa.byUser[person.user].filter((m) => m[1] === s[4] && m[2] === 'Approved' && m[3] === s[3] &&
      stamp(m[0], tabs.mfa.tz) <= stamp(s[0], tabs.signins.tz) && stamp(s[0], tabs.signins.tz) - stamp(m[0], tabs.mfa.tz) <= 5);
    const chat = C.chats.flatMap((c2) => c2.msgs).some((m) => m[0] === person.name && /did not initiate a sign-in/i.test(m[2]) && m[2].includes(s[4]) &&
      approvals.some((a) => stamp(m[1], C.chatTz) >= stamp(a[0], tabs.mfa.tz) && stamp(m[1], C.chatTz) - stamp(a[0], tabs.mfa.tz) <= 90));
    const burst = approvals.some((a) => tabs.mfa.byUser[person.user].filter((m) => m[2] === 'Denied' && m[3] === a[3] && stamp(m[0], tabs.mfa.tz) < stamp(a[0], tabs.mfa.tz) && stamp(a[0], tabs.mfa.tz) - stamp(m[0], tabs.mfa.tz) <= 10).length >= 2);
    if (s[2] === 'Web browser' && /cloud server/i.test(s[3]) && approvals.length === 1 && burst && chat)
      answers.push({ ...base, who: 'outsider', how: 'mfa', evidence: [...pairFor.mfa] });
  }
  return answers;
}

for (let seed = from; seed <= to; seed++) {
  try {
    const C = generate(seed), S = C.secret, layout = S.layout;
    shapeAudit(C); round4Audit(C,S,seed); exactlyOneCrime(C,S,seed); noSecondaryCrimeAudit(C,S,seed);
    const visible = Object.fromEntries(Object.entries(C).filter(([k]) => k !== 'secret' && k !== 'twists'));
    const guarded = new Proxy(visible, { get(target, key) { if (key === 'secret' || key === 'twists') throw Error(`solver accessed ${key}`); return target[key]; } });
    const answer = solve(guarded);
    checked++; bump(counts, layout);
    add(answer.ok && ['who', 'how', 'paymentRow', 'changeRow', 'evidence'].every((key) => eq(answer[key], S[key])), seed, `solver mismatch: ${JSON.stringify(answer)}`);
    const all = auditRendered(visible); ambiguityChecks++;
    add(all.length === 1 && ['who', 'how', 'paymentRow', 'changeRow', 'evidence'].every((k) => eq(all[0]?.[k], S[k])), seed, `rendered hypotheses: ${JSON.stringify(all)}`);
    add(eq(generate(seed), C), seed, 'not deterministic');
    const sloppy = solve(guarded, { naive: true });
    const clockBucket = (C.twists.includes('clocks') ? clocks : plain)[layout] ||= [0, 0];
    clockBucket[0] += !sloppy.ok || ['who', 'how', 'paymentRow', 'changeRow', 'evidence'].some((k) => !eq(sloppy[k], S[k])) ? 1 : 0; clockBucket[1]++;
    if (C.twists.includes('clocks')) {
      // Correct only the payment display for a naive reader. Session/expiry clocks must
      // independently matter, rather than all failures being invoice timestamp failures.
      const aligned = JSON.parse(JSON.stringify(visible));
      aligned.finance.payments.rows.forEach((p) => {
        const d = new Date((stamp(p[0], C.finance.payments.tz) + 60) * 60000);
        p[0] = `${d.getUTCDate()} ${['Jan', 'Feb', 'Mar'][d.getUTCMonth()]} ${d.getUTCFullYear()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
      });
      const ablated = solve(aligned, { naive: true });
      const sessionBucket = (sessionClocks[layout] ||= [0, 0]);
      sessionBucket[0] += ablated.ok ? 0 : 1; sessionBucket[1]++;
    }

    const unique = (xs, label) => add(new Set(xs).size === xs.length, seed, `duplicate ${label}`);
    ['id', 'name', 'user', 'email', 'handle', 'pc'].forEach((k) => unique(C.staff.map((s) => s[k]), `staff ${k}`));
    unique(C.emails.map((m) => m.id), 'mail ID'); unique(C.chats.map((x) => x.id), 'chat ID'); unique(C.files.map((x) => x.id), 'file ID');
    unique(C.finance.suppliers.map((s) => s.id), 'supplier ID'); unique(C.finance.suppliers.map((s) => s.domain), 'supplier domain');
    add(C.staff.length >= 10 && C.staff.length <= 12 && C.staff.filter((s) => s.dept === 'Finance').length >= 3 && C.staff.filter((s) => s.dept === 'Finance').length <= 5, seed, 'staff/finance size');
    const tabs = Object.fromEntries(C.security.tabs.map((t) => [t.id, t]));
    const allSigns = Object.values(tabs.signins.byUser).flat(), allMfa = Object.values(tabs.mfa.byUser).flat();
    unique(allSigns.map((r) => r[1]), 'session ID'); unique(allMfa.map((r) => r[1]), 'challenge ID');
    unique(C.finance.payments.rows.map((r) => r[1]), 'payment ID'); unique(C.finance.changes.rows.map((r) => r[1]), 'change ID');
    unique(C.web.registry.companies.map((co) => co.id), 'registry ID'); unique(C.web.registry.companies.map((co) => co.name), 'company name');
    const hosts = [C.web.company.host, ...Object.keys(C.web.suppliers), ...Object.keys(C.web.pages), 'domaininfo.net', 'companyregister.eu', 'ibancheck.eu', 'chirper.social'];
    unique(hosts, 'host definitions');
    const hostSet = new Set(hosts);
    for (const [host] of C.bookmarks) add(hostSet.has(host), seed, `bookmark host missing: ${host}`);
    for (const host of Object.keys(C.web.whois)) add(hostSet.has(host), seed, `whois host missing: ${host}`);
    for (const m of C.emails) {
      add(hostSet.has(emailHost(m)), seed, `mail host missing: ${emailHost(m)}`);
      add(C.staff.some((s) => s.email === m.to), seed, 'mail recipient missing');
      add(Number.isFinite(stamp(m.time, C.mailTz)), seed, 'mail timestamp invalid');
    }
    const rawVisible = JSON.stringify(visible);
    for (const match of rawVisible.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) add(hostSet.has(match[1]), seed, `URL host missing: ${match[1]}`);
    function walk(value, path = 'CASE2') {
      add(value !== undefined && !(typeof value === 'number' && !Number.isFinite(value)), seed, `invalid value at ${path}`);
      if (typeof value === 'string') add(!/\bundefined\b|\bNaN\b|\[object/.test(value), seed, `bad rendered string at ${path}`);
      if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => walk(v, `${path}.${k}`));
    }
    walk(C);
    add(eq(C.twists, [...new Set(C.twists)].sort()) && C.twists.length === 2 && C.twists.every((t) => ['clocks', 'trap', 'tip', 'noise'].includes(t)), seed, 'invalid twists');
    add(C.family === 'invoice' && C.name === 'The fake invoice' && C.web.company.host === 'pixelforge.studio', seed, 'case identity');
    add(C.milestones.map((m) => m.id).join(',') === 'payment,change,who,how,evidence', seed, 'milestone IDs');
    ['who', 'how', 'evidence'].forEach((k) => unique(C.report[k].map((r) => r[0]), `report ${k}`));
    add(eq([...C.report.who.map((x) => x[0])].sort(), [...C.staff.map((s) => s.id), 'outsider'].sort()), seed, 'who report choices');
    add(eq(C.report.how.map((x) => x[0]).sort(), ['self', 'lookalike', 'mfa', 'phish', 'reuse'].sort()), seed, 'how report choices');
    add(eq(C.report.evidence.map((x) => x[0]), ['auth', 'changelog', 'chat', 'mail', 'ownership', 'payment', 'tip', 'whois']), seed, 'evidence report IDs/order');
    add(eq(S.evidence, pairFor[layout]) && S.evidence.every((p) => p === p.split('+').sort().join('+') && p.split('+').every((id) => C.report.evidence.some((x) => x[0] === id))), seed, 'invalid evidence pair');
    add(C.report.who.some((x) => x[0] === S.who) && C.report.how.some((x) => x[0] === S.how), seed, 'answer absent from report');
    const banks = Object.entries(C.web.banklookup);
    unique(banks.map(([raw]) => iban(raw)), 'IBAN definitions');
    for (const [raw, b] of banks) {
      add(raw === iban(raw) && validIban(raw), seed, `bad IBAN: ${raw}`);
      add(C.web.registry.companies.some((co) => co.id === b.companyId && co.name === b.holder), seed, 'bank/company link broken');
    }
    const finance = C.staff.filter((s) => s.dept === 'Finance');
    for (const s of C.staff) {
      const signs = tabs.signins.byUser[s.user], prompts = tabs.mfa.byUser[s.user];
      add(Array.isArray(signs) && Array.isArray(prompts) && Array.isArray(tabs.accounts.accounts[s.id]), seed, `missing security record: ${s.user}`);
      for (const r of signs) {
        add(r.length === tabs.signins.columns.length && Number.isFinite(stamp(r[0], tabs.signins.tz)), seed, 'bad sign-in row');
        if (r[4] !== 'Existing trusted device') add(prompts.some((p) => p[1] === r[4] && p[2] === (r[5]==='Success'?'Approved':'Denied') && p[3] === r[3] && stamp(p[0], tabs.mfa.tz) <= stamp(r[0], tabs.signins.tz)), seed, 'sign-in/approval link broken');
      }
      for (const r of prompts) add(r.length === tabs.mfa.columns.length && Number.isFinite(stamp(r[0], tabs.mfa.tz)), seed, 'bad MFA row');
    }
    const isNight = (r) => { const h = new Date((stamp(r[0], tabs.mfa.tz) + 60) * 60000).getUTCHours(); return r[2] === 'Approved' && (h >= 20 || h < 6); };
    add(allMfa.filter(isNight).length===2, seed, 'Round 7 expected exactly two night approvals');
    add(allMfa.some((m) => m[2] === 'Denied'), seed, 'denied burst missing');
    for (const supplier of C.finance.suppliers) {
      const firstChange=C.finance.changes.rows.filter(r=>r[2]===supplier.id).sort((a,b)=>stamp(a[0],C.finance.changes.tz)-stamp(b[0],C.finance.changes.tz))[0];
      const initial = iban(firstChange[4]);
      let account = initial;
      const rows = C.finance.changes.rows.filter((r) => r[2] === supplier.id).sort((a, b) => stamp(a[0], C.finance.changes.tz) - stamp(b[0], C.finance.changes.tz));
      const fields = {};
      for (const r of rows) {
        const actor = C.staff.find((s) => s.user === r[6]);
        const session = actor && tabs.signins.byUser[actor.user].find((s) => s[1] === r[7]);
        add(r.length === C.finance.changes.columns.length && ['IBAN', 'Contact email', 'Phone', 'Address', 'Payment terms'].includes(r[3]), seed, 'change field/columns');
        add(r[4] !== r[5], seed, `no-op change ${r[1]} (${r[3]})`);
        add(fields[r[3]] === undefined || fields[r[3]] === r[4], seed, 'change field continuity');
        fields[r[3]] = r[5];
        add(actor?.dept === 'Finance' && !!session && stamp(session[0], tabs.signins.tz) <= stamp(r[0], C.finance.changes.tz) && stamp(r[0], C.finance.changes.tz) - stamp(session?.[0] || '', tabs.signins.tz) < 120, seed, 'change session invalid/expired');
        if (r[3] === 'IBAN') {
          add(iban(r[4]) === account, seed, 'change IBAN continuity');
          for (const value of [r[4], r[5]]) add(C.web.banklookup[iban(value)] && value === iban(value).match(/.{1,4}/g).join(' '), seed, 'change IBAN missing/unreadable');
          account = iban(r[5]);
        }
      }
      add(account === iban(supplier.ibanOnFile), seed, 'current supplier master inconsistent');
      for (const p of C.finance.payments.rows.filter((r) => r[3] === supplier.id && r[5] === 'Executed')) {
        const prior = rows.filter((r) => r[3] === 'IBAN' && stamp(r[0], C.finance.changes.tz) <= stamp(p[0], C.finance.payments.tz)).pop();
        add(p.length === C.finance.payments.columns.length && iban(p[6]) === (prior ? iban(prior[5]) : initial), seed, 'executed payment differs from effective master');
      }
    }
    const targetChange = C.finance.changes.rows[S.changeRow], targetPayment = C.finance.payments.rows[S.paymentRow];
    add(!!targetChange && !!targetPayment && targetPayment[5] === 'Executed', seed, 'flag rows invalid');
    const changer = C.staff.find((s) => s.user === targetChange[6]);
    const receiver = C.web.registry.companies.find((co) => co.id === C.web.banklookup[iban(targetPayment[6])].companyId);
    const lookMails = C.emails.filter((m) => C.finance.suppliers.some((s) => emailHost(m) !== s.domain && nearDomain(emailHost(m), s.domain)) && /REQ-/.test(text(m.body)));
    add(lookMails.length >= 1 && lookMails.every((m) => !!C.web.whois[emailHost(m)]), seed, 'look-alike decoy missing');
    const exactRequests = lookMails.filter((m) => m.to === changer.email && text(m.body).includes(targetChange[2]) && ibans(m.body).includes(iban(targetChange[5])) &&
      (targetChange[8].match(/REQ-[A-Z0-9-]+/g) || []).some((r) => new RegExp(`\\b${r}\\b`).test(text(m.body))));
    add(exactRequests.length === (layout === 'lookalike' ? 1 : 0), seed, 'request decoy fails at wrong link');
    const approvalSession = tabs.signins.byUser[changer.user].find((r) => r[1] === targetChange[7]);
    add((approvalSession[2] === 'Web browser') === (layout === 'mfa'), seed, 'night-approval decoy fails at wrong session link');
    if (layout === 'mfa') {
      add(/cloud server/.test(approvalSession[3]) && /^CH-\d{7}$/.test(approvalSession[4]) && tabs.mfa.byUser[changer.user].some((r) => r[1] === approvalSession[4] && r[2] === 'Approved' && r[3] === approvalSession[3]), seed, 'MFA chain is not visible in session/challenge/cloud records');
    } else add(approvalSession[2] === changer.pc && /office|home/i.test(approvalSession[3]) && approvalSession[4] === 'Existing trusted device', seed, 'ordinary target session missing');
    visibleChainChecks++;
    // Fixed shapes apply to ALL records, including decoy references and invoices.
    for (const [prefix, values, width] of [
      ['SES', allSigns.map((r) => r[1]), 7], ['CH', allMfa.map((r) => r[1]), 7],
      ['CHG', C.finance.changes.rows.map((r) => r[1]), 7], ['PAY', C.finance.payments.rows.map((r) => r[1]), 7],
      ['SUP', C.finance.suppliers.map((r) => r.id), 7], ['EU', C.web.registry.companies.map((r) => r.id), 7],
      ['INV', C.finance.payments.rows.map((r) => r[2]), 4],
      ['REQ', rawVisible.match(/REQ-[A-Za-z0-9-]+/g) || [], 4],
    ]) for (const value of values) add(new RegExp(`^${prefix}-\\d{${width}}$`).test(value), seed, `non-opaque ${prefix} shape: ${value}`);
    add((receiver.director === changer.name && receiver.address === tabs.accounts.accounts[changer.id].find((r) => r[0] === 'Home address')[1]) === (layout === 'insider'), seed, 'ownership decoy fails at wrong identity link');
    add(C.web.registry.companies.some((co) => co.id !== receiver.id && C.staff.some((s) => co.director === s.name && co.address === tabs.accounts.accounts[s.id].find((a) => a[0] === 'Home address')[1]) && co.id !== C.web.banklookup[iban(targetPayment[6])].companyId), seed, 'unrelated staff affiliation missing');
    if (C.traps.count) add(C.traps.count === 2 && C.staff.some((s) => s.id === C.traps.reportName) && C.traps.sawHosts.every((h) => C.web.pages[h]) && C.web.pages[C.traps.confirmHost]?.confirm, seed, 'trap metadata broken');
    else add(C.traps.reportName === null && C.traps.sawHosts.length === 0 && C.traps.confirmHost === null, seed, 'inactive trap metadata');

    const fp = { emails: C.emails.length, chats: C.chats.length, files: C.files.length, payments: C.finance.payments.rows.length,
      changes: C.finance.changes.rows.length, mfa: allMfa.length, signins: allSigns.length, registry: C.web.registry.companies.length,
      whois: Object.keys(C.web.whois).length, lookalikeRequests: lookMails.length, nightApprovals: allMfa.filter(isNight).length };
    const scopes = ['all', ...C.twists.map((t) => `with:${t}`), ...['clocks', 'trap', 'tip', 'noise'].filter((t) => !C.twists.includes(t)).map((t) => `without:${t}`), `pair:${C.twists.join('+')}`];
    for (const scope of scopes) {
      for (const [key, value] of Object.entries(fp)) distribution(fingerprints, scope, key, layout, value);
      distribution(positions, scope, 'culprit/victim staff position', layout, C.staff.indexOf(changer));
      distribution(positions, scope, 'culprit/victim finance position', layout, finance.indexOf(changer));
    }
    // These deliberately stop short of corroborating multiple sources. Accuracy means BOTH who AND how.
    // The no-evidence prior is 1/3 (the most likely fixed who+how is either outsider route).
    const latestLook = lookMails.find(m => (targetChange[8].match(/REQ-\d{4}/g) || []).some(ref => text(m.body).includes(ref)));
    const newestRequest = lookMails.slice().sort((a, b) => stamp(b.time, C.mailTz) - stamp(a.time, C.mailTz))[0];
    const mailPerson = C.staff.find((s) => s.email === newestRequest?.to);
    const worryPerson = C.staff.find((s) => C.chats.some((ch) => ch.msgs.some((m) => m[0] === s.name && /savings|rent|paying off|payday/i.test(m[2]))));
    const nightPerson = finance.find((s) => tabs.mfa.byUser[s.user].some(isNight));
    const director = C.staff.find((s) => s.name === receiver.director);
    const predictions = {
      changer: [changer.id, 'self'], moneyWorries: [worryPerson?.id || finance[0].id, 'self'],
      latestLookRecipient: [mailPerson?.id || finance[0].id, 'self'], nightApprovalPerson: [nightPerson?.id || finance[0].id, 'self'],
      directorAbroad: receiver.address.endsWith(', BE') ? [changer.id, 'self'] : ['outsider', 'mfa'],
      directorSmallUnit: Number(/unit (\d+)/.exec(receiver.address)?.[1]) < 50 ? [changer.id, 'self'] : ['outsider', 'mfa'],
      firstFinance: [finance[0].id, 'self'], lastFinance: [finance[finance.length - 1].id, 'self'],
      lookalikePresent: ['outsider', 'lookalike'], nightApprovalPresent: ['outsider', 'mfa'],
      trapAccusation: [C.traps.reportName || finance[0].id, 'self'],
    };
    for (const [name, [who, how]] of Object.entries(predictions)) {
      const stat = ((shortcuts[name] ||= {})[layout] ||= [0, 0]);
      stat[0] += who === S.who && how === S.how ? 1 : 0; stat[1]++;
    }
    // Records = distinct opened messages, pages, tables, profiles or ordinary documents.
    // Estimate the relevant corroborated branch; navigation/search/flags/report are separate actions.
    const records = layout === 'mfa' ? 13 : 12;
    const roughCommands = layout === 'insider' ? 38 : layout === 'lookalike' ? 36 : 37;
    const cmd = (commands[layout] ||= { records: 0, commands: 0, n: 0 }); cmd.records += records; cmd.commands += roughCommands; cmd.n++;

    // Sabotage the decisive join and require visible-data failure (one representative per layout).
    if (!commands[layout].mutated) {
      const broken = JSON.parse(JSON.stringify(visible));
      if (layout === 'insider') broken.web.registry.companies.find((co) => co.id === receiver.id).address += ', wrong unit';
      if (layout === 'lookalike') broken.emails.find((m) => m.id === latestLook.id).body = broken.emails.find((m) => m.id === latestLook.id).body.replace(/REQ-\d+/, 'REQ-INVALID');
      if (layout === 'mfa') broken.finance.changes.rows[S.changeRow][7] = 'SES-NOT-CREATED';
      add(!solve(broken).ok && auditRendered(broken).length === 0, seed, 'broken decisive link still solves');
      mutations++;
      const conflict = JSON.parse(JSON.stringify(visible));
      if (layout === 'insider') {
        const request = conflict.emails.find((m) => m.id === latestLook.id);
        request.body = request.body.replace(/<b>([A-Z]{2}\d{2}(?: [A-Z0-9]+)+)<\/b>/, `<b>${targetChange[5]}</b>`);
      }
      if (layout === 'lookalike') { const co=conflict.web.registry.companies.find((co) => co.id === receiver.id); co.director=changer.name; co.address=tabs.accounts.accounts[changer.id].find((r) => r[0] === 'Home address')[1]; }
      if (layout === 'mfa') conflict.chats.forEach((ch) => { ch.msgs = ch.msgs.filter((m) => m[0] !== changer.name); });
      const expected = layout === 'mfa' ? 0 : 2;
      add(!solve(conflict).ok && auditRendered(conflict).length === expected, seed, 'solver accepts ambiguity or missing independent confirmation');
      commands[layout].mutated = true; mutations++;
    }
  } catch (error) { problems.push(`${seed}: ${error.stack}`); }
}

// Compare FREQUENCY histograms, including proportions, not sets of observed values.
// Pairwise total variation is reported; a 6-sigma bin test handles multinomial sampling
// with many simultaneous comparisons. Sparse conditional buckets are printed, not overclaimed.
let maxCountTV = 0, maxPositionTV = 0, maxZ = 0, sparse = 0;
function compare(store, kind) {
  for (const [feature, byLayout] of Object.entries(store)) for (let a = 0; a < layouts.length; a++) for (let b = a + 1; b < layouts.length; b++) {
    const left = byLayout[layouts[a]] || {}, right = byLayout[layouts[b]] || {};
    const nl = Object.values(left).reduce((x, y) => x + y, 0), nr = Object.values(right).reduce((x, y) => x + y, 0);
    if (Math.min(nl, nr) < 60) { sparse++; continue; }
    const bins = new Set([...Object.keys(left), ...Object.keys(right)]);
    let tv = 0;
    for (const bin of bins) {
      const l = left[bin] || 0, r = right[bin] || 0, pooled = (l + r) / (nl + nr);
      const diff = Math.abs(l / nl - r / nr);
      tv += diff / 2;
      const variance = pooled * (1 - pooled) * (1 / nl + 1 / nr);
      const z = variance > 0 ? diff / Math.sqrt(variance) : 0;
      maxZ = Math.max(maxZ, z);
      if (z > 6) problems.push(`frequency leak ${feature}, ${layouts[a]}/${layouts[b]}, value ${bin}: z=${z.toFixed(2)}`);
    }
    if (kind === 'counts') maxCountTV = Math.max(maxCountTV, tv); else maxPositionTV = Math.max(maxPositionTV, tv);
    distributionChecks++;
  }
}
compare(fingerprints, 'counts'); compare(positions, 'positions');
let shapeComparisons = 0, shapeBins = 0, maxShapeGap = 0, legitimateShapeContrasts = 0;
function compareShapes(store, intended = false) {
  for (const [feature, hist] of Object.entries(store)) {
    const totals = layouts.map((l) => Object.values(hist[l] || {}).reduce((a, b) => a + b, 0));
    // A narrow CLI range is useful for consistency debugging, but cannot support
    // a population-frequency claim. The fixed holdout oracles still run in full.
    if (!intended && Math.min(...layouts.map((l) => counts[l] || 0)) < 60) continue;
    const bins = new Set(layouts.flatMap((l) => Object.keys(hist[l] || {})));
    for (const bin of bins) {
      const frequencies = layouts.map((l, i) => (hist[l]?.[bin] || 0) / (totals[i] || 1));
      const gap = Math.max(...frequencies) - Math.min(...frequencies);
      const exclusive = frequencies.filter((f) => f > 0).length === 1;
      if (intended) {
        if (gap > 0.1 || exclusive) legitimateShapeContrasts++;
        // The intended distinction is MFA versus ordinary sessions. Insider
        // versus lookalike must still have balanced shapes in these columns.
        if (feature.startsWith('target session | ') && Math.min(counts.insider || 0, counts.lookalike || 0) >= 60) {
          const ordinaryGap = Math.abs(frequencies[0] - frequencies[1]);
          maxShapeGap = Math.max(maxShapeGap, ordinaryGap); shapeBins++;
          if (ordinaryGap > 0.1 || (frequencies[0] > 0) !== (frequencies[1] > 0))
            problems.push(`SHAPE ordinary ${feature} ${JSON.stringify(bin)}: insider/lookalike gap ${(100 * ordinaryGap).toFixed(2)}pp or exclusive ordinary shape`);
        }
      }
      else {
        maxShapeGap = Math.max(maxShapeGap, gap); shapeBins++;
        if (gap > 0.1 || exclusive) problems.push(`SHAPE ${feature} ${JSON.stringify(bin)}: ${frequencies.map((f) => (100 * f).toFixed(2) + '%').join('/')} (gap ${(100 * gap).toFixed(2)}pp${exclusive ? ', one layout only' : ''})`);
      }
    }
    if (!intended || (feature.startsWith('target session | ') && Math.min(counts.insider || 0, counts.lookalike || 0) >= 60)) shapeComparisons++;
  }
}
compareShapes(shapes); compareShapes(chainFacts, true);
// Strict train/holdout split: never train on evaluation labels or choose a
// threshold/model using evaluation outcomes. Unseen values use the training prior.
const trainingPrior = {};
for (let seed = 1; seed <= 2500; seed++) {
  const C = generate(seed), l = C.secret.layout; bump(trainingPrior, l);
  for (const [feature, value] of Object.entries(oracleFeatures(C))) {
    const buckets = oracleTraining[feature] ||= new Map();
    const votes = buckets.get(value) || {}; bump(votes, l); buckets.set(value, votes);
  }
}
const majority = (votes) => layouts.reduce((best, l) => (votes[l] || 0) > (votes[best] || 0) ? l : best, layouts[0]);
const fallback = majority(trainingPrior), oracleHits = {};
for (let seed = 2501; seed <= 5000; seed++) {
  const C = generate(seed);
  const observed = oracleFeatures(C);
  for (const feature of Object.keys(oracleTraining)) {
    const value = observed[feature];
    const predicted = majority(oracleTraining[feature]?.get(value) || { [fallback]: 1 });
    const stats = oracleHits[feature] ||= [0, 0]; stats[0] += predicted === C.secret.layout ? 1 : 0; stats[1]++;
  }
}
let bestOracle = ['', 0];
for (const [feature, stats] of Object.entries(oracleHits)) {
  const accuracy = stats[0] / stats[1]; oracleTests.push({ feature, hits: stats[0], n: stats[1], accuracy });
  if (accuracy > bestOracle[1]) bestOracle = [feature, accuracy];
  if (accuracy > 1/3+.1) problems.push(`single-field oracle ${feature}: ${pct(...stats)}% > prior+10pp`);
}
for (const layout of layouts) {
  const bucket = clocks[layout] || [0, 0], plainBucket = plain[layout] || [0, 0];
  if (bucket[1] >= 100 && (bucket[0] / bucket[1] < 0.4 || bucket[0] / bucket[1] > 0.6)) problems.push(`${layout}: naive-clock failure rate outside 40..60%`);
  const sb = sessionClocks[layout] || [0, 0];
  if (sb[1] >= 100 && (sb[0] / sb[1] < 0.4 || sb[0] / sb[1] > 0.6)) problems.push(`${layout}: session-clock ablation failure rate outside 40..60%`);
  if (plainBucket[0]) problems.push(`${layout}: naive solver fails on ${plainBucket[0]} plain cases`);
}
for(const [name,r] of Object.entries(conditional)) {
  const accuracy=r.hits/r.n,prior=r.prior/r.n;
  console.log(`ROUND4 conditional ${name}: ${r.hits}/${r.n} ${pct(r.hits,r.n)}%; prior ${pct(r.prior,r.n)}%, limit ${(100*(prior+.1)).toFixed(2)}%`);
  if(r.n>=100&&accuracy>prior+.1)problems.push(`Round 4 conditional ${name} exceeds prior+10pp`);
}
for(const [name,r] of Object.entries(evidenceRules))console.log(`ROUND4 allowed EVIDENCE ${name}: ${r.hits}/${r.n} ${pct(r.hits,r.n)}% (not a non-evidential shortcut)`);
console.log(`ROUND6 genuine-account executions: ${crimeCases}/${checked} cases; ${ordinaryPayments} non-incident payments genuine at execution; ${unusedWrongChanges} unused/reverted non-incident wrong changes`);
timingAudit();
require('./check2-adversarial.js').run({ generate, from, to, problems });
// The historical construction helper recognizes episodes by old==standard.
// Round 5 permits direct collection-account switches. Canonicalize that one
// predecessor field ONLY for this legacy extractor; retain all dates, payments,
// people, references, sessions, counts, positions and bank links. The raw-record
// adversarial suite above still consumes the unmodified fields. This uses no
// secret/complaint labels: each one-off non-standard paid destination is an
// episode; standard payments and unused updates are not episode candidates.
function constructionView(seed) {
  const C=generate(seed),P=C.finance.payments.rows;
  for(const s of C.finance.suppliers) {
    const standard=ibans(C.web.suppliers[s.domain].html)[0];
    for(const c of C.finance.changes.rows.filter(c=>c[2]===s.id)) {
      const episode=iban(c[5])!==standard&&P.some(p=>p[3]===s.id&&iban(p[6])===iban(c[5]));
      if(episode)c[4]=standard.match(/.{1,4}/g).join(' ');
      else if(iban(c[4])===standard)c[4]=c[5];
    }
  }
  return C;
}
constructionAudit();
relationalLengthAudit();
// Preserve the historical construction attacks and learners. Paid ownership,
// exact requested-account equality, and the exact change-session's cloud/trusted
// authentication facts are evidence. Counts, neighboring rows, name lengths,
// timing, ages, orphan sessions and prominence remain non-evidential inputs.
function constructionAudit() {
  const legacy=require('./check2-construction.js'),{treeFit,treeScore,nbFit,nbScore}=require('./check2-adversarial.js');
  const excluded=new Set(['bankStaffHome','bankOwnHome','bankDirectorMatches','requestMatches','sessionCloud','sessionTrusted']);
  const clean=f=>Object.fromEntries(Object.entries(f).filter(([k])=>!k.split('.').some(x=>excluded.has(x))));
  const row=seed=>{const C=constructionView(seed),S=C.secret;delete C.secret;delete C.twists;delete C.traps;const E=legacy.extract(C);E.episodes.forEach(e=>e.f=clean(e.f));E.people=E.people.map(clean);E.aggregate=clean(E.aggregate);return {C,S,E,incident:E.episodes.findIndex(e=>e.change===S.changeRow),who:E.F.findIndex(p=>p.id===S.who),layout:layouts.indexOf(S.layout)};};
  const training=Array.from({length:4000},(_,i)=>row(100001+i)),test=Array.from({length:to-from+1},(_,i)=>row(from+i)),metrics={};
  const record=(name,hit,prior)=>probe(metrics,name,hit,prior);
  for(const r of test) {add(r.incident>=0,r.C.seed,'construction: missing incident candidate');legacy.attacks(r.C,r.S,r.E,record);}
  const argmax=a=>a.reduce((j,v,i)=>v>a[j]?i:j,0);
  for(const task of ['episode','layout','identity']) {
    const tr=task==='identity'?training.filter(r=>r.who>=0):training,te=task==='identity'?test.filter(r=>r.who>=0):test;
    const items=r=>task==='episode'?r.E.episodes.map(e=>e.f):task==='identity'?r.E.people:[r.E.aggregate];
    const target=r=>task==='episode'?r.incident:task==='identity'?r.who:r.layout;
    const keys=[...new Set(tr.flatMap(r=>items(r).flatMap(f=>Object.keys(f))))],vec=f=>keys.map(k=>f[k]||0);
    const data=tr.flatMap(r=>items(r).map((f,i)=>({x:vec(f),y:task==='layout'?r.layout:+(i===target(r))})));
    for(const type of ['depth4-tree','NB']) {
      const model=type==='depth4-tree'?treeFit(data,task==='layout'?3:2,4):nbFit(data,task==='layout'?3:2);
      const score=f=>type==='depth4-tree'?treeScore(model,vec(f)):nbScore(model,vec(f));
      for(const r of te) {const a=items(r),pick=task==='layout'?argmax(score(a[0])):argmax(a.map(f=>{const v=score(f);return type==='depth4-tree'?v[1]:v[1]-v[0];}));record(`construction ${type} / ${task} (${keys.length} non-evidential features)`,pick===target(r),task==='layout'?1/3:1/a.length);}
    }
  }
  const results=Object.entries(metrics).map(([name,r])=>{const accuracy=r.hits/r.n,prior=r.prior/r.n,limit=prior+.1;console.log(`ROUND6 construction ${name}: ${r.hits}/${r.n} ${(100*accuracy).toFixed(2)}%; prior ${(100*prior).toFixed(2)}%, limit ${(100*limit).toFixed(2)}%`);if(accuracy>limit)problems.push(name+' exceeds prior+10pp');return {name,...r,prior,accuracy,limit};});
  if(process.env.PF_CASE2_CONSTRUCTION_JSON)require('fs').writeFileSync(process.env.PF_CASE2_CONSTRUCTION_JSON,JSON.stringify({range:[from,to],training:[100001,104000],excludedEvidence:[...excluded],results},null,2));
}
// Conditional, CROSS-record representations from pf-audit6. No full bank,
// person or address equality enters these vectors. Invoice/REQ joins only locate
// the records. Also test all payment/change row lengths against their own priors.
function relationalLengthAudit() {
  const {treeFit,treeScore,nbFit,nbScore}=require('./check2-adversarial.js'),argmax=a=>a.reduce((j,v,i)=>v>a[j]?i:j,0);
  function row(seed) {
    const C=generate(seed),S=C.secret;delete C.secret;delete C.twists;delete C.traps;
    const invoice=C.emails.find(m=>/^Still unpaid:/.test(m.subject)).subject.match(/INV-\d{4}/)[0];
    const p=C.finance.payments.rows.find(p=>p[2]===invoice),c=C.finance.changes.rows.find(c=>c[2]===p[3]&&iban(c[5])===iban(p[6]));
    const changer=C.staff.find(s=>s.user===c[6]),F=C.staff.filter(s=>s.dept==='Finance'),T=C.security.tabs.find(t=>t.id==='accounts');
    const co=C.web.registry.companies.find(co=>co.id===C.web.banklookup[iban(p[6])].companyId),home=T.accounts[changer.id].find(r=>r[0]==='Home address')[1];
    const ref=c[8].match(/REQ-\d{4}/)[0],request=C.emails.find(m=>/^Bank details update/.test(m.subject)&&m.body.includes(ref)),requested=ibans(request.body)[0];
    const x=[co.director.length,changer.name.length,co.address.length,home.length,requested.length,iban(p[6]).length,+ (co.director.length===changer.name.length),+(co.address.length===home.length),+(requested.length===iban(p[6]).length),co.name.length,...co.director.split(' ').map(s=>s.length),...changer.name.split(' ').map(s=>s.length),co.address.replace(/\D/g,'').length,home.replace(/\D/g,'').length,co.director.split(' ').length,changer.name.split(' ').length,...[0,1].map(i=>+(co.director.split(' ')[i][0]===changer.name.split(' ')[i][0]))];
    return {C,S,x,F,co,requested,layout:layouts.indexOf(S.layout)};
  }
  const train=Array.from({length:4000},(_,i)=>row(i+1)),test=Array.from({length:2000},(_,i)=>row(i+4001)),external=Array.from({length:4000},(_,i)=>row(i+100001));
  const summaries=[];
  for(const [training,testing,label] of [[train,test,'4001..6000'],[external,Array.from({length:to-from+1},(_,i)=>row(i+from)),`${from}..${to}`]]) {
    const data=training.map(r=>({x:r.x,y:r.layout})),tree=treeFit(data,3,4),nb=nbFit(data,3),stats={};
    for(const r of testing) {
      const nameEq=r.x[6],addressEq=r.x[7],bankEq=r.x[8];
      for(const [name,pred] of [['name+IBAN length',nameEq?0:bankEq?1:2],['address+IBAN length',addressEq?0:bankEq?1:2],['name+address+IBAN length',nameEq&&addressEq?0:bankEq?1:2],['lengths depth4-tree',argmax(treeScore(tree,r.x))],['lengths NB',argmax(nbScore(nb,r.x))]])probe(stats,name,pred===r.layout,1/3);
      if(r.S.layout==='insider')probe(stats,'identity first finance name of director length',r.F.find(p=>p.name.length===r.co.director.length)?.id===r.S.who,1/r.F.length);
      for(const kind of ['payments','changes']) {
        const rows=r.C.finance[kind].rows,truth=r.S[kind==='payments'?'paymentRow':'changeRow'];
        for(const order of ['shortest','longest']) {
          const sizes=rows.map(v=>v.map(String).join(' ').length),pick=argmax(sizes.map(n=>order==='longest'?n:-n));
          probe(stats,`${kind} ${order} printed row`,pick===truth,1/rows.length);
        }
        for(const column of kind==='payments'?[6]:[4,5,6]) {
          const sizes=rows.map(v=>String(v[column]).length);probe(stats,`${kind} first length-equal column ${column}`,sizes.findIndex(n=>n===sizes[truth])===truth,1/rows.length);
        }
      }
    }
    for(const [name,r] of Object.entries(stats)) {const accuracy=r.hits/r.n,prior=r.prior/r.n,limit=prior+.1;console.log(`ROUND6 relational ${label} ${name}: ${r.hits}/${r.n} ${(100*accuracy).toFixed(2)}%; prior ${(100*prior).toFixed(2)}%, limit ${(100*limit).toFixed(2)}%`);if(accuracy>limit)problems.push('relational length '+label+' '+name+' exceeds prior+10pp');summaries.push({range:label,name,...r,prior,accuracy,limit});}
  }
  if(process.env.PF_CASE2_LENGTH_JSON)require('fs').writeFileSync(process.env.PF_CASE2_LENGTH_JSON,JSON.stringify({features:train[0].x.length,results:summaries},null,2));
  console.log(`ROUND6 secondary crimes: ${secondaryCases}/${checked} cases exactly one incident; ${JSON.stringify(crimeTotals)}; ${secondaryMutations} injected secondary offenses detected`);
}
// pf-audit7: invoice-conditioned counts only. No message wording, authentication
// result, IP, device, requested account or ownership fact enters these models.
// Retain the original rule, one-integer tree/NB, and all 18 broader counts.
function conditionalCountAudit() {
  const {renderer,treeFit,treeScore,nbFit,nbScore}=require('./check2-adversarial.js');
  const render=renderer(generate),occ=(s,v)=>s.split(v).length-1,mx=a=>a.reduce((j,v,i)=>v>a[j]?i:j,0);
  function row(seed,rendered=false) {
    const C=generate(seed),S=C.secret;delete C.secret;delete C.twists;delete C.traps;
    const invoice=C.emails.find(m=>/^Still unpaid:/.test(m.subject)).subject.match(/INV-\d+/)[0];
    const p=C.finance.payments.rows.find(r=>r[2]===invoice),c=C.finance.changes.rows.find(r=>r[2]===p[3]&&iban(r[5])===iban(p[6]));
    const actor=C.staff.find(s=>s.user===c[6]),F=C.staff.filter(s=>s.dept==='Finance'),T=Object.fromEntries(C.security.tabs.map(t=>[t.id,t]));
    const ref=c[8].match(/REQ-\d+/)[0],request=C.emails.find(m=>m.subject==='Bank details update '+ref),msgs=C.chats.flatMap(ch=>ch.msgs);
    const chat=msgs.map(m=>m[2]).join(' '),mail=C.emails.map(m=>m.subject+' '+text(m.body)).join(' ');
    const f={chatSessionMentions:occ(chat,c[7]),chatRowsMentionSession:msgs.filter(m=>m[2].includes(c[7])).length,chatSessionUniqueSpeakers:new Set(msgs.filter(m=>m[2].includes(c[7])).map(m=>m[0])).size,
      actorSigninCount:T.signins.byUser[actor.user].length,actorMfaCount:T.mfa.byUser[actor.user].length,actorChangeCount:C.finance.changes.rows.filter(r=>r[6]===actor.user).length,
      actorChatCount:msgs.filter(m=>m[0]===actor.name).length,actorReportPosition:C.report.who.findIndex(r=>r[0]===actor.id),actorFinancePosition:F.indexOf(actor),sessionInMail:occ(mail,c[7]),
      referenceInChat:occ(chat,ref),referenceInMail:occ(mail,ref),requestBodyLength:text(request.body).length,changeNoteLength:c[8].length,paymentRow:C.finance.payments.rows.indexOf(p),changeRow:C.finance.changes.rows.indexOf(c),
      paymentCountSupplier:C.finance.payments.rows.filter(r=>r[3]===p[3]).length,changeCountSupplier:C.finance.changes.rows.filter(r=>r[2]===p[3]).length};
    if(rendered)add(occ(render(C).chat,c[7])===f.chatSessionMentions,seed,'Round 7 raw/rendered Chat session counts disagree');
    return {seed,y:layouts.indexOf(S.layout),f};
  }
  const training=Array.from({length:4000},(_,i)=>row(i+1)),external=Array.from({length:4000},(_,i)=>row(i+100001));
  const fixed=Array.from({length:2000},(_,i)=>row(i+4001,true)),requested=Array.from({length:to-from+1},(_,i)=>row(i+from));
  const keys=Object.keys(training[0].f),results=[];
  for(const [tr,te,range,trainRange] of [[training,fixed,[4001,6000],[1,4000]],[external,requested,[from,to],[100001,104000]]]) {
    const report=(name,predict)=>{
      const hits=te.filter(r=>predict(r)===r.y).length,accuracy=hits/te.length,prior=1/3,limit=prior+.1;
      console.log(`ROUND7 conditional counts ${range.join('..')} ${name}: ${hits}/${te.length} ${(accuracy*100).toFixed(2)}%; prior 33.33%, limit 43.33%`);
      if(accuracy>limit)problems.push('Round 7 conditional counts '+name+' exceeds prior+10pp');
      results.push({range,training:trainRange,name,hits,n:te.length,accuracy,prior,limit});
    };
    const nonMfa=[0,1].reduce((b,v)=>tr.filter(r=>r.y===v).length>tr.filter(r=>r.y===b).length?v:b,0);
    report('original MFA-if-mentioned rule',r=>r.f.chatSessionMentions>0?2:nonMfa);
    for(const [group,fields] of [['session-count-only',['chatSessionMentions']],['all-new-count-and-prominence',keys],...keys.map(k=>['individual '+k,[k]])]) {
      const vec=r=>fields.map(k=>r.f[k]),data=tr.map(r=>({x:vec(r),y:r.y}));
      for(const type of group.startsWith('individual ')?['tree4']:['tree4','NB']) {
        const model=type==='tree4'?treeFit(data,3,4):nbFit(data,3);
        report(group+' '+type,r=>mx(type==='tree4'?treeScore(model,vec(r)):nbScore(model,vec(r))));
      }
    }
  }
  const hist=Object.fromEntries(layouts.map((l,y)=>[l,{}]));
  for(const r of fixed)hist[layouts[r.y]][r.f.chatSessionMentions]=(hist[layouts[r.y]][r.f.chatSessionMentions]||0)+1;
  if(process.env.PF_CASE2_COUNTS_JSON)require('fs').writeFileSync(process.env.PF_CASE2_COUNTS_JSON,JSON.stringify({features:keys,renderedHoldoutCases:fixed.length,sessionMentionHistogram:hist,results},null,2));
}
conditionalCountAudit();
const prior = 1 / 3, threshold = prior + 0.1;
let bestShortcut = ['', 0];
for (const [name, values] of Object.entries(shortcuts)) {
  const rows = Object.values(values), hits = rows.reduce((s, r) => s + r[0], 0), n = rows.reduce((s, r) => s + r[1], 0);
  if (hits / n > bestShortcut[1]) bestShortcut = [name, hits / n];
  if (n >= 100 && hits / n > threshold) problems.push(`shortcut ${name} = ${pct(hits, n)}%, above prior + 10 points`);
}
console.log(`seeds ${from}..${to}: ${checked} cases, ${problems.length} problems`);
console.log(`layouts: ${layouts.map((l) => `${l}=${counts[l] || 0}`).join(' | ')}`);
console.log(`visible ambiguity: ${ambiguityChecks} cases each support exactly one branch; decisive-link mutations: ${mutations}`);
console.log(`SHAPE: ${shapeComparisons} field/token distributions, ${shapeBins} bins; max gap=${(100 * maxShapeGap).toFixed(2)}pp (limit 10pp); visible chain checks=${visibleChainChecks}; intended linked-session/challenge contrasts=${legitimateShapeContrasts} (only exact joined Device/Location/MFA challenge and linked challenge existence)`);
console.log(`single-field oracles: ${oracleTests.length} tests, train seeds 1..2500, holdout 2501..5000; best=${bestOracle[0]} ${(100 * bestOracle[1]).toFixed(2)}% (limit 43.33%)`);
for (const r of oracleTests) console.log(`  oracle ${r.feature}: ${pct(r.hits, r.n)}% (${r.hits}/${r.n})`);
console.log(`frequency histograms: ${distributionChecks} comparisons (all, each twist present/absent, exact twist pair); max count TV=${(100 * maxCountTV).toFixed(2)}pp, position TV=${(100 * maxPositionTV).toFixed(2)}pp, max bin z=${maxZ.toFixed(2)}; sparse skipped=${sparse}`);
console.log('record-count frequency histograms by layout (value:frequency):');
for (const [name, hist] of Object.entries(fingerprints).filter(([k]) => k.startsWith('all | '))) console.log(`  ${name.slice(6)}: ${layouts.map((l) => `${l} ${JSON.stringify(hist[l] || {})}`).join(' | ')}`);
console.log(`shortcuts who+how: prior=${(100 * prior).toFixed(2)}%, limit=${(100 * threshold).toFixed(2)}% (overall | insider / lookalike / mfa):`);
for (const [name, stats] of Object.entries(shortcuts)) {
  const rows = Object.values(stats), hit = rows.reduce((n, r) => n + r[0], 0), n = rows.reduce((s, r) => s + r[1], 0);
  console.log(`  ${name}: ${pct(hit, n)}% | ${layouts.map((l) => pct(...(stats[l] || [0, 0])) + '%').join(' / ')}`);
}
console.log(`best shortcut: ${bestShortcut[0]} ${(100 * bestShortcut[1]).toFixed(2)}%`);
for (const l of layouts) {
  const c = clocks[l] || [0, 0], p = plain[l] || [0, 0], cmd = commands[l];
  const pos = positions['all | culprit/victim staff position']?.[l] || {};
  const meanPosition = Object.entries(pos).reduce((sum, [position, frequency]) => sum + Number(position) * frequency, 0) / (counts[l] || 1);
  console.log(`${l}: naive clocks FAIL ${c[0]}/${c[1]} (${pct(...c)}%), session-only ${pct(...(sessionClocks[l] || [0, 0]))}%; plain FAIL ${p[0]}/${p[1]}; mean staff position=${meanPosition.toFixed(2)}/10; careful path ~${cmd ? cmd.records / cmd.n : 0} opened records / ~${cmd ? cmd.commands / cmd.n : 0} commands (estimate, not UI replay)`);
}
problems.slice(0, 30).forEach((p) => console.log(`  - ${p}`));
process.exitCode = problems.length ? 1 : 0;
