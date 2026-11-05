const {generate}=require('C:/Users/yentl/.t3/projects/pixelforge/cases/gen2.js');
const {stamp}=require('C:/Users/yentl/.t3/projects/pixelforge/cases/solve2.js');
let change=0,payment=0;const example=[];
for(let seed=2001;seed<=10000;seed++){
 const C=generate(seed),S=C.secret;delete C.secret;delete C.traps;delete C.twists;
 const chat=C.chats.find(c=>c.id==='finance').msgs[0],at=stamp(chat[1],C.chatTz);
 const H=C.finance.changes.rows,P=C.finance.payments.rows;
 const candidates=H.map((r,i)=>({r,i,t:stamp(r[0],C.finance.changes.tz)})).filter(x=>x.r[3]==='IBAN'&&[7,77].includes(x.t-at));
 const c=candidates[0];change+=+(candidates.length===1&&c.i===S.changeRow);
 const p=c&&P.map((r,i)=>({r,i,t:stamp(r[0],C.finance.payments.tz)})).filter(x=>x.r[5]==='Executed'&&x.r[3]===c.r[2]&&x.r[6]===c.r[5]&&x.t>=c.t).sort((a,b)=>a.t-b.t)[0];payment+=+(p?.i===S.paymentRow);
 if([2001,2003,2006].includes(seed))example.push({seed,layout:S.layout,chatTime:chat[1],gap:c.t-at,change:c.r[1],payment:p.r[1]});
}
console.log(JSON.stringify({holdout:'2001..10000',change:{hits:change,n:8000},payment:{hits:payment,n:8000},example},null,2));
