"""Extract the user-provided cookbook. Run from project root with PDF path as argv[1]."""
import json, re, sys
from pathlib import Path
import pdfplumber
from pypdf import PdfReader
from PIL import Image, ImageOps
from io import BytesIO

root = Path(__file__).resolve().parents[1]
reader = PdfReader(sys.argv[1])
records = []
with pdfplumber.open(sys.argv[1]) as pdf:
    for i, page in enumerate(pdf.pages):
        if 'NUTRITIONALELEMENTS' not in (page.extract_text() or '').replace(' ', ''):
            continue
        num = i + 1
        def region(box):
            return page.crop(box).extract_text(x_tolerance=2) or ''
        title = region((235, 0, 595, 130)).replace('\n', ' ')
        meta = region((235, 130, 595, 302))
        ingredients = region((0, 355, 240, 805))
        steps = region((240, 355, 595, 805))
        links = []
        for a in reader.pages[i].get('/Annots', []):
            action = a.get_object().get('/A', {})
            if action.get('/URI') and action['/URI'] not in links:
                links.append(action['/URI'])
        images = [(x, Image.open(BytesIO(x.data))) for x in reader.pages[i-1].images]
        # Wide title artwork can be larger than the food photograph (pages 28/94).
        # Exclude flat logos/masks by image entropy before considering resolution.
        photographs = [x for x in images if x[1].convert('RGB').entropy() > 6]
        assert photographs, f'No photograph found on page {i}'
        img = max(photographs, key=lambda x: x[1].width*x[1].height)[1]
        img = ImageOps.exif_transpose(img).convert('RGB')
        img.thumbnail((1100,1100))
        img.save(root/'dist/images'/f'{num}.webp', 'WEBP', quality=83)
        category = 'sweet-breakfast' if num<41 else 'savory-breakfast' if num<63 else 'main' if num<135 else 'dessert' if num<169 else 'snack'
        records.append(dict(page=num,title=title,meta=meta,ingredients=ingredients,steps=steps,video=links[0] if links else None,group=category,image=f'images/{num}.webp'))
    extras = {str(n):pdf.pages[n-1].extract_text(x_tolerance=2) for n in [7,9,11,12]}
(root/'source/original.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
(root/'source/extras.json').write_text(json.dumps(extras,ensure_ascii=False,indent=2),encoding='utf-8')
print('Extracted',len(records),'recipes')
