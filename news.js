const NEWS_LOCATION = 'Maassluis';
const MAX_NEWS_ITEMS = 24;

const NEWS_FEEDS = [
  {
    id: 'maassluis',
    label: 'Maassluis',
    category: 'maassluis',
    url: 'https://news.google.com/rss/search?q=Maassluis&hl=nl&gl=NL&ceid=NL:nl',
  },
  {
    id: 'waterweg',
    label: 'Waterweg',
    category: 'waterweg',
    url: 'https://news.google.com/rss/search?q=Maassluis%20OR%20Vlaardingen%20OR%20Schiedam&hl=nl&gl=NL&ceid=NL:nl',
  },
  {
    id: 'veiligheid',
    label: 'Veiligheid',
    category: 'veiligheid',
    url: 'https://news.google.com/rss/search?q=Maassluis%20politie%20OR%20brandweer%20OR%20112&hl=nl&gl=NL&ceid=NL:nl',
  },
  {
    id: 'gemeente',
    label: 'Gemeente',
    category: 'gemeente',
    url: 'https://news.google.com/rss/search?q=Maassluis%20gemeente%20OR%20gemeenteraad%20OR%20werkzaamheden&hl=nl&gl=NL&ceid=NL:nl',
  },
];

const LOCAL_TERMS = [
  'maassluis',
  'maasland',
  'vlaardingen',
  'schiedam',
  'waterweg',
  'rijnmond',
  'hoek van holland',
  'rotterdam',
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
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);

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
  const haystack = `${item.title} ${item.description}`.toLowerCase();
  let score = 0;
  LOCAL_TERMS.forEach((term) => {
    if (haystack.includes(term)) score += term === 'maassluis' ? 5 : 2;
  });
  if (item.category === 'maassluis') score += 3;
  if (item.category === 'veiligheid') score += 1;
  return score;
}

function getText(parent, selectors) {
  for (const selector of selectors) {
    const node = parent.querySelector(selector);
    if (node?.textContent) return node.textContent.trim();
  }
  return '';
}

function getLink(item) {
  const directLink = item.querySelector('link')?.textContent?.trim();
  if (directLink) return directLink;

  const atomLink = item.querySelector('link[href]')?.getAttribute('href');
  return atomLink || '#';
}

function parseFeedXml(xmlText, feed) {
  const xml = new DOMParser().parseFromString(xmlText, 'application/xml');
  const parserError = xml.querySelector('parsererror');
  if (parserError) throw new Error(`Ongeldige RSS XML voor ${feed.label}`);

  const entries = [...xml.querySelectorAll('item, entry')];

  return entries.map((entry) => {
    const rawTitle = getText(entry, ['title']);
    const rawDescription = getText(entry, ['description', 'summary', 'content']);
    const pubDate = getText(entry, ['pubDate', 'published', 'updated']);
    const link = getLink(entry);
    const source = getText(entry, ['source']) || extractSource(rawTitle, feed.label);

    const item = {
      id: `${feed.id}-${link || rawTitle}`,
      title: cleanTitle(rawTitle),
      description: stripHtml(rawDescription).slice(0, 220),
      link,
      source,
      category: feed.category,
      feedLabel: feed.label,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      loadedFrom: feed.url,
    };

    item.score = relevanceScore(item);
    return item;
  });
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

function proxiedUrls(url) {
  return [
    url,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  ];
}

async function fetchTextWithFallback(url) {
  let lastError;

  for (const candidate of proxiedUrls(url)) {
    try {
      const response = await fetch(candidate, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      if (!text || !text.trim()) throw new Error('Lege RSS-response');
      return text;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('RSS niet bereikbaar');
}

async function loadFeed(feed) {
  const xmlText = await fetchTextWithFallback(feed.url);
  return parseFeedXml(xmlText, feed);
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
        <span>${active ? 'Actief' : 'Fallback'}</span>
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
    elements.list.innerHTML = `<div class="empty-news">Geen nieuws gevonden voor deze filter of zoekterm.</div>`;
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
      elements.list.innerHTML = `<div class="error-news">RSS-feeds konden niet worden geladen. Dit komt meestal door CORS of een tijdelijke blokkade van de feed/proxy.</div>`;
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
