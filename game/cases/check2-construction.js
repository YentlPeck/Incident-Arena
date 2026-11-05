/* Permanent v3 reviewer regressions + exchangeability audit.
   Originals retained in review-v3/. Missing/ambiguous attack candidates abstain.
   No invoice IDs, unpaid/mandate mail, hidden fields or incident chain enter features.
   Train on 100001..104000; independently score BOTH requested 5000-seed ranges. */
'use strict';
const fs=require('fs'),path=require('path');
const {text,iban,ibans,stamp}=require('./solve2.js');
const {treeFit,treeScore,nbFit,nbScore}=require('./check2-adversarial.js');
const argmax=a=>a.reduce((j,v,i)=>v>a[j]?i:j,0), layouts=['insider','lookalike','mfa'];
function extract(C) {
  const F=C.staff.filter(p=>p.dept==='Finance'), H=C.finance.changes.rows,P=C.finance.payments.rows;
  const T=Object.fromEntries(C.security.tabs.map(t=>[t.id,t])), signs=Object.values(T.signins.byUser).flat();
  const requests=C.emails.filter(m=>/^Bank details update REQ-/.test(m.subject));
  const homes=Object.fromEntries(F.map(p=>[p.id,T.accounts.accounts[p.id].find(r=>r[0]==='Home address')[1]]));
  const mapped=new Set(Object.values(C.web.banklookup).map(b=>b.companyId));
  const originals=Object.fromEntries(C.finance.suppliers.map(s=>[s.id,ibans(C.web.suppliers[s.domain].html)[0]]));
  const sc=r=>stamp(r[0],C.finance.changes.tz),sp=r=>stamp(r[0],C.finance.payments.tz),ss=r=>stamp(r[0],T.signins.tz);
  const quant=x=>Number.isFinite(x)?Math.round(x/5)*5:-9999;
  const referenced=new Set(H.map(r=>r[7]));
  const episodes=H.map((r,i)=>({r,i})).filter(({r})=>r[3]==='IBAN'&&iban(r[4])===originals[r[2]]&&iban(r[5])!==originals[r[2]]).map(({r,i},ei)=>{
    const p=F.find(p=>p.user===r[6]),at=sc(r), local=T.signins.byUser[p.user],session=local.find(s=>s[1]===r[7]);
    const pp=P.map((v,j)=>({v,j})).filter(x=>x.v[3]===r[2]&&iban(x.v[6])===iban(r[5]));
    const ref=r[8].match(/REQ-\d+/)?.[0], mails=requests.filter(m=>text(m.body).includes(ref));
    const bank=C.web.banklookup[iban(r[5])],co=C.web.registry.companies.find(c=>c.id===bank?.companyId);
    const changes=H.filter(x=>x[2]===r[2]), own=H.filter(x=>x[6]===p.user);
    const near=(rows,t,window)=>rows.filter(x=>Math.abs(t(x)-at)<=window).length;
    const f={position:ei,changePosition:i,supplierPosition:C.finance.suppliers.findIndex(s=>s.id===r[2]),userPosition:F.indexOf(p),
      changeHour:new Date(at*60000).getUTCHours(),changeMinute:at%60,changeId:Number(r[1].slice(4))%100,
      supplierChanges:changes.length,userChanges:own.length,userSessions:local.length,userPrompts:T.mfa.byUser[p.user].length,
      sessionsNear120:near(local,ss,120),sessionsNear240:near(local,ss,240),globalSessionsNear120:near(signs,ss,120),
      signRank:local.indexOf(session),sessionId:Number(r[7].slice(4))%100,sessionUses:H.filter(x=>x[7]===r[7]).length,
      orphanSessions:local.filter(s=>!referenced.has(s[1])).length,sessionAge:quant(at-ss(session)),
      sessionCloud:+/cloud server/.test(session?.[3]),sessionTrusted:+(session?.[4]==='Existing trusted device'),
      nearestUserSignGap:quant(Math.min(...local.map(s=>Math.abs(at-ss(s))))),
      refUses:H.filter(x=>x[8].includes(ref)).length,requestCount:mails.length,requestGap:quant(at-stamp(mails[0]?.time||'',C.mailTz)),
      requestIBANMultiplicity:requests.filter(m=>ibans(m.body)[0]===ibans(mails[0]?.body||'')[0]).length,
      requestMatches:+mails.some(m=>ibans(m.body).includes(iban(r[5]))),requestToMatches:+mails.some(m=>m.to===p.email),
      ibanLength:iban(r[5]).length,ibanPayments:pp.length,ibanChanges:H.filter(x=>x[4]===r[5]||x[5]===r[5]).length,
      paymentGap:quant(Math.min(...pp.map(x=>sp(x.v)-at))),paymentPosition:pp[0]?.j??-1,paymentAmount:Number(pp[0]?.v[4].replace(/[^0-9.]/g,'')),
      bankLinked: +(!!bank),bankNameLength:bank?.holder.length||0,bankStaffHome:+F.some(p=>co?.director===p.name&&co?.address===homes[p.id]),
      bankOwnHome:+(co?.director===p.name&&co?.address===homes[p.id]),bankDirectorMatches:F.filter(p=>co?.director===p.name).length,
      directorBankCompanies:C.web.registry.companies.filter(c=>c.director===p.name&&mapped.has(c.id)).length,
      directorBankHomes:C.web.registry.companies.filter(c=>c.director===p.name&&c.address===homes[p.id]&&mapped.has(c.id)).length,
      chatsNear120:C.chats.flatMap(c=>c.msgs).filter(m=>m[0]===p.name&&Math.abs(stamp(m[1],C.chatTz)-at)<120).length,
      nearestChatGap:quant(Math.min(...C.chats.flatMap(c=>c.msgs).filter(m=>m[0]===p.name).map(m=>Math.abs(stamp(m[1],C.chatTz)-at))))};
    return {f,change:i,payment:pp[0]?.j,user:F.indexOf(p)};
  });
  const keys=Object.keys(episodes[0].f),aggregate={episodes:episodes.length,finance:F.length,signs:signs.length,requests:requests.length,companies:C.web.registry.companies.length};
  for(const k of keys){const v=episodes.map(e=>e.f[k]);aggregate[k+'.sum']=v.reduce((a,b)=>a+b,0);aggregate[k+'.min']=Math.min(...v);aggregate[k+'.max']=Math.max(...v);}
  const people=F.map((p,i)=>{
    const own=episodes.filter(e=>e.user===i),f={position:i,staffPosition:C.staff.indexOf(p),changes:H.filter(r=>r[6]===p.user).length,signins:T.signins.byUser[p.user].length,requests:requests.filter(m=>m.to===p.email).length};
    for(const k of keys)f[k+'.sum']=own.reduce((n,e)=>n+e.f[k],0);
    return f;
  });
  // Sorted positions and per-person aggregates are available too: prominence
  // and construction order are not exempted from the classifier.
  people.forEach((f,i)=>Object.entries(f).forEach(([k,v])=>aggregate['person'+i+'.'+k]=v));
  return {episodes,aggregate,people,F,T,requests};
}
function attacks(C,S,E,record) {
  const {F,T,requests}=E,H=C.finance.changes.rows,P=C.finance.payments.rows;
  const hit=(name,p,t,prior)=>record(name,p===t,prior);
  const freq={};requests.forEach(m=>{const a=ibans(m.body)[0];freq[a]=(freq[a]||0)+1;});
  const single=requests.find(m=>freq[ibans(m.body)[0]]===1),actor=F.find(p=>p.email===single?.to);
  const early=H.map((r,i)=>({r,i,j:T.signins.byUser[r[6]].findIndex(s=>s[1]===r[7])})).filter(x=>x.j>=0&&x.j<4),selected=early.length===1?early[0]:null;
  const nextPay=c=>c&&P.map((r,i)=>({r,i,t:stamp(r[0],C.finance.payments.tz)})).filter(x=>x.r[5]==='Executed'&&x.r[3]===c.r[2]&&iban(x.r[6])===iban(c.r[5])&&x.t>=stamp(c.r[0],C.finance.changes.tz)).sort((a,b)=>a.t-b.t)[0];
  hit('v3 change / early sign-in row',selected?.i,S.changeRow,1/H.length);
  hit('v3 payment / early-session change then next',nextPay(selected)?.i,S.paymentRow,1/P.length);
  const signs=T.signins.byUser[F[0].user],offset=signs[0][4]==='Existing trusted device'?1:0;
  const anchor=stamp(signs[1+offset]?.[0]||'',T.signins.tz),late=stamp(signs[3+offset]?.[0]||'',T.signins.tz);
  const ca=H.map((r,i)=>({r,i,t:stamp(r[0],C.finance.changes.tz)})).filter(x=>x.r[3]==='IBAN'&&[10,80].includes(x.t-anchor));
  const pa=P.map((r,i)=>({r,i,t:stamp(r[0],C.finance.payments.tz)})).filter(x=>x.r[5]==='Executed'&&[5,82].includes(late-x.t));
  hit('v3 change / common sign-in plus 10 or 80',ca.length===1?ca[0].i:null,S.changeRow,1/H.length);
  hit('v3 payment / common late sign-in minus 5 or 82',pa.length===1?pa[0].i:null,S.paymentRow,1/P.length);
  const refs=new Set(H.map(r=>r[7]));
  const orphans=F.flatMap(p=>T.signins.byUser[p.user].slice(4+offset).filter(s=>!refs.has(s[1])).map(s=>({p,s})));
  const orphan=orphans[0],ot=orphan&&stamp(orphan.s[0],T.signins.tz);
  const nc=orphan?H.map((r,i)=>({r,i,t:stamp(r[0],C.finance.changes.tz)})).filter(x=>x.r[3]==='IBAN'&&x.r[6]===orphan.p.user&&x.t>=ot).sort((a,b)=>a.t-b.t):[];
  hit('v3 change / orphan then next',orphans.length===1?nc[0]?.i:null,S.changeRow,1/H.length);
  if(S.layout==='insider'){
    hit('v3 identity / singleton request recipient',actor?.id,S.who,1/F.length);
    hit('v3 identity / orphan trailing sign-in',orphans.length===1?orphan.p.id:null,S.who,1/F.length);
  }
  const sup=single&&C.finance.suppliers.find(s=>text(single.body).includes(s.id));
  const current=sup&&iban(sup.ibanOnFile)===ibans(single.body)[0];
  const homes=new Set(Object.values(T.accounts.accounts).map(r=>r.find(v=>v[0]==='Home address')[1]));
  const ids=new Set(Object.values(C.web.banklookup).map(b=>b.companyId)),bank=C.web.registry.companies.filter(c=>ids.has(c.id));
  const homeCount=bank.filter(c=>homes.has(c.address)).length;
  const exactCount=bank.filter(c=>C.staff.some(p=>c.director===p.name&&T.accounts.accounts[p.id].some(r=>r[0]==='Home address'&&r[1]===c.address))).length;
  hit('v3 layout / singleton current master',current?'lookalike':'insider',S.layout,1/3);
  hit('v3 layout / bank homes threshold',homeCount>=2?'insider':'mfa',S.layout,1/3);
  const layout=homeCount>=2?'insider':current?'lookalike':'mfa';
  hit('v3 layout / bank homes plus singleton',layout,S.layout,1/3);
  hit('v3 layout / exact director-home plus singleton',exactCount>=2?'insider':current?'lookalike':'mfa',S.layout,1/3);
  hit('v3 whole / composed shortcuts',layout===S.layout&&(layout==='insider'?actor?.id:'outsider')===S.who&&ca[0]?.i===S.changeRow&&nextPay(ca[0])?.i===S.paymentRow,true,0);
  const chatAt=stamp(C.chats.find(c=>c.id==='finance').msgs[0][1],C.chatTz);
  const cc=H.map((r,i)=>({r,i,t:stamp(r[0],C.finance.changes.tz)})).filter(x=>x.r[3]==='IBAN'&&[7,77].includes(x.t-chatAt));
  hit('v3 chat / change plus 7 or 77',cc.length===1?cc[0].i:null,S.changeRow,1/H.length);
  hit('v3 chat / change then next payment',nextPay(cc[0])?.i,S.paymentRow,1/P.length);
}
function run({generate,from=1,to=10000,problems=[]}) {
  const ranges=[[from,Math.min(to,5000)],[Math.max(from,5001),to]].filter(([a,b])=>b>=a),train=[],tests=ranges.map(()=>[]),metrics=ranges.map(()=>({}));
  const visible=C=>Object.fromEntries(Object.entries(C).filter(([k])=>!['secret','twists','traps'].includes(k)));
  const row=(seed)=>{const C=generate(seed),S=C.secret,E=extract(visible(C));return {E,S,incident:E.episodes.findIndex(e=>e.change===S.changeRow),who:E.F.findIndex(p=>p.id===S.who),layout:layouts.indexOf(S.layout)};};
  console.log('CONSTRUCTION: train 100001..104000; holdout ranges '+JSON.stringify(ranges));
  for(let seed=100001;seed<=104000;seed++)train.push(row(seed));
  for(let j=0;j<ranges.length;j++)for(let seed=ranges[j][0];seed<=ranges[j][1];seed++){
    const C=generate(seed),S=C.secret,E=extract(visible(C));
    if(E.episodes.every(e=>e.change!==S.changeRow))throw Error('Missing incident candidate '+seed);
    tests[j].push({E,S,incident:E.episodes.findIndex(e=>e.change===S.changeRow),who:E.F.findIndex(p=>p.id===S.who),layout:layouts.indexOf(S.layout)});
    attacks(visible(C),S,E,(name,hit,prior)=>{const r=metrics[j][name]||={hits:0,n:0,prior:0};r.hits+=+hit;r.n++;r.prior+=prior;});
  }
  for(const task of ['episode','layout','identity']) {
    const tr=task==='identity'?train.filter(r=>r.who>=0):train;
    const items=r=>task==='episode'?r.E.episodes.map(e=>e.f):task==='identity'?r.E.people:[r.E.aggregate];
    const keys=[...new Set(tr.flatMap(r=>items(r).flatMap(f=>Object.keys(f))))],vec=f=>keys.map(k=>f[k]||0);
    const target=r=>task==='episode'?r.incident:task==='identity'?r.who:r.layout;
    const training=tr.flatMap(r=>items(r).map((f,i)=>({x:vec(f),y:task==='layout'?r.layout:+(i===target(r))})));
    for(const model of ['depth4-tree','NB']) {
      const m=model==='depth4-tree'?treeFit(training,task==='layout'?3:2,4):nbFit(training,task==='layout'?3:2);
      const score=f=>model==='depth4-tree'?treeScore(m,vec(f)):nbScore(m,vec(f));
      for(let j=0;j<ranges.length;j++) {
        const te=task==='identity'?tests[j].filter(r=>r.who>=0):tests[j];let hits=0,prior=0;
        for(const r of te) {
          const candidates=items(r),pred=task==='layout'?argmax(score(candidates[0])):argmax(candidates.map(f=>{const v=score(f);return model==='depth4-tree'?v[1]:v[1]-v[0];}));
          hits+=+(pred===target(r));prior+=task==='layout'?1/3:1/candidates.length;
        }
        metrics[j][`construction ${model} / ${task} (${keys.length} features)`]={hits,n:te.length,prior};
      }
    }
  }
  const summaries=ranges.map((range,j)=>({range,training:[100001,104000],results:Object.entries(metrics[j]).map(([name,r])=>{
    const accuracy=r.hits/r.n,prior=r.prior/r.n,limit=prior+.1;
    console.log(`  ${range.join('..')} ${name}: ${r.hits}/${r.n} ${(100*accuracy).toFixed(2)}%; prior ${(100*prior).toFixed(2)}%, limit ${(100*limit).toFixed(2)}%`);
    if(accuracy>limit)problems.push(`${range.join('..')} ${name} exceeds prior+10pp`);
    return {name,...r,prior,accuracy,limit};
  })}));
  if(process.env.PF_CASE2_CONSTRUCTION_JSON)fs.writeFileSync(process.env.PF_CASE2_CONSTRUCTION_JSON,JSON.stringify(summaries,null,2));
  return summaries;
}
module.exports={extract,attacks,run};
if(require.main===module){const problems=[];run({generate:require(path.resolve(process.env.GEN2||path.join(__dirname,'gen2.js'))).generate,from:Number(process.argv[2]||1),to:Number(process.argv[3]||10000),problems});console.log('CONSTRUCTION problems: '+JSON.stringify(problems));process.exitCode=problems.length?1:0;}
