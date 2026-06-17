(() => {
  const buttons = [...document.querySelectorAll('[data-weather-view]')];
  const panels = [...document.querySelectorAll('[data-weather-panel]')];

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

  buttons.forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.weatherView));
  });

  setView('today');
})();