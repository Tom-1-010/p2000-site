(() => {
  const FEED_LIMIT = 14;

  function setText(selector, from, to) {
    const element = document.querySelector(selector);
    if (!element || element.textContent.trim() !== from) return;
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

  function applyCleanCopy() {
    cleanErrorText();
    cleanLoadingLabels();
    hideExtraItems('#newsList', '.news-item');
    hideExtraItems('#worksList', '.works-item');
  }

  const observer = new MutationObserver(applyCleanCopy);
  observer.observe(document.body, { childList: true, subtree: true });
  applyCleanCopy();
})();
