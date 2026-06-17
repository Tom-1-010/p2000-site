# De Buurtwacht

Mobielvriendelijke meerpagina-site voor een buurtapp met de huisstijl van het aangeleverde logo.

## Huisstijl

De globale kleuren staan in `styles.css`:

- Lichtblauw logo-accent: `#34acfc`
- Donkerblauw logo-kleur: `#182438`
- Zachte achtergrond: `#f4f8fc`

De homepage is opgezet als app-startscherm met locatie, buurtweer, snelle tegels en buurtupdates.

## Pagina's

- `index.html` - app-achtige homepage
- `mijnbuurt.html` - MijnBuurt
- `buurtnieuws.html` - Buurtnieuws
- `buurtmeldingen.html` - Buurtmeldingen
- `buurtweer.html` - Buurtweer
- `buurtwerkzaamheden.html` - Buurtwerkzaamheden
- `buurttips.html` - Buurttips

## Opzet

De site bestaat uit gewone HTML, CSS en JavaScript:

- `styles.css` - responsive styling, vaste ondernavigatie, app-kaarten en icon styles
- `app.js` - markeert de actieve ondermenu-knop op basis van de huidige pagina

## Iconen

De iconen zijn in één uniforme lijnstijl verwerkt als inline/CSS SVG-maskers. De gekozen stijl is gebaseerd op Lucide Icons. Lucide is openbaar beschikbaar en uitgebracht onder de ISC-licentie. Sommige Lucide-iconen zijn afgeleid van Feather en vallen onder MIT.

## Belangrijk

Deze versie is statisch. Er is geen backend, database, live P2000-feed, kaart, login of router gekoppeld.

## Lokaal bekijken

Open `index.html` direct in de browser of start een lokale server:

```bash
python -m http.server 3000
```

Daarna openen:

```text
http://localhost:3000
```
