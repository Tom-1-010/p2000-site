const P2000_RSS_URL = 'http://p2000.brandweer-berkel-enschot.nl/homeassistant/rss.asp';
const P2000_PROXY_URL = `https://api.allorigins.win/raw?url=${encodeURIComponent(P2000_RSS_URL)}`;
const REFRESH_INTERVAL_MS = 60000;

const fallbackMessages = [
  {
    id: 'demo-1',
    time: '16:42',
    priority: 'P1',
    discipline: 'brandweer',
    title: 'Woningbrand gemeld',
    city: 'Maassluis',
    area: 'Centrum',
    location: 'Lange Boonestraat, Maassluis',
    classification: 'Brand woning',
    summary: 'Voorbeeldmelding: rookontwikkeling gemeld bij een woning.',
    units: ['TS 17-1231', 'RV 17-1251'],
    status: 'Voorbeelddata',
  },
  {
    id: 'demo-2',
    time: '16:35',
    priority: 'P2',
    discipline: 'ambulance',
    title: 'Medische melding winkelgebied',
    city: 'Schiedam',
    area: 'Centrum',
    location: 'Hoogstraat, Schiedam',
    classification: 'Medisch incident',
    summary: 'Voorbeeldmelding: ambulance gevraagd voor medische hulp.',
    units: ['Ambulance 17-121'],
    status: 'Voorbeelddata',
  },
  {
    id: 'demo-3',
    time: '16:22',
    priority: 'P1',
    discipline: 'politie',
    title: 'Assistentie aan hulpdiensten',
    city: 'Vlaardingen',
    area: 'Westwijk',
    location: 'Westhavenkade, Vlaardingen',
    classification: 'Assistentie',
    summary: 'Voorbeeldmelding: politie gevraagd voor ondersteuning.',
    units: ['Eenheid 21.05', 'Eenheid 21.07'],
    status: 'Voorbeelddata',
  },
];

let messages = [...fallbackMessages];
let selectedMessageId = messages[0]?.id ?? null;

