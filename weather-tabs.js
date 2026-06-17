(() => {
  const buttons = [...document.querySelectorAll('[data-weather-view]')];
  const panels = [...document.querySelectorAll('[data-weather-panel]')];
  const rainGraphSection = document.querySelector('#rainGraphSection');
  const rainBars = document.querySelector('#rainBars');
  const rainPeakText = document.querySelector('#rainPeakText');

  if (!buttons.length || !panels.length) return;

  function setView(view) {
    const nextView = view === 'days' ? 'days' : 'today';

    buttons.forEach((button) => {
      const isActive = button.dataset.weatherView === nextView;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', String(isActive));
    });

    panels.forEach((panel) => {
      panel.hidden = panel.dataset.weatherPanel !== nextView;
    });

    if (nextView === 'today') {
      window.setTimeout(() => window.dispatchEvent(new Event('resize')), 80);
    }
  }

  function readRainPercentages() {
    if (!rainBars) return [];
    return [...rainBars.querySelectorAll('.rain-percent')]
      .map((element) => Number(element.textContent.replace('%', '').replace(',', '.').trim()))
      .filter(Number.isFinite);
  }

  function syncRainGraph() {
    if (!rainGraphSection) return;

    const percentages = readRainPercentages();
    const maxChance = percentages.length ? Math.max(...percentages) : 0;
    const statusText = rainPeakText?.textContent?.toLowerCase() || '';
    const shouldShow = maxChance >= 10 || (statusText.includes('piek') && maxChance > 0);

    rainGraphSection.hidden = !shouldShow;
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.weatherView));
  });

  if (rainGraphSection && (rainBars || rainPeakText)) {
    const observer = new MutationObserver(syncRainGraph);
    if (rainBars) observer.observe(rainBars, { childList: true, subtree: true, characterData: true });
    if (rainPeakText) observer.observe(rainPeakText, { childList: true, subtree: true, characterData: true });
    syncRainGraph();
  }

  setView('today');
})();