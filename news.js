const MAX_NEWS_ITEMS = 24;

const NEWS_FEEDS = [
  {
    id: 'wos-maassluis',
    label: 'WOS',
    category: 'maassluis',
    url: 'https://news.google.com/rss/search?q=site%3Awos.nl%20Maassluis&hl=nl&gl=NL&ceid=NL:nl',
  },
  {
    id: 'rijnmond-maassluis',
    label: 'Rijnmond',
    category: 'waterweg',
    url: 'https://news.google.com/rss/search?q=site%3Arijnmond.nl%20Maassluis&hl=nl&gl=NL&ceid=NL:nl',
  },
  {
    id: 'gemeente-maassluis',
    label: 'Gemeente Maassluis',
    category: 'gemeente',
    url: 'https://news.google.com/rss/search?q=site%3Amaassluis.nl%20Maassluis%20nieuws&hl=nl&gl=NL&ceid=NL:nl',
  },
  {
    id: 'politie-maassluis',
    label: 'Politie',
    category: 'veiligheid',
    url: 'https://news.google.com/rss/search?q=site%3Apolitie.nl%20Maassluis&hl=nl&gl=NL&ceid=NL:nl',
  },
  {
    id: 'werkzaamheden-maassluis',
    label: 'Werkzaamheden',
    category: 'gemeente',
    url: 'https://news.google.com/rss/search?q=Maassluis%20werkzaamheden%20OR%20wegafsluiting%20OR%20verkeer&hl=nl&gl=NL&ceid=NL:nl',
  },
  {
    id: 'bekendmakingen-maassluis',
    label: 'Bekendmakingen',
    category: 'gemeente',
    url: 'https://news.google.com/rss/search?q=Maassluis%20bekendmakingen%20vergunning&hl=nl&gl=NL&ceid=NL:nl',
  },
];

const LOCAL_TERMS = [
  'maassluis',
  'maasland',
  'vlaardingen',
  'schiedam',
  'waterweg',
  'rijnmond',
  'wos',
  'gemeente maassluis',
  'politie',
  'werkzaamheden',
  'wegafsluiting',
  'bekendmakingen',
  'vergunning',
  'midden-delfland',
];

const newsState = {
  allItems: [],
  activeFilter: 'all',
  search: '',
  loading: false,
};