const knownCities = [
  'Rotterdam', 'Schiedam', 'Vlaardingen', 'Maassluis', 'Rozenburg', 'Maasland',
  'Capelle aan den IJssel', 'Krimpen aan den IJssel', 'Barendrecht', 'Ridderkerk',
  'Spijkenisse', 'Nissewaard', 'Hellevoetsluis', 'Brielle', 'Oostvoorne', 'Rockanje',
  'Hoek van Holland', 'Dordrecht', 'Zwijndrecht', 'Papendrecht', 'Sliedrecht',
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
const apiStatus = document.querySelector('#apiStatus');
const feedStatus = document.querySelector('#feedStatus');

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setFeedStatus(text) {
  if (apiStatus) apiStatus.textContent = text;
  if (feedStatus) feedStatus.textContent = text;
}

function getXmlValue(item, tagName) {
  return item.getElementsByTagName(tagName)[0]?.textContent?.trim() || '';
}

function normalizeDiscipline(value, messageText) {
  const raw = `${value} ${messageText}`.toLowerCase();
  if (raw.includes('brandweer') || raw.includes('brand')) return 'brandweer';
  if (raw.includes('ambulance') || raw.includes('ambu') || raw.includes('lifeliner')) return 'ambulance';
  if (raw.includes('politie')) return 'politie';
  return 'overig';
}

function formatDiscipline(value) {
  const labels = { brandweer: 'Brandweer', ambulance: 'Ambulance', politie: 'Politie', overig: 'Overig' };
  return labels[value] || value;
}

function inferPriority(text) {
  const match = String(text).toUpperCase().match(/\bP\s?([123])\b/);
  return match ? `P${match[1]}` : 'P2';
}

function inferCity(text, regionName) {
  const haystack = `${text} ${regionName}`.toLowerCase();
  const found = knownCities.find((city) => haystack.includes(city.toLowerCase()));
  return found || regionName || 'Onbekend';
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

function parseP2000Feed(xmlText) {
  const xml = new DOMParser().parseFromString(xmlText, 'text/xml');
  if (xml.querySelector('parsererror')) throw new Error('P2000-feed kon niet worden gelezen.');

  return [...xml.querySelectorAll('item')].slice(0, 60).map((item, index) => {
    const messageText = getXmlValue(item, 'message') || getXmlValue(item, 'title') || getXmlValue(item, 'description');
    const regionName = getXmlValue(item, 'regname');
    const disciplineRaw = getXmlValue(item, 'dienst');
    const capcode = getXmlValue(item, 'code');
    const published = getXmlValue(item, 'published') || getXmlValue(item, 'pubDate');
    const city = inferCity(messageText, regionName);
    const discipline = normalizeDiscipline(disciplineRaw, messageText);
    const priority = inferPriority(messageText);

    return {
      id: `live-${published || index}-${capcode || index}`,
      time: formatTime(published),
      priority,
      discipline,
      title: messageText || 'P2000-melding',
      city,
      area: regionName || city,
      location: messageText || city,
      classification: disciplineRaw || 'P2000',
      summary: messageText || 'Live P2000-melding zonder extra omschrijving.',
      units: capcode ? [capcode] : ['Capcode onbekend'],
      status: 'Live P2000',
    };
  });
}

async function loadP2000Feed() {
  setFeedStatus('P2000-feed laden...');
  const urls = window.location.protocol === 'http:' ? [P2000_RSS_URL, P2000_PROXY_URL] : [P2000_PROXY_URL];

  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const xmlText = await response.text();
      const liveMessages = parseP2000Feed(xmlText);

      if (!liveMessages.length) throw new Error('Geen meldingen in feed.');
      messages = liveMessages;
      selectedMessageId = messages[0].id;
      setFeedStatus('Live P2000-feed');
      renderMessages();
      return;
    } catch (error) {
      console.warn('P2000-feed niet geladen via', url, error);
    }
  }

  messages = [...fallbackMessages];
  selectedMessageId = messages[0]?.id ?? null;
  setFeedStatus('Fallback voorbeelddata');
  renderMessages();
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
    messageDetails.textContent = 'Selecteer een andere stad, plaats, discipline of prioriteit.';
    return;
  }

  if (!filteredMessages.some((message) => message.id === selectedMessageId)) {
    selectedMessageId = filteredMessages[0].id;
  }

  messagesList.innerHTML = filteredMessages.map((message) => {
    const activeClass = message.id === selectedMessageId ? ' active' : '';
    const priorityClass = message.priority.toLowerCase();

    return `
      <button class="message-card${activeClass}" type="button" data-id="${escapeHtml(message.id)}">
        <span class="priority-badge ${priorityClass}">${escapeHtml(message.priority)}</span>
        <span class="message-main">
          <strong>${escapeHtml(message.title)}</strong>
          <span class="message-meta">${escapeHtml(formatDiscipline(message.discipline))} · ${escapeHtml(message.city)} · ${escapeHtml(message.area)}</span>
          <span class="message-tags"><span>${escapeHtml(message.classification)}</span><span>${escapeHtml(message.status)}</span></span>
        </span>
        <span class="message-time">${escapeHtml(message.time)}</span>
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
      <span>${escapeHtml(message.priority)} · ${escapeHtml(formatDiscipline(message.discipline))}</span>
      <h3>${escapeHtml(message.title)}</h3>
      <p>${escapeHtml(message.summary)}</p>
    </div>
    <div class="detail-row"><span class="detail-label">Locatie / tekst</span><span class="detail-value">${escapeHtml(message.location)}</span></div>
    <div class="detail-row"><span class="detail-label">Classificatie</span><span>${escapeHtml(message.classification)}</span></div>
    <div class="detail-row"><span class="detail-label">Status</span><span>${escapeHtml(message.status)}</span></div>
    <div class="detail-row"><span class="detail-label">Capcodes / eenheden</span><span>${escapeHtml(message.units.join(', '))}</span></div>
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
        <strong>${escapeHtml(city)}</strong>
        <p>Hoogste prioriteit: ${escapeHtml(priority)}. Betrokken disciplines: ${escapeHtml(disciplines)}.</p>
      </article>
    `;
  }).join('');

  neighbourhoodGrid.innerHTML = citySummaries;
}

messagesList.addEventListener('click', (event) => {
  const item = event.target.closest('.message-card');
  if (!item) return;
  selectedMessageId = item.dataset.id;
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
loadP2000Feed();
setInterval(loadP2000Feed, REFRESH_INTERVAL_MS);
