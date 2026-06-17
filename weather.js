const WEATHER_LOCATION = {
  name: 'Maassluis',
  latitude: 51.9233,
  longitude: 4.2500,
  timezone: 'Europe/Amsterdam',
};

const WEATHER_API_URL = new URL('https://api.open-meteo.com/v1/forecast');
WEATHER_API_URL.search = new URLSearchParams({
  latitude: String(WEATHER_LOCATION.latitude),
  longitude: String(WEATHER_LOCATION.longitude),
  timezone: WEATHER_LOCATION.timezone,
  current: [
    'temperature_2m',
    'relative_humidity_2m',
    'apparent_temperature',
    'precipitation',
    'rain',
    'showers',
    'weather_code',
    'cloud_cover',
    'wind_speed_10m',
    'wind_direction_10m',
    'wind_gusts_10m',
  ].join(','),
  hourly: [
    'temperature_2m',
    'precipitation_probability',
    'precipitation',
    'rain',
    'weather_code',
    'cloud_cover',
    'wind_speed_10m',
    'wind_direction_10m',
    'visibility',
  ].join(','),
  daily: [
    'weather_code',
    'temperature_2m_max',
    'temperature_2m_min',
    'precipitation_probability_max',
    'precipitation_sum',
    'wind_speed_10m_max',
    'wind_gusts_10m_max',
  ].join(','),
  forecast_days: '5',
  forecast_hours: '24',
  wind_speed_unit: 'kmh',
  precipitation_unit: 'mm',
}).toString();

const elements = {
  intro: document.querySelector('#weatherIntro'),
  currentTemp: document.querySelector('#currentTemp'),
  currentDetails: document.querySelector('#currentDetails'),
  todaySummary: document.querySelector('#todaySummary'),
  todayText: document.querySelector('#todayText'),
  rainChance: document.querySelector('#rainChance'),
  windStrength: document.querySelector('#windStrength'),
  windDirection: document.querySelector('#windDirection'),
  visibilityValue: document.querySelector('#visibilityValue'),
  adviceTitle: document.querySelector('#adviceTitle'),
  adviceText: document.querySelector('#adviceText'),
  weatherUpdated: document.querySelector('#weatherUpdated'),
  rainBars: document.querySelector('#rainBars'),
  hourlyForecast: document.querySelector('#hourlyForecast'),
  dailyList: document.querySelector('#dailyList'),
  apiNotice: document.querySelector('#apiNotice'),
  forecastButton: document.querySelector('#forecastButton'),
  radarStatus: document.querySelector('#radarStatus'),
  rainCells: [...document.querySelectorAll('.rain-cell')],
};

