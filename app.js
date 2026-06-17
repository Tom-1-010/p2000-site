const messages = [
  {
    id: 1,
    time: '16:42',
    priority: 'P1',
    discipline: 'brandweer',
    title: 'Woningbrand gemeld',
    city: 'Maassluis',
    area: 'Centrum',
    location: 'Lange Boonestraat, Maassluis',
    classification: 'Brand woning',
    summary: 'Rookontwikkeling gemeld bij een woning. Hulpdiensten zijn opgeroepen.',
    units: ['TS 17-1231', 'RV 17-1251'],
    status: 'Onderweg',
  },
  {
    id: 2,
    time: '16:35',
    priority: 'P2',
    discipline: 'ambulance',
    title: 'Medische melding winkelgebied',
    city: 'Schiedam',
    area: 'Centrum',
    location: 'Hoogstraat, Schiedam',
    classification: 'Medisch incident',
    summary: 'Ambulance gevraagd voor een persoon die hulp nodig heeft.',
    units: ['Ambulance 17-121'],
    status: 'Gekoppeld',
  },
  {
    id: 3,
    time: '16:22',
    priority: 'P1',
    discipline: 'politie',
    title: 'Assistentie aan hulpdiensten',
    city: 'Vlaardingen',
    area: 'Westwijk',
    location: 'Westhavenkade, Vlaardingen',
    classification: 'Assistentie',
    summary: 'Ondersteuning gevraagd bij een lopende hulpverleningsmelding.',
    units: ['Eenheid 21.05', 'Eenheid 21.07'],
    status: 'Ter plaatse',
  },
  {
    id: 4,
    time: '16:11',
    priority: 'P3',
    discipline: 'brandweer',
    title: 'Stormschade',
    city: 'Rozenburg',
    area: 'Oost',
    location: 'Emmastraat, Rozenburg',
    classification: 'Stormschade',
    summary: 'Schade aan een dakrand gemeld. De situatie wordt gecontroleerd.',
    units: ['TS 17-1431'],
    status: 'In behandeling',
  },
  {
    id: 5,
    time: '15:58',
    priority: 'P2',
    discipline: 'brandweer',
    title: 'Automatische brandmelding',
    city: 'Maasland',
    area: 'Dorp',
    location: 'Stationsweg, Maasland',
    classification: 'OMS',
    summary: 'Automatische melding vanuit een gebouw.',
    units: ['TS 17-1131'],
    status: 'Controle',
  },
  {
    id: 6,
    time: '15:46',
    priority: 'P2',
    discipline: 'politie',
    title: 'Verkeersongeval',
    city: 'Schiedam',
    area: 'Nieuwland',
    location: 'Burgemeester Van Haarenlaan, Schiedam',
    classification: 'Verkeer',
    summary: 'Melding van een aanrijding met verkeershinder.',
    units: ['Eenheid 21.11'],
    status: 'Onderweg',
  },
];

const menuButton = document.querySelector('#menuButton');
const mainMenu = document.querySelector('#mainMenu');
const disciplineFilter = document.querySelector('#disciplineFilter');
const priorityFilter = document.querySelector('#priorityFilter');
const cityFilter = document.querySelector('#cityFilter');
const messagesList = document.querySelector('#messagesList');
const messageDetails = document.querySelector('#messageDetails');
const totalCount = document.querySelector('#totalCount');
const p1Count = document.querySelector('#p1Count');
const lastUpdate = document.querySelector('#lastUpdate');
const activeArea = document.querySelector('#activeArea');
const heroTotal = document.querySelector('#heroTotal');
const heroPriority = document.querySelector('#heroPriority');
const neighbourhoodGrid = document.querySelector('#neighbourhoodGrid');

let selectedMessageId = messages[0]?.id ?? null;