const elements = {
  status: document.querySelector('#newsStatus'),
  updated: document.querySelector('#newsUpdated'),
  count: document.querySelector('#newsCount'),
  sourceCount: document.querySelector('#sourceCount'),
  lastUpdate: document.querySelector('#lastUpdateTime'),
  list: document.querySelector('#newsList'),
  topStory: document.querySelector('#topStoryCard'),
  sourceList: document.querySelector('#sourceList'),
  search: document.querySelector('#newsSearch'),
  refresh: document.querySelector('#refreshNews'),
  filters: [...document.querySelectorAll('.news-filter')],
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function stripHtml(value) {
  const doc = new DOMParser().parseFromString(String(value || ''), 'text/html');
  return doc.body.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function formatTime(value) {
  if (!value) return '--:--';
  return new Date(value).toLocaleTimeString('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(value) {
  if (!value) return 'tijd onbekend';
  const date = new Date(value);
  const diffHours = Math.floor((Date.now() - date.getTime()) / 3600000);

  if (diffHours < 1) return 'zojuist';
  if (diffHours < 24) return `${diffHours} uur geleden`;

  return date.toLocaleDateString('nl-NL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function extractSource(title, fallback) {
  if (!title) return fallback;
  const parts = title.split(' - ');
  return parts.length > 1 ? parts.at(-1).trim() : fallback;
}

function cleanTitle(title) {
  if (!title) return 'Geen titel';
  const parts = title.split(' - ');
  return parts.length > 1 ? parts.slice(0, -1).join(' - ').trim() : title.trim();
}

function relevanceScore(item) {
  const haystack = `${item.title} ${item.description} ${item.source}`.toLowerCase();
  let score = 0;

  LOCAL_TERMS.forEach((term) => {
    if (haystack.includes(term)) score += term === 'maassluis' ? 5 : 2;
  });

  if (item.category === 'maassluis') score += 3;
  if (item.category === 'veiligheid') score += 1;
  if (item.feedLabel === 'WOS' || item.feedLabel === 'Gemeente Maassluis') score += 2;

  return score;
}

function normalizeItem(item, feed) {
  const rawTitle = item.title || 'Geen titel';
  const description = stripHtml(item.description || item.content || item.summary || '').slice(0, 220);
  const link = item.link || item.guid || '#';
  const source = item.source || item.author || extractSource(rawTitle, feed.label);
  const publishedAt = item.pubDate || item.published || item.updated || new Date().toISOString();

  const normalized = {
    id: `${feed.id}-${link || rawTitle}`,
    title: cleanTitle(rawTitle),
    description,
    link,
    source,
    category: feed.category,
    feedLabel: feed.label,
    publishedAt: new Date(publishedAt).toISOString(),
    loadedFrom: feed.url,
  };

  normalized.score = relevanceScore(normalized);
  return normalized;
}

function getText(parent, selectors) {
  for (const selector of selectors) {
    const node = parent.querySelector(selector);
    if (node?.textContent) return node.textContent.trim();
  }
  return '';
}

function getLink(entry) {
  const directLink = entry.querySelector('link')?.textContent?.trim();
  if (directLink) return directLink;

  const atomLink = entry.querySelector('link[href]')?.getAttribute('href');
  return atomLink || '#';
}

function parseFeedXml(xmlText, feed) {
  const xml = new DOMParser().parseFromString(xmlText, 'application/xml');
  const parserError = xml.querySelector('parsererror');

  if (parserError) {
    throw new Error(`Ongeldige RSS XML voor ${feed.label}`);
  }

  return [...xml.querySelectorAll('item, entry')].map((entry) => normalizeItem({
    title: getText(entry, ['title']),
    description: getText(entry, ['description', 'summary', 'content']),
    pubDate: getText(entry, ['pubDate', 'published', 'updated']),
    link: getLink(entry),
    source: getText(entry, ['source']) || undefined,
  }, feed));
}

function uniqueItems(items) {
  const seen = new Set();

  return items.filter((item) => {
    const key = `${item.title.toLowerCase()}-${item.source.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function proxiedXmlUrls(url) {
  return [
    `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  ];
}

function rssJsonUrls(url) {
  return [
    `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`,
  ];
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function loadFeedViaJson(feed) {
  let lastError;

  for (const url of rssJsonUrls(feed.url)) {
    try {
      const data = await fetchJson(url);
      if (data.status && data.status !== 'ok') throw new Error(data.message || 'RSS2JSON gaf geen ok-status');
      if (!Array.isArray(data.items) || !data.items.length) throw new Error('RSS2JSON gaf geen items terug');
      return data.items.map((item) => normalizeItem(item, feed));
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('RSS2JSON niet bereikbaar');
}

async function loadFeedViaXmlProxy(feed) {
  let lastError;

  for (const url of proxiedXmlUrls(feed.url)) {
    try {
      const text = await fetchText(url);
      if (!text || !text.trim()) throw new Error('Lege proxy-response');

      if (url.includes('allorigins.win/get')) {
        const wrapped = JSON.parse(text);
        if (!wrapped.contents) throw new Error('AllOrigins gaf geen contents terug');
        return parseFeedXml(wrapped.contents, feed);
      }

      return parseFeedXml(text, feed);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('XML-proxy niet bereikbaar');
}

async function loadFeed(feed) {
  try {
    return await loadFeedViaJson(feed);
  } catch (jsonError) {
    console.warn(`RSS2JSON mislukt voor ${feed.label}:`, jsonError);
    return loadFeedViaXmlProxy(feed);
  }
}

function setLoadingState(isLoading) {
  newsState.loading = isLoading;

  if (elements.refresh) elements.refresh.disabled = isLoading;
  if (elements.status) elements.status.textContent = isLoading ? 'RSS laden' : 'Live nieuws';
  if (elements.updated) elements.updated.textContent = isLoading ? 'Feeds worden opgehaald.' : `Bijgewerkt om ${formatTime(new Date())}`;
}

function filteredItems() {
  const search = newsState.search.toLowerCase().trim();

  return newsState.allItems.filter((item) => {
    const matchesFilter = newsState.activeFilter === 'all' || item.category === newsState.activeFilter;
    const matchesSearch = !search || `${item.title} ${item.description} ${item.source}`.toLowerCase().includes(search);
    return matchesFilter && matchesSearch;
  });
}

function renderSources(successfulFeeds = []) {
  if (!elements.sourceList) return;

  elements.sourceList.innerHTML = NEWS_FEEDS.map((feed) => {
    const active = successfulFeeds.includes(feed.id);

    return `
      <li>
        <span>${active ? 'Actief' : 'Niet geladen'}</span>
        <strong>${escapeHtml(feed.label)}</strong>
        <small>${escapeHtml(feed.category)}</small>
      </li>
    `;
  }).join('');
}

function renderTopStory(items) {
  if (!elements.topStory) return;

  const topStory = [...items].sort((a, b) => b.score - a.score || new Date(b.publishedAt) - new Date(a.publishedAt))[0];

  if (!topStory) {
    elements.topStory.innerHTML = `
      <span class="small-label">Belangrijkste bericht</span>
      <h2>Geen berichten gevonden</h2>
      <p>Er zijn op dit moment geen berichten die passen bij je filter of zoekterm.</p>
    `;
    return;
  }

  elements.topStory.innerHTML = `
    <span class="small-label">Belangrijkste bericht</span>
    <h2>${escapeHtml(topStory.title)}</h2>
    <p>${escapeHtml(topStory.description || 'Open het bericht om meer te lezen bij de bron.')}</p>
    <div class="news-item-meta">
      <span class="news-tag local">${escapeHtml(topStory.feedLabel)}</span>
      <span>${escapeHtml(topStory.source)}</span>
      <span>${escapeHtml(formatDate(topStory.publishedAt))}</span>
    </div>
    <a href="${escapeHtml(topStory.link)}" target="_blank" rel="noopener noreferrer">Lees bij bron</a>
  `;
}

function renderList() {
  const items = filteredItems()
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt) || b.score - a.score)
    .slice(0, MAX_NEWS_ITEMS);

  if (elements.count) elements.count.textContent = String(newsState.allItems.length);
  if (elements.lastUpdate) elements.lastUpdate.textContent = formatTime(new Date());

  renderTopStory(items);

  if (!elements.list) return;

  if (!items.length) {
    elements.list.innerHTML = '<div class="empty-news">Geen nieuws gevonden voor deze filter of zoekterm.</div>';
    return;
  }

  elements.list.innerHTML = items.map((item) => `
    <article class="news-item">
      <div class="news-item-header">
        <div>
          <span class="news-item-source">${escapeHtml(item.feedLabel)}</span>
          <h3><a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></h3>
        </div>
        <span class="news-tag ${item.score >= 5 ? 'local' : ''}">${item.score >= 5 ? 'Lokaal' : escapeHtml(item.category)}</span>
      </div>
      <p>${escapeHtml(item.description || 'Geen samenvatting beschikbaar via deze RSS-feed.')}</p>
      <div class="news-item-meta">
        <span>${escapeHtml(item.source)}</span>
        <span>${escapeHtml(formatDate(item.publishedAt))}</span>
      </div>
    </article>
  `).join('');
}

async function loadNews() {
  setLoadingState(true);

  if (elements.list) {
    elements.list.innerHTML = `
      <article class="news-item skeleton-news"><div><span></span><strong></strong><p></p></div></article>
      <article class="news-item skeleton-news"><div><span></span><strong></strong><p></p></div></article>
      <article class="news-item skeleton-news"><div><span></span><strong></strong><p></p></div></article>
    `;
  }

  const settled = await Promise.allSettled(NEWS_FEEDS.map(async (feed) => ({
    feed,
    items: await loadFeed(feed),
  })));

  const successful = settled
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value);

  const failed = settled.filter((result) => result.status === 'rejected');
  const allItems = uniqueItems(successful.flatMap((result) => result.items));

  newsState.allItems = allItems;
  setLoadingState(false);

  if (elements.sourceCount) elements.sourceCount.textContent = String(successful.length);
  renderSources(successful.map((result) => result.feed.id));

  if (!allItems.length) {
    if (elements.status) elements.status.textContent = 'RSS niet bereikbaar';
    if (elements.updated) elements.updated.textContent = 'Geen feed kon worden geladen.';
    if (elements.list) {
      elements.list.innerHTML = '<div class="error-news">RSS-feeds konden niet worden geladen. Dit komt meestal doordat Google News of de publieke RSS-proxy tijdelijk blokkeert. Voor productie is een eigen serverless RSS-endpoint betrouwbaarder.</div>';
    }
    renderTopStory([]);
    return;
  }

  if (failed.length && elements.updated) {
    elements.updated.textContent = `${successful.length} van ${NEWS_FEEDS.length} feeds geladen om ${formatTime(new Date())}`;
  }

  renderList();
}

function setupEvents() {
  elements.filters.forEach((button) => {
    button.addEventListener('click', () => {
      newsState.activeFilter = button.dataset.filter || 'all';
      elements.filters.forEach((item) => item.classList.toggle('active', item === button));
      renderList();
    });
  });

  elements.search?.addEventListener('input', (event) => {
    newsState.search = event.target.value;
    renderList();
  });

  elements.refresh?.addEventListener('click', () => {
    loadNews();
  });
}

setupEvents();
renderSources([]);
loadNews();
