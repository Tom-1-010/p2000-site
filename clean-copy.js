(() => {
  const FEED_LIMIT = 14;

  function setText(selector, from, to) {
    const element = document.querySelector(selector);
    if (!element || element.textContent.trim() !== from) return;
    element.textContent = to;
  }

  function setShortText(selector, to) {
    const element = document.querySelector(selector);
    if (!element || element.textContent.trim() === to) return;
    element.textContent = to;
  }

  function hideExtraItems(listSelector, itemSelector) {
    const list = document.querySelector(listSelector);
    if (!list) return;

    [...list.querySelectorAll(itemSelector)].forEach((item, index) => {
      item.hidden = index >= FEED_LIMIT;
    });
  }

  function cleanErrorText() {
    document.querySelectorAll('.error-news').forEach((element) => {
      element.textContent = 'Nieuws kan nu niet worden geladen. Probeer het later opnieuw.';
    });

    document.querySelectorAll('.error-works').forEach((element) => {
      element.textContent = 'Werkzaamheden en bekendmakingen kunnen nu niet worden geladen. Probeer het later opnieuw.';
    });
  }

  function cleanLoadingLabels() {
    setText('#newsStatus', 'RSS laden', 'Nieuws laden');
    setText('#worksStatus', 'RSS laden', 'Updates laden');
    setText('#newsUpdated', 'Feeds worden opgehaald.', 'Berichten worden opgehaald.');
    setText('#worksUpdated', 'Gemeentelijke feeds worden opgehaald.', 'Gemeentelijke berichten worden opgehaald.');
  }

  function cleanLiveLabels() {
    setText('#newsStatus', 'Live nieuws', 'Nieuws');
    setText('#worksStatus', 'Live updates', 'Updates');
    setText('#weatherUpdated', 'Live data laden', 'Weerdata laden');
    setText('#weatherUpdated', 'Live data niet beschikbaar', 'Data niet beschikbaar');
    setText('#rainTimerMeta', 'Live data laden', 'Weerdata laden');
    setText('#rainTimerMeta', 'Geen live data', 'Geen data');
    setText('#radarStatus', 'Geen live data', 'Geen data');
    setText('#forecastButton', 'Live', 'Verwachting');
    setText(
      '#apiNotice',
      'Live weerdata kon niet worden geladen. Controleer later opnieuw; er wordt geen nepweer getoond.',
      'Weerdata kon niet worden geladen. Controleer later opnieuw; er wordt geen nepweer getoond.',
    );
  }

  function cleanWeatherCopy() {
    if (document.body.dataset.page !== 'buurtweer') return;

    setText('#currentDetails', 'De actuele verwachting voor Maassluis wordt opgehaald.', 'Weer ophalen.');
    setText('#rainTimerText', 'We controleren de komende 12 uur voor Maassluis.', 'Komende 12 uur.');
    setText('#weatherAttentionText', 'Bij zware buien, onweer of harde wind tonen we hier een korte waarschuwing.', 'Geen waarschuwing.');
    setText('#adviceText', 'We bepalen of een jas, paraplu of extra opletten nodig is.', 'Advies ophalen.');

    const todayText = document.querySelector('#todayText');
    if (todayText?.textContent.includes('Vandaag ongeveer')) {
      todayText.textContent = todayText.textContent
        .replace('Vandaag ongeveer ', 'Max ')
        .replace('Regenkans tot ', 'Regen ')
        .replace('Wind ', 'Wind ')
        .replace(' uit ', ' ');
    }

    const attentionText = document.querySelector('#weatherAttentionText');
    if (attentionText) {
      if (attentionText.textContent.includes('Geen zware buien')) setShortText('#weatherAttentionText', 'Geen waarschuwing.');
      if (attentionText.textContent.includes('Er is later duidelijke kans')) setShortText('#weatherAttentionText', 'Later kans op regen.');
      if (attentionText.textContent.includes('Houd buitenactiviteiten')) setShortText('#weatherAttentionText', 'Let op buiten.');
    }

    const adviceText = document.querySelector('#adviceText');
    if (adviceText) {
      if (adviceText.textContent.includes('Geen grote bijzonderheden')) setShortText('#adviceText', 'Geen bijzonderheden.');
      if (adviceText.textContent.includes('Prima om naar buiten')) setShortText('#adviceText', 'Voorlopig droog.');
      if (adviceText.textContent.includes('Er is nu of zeer binnenkort')) setShortText('#adviceText', 'Neem regen mee.');
      if (adviceText.textContent.includes('Op open stukken')) setShortText('#adviceText', 'Veel wind buiten.');
      if (adviceText.textContent.includes('Het voelt fris')) setShortText('#adviceText', 'Jas verstandig.');
      if (adviceText.textContent.includes('Blijf alert')) setShortText('#adviceText', 'Let op onweer.');
    }
  }

  function applyCleanCopy() {
    cleanErrorText();
    cleanLoadingLabels();
    cleanLiveLabels();
    cleanWeatherCopy();
    hideExtraItems('#newsList', '.news-item');
    hideExtraItems('#worksList', '.works-item');
  }

  const observer = new MutationObserver(applyCleanCopy);
  observer.observe(document.body, { childList: true, subtree: true });
  applyCleanCopy();
})();