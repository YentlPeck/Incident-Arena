'use strict';
// Adversarial, visible-only feature audit. No labels enter extraction or rendering.
const fs = require('fs'), vm = require('vm');
const { text, iban, ibans, stamp } = require('./solve2.js');
const layouts = ['insider', 'lookalike', 'mfa'];
const argmax = a => a.reduce((best, x, i) => x > a[best] ? i : best, 0);
const tokens = s => { const out = {}; for (const t of s.toLowerCase().match(/[a-z0-9]+(?:[._@-][a-z0-9]+)*/g) || []) out[t] = (out[t] || 0) + 1; return out; };
function renderer(generate) {
  let code = fs.readFileSync(require.resolve('./gameR2.js'), 'utf8');
  code = code.replace('const C = window.PFCase2.generate(seed);', 'let C = window.PFCase2.generate(seed);');
  code = code.replace('  boot();', '  const initial=JSON.stringify(S); window.audit={S,set(c){C=c;Object.assign(S,JSON.parse(initial));},renderCase,renderMail,renderChat,renderFinance,renderSecurity,renderFiles,page};');
  const ctx = { URL, URLSearchParams, location: { href: 'http://local/case2.html?seed=1' }, window: { PFCase2: { generate }, addEventListener() {} }, document: { addEventListener() {} }, ICONS: new Proxy({}, { get() { return ['.']; } }), PALETTE: {}, setTimeout() {}, setInterval() {} };
  vm.createContext(ctx); vm.runInContext(code, ctx);
  const A = ctx.window.audit;
  if (!A) throw Error('Rendered-text audit hook failed');
  const txt = h => text(h.replace(/<input\b[^>]*\bvalue="([^"]*)"[^>]*>/g, ' $1 '));
  const section = h => h.match(/<section class="mail-read">([\s\S]*)<\/section>/)?.[1] || h;
  return C => {
    A.set(C); const S = A.S, parts = {};
    parts.case = txt(A.renderCase()) + ' ' + text(C.intro) + ' ' + C.date;
    parts.mail = C.emails.map(m => { S.mail.sel = m.id; return txt(section(A.renderMail())); }).join(' ');
    parts.chat = C.chats.map(c => { S.chat.sel = c.id; return txt(section(A.renderChat())); }).join(' ');
    parts.docs = C.files.map(f => { S.files.open = f.id; return txt(section(A.renderFiles())); }).join(' ');
    parts.finance = ['suppliers', 'payments', 'changes'].map(t => { S.finance.tab = t; return txt(A.renderFinance()); }).join(' ');
    parts.security = C.security.tabs.map(t => { S.sec.tab = t.id; return C.staff.map(p => { S.sec.person = p.id; S.sec.query = p.user; S.sec.user = p.user; return txt(A.renderSecurity()); }).join(' '); }).join(' ');
    const page = (host, path = '') => txt(A.page({ host, path, q: new URLSearchParams() }));
    parts.pages = page(C.web.company.host) + ' ' + page(C.web.company.host, '/team') + ' ' + [...Object.keys(C.web.suppliers), ...Object.keys(C.web.pages)].map(h => page(h)).join(' ');
    parts.whois = Object.entries(C.web.whois).map(([domain, rows]) => { S.browser.whoisQuery = domain; S.browser.whoisShown = { domain, rows }; return page('domaininfo.net'); }).join(' ');
    parts.registry = C.web.registry.companies.map(co => { S.browser.registryQuery = co.name; S.browser.registryShown = [co]; return page('companyregister.eu'); }).join(' ');
    parts.bank = Object.entries(C.web.banklookup).map(([key, hit]) => { S.browser.ibanQuery = key; S.browser.ibanShown = { iban: key, hit }; return page('ibancheck.eu'); }).join(' ');
    parts.chirper = page('chirper.social') + ' ' + Object.keys(C.web.chirper).map(h => page('chirper.social', '/@' + h)).join(' ');
    return parts;
  };
}
function normStaff(s, C) {
  C.staff.forEach((p, i) => { for (const value of [p.email, p.user, p.id, p.name, p.handle].sort((a,b) => b.length-a.length)) s = s.split(value).join(' PERSON' + i + ' '); });
  return s;
}
function extract(C, parts) {
  const f = {}, finance = C.staff.filter(p => p.dept === 'Finance'), P = C.finance.payments.rows, H = C.finance.changes.rows;
  const tabs = Object.fromEntries(C.security.tabs.map(t => [t.id, t]));
  const homes = C.staff.map(p => tabs.accounts.accounts[p.id].find(r => r[0] === 'Home address')[1]);
  const companies = C.web.registry.companies;
  const whole = Object.values(parts).join(' ').replace(/Case #\d+/g, 'Case');
  const measures = (prefix, values) => {
    const freq = {}; values.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
    const n = Object.keys(freq).length, counts = Object.values(freq);
    f[prefix + '.distinct'] = n; f[prefix + '.duplicates'] = values.length - n;
    f[prefix + '.maxRepeat'] = Math.max(0, ...counts);
    f[prefix + '.repeatedValues'] = counts.filter(n => n > 1).length;
    for (let n = 1; n <= 12; n++) f[prefix + '.multiplicity' + n] = counts.filter(v => v === n).length;
  };
  const financeIBAN = [...P.map(r => iban(r[6])), ...H.filter(r => r[3] === 'IBAN').flatMap(r => [iban(r[4]), iban(r[5])])];
  measures('financeMail.iban', [...financeIBAN, ...C.emails.flatMap(m => ibans(m.body))]);
  measures('mail.iban', C.emails.flatMap(m => ibans(m.body)));
  measures('accountsRegistry.address', [...homes, ...companies.map(c => c.address)]);
  measures('registry.address', companies.map(c => c.address));
  measures('registry.units', [...homes, ...companies.map(c => c.address)].map(a => /unit (\d+)/.exec(a)?.[1] || ''));
  const scopes = { all: whole, mail: parts.mail, chat: parts.chat, docs: parts.docs, finance: parts.finance, security: parts.security, registry: parts.registry, bank: parts.bank };
  for (const [scope, s] of Object.entries(scopes)) {
    measures(scope + '.iban', ibans(s));
    for (const [type, re] of Object.entries({ domain: /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:eu|art|audio|design|studio|social|net)\b/gi, session: /\bSES-\d{7}\b/g, challenge: /\bCH-\d{7}\b/g, request: /\bREQ-\d{4}\b/g, company: /\bEU-\d{7}\b/g })) measures(scope + '.' + type, s.match(re) || []);
    measures(scope + '.companyNames', companies.flatMap(co => Array.from({length: s.split(co.name).length - 1}, () => co.name)));
    for (const suffix of ['BV', 'SRL', 'Cooperative', 'Association']) f[scope + '.suffix.' + suffix] = (s.match(new RegExp('\\b' + suffix + '\\b', 'g')) || []).length;
    const normalized = normStaff(s, C);
    C.staff.forEach((p, i) => { f[scope + '.person.' + i] = (normalized.match(new RegExp('\\bPERSON' + i + '\\b', 'g')) || []).length; });
  }
  const requests = C.emails.filter(m => /Bank details update|Payment account request/.test(m.subject));
  const holders = requests.map(m => C.web.banklookup[ibans(m.body)[0]]).filter(Boolean);
  measures('requestHolder.names', holders.map(h => h.holder));
  for (const suffix of ['BV', 'SRL', 'Cooperative', 'Association']) {
    f['requestHolder.suffix.' + suffix] = holders.filter(h => new RegExp('\\b' + suffix + '$').test(h.holder)).length;
    // Also retain the most recent request's suffix: a holder label is not the
    // linked request-reference + changed-IBAN proof, and receives no exemption.
    f['latestRequestHolder.suffix.' + suffix] = +(!!holders[0] && new RegExp('\\b' + suffix + '$').test(holders[0].holder));
  }
  f.staffDirectorNames = companies.filter(co => C.staff.some(p => p.name === co.director)).length;
  f.staffDirectorFullHomes = companies.filter(co => C.staff.some((p, i) => p.name === co.director && homes[i] === co.address)).length;
  f.registryStaffAddresses = companies.filter(co => homes.includes(co.address)).length;
  for (const [name, rows] of [['payment', P], ['change', H]]) {
    f[name + '.rows'] = rows.length;
    rows.forEach((r, i) => {
      f[name + '.row' + i + '.iban'] = name === 'change' ? +(r[3] === 'IBAN') : ibans(r[6]).length;
      f[name + '.row' + i + '.executed'] = name === 'payment' ? +(r[5] === 'Executed') : 0;
    });
  }
  const person = finance.map(p => {
    const i = C.staff.indexOf(p), x = { staffPosition: i, financePosition: finance.indexOf(p) };
    for (const scope of Object.keys(scopes)) x[scope + '.mentions'] = f[scope + '.person.' + i];
    x.changes = H.filter(r => r[6] === p.user).length;
    x.signins = tabs.signins.byUser[p.user].length;
    // Deliberately no director==changer/home or session/challenge/reference joins.
    return x;
  });
  const rowFeatures = (rows, name) => rows.map((r, i) => {
    const when = stamp(r[0], C.finance[name === 'payment' ? 'payments' : 'changes'].tz);
    const x = { position: i, chronological: rows.filter(x => stamp(x[0], C.finance[name === 'payment' ? 'payments' : 'changes'].tz) < when).length,
      supplierPosition: C.finance.suppliers.findIndex(p => p.id === r[name === 'payment' ? 3 : 2]),
      supplierFrequency: rows.filter(x => x[name === 'payment' ? 3 : 2] === r[name === 'payment' ? 3 : 2]).length,
      hour: new Date(when * 60000).getUTCHours(), minute: when % 60 };
    if (name === 'payment') Object.assign(x, { executed: +(r[5] === 'Executed'), amount: Number(r[4].replace(/[^0-9.]/g, '')), invoiceRepeats: rows.filter(x => x[2] === r[2]).length,
      ibanRepeats: rows.filter(x => x[6] === r[6]).length, ibanLength: iban(r[6]).length });
    else Object.assign(x, { isIBAN: +(r[3] === 'IBAN'), ibanOrdinal: rows.slice(0,i).filter(x => x[3] === 'IBAN').length,
      byPosition: finance.findIndex(p => p.user === r[6]), changerRepeats: rows.filter(x => x[6] === r[6]).length,
      sessionRepeats: rows.filter(x => x[7] === r[7]).length, requestRepeats: rows.filter(x => x[8].match(/REQ-\d+/)?.[0] === r[8].match(/REQ-\d+/)?.[0]).length,
      oldLength: r[4].length, newLength: r[5].length });
    return x;
  });
  const normalized = normStaff(whole, C), lexical = whole.replace(/\b(?:INV|REQ|SES|CH|CHG|PAY|SUP|EU|PC)-[A-Z0-9-]+\b/g, ' ID ').replace(/\b\w*\d\w*\b/g, ' NUMBER ');
  const payment = rowFeatures(P,'payment'), change = rowFeatures(H,'change');
  for (const [scope, rows] of [['payment',payment],['change',change]]) rows.forEach((r,i) => Object.entries(r).forEach(([key,value]) => {f[scope+'.candidate'+i+'.'+key]=value;}));
  return { f, person, payment, change, bows: { raw: tokens(whole), lexical: tokens(lexical), normalized: tokens(normalized) }, finance };
}
function treeFit(rows, classes, depth = 3) {
  const counts = Array(classes).fill(0); rows.forEach(r => counts[r.y]++);
  const probs = counts.map(c => c / rows.length);
  if (!depth || counts.filter(Boolean).length < 2 || rows.length < 40) return { probs };
  const loss = counts => { const n = counts.reduce((a,b) => a+b,0); return n ? n-counts.reduce((a,b) => a+b*b,0)/n : 0; };
  let best = null, base = loss(counts);
  for (let j = 0; j < rows[0].x.length; j++) {
    const values = [...new Set(rows.map(r => r.x[j]))].sort((a,b) => a-b);
    if (values.length < 2) continue;
    const limits = values.length <= 18 ? values.slice(0,-1).map((v,i) => (v+values[i+1])/2) : Array.from({length:16}, (_,i) => values[Math.floor((i+1)*values.length/17)]);
    for (const t of limits) {
      const left = Array(classes).fill(0), right = counts.slice();
      rows.forEach(r => { if (r.x[j] <= t) { left[r.y]++; right[r.y]--; } });
      if (Math.min(left.reduce((a,b)=>a+b,0),right.reduce((a,b)=>a+b,0)) < 20) continue;
      const value = loss(left)+loss(right);
      if (value < base && (!best || value < best.loss)) best = { j, t, loss:value };
    }
  }
  if (!best) return { probs };
  return { ...best, left: treeFit(rows.filter(r => r.x[best.j] <= best.t), classes,depth-1), right: treeFit(rows.filter(r => r.x[best.j] > best.t),classes,depth-1) };
}
function treeScore(model,x) { while (!model.probs) model = x[model.j] <= model.t ? model.left : model.right; return model.probs; }
function nbFit(rows, classes) {
  const counts = Array(classes).fill(1), buckets = rows[0].x.map(() => new Map());
  rows.forEach(({x,y}) => { counts[y]++; x.forEach((v,j) => { const b = buckets[j].get(v) || Array(classes).fill(0); b[y]++; buckets[j].set(v,b); }); });
  return { counts, buckets };
}
function nbScore(m,x) {
  const total=m.counts.reduce((a,b)=>a+b,0), scores=m.counts.map(n=>Math.log(n/total));
  x.forEach((v,j) => { const b=m.buckets[j].get(v)||[]; scores.forEach((_,k)=> { scores[k]+=Math.log(((b[k]||0)+1)/(m.counts[k]-1+m.buckets[j].size+1)); }); });
  return scores;
}
function bowFit(rows, classes, minDF = 10) {
  const df = new Map(); rows.forEach(r => Object.keys(r.bow).forEach(w => df.set(w,(df.get(w)||0)+1)));
  const vocab = new Map([...df].filter(([w,n])=>n>=minDF).map(([w],i)=>[w,i]));
  const wc=Array.from({length:classes},()=>new Float64Array(vocab.size).fill(1)), dc=Array(classes).fill(1);
  rows.forEach(({bow,y})=>{dc[y]++; for (const [w,n] of Object.entries(bow)) if(vocab.has(w)) wc[y][vocab.get(w)]+=n;});
  const log=wc.map(a=> { const sum=a.reduce((x,y)=>x+y,0); return a.map(n=>Math.log(n/sum)); });
  return {vocab,log,prior:dc.map(n=>Math.log(n/dc.reduce((a,b)=>a+b,0)))};
}
function bowScore(m,bow) { const scores=m.prior.slice(); for(const [w,n] of Object.entries(bow)) { const j=m.vocab.get(w); if(j!==undefined) scores.forEach((_,k)=>scores[k]+=n*m.log[k][j]); } return scores; }
const percent = x => (100*x).toFixed(2)+'%';
function run({generate,from,to,problems}) {
  const render = renderer(generate), train=[], test=[], baseline={};
  function record(task,name,pred,truth,prior) { const key=task+' / '+name, r=baseline[key] ||= {hits:0,n:0,prior:0}; r.hits+=+(pred===truth);r.n++;r.prior+=prior; }
  console.log('ADVERSARIAL: collecting visible aggregates and actual engine-rendered text, train 1..4000 / holdout 4001..6000');
  for(let seed=1;seed<=Math.max(6000,to);seed++) {
    if(seed>6000 && (seed<from||seed>to)) continue;
    const C=generate(seed), S=C.secret;
    const visible=Object.fromEntries(Object.entries(C).filter(([k])=>!['secret','twists','traps'].includes(k)));
    if(seed%2000===0) console.log('  rendered seed '+seed);
    const parts=render(visible), E=extract(visible,parts), P=C.finance.payments.rows,H=C.finance.changes.rows;
    const truthPerson=E.finance.findIndex(p=>p.id===S.who);
    if(seed<=6000) {
      const row={seed,layout:layouts.indexOf(S.layout),who:truthPerson,labels:{layout:layouts.indexOf(S.layout),who:truthPerson,payment:S.paymentRow,change:S.changeRow},...E};
      for (const k of ['layout','who','payment','change']) if(!Number.isInteger(row.labels[k])) throw Error('Invalid classifier label '+k);
      (seed<=4000?train:test).push(row);
    }
    if(seed<from||seed>to) continue;
    const priors={layout:1/3,identity:1/E.finance.length,payment:1/P.length,change:1/H.length};
    record('layout','constant insider',0,layouts.indexOf(S.layout),priors.layout);
    record('layout','reviewer two-count threshold',E.f['financeMail.iban.distinct']===5?1:E.f['accountsRegistry.address.distinct']<=15?0:2,layouts.indexOf(S.layout),priors.layout);
    if(S.layout==='insider') {
      const names=['first finance','last finance','most mail mentions','least mail mentions','most chat mentions','most doc mentions','most total mentions','Quarter-end cover recipient','clock chat speaker','latest request recipient'];
      const personIndex=p=>E.finance.findIndex(f=>f.id===p?.id);
      const choose=(scope,least=false)=>argmax(E.person.map(p=>(least?-1:1)*p[scope+'.mentions']));
      const latest=C.emails.filter(m=>/Bank details update/.test(m.subject)).sort((a,b)=>stamp(b.time,C.mailTz)-stamp(a.time,C.mailTz))[0];
      const preds=[0,E.finance.length-1,choose('mail'),choose('mail',true),choose('chat'),choose('docs'),choose('all'),personIndex(C.staff.find(p=>p.email===C.emails.find(m=>m.subject==='Quarter-end cover').to)),personIndex(C.staff.find(p=>p.name===C.chats.find(c=>c.id==='ops').msgs[1][0])),personIndex(C.staff.find(p=>p.email===latest.to))];
      names.forEach((n,i)=>record('identity',n,preds[i],truthPerson,priors.identity));
    }
    for(const [task,rows,truth] of [['payment',P,S.paymentRow],['change',H,S.changeRow]]) {
      const ordered=rows.map((r,i)=>i).sort((a,b)=>stamp(rows[a][0],C.finance[task==='payment'?'payments':'changes'].tz)-stamp(rows[b][0],C.finance[task==='payment'?'payments':'changes'].tz));
      for(let n=0;n<rows.length;n++) { record(task,'display nth '+(n+1),n,truth,priors[task]); record(task,'chronological nth '+(n+1),ordered[n],truth,priors[task]); }
      record(task,'last displayed',rows.length-1,truth,priors[task]);
      if(task==='payment') {
        record(task,'largest amount',argmax(rows.map(r=>Number(r[4].replace(/[^0-9.]/g,'')))),truth,priors[task]);
        record(task,'first supplier first payment',rows.findIndex(r=>r[3]===C.finance.suppliers[0].id),truth,priors[task]);
      } else {
        const bank=ordered.filter(i=>rows[i][3]==='IBAN');
        bank.forEach((i,n)=>record(task,'chronological nth IBAN '+(n+1),i,truth,priors[task]));
        rows.map((r,i)=>i).filter(i=>rows[i][3]==='IBAN').forEach((i,n)=>record(task,'display nth IBAN '+(n+1),i,truth,priors[task]));
        const night=bank.filter(i=>{const h=new Date((stamp(rows[i][0],C.finance.changes.tz)+60)*60000).getUTCHours();return h>=20||h<6;});
        record(task,'latest night change',night.at(-1)??-1,truth,priors[task]);
        const biggest=P[argmax(P.map(r=>Number(r[4].replace(/[^0-9.]/g,''))))];
        const matching=bank.filter(i=>rows[i][2]===biggest[3]&&iban(rows[i][5])===iban(biggest[6])&&stamp(rows[i][0],C.finance.changes.tz)<=stamp(biggest[0],C.finance.payments.tz));
        record(task,'change matching largest payment',matching.at(-1)??-1,truth,priors[task]);
      }
    }
  }
  const results=[];
  function report(name,hits,n,prior) {
    const accuracy=hits/n;results.push({name,hits,n,prior,accuracy,limit:prior+.1});
    console.log(`  ${name}: ${hits}/${n} ${percent(accuracy)}; prior ${percent(prior)}, limit ${percent(prior+.1)}`);
    if(accuracy>prior+.1) problems.push(`ADVERSARIAL ${name}: ${percent(accuracy)} > own prior+10pp ${percent(prior+.1)}`);
  }
  for(const [name,r] of Object.entries(baseline)) report('baseline '+name,r.hits,r.n,r.prior/r.n);
  const keys=[...new Set(train.flatMap(r=>Object.keys(r.f)))];
  for(const task of ['layout','who','payment','change']) {
    const candidates=task==='layout'?null:task==='who'?'person':task;
    const tr=task==='who'?train.filter(r=>r.who>=0):train, te=task==='who'?test.filter(r=>r.who>=0):test;
    const kk=candidates?Object.keys(tr[0][candidates][0]):keys;
    const x=o=>kk.map(k=>o[k]||0);
    const rows=tr.flatMap(r=>candidates?r[candidates].map((v,i)=>({x:x(v),y:+(i===r.labels[task])})):[{x:x(r.f),y:r.layout}]);
    const prior=task==='layout'?1/3:te.reduce((n,r)=>n+1/r[candidates].length,0)/te.length;
    for(const model of ['depth3-tree','aggregate-NB']) {
      const fitted=model==='depth3-tree'?treeFit(rows,candidates?2:3):nbFit(rows,candidates?2:3);
      const score=v=>model==='depth3-tree'?treeScore(fitted,x(v)):nbScore(fitted,x(v));
      let hits=0;
      for(const r of te) {
        const pred=candidates?argmax(r[candidates].map(v=>{const s=score(v);return model==='depth3-tree'?s[1]:s[1]-s[0];})):argmax(score(r.f));
        hits+=+(pred===r.labels[task]);
      }
      report(`${model} ${task}`,hits,te.length,prior);
    }
    if (candidates) {
      // Multiclass global models consume EVERY aggregate, including per-person and
      // per-row positions. Candidate ranking above additionally tests local row tells.
      const target=r=>task==='who'?r.person[r.who].staffPosition:r.labels[task];
      const classes=task==='who'?11:Math.max(...train.map(r=>r[candidates].length));
      const globalKeys=keys, gx=r=>globalKeys.map(k=>r.f[k]||0);
      const gr=tr.map(r=>({x:gx(r),y:target(r)}));
      for(const model of ['global-depth3-tree','global-aggregate-NB']) {
        const m=model==='global-depth3-tree'?treeFit(gr,classes):nbFit(gr,classes);
        let hits=0;
        for(const r of te) {
          const scores=model==='global-depth3-tree'?treeScore(m,gx(r)):nbScore(m,gx(r));
          const allowed=task==='who'?r.person.map(p=>p.staffPosition):Array.from({length:r[candidates].length},(_,i)=>i);
          hits+=+(allowed[argmax(allowed.map(i=>scores[i]))]===target(r));
        }
        report(`${model} ${task}`,hits,te.length,prior);
      }
    }
    for(const field of ['raw','lexical','normalized']) {
      const classes=task==='layout'?3:task==='who'?11:Math.max(...train.map(r=>r[candidates].length));
      // Reviewer's exact rendered-text multinomial NB, including df>=10 and Laplace=1.
      const target=r=>task==='who'?r.finance[r.who] && r.person[r.who].staffPosition:r.labels[task];
      const m=bowFit(tr.map(r=>({bow:r.bows[field],y:target(r)})),classes);
      let hits=0;
      for(const r of te) {
        const scores=bowScore(m,r.bows[field]);
        const allowed=task==='who'?r.person.map(p=>p.staffPosition):Array.from({length:task==='layout'?3:r[candidates].length},(_,i)=>i);
        const pred=allowed[argmax(allowed.map(i=>scores[i]))];hits+=+(pred===target(r));
      }
      report(`rendered-${field}-NB ${task}`,hits,te.length,prior);
    }
  }
  // The reviewer's two person-only rendered-text ablations have their own
  // identity metric as well; masking lexical words must not hide prominence.
  for (const scope of ['all', 'mail']) {
    const tr=train.filter(r=>r.who>=0), te=test.filter(r=>r.who>=0);
    const bow=r=>Object.fromEntries(Array.from({length:11},(_,i)=>['person'+i,r.f[scope+'.person.'+i]||0]));
    const target=r=>r.person[r.who].staffPosition;
    const m=bowFit(tr.map(r=>({bow:bow(r),y:target(r)})),11,1);
    let hits=0;
    for(const r of te) {
      const scores=bowScore(m,bow(r)), allowed=r.person.map(p=>p.staffPosition);
      hits+=+(allowed[argmax(allowed.map(i=>scores[i]))]===target(r));
    }
    report(`rendered-${scope}-person-only-NB who`,hits,te.length,te.reduce((n,r)=>n+1/r.finance.length,0)/te.length);
  }
  const summary={range:[from,to],training:[1,4000],holdout:[4001,6000],features:keys.length,results};
  if(process.env.PF_CASE2_AUDIT_JSON) fs.writeFileSync(process.env.PF_CASE2_AUDIT_JSON,JSON.stringify(summary,null,2));
  console.log(`ADVERSARIAL: ${results.length} separately scored tests, ${keys.length} aggregate features; only multi-source evidence joins excluded`);
  return summary;
}
module.exports={run,extract,renderer,treeFit,treeScore,nbFit,nbScore};
