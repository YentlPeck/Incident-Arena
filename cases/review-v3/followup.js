'use strict';
const fs=require('fs'),vm=require('vm');
const root='C:/Users/yentl/.t3/projects/pixelforge/';
const {generate}=require(root+'cases/gen2.js');
const {ibans,iban,stamp,text}=require(root+'cases/solve2.js');
const m={};function hit(k,p,t,prior){let v=m[k]||={hit:0,n:0,prior:0};v.hit+=+(p===t);v.n++;v.prior+=prior;}
for(let seed=2001;seed<=10000;seed++){
 const C=generate(seed),S=C.secret;delete C.secret;delete C.twists;delete C.traps;
 const T=Object.fromEntries(C.security.tabs.map(t=>[t.id,t])), F=C.staff.filter(p=>p.dept==='Finance');
 const homes=new Set(Object.values(T.accounts.accounts).map(rows=>rows.find(r=>r[0]==='Home address')[1]));
 const mapped=new Set(Object.values(C.web.banklookup).map(b=>b.companyId));
 const bankHomes=C.web.registry.companies.filter(co=>mapped.has(co.id)&&homes.has(co.address)).length;
 const req=C.emails.filter(e=>/^Bank details update REQ-/.test(e.subject));
 const a=req.map(e=>ibans(e.body)[0]),single=req.find((e,i)=>a.filter(x=>x===a[i]).length===1);
 const sup=C.finance.suppliers.find(s=>text(single.body).includes(s.id));
 const current=iban(sup.ibanOnFile)===ibans(single.body)[0];
 const predicted=bankHomes>=2?'insider':current?'lookalike':'mfa';
 hit('layout / bank-mapped-home count plus singleton-request current account',predicted,S.layout,1/3);
 hit('layout / bank-mapped-home count only; otherwise mfa',bankHomes>=2?'insider':'mfa',S.layout,1/3);
 const actor=C.staff.find(p=>p.email===single.to);
 const P=C.finance.payments.rows,H=C.finance.changes.rows;
 const signs=T.signins.byUser[F[0].user];
 const offset=signs[0][4]==='Existing trusted device'?1:0;
 const at=stamp(signs[1+offset][0],T.signins.tz);
 const selected=H.map((r,i)=>({r,i,t:stamp(r[0],C.finance.changes.tz)})).filter(x=>x.r[3]==='IBAN'&&[10,80].includes(x.t-at));
 const c=selected[0];
 const p=c&&P.map((r,i)=>({r,i,t:stamp(r[0],C.finance.payments.tz)})).filter(x=>x.r[5]==='Executed'&&x.r[3]===c.r[2]&&iban(x.r[6])===iban(c.r[5])&&x.t>=c.t).sort((a,b)=>a.t-b.t)[0];
 const predWho=predicted==='insider'?actor.id:'outsider';
 hit('whole answer / shortcut composition',predicted===S.layout&&predWho===S.who&&c?.i===S.changeRow&&p?.i===S.paymentRow,true,0);
 if([2001,2003,2006].includes(seed))console.log(JSON.stringify({seed,layout:S.layout,bankMappedHomeMatches:bankHomes,requestMatchesMaster:current,request:single.subject,recipient:actor.name,normal:signs[1+offset][0],change:c.r,payment:p.r,requestAccounts:req.map(e=>({subject:e.subject,to:e.to,account:ibans(e.body)[0]}))},null,2));
}
console.log(JSON.stringify(Object.fromEntries(Object.entries(m).map(([k,v])=>[k,{hits:v.hit,n:v.n,accuracy:v.hit/v.n,prior:v.prior/v.n}])),null,2));
// Render directly with the current engine, with no browser or model/player run.
const code=fs.readFileSync(root+'cases/gameR2.js','utf8').replace(/  boot\(\);\s*\}\)\(\);\s*$/,'  window.review={C,S,renderMail,renderFinance,renderSecurity,renderCase,page};\n})();');
for(const seed of [2001,2003,2006]){
 const C=generate(seed);const ctx={URL,URLSearchParams,location:{href:`http://local/case2.html?seed=${seed}`},window:{PFCase2:{generate:()=>C},addEventListener(){}},document:{addEventListener(){}},setTimeout(){},setInterval(){},ICONS:new Proxy({},{get:()=>['.']}),PALETTE:{}};
 vm.runInNewContext(code,ctx);const A=ctx.window.review;
 const who=C.staff.find(p=>p.id===C.secret.who)||C.staff.find(p=>p.user===C.finance.changes.rows[C.secret.changeRow][6]);
 A.S.sec.query=who.user;A.S.sec.user=who.user;
 const sec=text(A.renderSecurity());A.S.finance.tab='changes';const fin=text(A.renderFinance());
 const request=C.emails.find(e=>e.to===who.email&&/^Bank details update/.test(e.subject));A.S.mail.sel=request.id;
 const mail=text(A.renderMail());
 console.log(JSON.stringify({renderedSeed:seed,changeSessionInFinance:fin.includes(C.finance.changes.rows[C.secret.changeRow][7]),changeSessionInSecurity:sec.includes(C.finance.changes.rows[C.secret.changeRow][7]),requestIBANInMail:ibans(mail).includes(ibans(request.body)[0]),normalSigninTable:text(A.renderSecurity()).slice(-2200)}));
}
