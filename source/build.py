"""Build and validate the static Italian catalogue. No network or PDF needed."""
import json, re, unicodedata
from pathlib import Path
from collections import Counter

root=Path(__file__).resolve().parents[1]
original=json.loads((root/'source/original.json').read_text(encoding='utf-8'))
translations=[]
for file in sorted((root/'source').glob('it-*.json')):
    translations.extend(json.loads(file.read_text(encoding='utf-8')))
assert len(translations)==76 and len({r['page'] for r in translations})==76
translated={r['page']:r for r in translations}
assert set(translated)=={r['page'] for r in original}
recipes=[]
for raw in original:
    recipe=translated[raw['page']].copy()
    assert recipe['title'] and recipe['ingredients'] and recipe['steps']
    assert all(len(s)==2 and s[0] and s[1] for s in recipe['steps'])
    meta=raw['meta']
    if raw['page']==27:
        minutes,portions,time_text,portion_text=120,2,'2 ore (preparazione: 5 min)','2 porzioni'
    else:
        time_match=re.search(r'\n(\d+)\s*(min|h)(\d*)\s+(\d+)([^\n]*)',meta)
        assert time_match,raw['page']
        number,unit,extra,portions,suffix=time_match.groups()
        minutes=int(number)*(60 if unit=='h' else 1)+int(extra or 0)
        portions=int(portions)
        time_text=f'{minutes} min' if minutes<60 else f'{minutes//60} '+('ora' if minutes//60==1 else 'ore')+(f' {minutes%60} min' if minutes%60 else '')
        portion_unit='fette' if 'slices' in suffix else 'biscotti' if 'cookies' in suffix else 'pezzi' if 'units' in suffix else 'porzioni'
        portion_text=f'{portions} {portion_unit}'
    calories=re.search(r'(\d+)\s*kcal',meta)
    macros=re.findall(r'([\d.]+)g',meta)
    assert calories and len(macros)==3,raw['page']
    recipe.update(id=re.sub(r'[^a-z0-9]+','-',unicodedata.normalize('NFKD',recipe['title']).encode('ascii','ignore').decode().lower()).strip('-'),
                  minutes=minutes,time=time_text,portions=portions,portionLabel=portion_text,
                  calories=int(calories[1]),protein=float(macros[0]),carbs=float(macros[1]),fat=float(macros[2]),
                  image=raw['image'],video=raw['video'],sourcePages=[raw['page']-1,raw['page']],group=raw['group'])
    recipe['categories']=['pranzo','cena'] if raw['group']=='main' else ['colazioni','spuntini'] if 'breakfast' in raw['group'] else ['spuntini']
    recipe['taste']='salato' if raw['group'] in ['main','savory-breakfast'] or raw['page']==177 else 'dolce'
    recipe['label']={'sweet-breakfast':'Colazione dolce','savory-breakfast':'Colazione salata','main':'Pranzo / Cena','dessert':'Dessert','snack':'Spuntino'}[raw['group']]
    recipe['nutritionBasis']='Per fetta' if 'fette' in portion_text else 'Per biscotto' if 'biscotti' in portion_text else 'Per pezzo' if 'pezzi' in portion_text else 'Per porzione / unità'
    assert (root/'dist'/recipe['image']).is_file()
    assert recipe['video'] is None or recipe['video'].startswith('https://')
    assert '\ufffd' not in json.dumps(recipe,ensure_ascii=False)
    recipes.append(recipe)
assert len({r['id'] for r in recipes})==76
data=json.dumps(recipes,ensure_ascii=False,indent=2)
(root/'dist/recipes.json').write_text(data+'\n',encoding='utf-8')
(root/'dist/recipes.js').write_text('window.RECIPES = '+data+';\n',encoding='utf-8')
counts=Counter(c for r in recipes for c in r['categories'])
assert counts=={'colazioni':20,'pranzo':34,'cena':34,'spuntini':42},counts
print('Validated 76 complete recipes, unique IDs, source pages, images, video URLs and exact source nutritional values.')
print(dict(counts))
