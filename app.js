const messages = [
  {
    id: 1,
    time: '16:42',
    priority: 'P1',
    discipline: 'brandweer',
    title: 'Gebouwbrand woning',
    location: 'Lange Boonestraat, Maassluis',
    classification: 'BR woning',
    units: ['TS 17-1231', 'RV 17-1251', 'OVDB 17-9091'],
    duration: '00:18:44',
    logs: [
      '16:42 - P2000 alarmering verzonden',
      '16:43 - TS 17-1231 gealarmeerd',
      '16:44 - RV 17-1251 toegevoegd',
    ],
  },
  {
    id: 2,
    time: '16:35',
    priority: 'P2',
    discipline: 'ambulance',
    title: 'Onwelwording in winkel',
    location: 'Hoogstraat, Schiedam',
    classification: 'A2 onwel',
    units: ['17-121', '17-902'],
    duration: '00:11:02',
    logs: [
      '16:35 - Melding aangemaakt',
      '16:36 - Ambulance 17-121 gekoppeld',
    ],
  },
  {
    id: 3,
    time: '16:22',
    priority: 'P1',
    discipline: 'politie',
    title: 'Assistentie hulpdiensten',
    location: 'Westhavenkade, Vlaardingen',
    classification: 'Assistentie ambulance',
    units: ['RT 21.05', 'RT 21.07'],
    duration: '00:27:18',
    logs: [
      '16:22 - Politie gekoppeld aan incident',
      '16:24 - Eenheid ter plaatse gemeld',
    ],
  },
  {
    id: 4,
    time: '16:11',
    priority: 'P3',
    discipline: 'brandweer',
    title: 'Stormschade dakrand',
    location: 'Emmastraat, Rozenburg',
    classification: 'THV stormschade',
    units: ['TS 17-1431'],
    duration: '00:41:29',
    logs: [
      '16:11 - Melding ontvangen',
      '16:13 - TS 17-1431 gealarmeerd',
      '16:28 - Situatie veiliggesteld',
    ],
  },
  {
    id: 5,
    time: '15:58',
    priority: 'P2',
    discipline: 'brandweer',
    title: 'Automatische brandmelding',
    location: 'Stationsweg, Maasland',
    classification: 'OMS openbaar gebouw',
    units: ['TS 17-1131'],
    duration: '00:52:07',
    logs: [
      '15:58 - Automatische melding ontvangen',
      '15:59 - TS 17-1131 gealarmeerd',
    ],
  },
];

const disciplineFilter = document.querySelector('#disciplineFilter');
const priorityFilter = document.querySelector('#priorityFilter');
const cityFilter = document.querySelector('#cityFilter');
const messagesList = document.querySelector('#messagesList');
const messageDetails = document.querySelector('#messageDetails');
const totalCount = document.querySelector('#totalCount');
const p1Count = document.querySelector('#p1Count');
const lastUpdate = document.querySelector('#lastUpdate');

let selectedMessageId = messages[0]?.id ?? null;

function formatDiscipline(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getFilteredMessages() {
  const discipline = disciplineFilter.value;
  const priority = priorityFilter.value;
  const city = cityFilter.value.trim().toLowerCase();

  return messages.filter((message) => {
    const disciplineMatch = discipline === 'alle' || message.discipline === discipline;
    const priorityMatch = priority === 'alle' || message.priority === priority;
    const cityMatch = city === '' || message.location.toLowerCase().includes(city);

    return disciplineMatch && priorityMatch && cityMatch;
  });
}

function renderSummary(filteredMessages) {
  totalCount.textContent = String(filteredMessages.length);
  p1Count.textContent = String(filteredMessages.filter((message) => message.priority === 'P1').length);
  lastUpdate.textContent = new Date().toLocaleTimeString('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderMessages() {
  const filteredMessages = getFilteredMessages();
  renderSummary(filteredMessages);

  if (!filteredMessages.length) {
    messagesList.innerHTML = '<div class="no-results">Geen meldingen gevonden met deze filters.</div>';
    messageDetails.className = 'message-details empty-state';
    messageDetails.textContent = 'Geen melding geselecteerd.';
    return;
  }

  if (!filteredMessages.some((message) => message.id === selectedMessageId)) {
    selectedMessageId = filteredMessages[0].id;
  }

  messagesList.innerHTML = filteredMessages
    .map((message) => {
      const activeClass = message.id === selectedMessageId ? ' active' : '';
      const priorityClass = message.priority.toLowerCase();

      return `
        <button class="message-item${activeClass}" type="button" data-id="${message.id}">
          <span class="priority-badge ${priorityClass}">${message.priority}</span>
          <span class="message-main">
            <strong>${message.title}</strong>
            <span class="message-meta">${formatDiscipline(message.discipline)} · ${message.location}</span>
          </span>
          <span class="message-time">${message.time}</span>
        </button>
      `;
    })
    .join('');

  renderDetails(messages.find((message) => message.id === selectedMessageId));
}

function renderDetails(message) {
  if (!message) {
    messageDetails.className = 'message-details empty-state';
    messageDetails.textContent = 'Geen melding geselecteerd.';
    return;
  }

  messageDetails.className = 'message-details';
  messageDetails.innerHTML = `
    <div class="detail-row">
      <span class="detail-label">Melding</span>
      <span class="detail-value">${message.priority} · ${message.title}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Classificatie</span>
      <span>${message.classification}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Adres</span>
      <span>${message.location}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Gekoppelde eenheden</span>
      <span>${message.units.join(', ')}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Bezetduur</span>
      <span>${message.duration}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">P2000 logs</span>
      <ol class="log-list">
        ${message.logs.map((line) => `<li>${line}</li>`).join('')}
      </ol>
    </div>
  `;
}

messagesList.addEventListener('click', (event) => {
  const item = event.target.closest('.message-item');

  if (!item) {
    return;
  }

  selectedMessageId = Number(item.dataset.id);
  renderMessages();
});

[disciplineFilter, priorityFilter, cityFilter].forEach((input) => {
  input.addEventListener('input', renderMessages);
  input.addEventListener('change', renderMessages);
});

renderMessages();
