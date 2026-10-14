const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const recipes=require('../dist/recipes.json');
const base=process.env.TEST_URL||'http://127.0.0.1:5173/';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.waitForLoadState('networkidle');
 assert.equal(await page.locator('.recipe-card').count(),76);
 assert.equal(recipes.length,76);assert.equal(new Set(recipes.map(r=>r.id)).size,76);
 for(const [category,count] of [['colazioni',20],['pranzo',34],['cena',34],['spuntini',42]]){
   await page.locator(`[data-category="${category}"]`).click();assert.equal(await page.locator('.recipe-card').count(),count);
 }
 await page.locator('#reset').click();
 await page.locator('#search').fill('avocado');assert.equal(await page.locator('.recipe-card').count(),2);
 await page.locator('[data-category="pranzo"]').click();assert.equal(await page.locator('.recipe-card').count(),1);
 await page.locator('#time').selectOption('60');assert.equal(await page.locator('.recipe-card').count(),1);
 const filteredHash=await page.evaluate(()=>location.hash);
 await page.locator('.card-photo').first().click();await page.waitForSelector('#detail:not([hidden])');
 await page.locator('[data-ingredient]').first().check();
 await page.locator('#detail [data-favorite]').click();
 await page.locator('[data-back]').click();assert.equal(await page.locator('#search').inputValue(),'avocado');assert.equal(await page.evaluate(()=>location.hash),filteredHash);
 await page.locator('.card-photo').first().click();assert.equal(await page.locator('[data-ingredient]').first().isChecked(),true);
 await page.reload();assert.equal(await page.locator('#detail [data-favorite]').getAttribute('aria-pressed'),'true');
 await page.locator('#favorites-link').click();assert.equal(await page.locator('.recipe-card').count(),1);
 await page.locator('.favorite').click();assert.equal(await page.locator('#empty').isVisible(),true);
 await page.locator('#empty-reset').click();await page.locator('#search').fill('xyzznonexistent');assert.equal(await page.locator('.recipe-card').count(),0);assert.equal(await page.locator('#empty').isVisible(),true);
 await page.locator('#reset').click();await page.locator('#taste').selectOption('dolce');await page.locator('#time').selectOption('15');
 assert.equal(await page.locator('.recipe-card').count(),4);
 await page.locator('#reset').click();await page.keyboard.press('/');assert.equal(await page.locator('#search').evaluate(el=>el===document.activeElement),true);
 await page.locator('#sort').selectOption('quick');assert.match(await page.locator('.recipe-card h2').first().innerText(),/Smoothie/);
 for(const r of recipes){
   await page.goto(base+'#ricetta/'+r.id);await page.waitForFunction(title=>document.querySelector('#detail h1')?.textContent===title,r.title);
   assert.equal(await page.locator('#detail h1').innerText(),r.title);
   assert.equal(await page.locator('.steps li').count(),r.steps.length);
   assert.equal(await page.locator('[data-ingredient]').count(),r.ingredients.filter(x=>!x.startsWith('#')).length);
   const response=await page.request.get(new URL(r.image,base).href);assert.equal(response.status(),200);
   await page.waitForFunction(()=>{const el=document.querySelector('.detail-photo');return el.complete&&el.naturalWidth>0;});
 }
 await page.goto(base+'#info');assert.equal(await page.locator('.pantry h3').count(),6);
 await page.goto(base+'#ricetta/non-esiste');assert.match(await page.locator('#detail').innerText(),/non trovata/);
 fs.mkdirSync(path.resolve(__dirname,'../qa'),{recursive:true});
 for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:width<700?844:1000});await page.goto(base);await page.waitForLoadState('networkidle');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`catalog overflow at ${width}`);
   await page.screenshot({path:path.resolve(__dirname,`../qa/catalog-${width}.png`)});
   await page.goto(base+'#ricetta/'+recipes[0].id);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`detail overflow at ${width}`);
   await page.screenshot({path:path.resolve(__dirname,`../qa/detail-${width}.png`),fullPage:true});
 }
 await page.goto(base);await page.evaluate(()=>localStorage.setItem('skrea-favorites','{"broken":true}'));await page.reload();assert.equal(await page.locator('.recipe-card').count(),76);
 await page.locator('#search').fill('pollo');await page.locator('.card-photo').first().click();await page.goBack();assert.equal(await page.locator('#search').inputValue(),'pollo');
 assert.deepEqual(errors,[]);
 console.log('PASS: 76 recipe routes and images; category counts; combined search/taste/time; favorites persistence; ingredient checkboxes; back navigation; malformed storage; empty and missing states; 320/390/768/1440px layouts; zero JS exceptions.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
