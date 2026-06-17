# 112indewijk

Mobielvriendelijk buurtplatform voor P2000-meldingen en veiligheidsinformatie.

## Opzet

De site bestaat uit gewone HTML, CSS en JavaScript:

- `index.html` - pagina-opbouw, navigatie, hero, meldingen, buurtbeeld en informatieblokken
- `styles.css` - volledige responsive styling voor desktop en mobiel
- `app.js` - P2000 RSS-feed, fallbackdata, filters, detailpaneel, buurtstatistieken en mobiel menu

## P2000-feed

De site probeert P2000-data te laden via:

```text
http://p2000.brandweer-berkel-enschot.nl/homeassistant/rss.asp
```

Omdat deze feed via HTTP loopt en een statische HTTPS-site dit kan blokkeren, gebruikt de frontend op HTTPS eerst een proxy-url via AllOrigins. Als de live feed of proxy niet werkt, valt de site automatisch terug op voorbeelddata.

## Filters

De frontend ondersteunt filters op:

- stad, plaats, wijk of meldingstekst
- discipline: brandweer, ambulance, politie of overig
- prioriteit: P1, P2 of P3

## Belangrijk

Dit is een statische frontend. Er is nog geen eigen backend, database, kaart, login of officiële P2000-provider gekoppeld.

## Lokaal bekijken

Open `index.html` direct in de browser of start een lokale server:

```bash
python -m http.server 3000
```

Daarna openen:

```text
http://localhost:3000
```