function formatDiscipline(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getHighestPriority(items) {
  if (items.some((message) => message.priority === 'P1')) return 'P1';
  if (items.some((message) => message.priority === 'P2')) return 'P2';
  if (items.some((message) => message.priority === 'P3')) return 'P3';
  return 'Geen';
}

function countByCity(items) {
  return items.reduce((accumulator, message) => {
    accumulator[message.city] = (accumulator[message.city] || 0) + 1;
    return accumulator;
  }, {});
}

function getMostActiveCity(items) {
  const sortedCities = Object.entries(countByCity(items)).sort((a, b) => b[1] - a[1]);
  return sortedCities[0]?.[0] || '-';
}

function getFilteredMessages() {
  const discipline = disciplineFilter.value;
  const priority = priorityFilter.value;
  const query = cityFilter.value.trim().toLowerCase();

  return messages.filter((message) => {
    const disciplineMatch = discipline === 'alle' || message.discipline === discipline;
    const priorityMatch = priority === 'alle' || message.priority === priority;
    const queryMatch =
      query === '' ||
      message.city.toLowerCase().includes(query) ||
      message.area.toLowerCase().includes(query) ||
      message.location.toLowerCase().includes(query) ||
      message.title.toLowerCase().includes(query);

    return disciplineMatch && priorityMatch && queryMatch;
  });
}

function renderSummary(filteredMessages) {
  totalCount.textContent = String(filteredMessages.length);
  p1Count.textContent = String(filteredMessages.filter((message) => message.priority === 'P1').length);
  activeArea.textContent = getMostActiveCity(filteredMessages);
  heroTotal.textContent = `${messages.length} meldingen`;
  heroPriority.textContent = getHighestPriority(messages);
  lastUpdate.textContent = new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

function renderMessages() {
  const filteredMessages = getFilteredMessages();
  renderSummary(filteredMessages);
  renderNeighbourhoodGrid();

  if (!filteredMessages.length) {
    messagesList.innerHTML = '<div class="no-results">Geen meldingen gevonden met deze filters.</div>';
    messageDetails.className = 'message-details empty-state';
    messageDetails.textContent = 'Selecteer een andere plaats, discipline of prioriteit.';
    return;
  }

  if (!filteredMessages.some((message) => message.id === selectedMessageId)) {
    selectedMessageId = filteredMessages[0].id;
  }

  messagesList.innerHTML = filteredMessages.map((message) => {
    const activeClass = message.id === selectedMessageId ? ' active' : '';
    const priorityClass = message.priority.toLowerCase();

    return `
      <button class="message-card${activeClass}" type="button" data-id="${message.id}">
        <span class="priority-badge ${priorityClass}">${message.priority}</span>
        <span class="message-main">
          <strong>${message.title}</strong>
          <span class="message-meta">${formatDiscipline(message.discipline)} · ${message.city} · ${message.area}</span>
          <span class="message-tags"><span>${message.classification}</span><span>${message.status}</span></span>
        </span>
        <span class="message-time">${message.time}</span>
      </button>
    `;
  }).join('');

  renderDetails(messages.find((message) => message.id === selectedMessageId));
}

function renderDetails(message) {
  if (!message) {
    messageDetails.className = 'message-details empty-state';
    messageDetails.textContent = 'Selecteer een melding om details te bekijken.';
    return;
  }

  messageDetails.className = 'message-details';
  messageDetails.innerHTML = `
    <div class="detail-hero">
      <span>${message.priority} · ${formatDiscipline(message.discipline)}</span>
      <h3>${message.title}</h3>
      <p>${message.summary}</p>
    </div>
    <div class="detail-row"><span class="detail-label">Locatie</span><span class="detail-value">${message.location}</span></div>
    <div class="detail-row"><span class="detail-label">Classificatie</span><span>${message.classification}</span></div>
    <div class="detail-row"><span class="detail-label">Status</span><span>${message.status}</span></div>
    <div class="detail-row"><span class="detail-label">Eenheden</span><span>${message.units.join(', ')}</span></div>
  `;
}

function renderNeighbourhoodGrid() {
  const citySummaries = Object.entries(countByCity(messages)).sort((a, b) => b[1] - a[1]).map(([city, count]) => {
    const cityMessages = messages.filter((message) => message.city === city);
    const priority = getHighestPriority(cityMessages);
    const disciplines = [...new Set(cityMessages.map((message) => formatDiscipline(message.discipline)))].join(', ');

    return `
      <article class="area-card">
        <span class="area-count">${count} meldingen</span>
        <strong>${city}</strong>
        <p>Hoogste prioriteit: ${priority}. Betrokken disciplines: ${disciplines}.</p>
      </article>
    `;
  }).join('');

  neighbourhoodGrid.innerHTML = citySummaries;
}

messagesList.addEventListener('click', (event) => {
  const item = event.target.closest('.message-card');
  if (!item) return;
  selectedMessageId = Number(item.dataset.id);
  renderMessages();
});

[disciplineFilter, priorityFilter, cityFilter].forEach((input) => {
  input.addEventListener('input', renderMessages);
  input.addEventListener('change', renderMessages);
});

menuButton.addEventListener('click', () => {
  const isOpen = mainMenu.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
});

mainMenu.addEventListener('click', (event) => {
  if (event.target.tagName === 'A') {
    mainMenu.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
  }
});

renderMessages();
