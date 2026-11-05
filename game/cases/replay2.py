"""Deterministic Playwright replay; no model/player runs. Use --dev before promotion."""
from pathlib import Path
import argparse,json,subprocess
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--dev',action='store_true');p.add_argument('--count',type=int,default=100);p.add_argument('--start',type=int,default=1);a=p.parse_args()
out=Path(r'C:\Users\yentl\AppData\Local\Temp\pf-case2-shots\v4');out.mkdir(parents=True,exist_ok=True)
generator='./cases/gen2_dev.js' if a.dev else './cases/gen2.js'
script=r'''const {generate}=require(process.argv[1]),{solve,hypotheses}=require('./cases/solve2.js');const cases=[];for(let seed=+process.argv[2];seed<+process.argv[2]+(+process.argv[3]);seed++){const C=generate(seed);delete C.secret;delete C.twists;delete C.traps;const answer=solve(C),h=hypotheses(C);if(!answer.ok)throw Error(seed+JSON.stringify(answer));cases.push({seed,...answer,layout:answer.how==='self'?'insider':answer.how,user:h.chain.changer.user,session:h.chain.c[7],evidence:answer.evidence[0].split('+')});}console.log(JSON.stringify(cases));'''
cases=json.loads(subprocess.check_output(['node','-e',script,generator,str(a.start),str(a.count)],cwd=ROOT,text=True))
html='case2_dev.html' if a.dev else 'case2.html'
if a.dev:(ROOT/html).write_text((ROOT/'case2.html').read_text(encoding='utf-8').replace('cases/gen2.js','cases/gen2_dev.js'),encoding='utf-8')
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path=r'C:\Users\yentl\AppData\Local\ms-playwright\chromium-1243\chrome-win64\chrome.exe')
    page=browser.new_page(viewport={'width':1280,'height':800},device_scale_factor=1)
    errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
    shots=set();results=[];measurements=[]
    for c in cases:
        page.goto((ROOT/html).as_uri()+'?seed='+str(c['seed']))
        page.add_style_tag(content='*,*::before,*::after{animation:none!important;transition:none!important}')
        page.locator('#player').fill('UI regression')
        page.locator('[data-act="start"]').click()
        layout=c['layout'];capture=layout not in shots
        geom=page.locator('#win-casefile .win-body').evaluate('(e)=>({w:e.clientWidth,sw:e.scrollWidth,h:e.clientHeight,sh:e.scrollHeight})')
        assert geom['sw']<=geom['w']+1 and geom['sh']<=geom['h']+1,('report overflow',c['seed'],geom)
        assert page.locator('#file-report').is_visible()
        if capture:page.screenshot(path=str(out/(layout+'-report.png')))
        page.locator('#icons [data-id="finance"]').click()
        for tab,group,answer in [('suppliers',None,None),('payments','payment',c['paymentRow']),('changes','change',c['changeRow'])]:
            page.locator('[data-act="financeTab"][data-id="'+tab+'"]').click()
            geom=page.locator('#win-finance .log-wrap').evaluate('(e)=>({w:e.clientWidth,sw:e.scrollWidth,minFont:Math.min(...[...e.querySelectorAll("td")].map(x=>parseFloat(getComputedStyle(x).fontSize)))})')
            assert geom['sw']<=geom['w']+1,('Finance horizontal overflow',c['seed'],tab,geom)
            assert geom['minFont']>=12,('small text',geom)
            measurements.append({'seed':c['seed'],'tab':tab,**geom})
            if capture:page.screenshot(path=str(out/(layout+'-'+tab+'.png')))
            if group:page.locator('[data-act="flagFinance"][data-group="'+group+'"][data-id="'+str(answer)+'"]').click()
        page.locator('#icons [data-id="security"]').click()
        page.locator('#security-q').fill(c['user']);page.locator('[data-form="security"] button[type="submit"]').click()
        assert c['session'] in page.locator('#win-security').inner_text()
        if capture:page.screenshot(path=str(out/(layout+'-security.png')))
        page.locator('#icons [data-id="casefile"]').click()
        for group,ids in [('who',[c['who']]),('how',[c['how']]),('evidence',c['evidence'])]:
            for answer in ids:page.locator('[data-act="pick"][data-group="'+group+'"][data-id="'+answer+'"]').click()
        page.locator('#file-report').click()
        score=page.evaluate('window.pixelforgeScore()')
        assert score['done'] and score['progress']==5 and score['report']['correct'],(c,score)
        results.append({'seed':c['seed'],'layout':layout,'correct':True,'clicks':score['clicks']})
        if capture:page.screenshot(path=str(out/(layout+'-result.png')));shots.add(layout)
        if len(results)%25==0:print('UI replays',len(results),flush=True)
    assert not errors,errors
    (out/('ui-dev-results.json' if a.dev else 'ui-results.json')).write_text(json.dumps({'generator':generator,'viewport':[1280,800],'replays':results,'tables':measurements,'pageErrors':errors},indent=2))
    browser.close()
print(f'{len(results)}/{len(cases)} correct; no page errors; report fits; Finance has no horizontal overflow and >=12px text; screenshots: {out}')
