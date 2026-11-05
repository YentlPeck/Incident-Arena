const {generate}=require('C:/Users/yentl/.t3/projects/pixelforge/cases/gen2.js');
const {ibans,iban,text}=require('C:/Users/yentl/.t3/projects/pixelforge/cases/solve2.js');
for(const [from,to] of [[2001,10000],[100001,102000]]){
 let hits=0,oldFails=[];
 for(let seed=from;seed<=to;seed++){
  const C=generate(seed),truth=C.secret.layout;delete C.secret;delete C.traps;delete C.twists;
  const ac=C.security.tabs.find(t=>t.kind==='accounts').accounts;
  const bankIds=new Set(Object.values(C.web.banklookup).map(x=>x.companyId));
  const B=C.web.registry.companies.filter(co=>bankIds.has(co.id));
  const old=B.filter(co=>C.staff.some(p=>ac[p.id].some(r=>r[0]==='Home address'&&r[1]===co.address))).length;
  const n=B.filter(co=>C.staff.some(p=>p.name===co.director&&ac[p.id].some(r=>r[0]==='Home address'&&r[1]===co.address))).length;
  const req=C.emails.filter(e=>/^Bank details update REQ-/.test(e.subject));const a=req.map(e=>ibans(e.body)[0]);
  const single=req.find((e,i)=>a.filter(x=>x===a[i]).length===1);const s=C.finance.suppliers.find(s=>text(single.body).includes(s.id));
  const current=iban(s.ibanOnFile)===ibans(single.body)[0];
  const pred=n>=2?'insider':current?'lookalike':'mfa';hits+=+(pred===truth);
  if((old>=2?'insider':current?'lookalike':'mfa')!==truth)oldFails.push(seed);
 }
 console.log(JSON.stringify({from,to,hits,n:to-from+1,oldAddressOnlyFailures:oldFails}));
}
