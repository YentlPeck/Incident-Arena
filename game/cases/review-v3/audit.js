'use strict';
const fs=require('fs'),vm=require('vm');
const root='C:/Users/yentl/.t3/projects/pixelforge/';
const src=fs.readFileSync(root+'cases/gen2.js','utf8');
const {generate}=require(root+'cases/gen2.js');
const {stamp,ibans,iban,text}=require(root+'cases/solve2.js');
const metrics={}, examples={}, counts={};
function record(k,p,t,prior,seed,detail){const r=metrics[k]||={hit:0,n:0,prior:0};r.hit+=+(p===t);r.n++;r.prior+=prior;if(p===t&&!(examples[k]||[]).some(x=>x.layout===detail.layout)){(examples[k]||=[]).push({seed,...detail});}}
function assess(seed){
 const C=generate(seed), S=C.secret;delete C.secret;delete C.twists;delete C.traps;
 const F=C.staff.filter(p=>p.dept==='Finance'),P=C.finance.payments.rows,H=C.finance.changes.rows;
 const tabs=Object.fromEntries(C.security.tabs.map(t=>[t.id,t]));
 const requests=C.emails.filter(m=>/^Bank details update REQ-/.test(m.subject));
 const freq={};requests.forEach(m=>{const a=ibans(m.body)[0];freq[a]=(freq[a]||0)+1});
 const singleton=requests.filter(m=>freq[ibans(m.body)[0]]===1);
 const actor=C.staff.find(p=>p.email===singleton[0]?.to);
 const d={layout:S.layout,actor:actor?.name,request:singleton[0]?.subject,requestIBAN:ibans(singleton[0]?.body||'')[0]};
 if(S.layout==='insider')record('identity / singleton request account',actor?.id,S.who,1/F.length,seed,d);
 // New order attack: no cloud/device/challenge interpretation; use only the reference's display rank.
 const early=H.map((r,i)=>({i,r,j:tabs.signins.byUser[r[6]].findIndex(s=>s[1]===r[7])})).filter(o=>o.j>=0&&o.j<4);
 const selected=early.length===1?early[0]:null;
 record('change / early sign-in display row',selected?.i,S.changeRow,1/H.length,seed,{...d,change:selected?.r[1],signinPosition:selected?.j,candidates:early.length});
 // Independently detect the generated-but-unused trusted session. Ignore all session device fields.
 const referenced=new Set(H.map(r=>r[7]));
 const userUnused=F.map(p=>({p,rows:tabs.signins.byUser[p.user].slice(-H.filter(r=>r[6]===p.user).length-(p.id===actor?.id?1:0)).filter(s=>!referenced.has(s[1]))}));
 // Stable first-four common administrative sign-in rows, then an extra per-change row.
 const offset=tabs.signins.byUser[F[0].user][0][4]==='Existing trusted device'?1:0;
 const unref=F.flatMap(p=>tabs.signins.byUser[p.user].slice(4+offset).filter(s=>!referenced.has(s[1])).map(s=>({p,s})));
 if(S.layout==='insider')record('identity / orphan trailing sign-in',unref.length===1?unref[0].p.id:null,S.who,1/5,seed,{...d,unused:unref.map(x=>x.s[1])});
 const ct=selected&&stamp(selected.r[0],C.finance.changes.tz);
 const matches=selected?P.map((r,i)=>({r,i,t:stamp(r[0],C.finance.payments.tz)})).filter(x=>x.r[5]==='Executed'&&x.r[3]===selected.r[2]&&iban(x.r[6])===iban(selected.r[5])&&x.t>=ct).sort((a,b)=>a.t-b.t):[];
 record('payment / early-session change then next payment',matches[0]?.i,S.paymentRow,1/P.length,seed,{...d,payment:matches[0]?.r[1],change:selected?.r[1]});
 // Authentication time anchor alone: repeated finance late sign-in time minus either standard payment gap.
 const late=stamp(tabs.signins.byUser[F[0].user][3+offset][0],tabs.signins.tz);
 const anchors=P.map((r,i)=>({r,i,t:stamp(r[0],C.finance.payments.tz)})).filter(x=>x.r[5]==='Executed'&&[5,82].includes(late-x.t));
 record('payment / common late sign-in time minus 5 or 82',anchors.length===1?anchors[0].i:null,S.paymentRow,1/P.length,seed,{...d,payment:anchors[0]?.r[1],count:anchors.length});
 // A standalone orphan sign-in in selected actor: nearest subsequent IBAN change, no used-session match.
 const orphan=unref[0];const ot=orphan&&stamp(orphan.s[0],tabs.signins.tz);
 const next=orphan?H.map((r,i)=>({r,i,t:stamp(r[0],C.finance.changes.tz)})).filter(x=>x.r[3]==='IBAN'&&x.r[6]===orphan.p.user&&x.t>=ot).sort((a,b)=>a.t-b.t):[];
 record('change / orphan sign-in then next IBAN change',unref.length===1?next[0]?.i:null,S.changeRow,1/H.length,seed,d);
 // No account-session join: common trusted administrative anchor and change gap.
 const normal=stamp(tabs.signins.byUser[F[0].user][1+offset][0],tabs.signins.tz);
 const ca=H.map((r,i)=>({r,i,t:stamp(r[0],C.finance.changes.tz)})).filter(x=>x.r[3]==='IBAN'&&[10,80].includes(x.t-normal));
 record('change / common normal sign-in time plus 10 or 80',ca.length===1?ca[0].i:null,S.changeRow,1/H.length,seed,d);
 // Lookalike route inferred from current supplier account plus the singleton request only.
 const sup=C.finance.suppliers.find(s=>singleton[0]&&text(singleton[0].body).includes(s.id));
 const same=sup&&iban(sup.ibanOnFile)===ibans(singleton[0].body)[0];
 record('layout / singleton request matches current master else insider',same?'lookalike':'insider',S.layout,1/3,seed,d);
 // Timing-only request arrival vs change, measured for every candidate; don't use target labels.
 // Identity from name occurrence across app boundaries rather than total counts.
 const ownRequests=F.map(p=>requests.filter(m=>m.to===p.email));
 counts[S.layout]=(counts[S.layout]||0)+1;
 return {C,S,F,requests,actor,selected,offset};
}
for(let s=1;s<=2000;s++)assess(s); // calibration separately discarded
for(const k of Object.keys(metrics))delete metrics[k];for(const k of Object.keys(examples))delete examples[k];for(const k of Object.keys(counts))delete counts[k];
for(let s=2001;s<=10000;s++)assess(s);
console.log(JSON.stringify({holdout:'2001..10000',metrics:Object.fromEntries(Object.entries(metrics).map(([k,v])=>[k,{...v,accuracy:v.hit/v.n,prior:v.prior/v.n}])),counts,examples},null,2));
// Force layout without consuming RNG: same exact draws, only the first pick's returned value changes.
const forced={};for(const layout of ['insider','lookalike','mfa']){
 const patched=src.replace("const layout = R.pick(['insider', 'lookalike', 'mfa']);",`R.pick(['insider', 'lookalike', 'mfa']); const layout = '${layout}';`);
 const ctx={module:{exports:{}},globalThis:{}};vm.runInNewContext(patched,ctx);forced[layout]=ctx.module.exports.generate;
}
function visible(c){delete c.secret;delete c.twists;delete c.traps;return c;}
function diffs(a,b,p='',out=[]){if(typeof a!==typeof b){out.push(p);return out}if(a&&typeof a==='object'){for(const k of new Set([...Object.keys(a),...Object.keys(b)]))diffs(a[k],b[k],p+'.'+k,out)}else if(a!==b)out.push(p);return out;}
for(const seed of [2001,2002,2003]){const a=visible(forced.insider(seed));console.log(JSON.stringify({matchedSeed:seed,insider_vs_lookalike:diffs(a,visible(forced.lookalike(seed))),insider_vs_mfa:diffs(a,visible(forced.mfa(seed)))}));}
