# SKREA IN CUCINA

Un ricettario dal carattere street: 76 ricette tradotte in italiano, fotografie originali, ricerca per ingrediente e preferiti. HTML, CSS e JavaScript, senza backend o traduzione a runtime.

## Avvio

Richiede Node.js per il solo server locale:

```sh
npm start
```

Apri http://127.0.0.1:5173. In alternativa, `dist/index.html` è consultabile direttamente nel browser. Per pubblicare su qualsiasi hosting statico, carica il contenuto di `dist/`. La workflow GitHub Pages pubblica `dist/` a ogni push su `main`; nelle impostazioni Pages della repository selezionare GitHub Actions.

## Funzioni

- Colazioni (20), Pranzo (34), Cena (34), Spuntini (42). Le categorie si sovrappongono intenzionalmente: le ricette uniche sono 76.
- Ricerca combinata per titolo e ingredienti, filtri dolce/salato e tempo, ordinamento per libro, tempo e nome.
- Schede complete con porzioni, macronutrienti, ingredienti spuntabili, procedure, note e video originali.
- Collegamenti diretti tramite hash, filtri nell'URL e ritorno al catalogo senza perdere la ricerca.
- Preferiti nel localStorage del browser, senza account o sincronizzazione. Ingredienti spuntati conservati solo durante la visita.
- Copia del collegamento e stampa della ricetta; layout responsive e rispetto di reduced-motion.

## Dati e fonte

`source/original.json` conserva l'estrazione delle 76 schede con pagina, metadati, ingredienti, procedimento e video. `source/it-1.json` fino a `it-4.json` contengono le traduzioni revisionate. `source/extras.json` conserva le sezioni informative di origine. Il PDF fornito dall'utente non è incluso nella repository.

Per rigenerare e validare i dati pubblicati (Python 3, solo libreria standard):

```sh
python source/build.py
```

Il controllo verifica copertura delle 76 ricette, identificativi unici, categorie, immagini e corrispondenza dei valori nutrizionali con l'estrazione originale. Non ricalcola i valori del libro. I tempi dei filtri sono quelli riepilogativi della fonte; le discrepanze individuate con riposi e cotture sono riportate nelle note. Le indicazioni di resa restano quelle originali, anche quando presentano incongruenze. I video non sono tradotti.

Per riestrarre testi e fotografie dal PDF locale servono `pdfplumber`, `pypdf` e `Pillow`:

```sh
python source/extract.py /percorso/RICETTE.pdf
python source/build.py
```

Le fotografie WebP sono associate alla pagina fotografica immediatamente precedente a ogni scheda. Immagini e testi derivano dal ricettario fornito dall'utente; non viene attribuita una nuova licenza a questi contenuti.

## Verifiche browser

```sh
npm install
npx playwright install chromium
npm start
# In un secondo terminale:
npm test
```

È possibile impostare `TEST_URL` per testare una distribuzione o `PLAYWRIGHT_EXECUTABLE_PATH` per un Chromium già installato. Il test percorre tutte le 76 ricette, verifica immagini e interazioni, persistenza, filtri combinati e layout a 320, 390, 768 e 1440 pixel. Gli screenshot sono salvati in `qa/`, esclusa da Git.

## Struttura

- `dist/`: sito pronto da pubblicare e catalogo JSON utilizzabile anche da altre interfacce.
- `source/`: estrazione, traduzioni e generazione dati.
- `scripts/serve.cjs`: server statico di anteprima senza dipendenze.
- `tests/browser.cjs`: verifiche funzionali e responsive con Playwright.
- `.github/workflows/pages.yml`: distribuzione su GitHub Pages.

Nessun servizio Sites è utilizzato per hosting o pubblicazione.
