# De Buurtwacht

Algemene mobielvriendelijke homepage voor een buurtplatform.

## Opzet

De site bestaat uit gewone HTML, CSS en JavaScript:

- `index.html` - algemene homepage met merknaam, hero, functiekaarten en icon-only ondermenu
- `styles.css` - volledige responsive styling met grijze, rustige buurtplatform-uitstraling
- `app.js` - kleine interactielaag voor actieve staat van het ondermenu

## Onderin menu

Het vaste ondermenu gebruikt alleen iconen. De items zijn toegankelijk via `aria-label` en `title`:

- MijnBuurt
- Buurtnieuws
- Buurtmeldingen
- Buurtweer
- Buurtwerkzaamheden
- Buurttips

## Belangrijk

Deze versie is een statische homepage. Er is geen backend, database, live P2000-feed, kaart, login of route-systeem gekoppeld.

## Lokaal bekijken

Open `index.html` direct in de browser of start een lokale server:

```bash
python -m http.server 3000
```

Daarna openen:

```text
http://localhost:3000
```
