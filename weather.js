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
  currentWeatherIcon: document.querySelector('#currentWeatherIcon'),
  rainHeadline: document.querySelector('#rainHeadline'),
  currentTemp: document.querySelector('#currentTemp'),
  currentDetails: document.querySelector('#currentDetails'),
  feelsLikeText: document.querySelector('#feelsLikeText'),
  feelsLikeMetric: document.querySelector('#feelsLikeMetric'),
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
  rainPeakText: document.querySelector('#rainPeakText'),
  weatherAttention: document.querySelector('#weatherAttention'),
  weatherAttentionText: document.querySelector('#weatherAttentionText'),
};

let weatherMap;
let weatherMarker;
let rainCircle;

function round(value) {
  return Number.isFinite(value) ? Math.round(value) : '--';
}

function formatTime(value) {
  if (!value) return '--:--';
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

function weatherIconType(code) {
  const number = Number(code);
  if ([0].includes(number)) return 'sun';
  if ([1, 2].includes(number)) return 'partly';
  if ([3, 45, 48].includes(number)) return 'cloud';
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(number)) return 'rain';
  if ([71, 73, 75, 77, 85, 86].includes(number)) return 'snow';
  if ([95, 96, 99].includes(number)) return 'storm';
  return 'cloud';
}

function weatherIcon(code, size = 'normal') {
  const type = weatherIconType(code);
  const className = `weather-svg weather-svg-${type} ${size === 'small' ? 'weather-svg-small' : ''}`;
  const icons = {
    sun: `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"></path></svg>`,
    partly: `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v2M5.6 5.6 7 7M3 12h2M17 7l1.4-1.4"></path><path d="M8 14a4.5 4.5 0 1 1 7.9-3A4 4 0 1 1 17 19H8a3.5 3.5 0 0 1 0-7Z"></path></svg>`,
    cloud: `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18h10a4 4 0 0 0 .4-8A6 6 0 0 0 6.1 11.5 3.5 3.5 0 0 0 7 18Z"></path></svg>`,
    rain: `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 15.5h10a4 4 0 0 0 .4-8A6 6 0 0 0 6.1 9 3.5 3.5 0 0 0 7 15.5Z"></path><path d="M8 19l-.8 2M12 19l-.8 2M16 19l-.8 2"></path></svg>`,
    snow: `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M5 7l14 10M19 7 5 17M7 4l5 3 5-3M7 20l5-3 5 3"></path></svg>`,
    storm: `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 14h10a4 4 0 0 0 .4-8A6 6 0 0 0 6.1 7.5 3.5 3.5 0 0 0 7 14Z"></path><path d="m13 13-3 5h3l-2 4 5-7h-3l2-2Z"></path></svg>`,
  };

  return icons[type];
}

