'use strict';
const recipes = window.RECIPES || [];
const $ = selector => document.querySelector(selector);
const esc = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = text => text.toLocaleLowerCase('it').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const fmt = number => new Intl.NumberFormat('it-IT').format(number);
let favorites = new Set();
try { const stored=JSON.parse(localStorage.getItem('skrea-favorites') || '[]'); if(Array.isArray(stored)) favorites=new Set(stored.filter(id=>recipes.some(r=>r.id===id))); } catch {}
const state={category:'all',search:'',taste:'all',time:'all',sort:'book',favorites:false};
let catalogHash='#', catalogScroll=0, lastRecipe=null, toastTimer;
const checked=new Map();
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2800);}
function updateFavorites(){
  $('#fav-count').textContent=favorites.size;
  document.querySelectorAll('[data-favorite]').forEach(button=>{
    const id=button.dataset.favorite, saved=favorites.has(id),r=recipes.find(r=>r.id===id);
    button.setAttribute('aria-pressed',saved);
    button.setAttribute('aria-label',`${saved?'Rimuovi dai':'Aggiungi ai'} preferiti: ${r.title}`);
    button.innerHTML=button.classList.contains('favorite')?(saved?'♥':'♡'):`${saved?'♥ Salvata nei preferiti':'♡ Salva ricetta'}`;
  });
}
function toggleFavorite(id){
  const saved=!favorites.has(id);saved?favorites.add(id):favorites.delete(id);
  try{localStorage.setItem('skrea-favorites',JSON.stringify([...favorites]));toast(saved?'Ricetta salvata. Buona scelta.':'Ricetta rimossa dai preferiti.');}catch{toast('Preferiti disponibili per questa visita: il browser non consente il salvataggio.');}
  updateFavorites();if(!$('#catalog').hidden&&state.favorites)renderGrid();
}
function getFiltered(){
  const terms=norm(state.search).trim().split(/\s+/).filter(Boolean);
  return recipes.filter(r=>{
    const haystack=norm(r.title+' '+r.ingredients.join(' '));
    return (!state.favorites||favorites.has(r.id))&&(state.category==='all'||r.categories.includes(state.category))&&(state.taste==='all'||r.taste===state.taste)&&(state.time==='all'||(state.time==='over60'?r.minutes>60:r.minutes<=Number(state.time)))&&terms.every(term=>haystack.includes(term));
  }).sort((a,b)=>state.sort==='quick'?a.minutes-b.minutes:state.sort==='az'?a.title.localeCompare(b.title,'it'):a.page-b.page);
}
function renderGrid(){
  const results=getFiltered();
  $('#results').innerHTML=`<strong>${results.length}</strong> ${results.length===1?'ricetta':'ricette'}${state.favorites?' nei tuoi preferiti':' da portare in tavola'}`;
  $('#grid').innerHTML=results.map(r=>`<article class="recipe-card"><a class="card-photo" href="#ricetta/${r.id}" aria-label="Apri ${esc(r.title)}"><img src="${r.image}" alt="${esc(r.title)}" loading="lazy" width="550" height="480"></a><button class="favorite" data-favorite="${r.id}" aria-pressed="${favorites.has(r.id)}" aria-label="${favorites.has(r.id)?'Rimuovi dai':'Aggiungi ai'} preferiti: ${esc(r.title)}">${favorites.has(r.id)?'♥':'♡'}</button><div class="card-meta"><span class="tag">${esc(r.label)}</span><span>${esc(r.time)}</span></div><h2><a href="#ricetta/${r.id}">${esc(r.title)}</a></h2><div class="card-bottom"><span><b>${fmt(r.calories)}</b> kcal <span aria-hidden="true">/</span> <b>${fmt(r.protein)} g</b> proteine</span><a class="arrow" href="#ricetta/${r.id}" aria-label="Prepara ${esc(r.title)}">↗</a></div></article>`).join('');
  $('#empty').hidden=results.length>0;
  $('#empty-message').textContent=state.favorites&&!favorites.size?'Salva le ricette con il cuore: le ritroverai qui, su questo dispositivo.':'Prova un altro ingrediente o allarga i filtri.';
  document.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.category===state.category));
  $('#search').value=state.search;$('#taste').value=state.taste;$('#time').value=state.time;$('#sort').value=state.sort;
}
function saveFilters(){
  const params=new URLSearchParams();
  for(const key of ['category','search','taste','time','sort'])if(state[key]!==({category:'all',search:'',taste:'all',time:'all',sort:'book'}[key]))params.set(key,state[key]);
  catalogHash=(state.favorites?'#preferiti':'#')+(params.size?'?'+params.toString():'');
  history.replaceState(null,'',catalogHash);renderGrid();
}
function resetFilters(){Object.assign(state,{category:'all',search:'',taste:'all',time:'all',sort:'book',favorites:false});history.replaceState(null,'','#');route();}
function showRecipe(r){
  document.title=r.title+' · SKREA IN CUCINA';lastRecipe=r.id;
  const checks=checked.get(r.id)||new Set();
  $('#detail').innerHTML=`<a href="${esc(catalogHash)}" class="back" data-back>← Torna alle ricette</a><div class="detail-head"><img class="detail-photo" src="${r.image}" alt="${esc(r.title)}" width="600" height="600"><div><p class="detail-tags">${esc(r.label)} · ${esc(r.taste)}</p><h1 class="detail-title" tabindex="-1">${esc(r.title)}</h1><div class="quick-stats"><div><strong>${esc(r.time)}</strong>Tempo indicato nel libro</div><div><strong>${esc(r.portionLabel)}</strong>Resa della ricetta</div></div><div class="detail-tools"><button class="outline-button" data-favorite="${r.id}"></button><button class="outline-button" id="share">Copia link ↗</button><button class="outline-button" id="print">Stampa</button>${r.video?`<a class="outline-button" href="${esc(r.video)}" target="_blank" rel="noopener noreferrer">Video originale ↗</a>`:''}</div><p class="source-note">Quantità per la ricetta completa. Valori nutrizionali per porzione o unità, come nella fonte.</p></div></div><div class="nutrition" aria-label="Valori nutrizionali"><div><b>Dentro ogni porzione.</b><span>${esc(r.nutritionBasis)}</span></div><div><strong>${fmt(r.calories)}</strong><small>kcal</small></div><div><strong>${fmt(r.protein)} g</strong><small>Proteine</small></div><div><strong>${fmt(r.carbs)} g</strong><small>Carboidrati</small></div><div><strong>${fmt(r.fat)} g</strong><small>Grassi</small></div></div><div class="recipe-body"><section><h2>Metti tutto sul tavolo.</h2><ul class="ingredient-list">${r.ingredients.map((text,i)=>text.startsWith('#')?`<li class="ingredient-heading">${esc(text.slice(1))}</li>`:`<li><label><input type="checkbox" data-ingredient="${i}" ${checks.has(i)?'checked':''}><span>${esc(text)}</span></label></li>`).join('')}</ul></section><section><h2>Ora si cucina.</h2><ol class="steps">${r.steps.map(([title,body])=>`<li><h3>${esc(title)}</h3><p>${esc(body)}</p></li>`).join('')}</ol>${(r.notes||[]).map(note=>`<p class="recipe-note">${esc(note)}</p>`).join('')}<p class="source-note">Fonte: ricettario fornito, pagine ${r.sourcePages.join('–')}. Traduzione italiana. I valori nutrizionali e i tempi riepilogativi sono quelli del libro; gli ingredienti facoltativi sono esclusi, salvo diversa indicazione.</p></section></div>`;
  updateFavorites();
  $('#share').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);toast('Link copiato. Passa la ricetta.');}catch{toast('Copia il link dalla barra degli indirizzi del browser.');}};
  $('#print').onclick=()=>window.print();
  $('#detail').querySelector('h1').focus({preventScroll:true});
}
function infoPage(){
  $('#info').innerHTML=`<div class="info-page"><a class="back" href="${esc(catalogHash)}" data-back>← Torna alle ricette</a><p class="eyebrow">PRIMA DI ACCENDERE I FORNELLI</p><h1 tabindex="-1">LE BASI.<br>POI SI CUCINA.</h1><section><h2>Come leggere le ricette</h2><p>Ogni ricetta riporta la resa totale degli ingredienti e il tempo medio indicato nel libro. Calorie, proteine, carboidrati e grassi si riferiscono a una porzione o unità. Gli ingredienti facoltativi non sono inclusi nei macronutrienti, salvo indicazioni esplicite: sono suggerimenti per aggiungere sapore o alternative agli ingredienti.</p><p>I tempi del catalogo sono quelli riepilogativi originali. Controlla anche il procedimento: raffreddamento, congelamento e riposo possono richiedere tempo aggiuntivo. Le discrepanze individuate sono segnalate nella scheda.</p><p>Il pulsante «Video originale» apre il video collegato nel ricettario. I video rimangono nella lingua originale. Le ricette principali compaiono sia in Pranzo sia in Cena; le colazioni sono disponibili anche negli Spuntini, insieme ai dessert.</p></section><section><h2>Macronutrienti, senza complicazioni</h2><p>«Macro» è l'abbreviazione di macronutrienti, le tre principali componenti degli alimenti che forniscono energia.</p><ul><li><strong>Proteine:</strong> importanti per i muscoli, il recupero e la sazietà. 1 g apporta 4 kcal.</li><li><strong>Carboidrati:</strong> la principale fonte di energia. 1 g apporta 4 kcal.</li><li><strong>Grassi:</strong> importanti per la produzione ormonale, la sazietà e l'assorbimento delle vitamine. 1 g apporta 9 kcal.</li></ul><p>Il libro descrive le calorie come somma dell'energia dei macronutrienti. Qui i valori sono trascritti fedelmente, senza ricalcoli: eventuali discrepanze nei dati della fonte restano conservate.</p></section><section><h2>Gli attrezzi del mestiere</h2><p>Frullatore; padella antiaderente; pentola; ciotola; tagliere; coltelli; spatola e cucchiaio di legno; sbattitore o frusta; grattugia; bilancia o misurini; guanti da forno o canovaccio; tortiera, preferibilmente da plumcake; stampini da muffin; carta forno.</p></section><section><h2>La dispensa del ricettario</h2><p>L'elenco generale degli ingredienti del libro, tradotto. Le quantità da usare sono nelle singole ricette.</p><div class="pantry">${[
 ['Proteine',['Uova','Albumi','Pollo','Tonno','Salmone','Macinato magro di manzo','Merluzzo','Tofu','Proteine in polvere']],
 ['Latticini e alternative',['Latte o bevanda vegetale','Yogurt magro o vegetale','Formaggio grattugiato light','Fiocchi di latte','Formaggio spalmabile','Feta','Formaggio light a fette','Budino proteico al caffè','Parmigiano','Formaggio fresco montato light','Mozzarelline light']],
 ['Verdure',['Cipolla','Carota','Funghi','Spinaci','Pomodoro','Zucchina','Peperone','Porri','Zucca','Aglio','Erba cipollina','Cetrioli','Cipolla rossa','Pomodorini']],
 ['Frutta',['Banana','Avocado','Limone','Lamponi','Fragole','Mirtilli','Datteri','Frutti rossi surgelati']],
 ['Cereali, legumi e dispensa',['Tapioca idratata','Farina d’avena','Farina di mandorle','Pasta','Riso','Patate','Patate dolci','Fiocchi d’avena','Noodles all’uovo','Piadine integrali','Carta di riso','Caffè solubile','Senape di Digione','Mais','Ceci','Polpa o concentrato di pomodoro','Semi di chia','Semi di sesamo','Semi di zucca','Olio','Aceto','Salsa di soia','Tabasco','Latte di cocco light','Panini per hot dog','Biscotti Maria senza zuccheri','Gelatina in fogli','Cacao magro','Cioccolato fondente','Gocce di cioccolato fondente','Sottaceti','Pasta d’aglio','Corn flakes','Frutta secca','Burro di arachidi','Dolcificanti: sciroppo d’acero 0%, xilitolo, miele']],
 ['Spezie e aromi',['Sale','Pepe','Aglio in polvere','Paprika','Prezzemolo','Coriandolo','Menta','Basilico','Curry in polvere','Cipolla in polvere','Origano','Cannella','Cacao in polvere','Matcha','Estratto di vaniglia','Stevia, xilitolo e sciroppo d’acero','Lievito']]
 ].map(([title,items])=>`<div><h3>${title}</h3><ul>${items.map(item=>`<li>${item}</li>`).join('')}</ul></div>`).join('')}</div></section><section><h2>I tuoi preferiti rimangono qui</h2><p>I preferiti sono salvati nel browser di questo dispositivo. Non serve un account e non vengono sincronizzati con altri dispositivi. Cancellando i dati del browser, si cancella anche la lista. Gli ingredienti spuntati rimangono selezionati durante questa visita.</p><p class="source-note">Informazioni culinarie tradotte dalle pagine 7, 9, 11 e 12 del ricettario fornito. Nessun servizio di traduzione viene utilizzato mentre navighi.</p></section></div>`;
  $('#info h1').focus({preventScroll:true});
}
function route(){
  const hash=location.hash||'#';const detail=hash.startsWith('#ricetta/'),info=hash==='#info';
  $('#catalog').hidden=detail||info;$('#detail').hidden=!detail;$('#info').hidden=!info;
  document.querySelectorAll('.header nav a').forEach(a=>a.classList.remove('active'));
  if(detail){
    const r=recipes.find(r=>r.id===hash.slice(9));
    if(r)showRecipe(r);else{$('#detail').innerHTML='<a href="#" class="back">← Torna alle ricette</a><h1 class="detail-title">Ricetta non trovata.</h1><p>Questo collegamento non corrisponde a una ricetta del catalogo.</p>';document.title='Ricetta non trovata · SKREA IN CUCINA';}
  }else if(info){infoPage();$('#info-link').classList.add('active');document.title='Informazioni utili · SKREA IN CUCINA';}
  else{
    state.favorites=hash.startsWith('#preferiti');const params=new URLSearchParams(hash.split('?')[1]||'');
    state.category=['colazioni','pranzo','cena','spuntini'].includes(params.get('category'))?params.get('category'):'all';
    state.search=params.get('search')||'';state.taste=['dolce','salato'].includes(params.get('taste'))?params.get('taste'):'all';state.time=['15','30','60','over60'].includes(params.get('time'))?params.get('time'):'all';state.sort=['quick','az'].includes(params.get('sort'))?params.get('sort'):'book';
    catalogHash=hash;$('#catalog-title').innerHTML=state.favorites?'BUONE SCELTE.<br><span>DA RIFARE.</span>':'MENO SCUSE.<br><span>PIÙ CUCINA.</span>';
    $('.intro-copy').textContent=state.favorites?'Le tue ricette salvate, tutte a portata di mano.':'76 ricette. Ingredienti veri. Scegli cosa ti va.';
    $(state.favorites?'#favorites-link':'#catalog-link').classList.add('active');document.title=(state.favorites?'I tuoi preferiti':'Il ricettario')+' · SKREA IN CUCINA';renderGrid();
  }
  updateFavorites();
}
document.addEventListener('click',event=>{
  const favorite=event.target.closest('[data-favorite]');if(favorite){toggleFavorite(favorite.dataset.favorite);return;}
  const category=event.target.closest('[data-category]');if(category){state.category=category.dataset.category;saveFilters();return;}
  const link=event.target.closest('a');if(link&&link.getAttribute('href')?.startsWith('#ricetta/'))catalogScroll=window.scrollY;
  if(link?.hasAttribute('data-back')){event.preventDefault();history.pushState(null,'',catalogHash);route();window.scrollTo(0,catalogScroll);const card=document.querySelector(`.recipe-card a[href="#ricetta/${lastRecipe}"]`);card?.focus({preventScroll:true});}
});
$('#search').addEventListener('input',event=>{state.search=event.target.value;saveFilters();});
for(const key of ['taste','time','sort'])$('#'+key).addEventListener('change',event=>{state[key]=event.target.value;saveFilters();});
$('#reset').onclick=resetFilters;$('#empty-reset').onclick=resetFilters;
document.addEventListener('change',event=>{if(event.target.matches('[data-ingredient]')){const id=location.hash.slice(9);const items=checked.get(id)||new Set();const index=Number(event.target.dataset.ingredient);event.target.checked?items.add(index):items.delete(index);checked.set(id,items);}});
document.addEventListener('keydown',event=>{if(event.key==='/'&&!event.ctrlKey&&!event.metaKey&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)&&!$('#catalog').hidden){event.preventDefault();$('#search').focus();}});
window.addEventListener('hashchange',()=>{route();window.scrollTo(0,$('#catalog').hidden?0:catalogScroll);});
window.addEventListener('popstate',()=>{route();if(!$('#catalog').hidden)requestAnimationFrame(()=>window.scrollTo(0,catalogScroll));});
window.addEventListener('storage',event=>{if(event.key==='skrea-favorites'){try{const value=JSON.parse(event.newValue||'[]');favorites=new Set(Array.isArray(value)?value.filter(id=>recipes.some(r=>r.id===id)):[]);}catch{favorites=new Set();}updateFavorites();if(!$('#catalog').hidden&&state.favorites)renderGrid();}});
route();