function round(value) {
  return Number.isFinite(value) ? Math.round(value) : '--';
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateLabel(value, index) {
  if (index === 0) return 'Vandaag';
  if (index === 1) return 'Morgen';

  return new Date(value).toLocaleDateString('nl-NL', {
    weekday: 'long',
  });
}

function weatherText(code) {
  const groups = [
    { codes: [0], text: 'helder' },
    { codes: [1, 2], text: 'licht bewolkt' },
    { codes: [3], text: 'bewolkt' },
    { codes: [45, 48], text: 'mist' },
    { codes: [51, 53, 55], text: 'motregen' },
    { codes: [56, 57], text: 'ijzel' },
    { codes: [61, 63], text: 'regen' },
    { codes: [65], text: 'zware regen' },
    { codes: [66, 67], text: 'ijzelregen' },
    { codes: [71, 73, 75, 77], text: 'sneeuw' },
    { codes: [80, 81], text: 'buien' },
    { codes: [82], text: 'zware buien' },
    { codes: [85, 86], text: 'sneeuwbuien' },
    { codes: [95, 96, 99], text: 'onweer' },
  ];

  return groups.find((group) => group.codes.includes(Number(code)))?.text || 'wisselend weer';
}

function windDirectionLabel(degrees) {
  if (!Number.isFinite(degrees)) return 'wind';
  const labels = ['noord', 'noordoost', 'oost', 'zuidoost', 'zuid', 'zuidwest', 'west', 'noordwest'];
  const index = Math.round(degrees / 45) % 8;
  return labels[index];
}

function windBft(kmh) {
  if (!Number.isFinite(kmh)) return '--';
  const limits = [1, 5, 11, 19, 28, 38, 49, 61, 74, 88, 102, 117];
  const beaufort = limits.findIndex((limit) => kmh < limit);
  return beaufort === -1 ? 12 : beaufort;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function showNotice(message) {
  if (!elements.apiNotice) return;
  elements.apiNotice.hidden = !message;
  elements.apiNotice.textContent = message || '';
}

function setRainMapIntensity(maxRainChance) {
  const intensity = Math.min(1, Math.max(0.18, maxRainChance / 100));
  elements.rainCells.forEach((cell, index) => {
    const multiplier = [0.55, 0.9, 0.38][index] || 0.4;
    cell.style.opacity = String(Math.max(0.12, intensity * multiplier));
  });
}

function renderCurrent(data) {
  const current = data.current;
  const daily = data.daily;
  const text = weatherText(current.weather_code);
  const wind = current.wind_speed_10m;
  const direction = windDirectionLabel(current.wind_direction_10m);
  const bft = windBft(wind);
  const rainChance = daily.precipitation_probability_max?.[0] ?? 0;
  const visibility = data.hourly.visibility?.[0] ? Math.round(data.hourly.visibility[0] / 1000) : '--';

  elements.currentTemp.textContent = `${round(current.temperature_2m)}°`;
  elements.currentDetails.textContent = `${text} · wind ${bft} Bft`;
  elements.todaySummary.textContent = `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
  elements.todayText.textContent = `Vandaag wordt het ongeveer ${round(daily.temperature_2m_max?.[0])}°. De kans op regen is ${round(rainChance)}%.`;
  elements.rainChance.textContent = `${round(rainChance)}%`;
  elements.windStrength.textContent = `${bft} Bft`;
  elements.windDirection.textContent = direction;
  elements.visibilityValue.textContent = `${visibility} km`;
  elements.weatherUpdated.textContent = `${formatTime(current.time)} bijgewerkt`;
  elements.forecastButton.textContent = 'Open-Meteo live';
  elements.radarStatus.textContent = 'Live verwachting';
  elements.intro.textContent = `Actuele verwachting voor ${WEATHER_LOCATION.name}. Temperatuur, neerslag en wind worden live opgehaald.`;

  const rainNow = current.precipitation || current.rain || current.showers || 0;
  if (rainChance >= 70 || rainNow > 0.5) {
    elements.adviceTitle.textContent = 'Regenjas mee';
    elements.adviceText.textContent = 'Er is duidelijk kans op regen. Check vooral de neerslagbalken hieronder.';
  } else if (wind >= 38) {
    elements.adviceTitle.textContent = 'Let op de wind';
    elements.adviceText.textContent = 'Er staat vrij veel wind. Houd hier rekening mee op de fiets.';
  } else {
    elements.adviceTitle.textContent = 'Prima om op pad te gaan';
    elements.adviceText.textContent = 'De verwachting ziet er rustig uit. Houd de buien rond de regio wel in de gaten.';
  }
}

function renderRainBars(data) {
  const hours = data.hourly.time.slice(0, 8);
  const probabilities = data.hourly.precipitation_probability.slice(0, 8);
  const rain = data.hourly.precipitation.slice(0, 8);
  const maxChance = Math.max(...probabilities.filter(Number.isFinite), 0);

  setRainMapIntensity(maxChance);

  elements.rainBars.innerHTML = hours.map((time, index) => {
    const chance = probabilities[index] ?? 0;
    const rainAmount = rain[index] ?? 0;
    const height = Math.max(8, Math.min(96, chance));
    const title = `${chance}% kans, ${rainAmount.toFixed(1)} mm`;

    return `
      <div title="${escapeHtml(title)}">
        <span style="height: ${height}%"></span>
        <small>${escapeHtml(formatTime(time))}</small>
      </div>
    `;
  }).join('');
}

function renderHourly(data) {
  const hours = data.hourly.time.slice(0, 4);

  elements.hourlyForecast.innerHTML = hours.map((time, index) => {
    const temperature = data.hourly.temperature_2m[index];
    const code = data.hourly.weather_code[index];
    const chance = data.hourly.precipitation_probability[index] ?? 0;
    const activeClass = index === 1 ? ' active' : '';

    return `
      <article class="forecast-card${activeClass}">
        <span>${escapeHtml(formatTime(time))}</span>
        <strong>${round(temperature)}°</strong>
        <p>${escapeHtml(weatherText(code))} · ${round(chance)}%</p>
      </article>
    `;
  }).join('');
}

function renderDaily(data) {
  elements.dailyList.innerHTML = data.daily.time.map((date, index) => {
    const min = data.daily.temperature_2m_min[index];
    const max = data.daily.temperature_2m_max[index];
    const code = data.daily.weather_code[index];
    const rainChance = data.daily.precipitation_probability_max[index] ?? 0;

    return `
      <article>
        <span>${escapeHtml(formatDateLabel(date, index))}</span>
        <strong>${round(max)}° / ${round(min)}°</strong>
        <p>${escapeHtml(weatherText(code))} · ${round(rainChance)}% regen</p>
      </article>
    `;
  }).join('');
}

async function loadWeather() {
  try {
    showNotice('');
    const response = await fetch(WEATHER_API_URL, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Open-Meteo gaf HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.current || !data.hourly || !data.daily) {
      throw new Error('Onvolledige weerdata ontvangen.');
    }

    renderCurrent(data);
    renderRainBars(data);
    renderHourly(data);
    renderDaily(data);
  } catch (error) {
    console.error(error);
    showNotice('Live weerdata kon niet worden geladen. De getoonde waarden blijven tijdelijk op de laatst bekende of voorbeeldstand staan.');
    if (elements.forecastButton) elements.forecastButton.textContent = 'Niet geladen';
    if (elements.radarStatus) elements.radarStatus.textContent = 'Geen live data';
  }
}

loadWeather();
setInterval(loadWeather, 10 * 60 * 1000);