function windDirectionLabel(degrees) {
  if (!Number.isFinite(degrees)) return 'wind';
  const labels = ['N', 'NO', 'O', 'ZO', 'Z', 'ZW', 'W', 'NW'];
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

function capitalise(value) {
  const text = String(value || '');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function firstUsableHourIndex(data) {
  const currentTime = new Date(data.current?.time || Date.now()).getTime();
  const index = data.hourly.time.findIndex((time) => new Date(time).getTime() >= currentTime);
  return Math.max(0, index === -1 ? 0 : index);
}

function nextHours(data, amount) {
  const start = firstUsableHourIndex(data);
  return data.hourly.time.slice(start, start + amount).map((time, offset) => {
    const index = start + offset;
    return {
      time,
      temperature: data.hourly.temperature_2m?.[index],
      rainChance: data.hourly.precipitation_probability?.[index] ?? 0,
      rainAmount: data.hourly.precipitation?.[index] ?? 0,
      weatherCode: data.hourly.weather_code?.[index],
      visibility: data.hourly.visibility?.[index],
    };
  });
}

function rainSituation(data) {
  const current = data.current;
  const hours = nextHours(data, 12);
  const rainNow = current.precipitation || current.rain || current.showers || 0;
  const nextRain = hours.find((hour, index) => index > 0 && (hour.rainChance >= 40 || hour.rainAmount > 0.1));
  const maxTwoHourChance = Math.max(...hours.slice(0, 2).map((hour) => hour.rainChance).filter(Number.isFinite), 0);
  const maxTwelveHourChance = Math.max(...hours.map((hour) => hour.rainChance).filter(Number.isFinite), 0);

  if (rainNow > 0.1) {
    return {
      headline: `Nu regen in ${WEATHER_LOCATION.name}`,
      maxTwoHourChance,
      maxTwelveHourChance,
      nextRain,
      rainNow,
    };
  }

  if (nextRain) {
    return {
      headline: `Bui verwacht rond ${formatTime(nextRain.time)}`,
      maxTwoHourChance,
      maxTwelveHourChance,
      nextRain,
      rainNow,
    };
  }

  return {
    headline: maxTwelveHourChance <= 15 ? 'Voorlopig droog' : 'Droog komende uren',
    maxTwoHourChance,
    maxTwelveHourChance,
    nextRain,
    rainNow,
  };
}

function practicalAdvice(data, rainInfo, bft) {
  const current = data.current;
  const temperature = current.apparent_temperature ?? current.temperature_2m;
  const code = Number(current.weather_code);

  if ([95, 96, 99].includes(code)) {
    return {
      title: 'Let op onweer',
      text: 'Blijf alert bij buitenactiviteiten. Onweer kan lokaal snel voor gevaar zorgen.',
    };
  }

  if (rainInfo.rainNow > 0.1 || rainInfo.maxTwoHourChance >= 60) {
    return {
      title: 'Paraplu meenemen',
      text: 'Er is nu of zeer binnenkort duidelijke kans op regen. Houd de regenbalken in de gaten.',
    };
  }

  if (bft !== '--' && bft >= 5) {
    return {
      title: 'Veel wind op de fiets',
      text: 'Op open stukken richting de Nieuwe Waterweg kan de wind merkbaar zijn.',
    };
  }

  if (Number.isFinite(temperature) && temperature <= 8) {
    return {
      title: 'Jas verstandig',
      text: 'Het voelt fris buiten. Zeker bij wind is een jas geen overbodige luxe.',
    };
  }

  if (rainInfo.maxTwelveHourChance <= 15) {
    return {
      title: 'Voorlopig droog',
      text: 'Prima om naar buiten te gaan. Geen duidelijke buien in de komende uren.',
    };
  }

  return {
    title: 'Rustig weerbeeld',
    text: 'Geen grote bijzonderheden. Kijk vooral naar de tijdlijn als je later op pad gaat.',
  };
}

function updateAttention(data, rainInfo, bft) {
  if (!elements.weatherAttention || !elements.weatherAttentionText) return;
  const code = Number(data.current.weather_code);
  const gusts = data.current.wind_gusts_10m;

  if ([95, 96, 99].includes(code)) {
    elements.weatherAttention.textContent = 'Kans op onweer';
    elements.weatherAttentionText.textContent = 'Houd buitenactiviteiten en open locaties extra in de gaten.';
  } else if ((bft !== '--' && bft >= 6) || gusts >= 60) {
    elements.weatherAttention.textContent = 'Harde wind mogelijk';
    elements.weatherAttentionText.textContent = `Windstoten tot ongeveer ${round(gusts)} km/u.`;
  } else if (rainInfo.maxTwelveHourChance >= 70) {
    elements.weatherAttention.textContent = 'Grote kans op buien';
    elements.weatherAttentionText.textContent = 'Er is later duidelijke kans op regen. Check de komende 12 uur.';
  } else {
    elements.weatherAttention.textContent = 'Geen bijzonderheden';
    elements.weatherAttentionText.textContent = 'Geen zware buien, onweer of harde wind zichtbaar in de huidige data.';
  }
}

function initMap() {
  const mapElement = document.querySelector('#weatherMap');
  if (!mapElement || !window.L || weatherMap) return;

  weatherMap = L.map(mapElement, {
    zoomControl: true,
    scrollWheelZoom: false,
  }).setView([WEATHER_LOCATION.latitude, WEATHER_LOCATION.longitude], 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap',
  }).addTo(weatherMap);

  weatherMarker = L.marker([WEATHER_LOCATION.latitude, WEATHER_LOCATION.longitude])
    .addTo(weatherMap)
    .bindPopup('Meetpunt Maassluis<br>Weerlocatie De Buurtwacht');

  rainCircle = L.circle([WEATHER_LOCATION.latitude, WEATHER_LOCATION.longitude], {
    radius: 2200,
    color: '#1597ed',
    weight: 1,
    fillColor: '#34acfc',
    fillOpacity: 0.08,
  }).addTo(weatherMap);
}

function updateMap(data) {
  if (!weatherMap || !rainCircle || !weatherMarker) return;

  const rainInfo = rainSituation(data);
  const rainChance = rainInfo.maxTwelveHourChance;
  const radius = 1800 + rainChance * 32;
  const fillOpacity = Math.min(0.26, 0.05 + rainChance / 430);

  rainCircle.setRadius(radius);
  rainCircle.setStyle({
    fillOpacity,
    opacity: rainChance > 40 || rainInfo.rainNow > 0 ? 0.75 : 0.32,
  });

  weatherMarker.setPopupContent(`
    <strong>Meetpunt ${escapeHtml(WEATHER_LOCATION.name)}</strong><br>
    ${round(data.current.temperature_2m)}° · ${escapeHtml(weatherText(data.current.weather_code))}<br>
    Regenkans komende uren: ${round(rainChance)}%
  `);

  setTimeout(() => weatherMap.invalidateSize(), 150);
}

function renderCurrent(data) {
  const current = data.current;
  const daily = data.daily;
  const text = weatherText(current.weather_code);
  const wind = current.wind_speed_10m;
  const direction = windDirectionLabel(current.wind_direction_10m);
  const bft = windBft(wind);
  const rainInfo = rainSituation(data);
  const hours = nextHours(data, 1);
  const visibility = hours[0]?.visibility ? Math.round(hours[0].visibility / 1000) : '--';
  const advice = practicalAdvice(data, rainInfo, bft);

  if (elements.currentWeatherIcon) elements.currentWeatherIcon.innerHTML = weatherIcon(current.weather_code);
  elements.rainHeadline.textContent = rainInfo.headline;
  elements.currentTemp.textContent = `${round(current.temperature_2m)}°`;
  elements.currentDetails.textContent = `${capitalise(text)} · voelt als ${round(current.apparent_temperature)}° · wind ${bft} Bft ${direction}`;
  elements.feelsLikeText.textContent = `Voelt als ${round(current.apparent_temperature)}°`;
  elements.feelsLikeMetric.textContent = `${round(current.apparent_temperature)}°`;
  elements.todaySummary.textContent = `${capitalise(text)} vandaag`;
  elements.todayText.textContent = `Vandaag ongeveer ${round(daily.temperature_2m_max?.[0])}°. Regenkans tot ${round(daily.precipitation_probability_max?.[0] ?? rainInfo.maxTwelveHourChance)}%. Wind ${bft} Bft uit ${direction}.`;
  elements.rainChance.textContent = `${round(rainInfo.maxTwoHourChance)}%`;
  elements.windStrength.textContent = `${bft} Bft`;
  elements.windDirection.textContent = `${direction} · ${round(wind)} km/u`;
  elements.visibilityValue.textContent = `${visibility} km`;
  elements.weatherUpdated.textContent = `Bijgewerkt ${formatTime(current.time)}`;
  elements.forecastButton.textContent = 'Live';
  elements.radarStatus.textContent = 'Kaart';
  elements.intro.textContent = `Snel overzicht voor ${WEATHER_LOCATION.name}: regen, wind en gevoelstemperatuur.`;
  elements.adviceTitle.textContent = advice.title;
  elements.adviceText.textContent = advice.text;

  updateAttention(data, rainInfo, bft);
}

function renderRainBars(data) {
  const hours = nextHours(data, 8);
  const maxChance = Math.max(...hours.map((hour) => hour.rainChance).filter(Number.isFinite), 0);
  const peak = hours.find((hour) => hour.rainChance === maxChance);

  if (elements.rainPeakText) {
    elements.rainPeakText.textContent = maxChance > 0 && peak
      ? `Piek rond ${formatTime(peak.time)} · ${round(maxChance)}%`
      : 'Voorlopig weinig kans op regen';
  }

  elements.rainBars.innerHTML = hours.map((hour) => {
    const chance = hour.rainChance ?? 0;
    const rainAmount = hour.rainAmount ?? 0;
    const height = Math.max(6, Math.min(96, chance));
    const title = `${chance}% kans, ${Number(rainAmount).toFixed(1)} mm`;

    return `
      <div title="${escapeHtml(title)}">
        <small class="rain-percent">${round(chance)}%</small>
        <span style="height: ${height}%"></span>
        <small>${escapeHtml(formatTime(hour.time))}</small>
      </div>
    `;
  }).join('');
}

function renderHourly(data) {
  const hours = nextHours(data, 12);

  elements.hourlyForecast.innerHTML = hours.map((hour, index) => {
    const activeClass = index === 0 ? ' active' : '';
    const rainChance = hour.rainChance ?? 0;
    const rainBarHeight = Math.max(4, Math.min(100, rainChance));

    return `
      <article class="timeline-item${activeClass}" title="${escapeHtml(weatherText(hour.weatherCode))}, ${round(rainChance)}% regenkans">
        <span>${escapeHtml(formatTime(hour.time))}</span>
        ${weatherIcon(hour.weatherCode, 'small')}
        <strong>${round(hour.temperature)}°</strong>
        <small>${round(rainChance)}%</small>
        <i style="height: ${rainBarHeight}%"></i>
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
        <span class="daily-icon" aria-hidden="true">${weatherIcon(code, 'small')}</span>
        <strong>${round(max)}° / ${round(min)}°</strong>
        <p>${escapeHtml(capitalise(weatherText(code)))} · ${round(rainChance)}% regen</p>
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
    updateMap(data);
  } catch (error) {
    console.error(error);
    showNotice('Live weerdata kon niet worden geladen. Controleer later opnieuw; er wordt geen nepweer getoond.');
    if (elements.forecastButton) elements.forecastButton.textContent = 'Niet geladen';
    if (elements.radarStatus) elements.radarStatus.textContent = 'Geen live data';
    if (elements.weatherUpdated) elements.weatherUpdated.textContent = 'Live data niet beschikbaar';
  }
}

initMap();
loadWeather();
setInterval(loadWeather, 10 * 60 * 1000);
