const MAX_WORK_ITEMS = 24;
const WORK_PAGE_SIZE = 5;

const WORK_FEEDS = [
  {
    id: 'werkzaamheden-maassluis-gemeente',
    label: 'Werkzaamheden',
    category: 'werkzaamheden',
    url: 'https://news.google.com/rss/search?q=site%3Amaassluis.nl%20Maassluis%20werkzaamheden%20OR%20wegafsluiting%20OR%20verkeer&hl=nl&gl=NL&ceid=NL:nl',
  },
  {
    id: 'bekendmakingen-maassluis-gemeente',
    label: 'Bekendmakingen',
    category: 'bekendmakingen',
    url: 'https://news.google.com/rss/search?q=site%3Amaassluis.nl%20Maassluis%20bekendmakingen%20OR%20vergunning%20OR%20verordening&hl=nl&gl=NL&ceid=NL:nl',
  },
];

const WORK_TERMS = [
  'maassluis',
  'werkzaamheden',
  'wegafsluiting',
  'omleiding',
  'verkeer',
  'hinder',
  'riolering',
  'straat',
  'weg',
  'bekendmaking',
  'bekendmakingen',
  'vergunning',
  'verordening',
  'besluit',
  'gemeente',
];

const worksState = {
  allItems: [],
  activeFilter: 'all',
  search: '',
  loading: false,
  currentPage: 1,
};

const elements = {
  status: document.querySelector('#worksStatus'),
  updated: document.querySelector('#worksUpdated'),
  count: document.querySelector('#worksCount'),
  sourceCount: document.querySelector('#worksSourceCount'),
  lastUpdate: document.querySelector('#worksLastUpdate'),
  list: document.querySelector('#worksList'),
  topWork: document.querySelector('#topWorkCard'),
  sourceList: document.querySelector('#worksSourceList'),
  pagination: document.querySelector('#worksPagination'),
  search: document.querySelector('#worksSearch'),
  refresh: document.querySelector('#refreshWorks'),
  filters: [...document.querySelectorAll('.works-filter')],
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

function workScore(item) {
  const haystack = `${item.title} ${item.description} ${item.source}`.toLowerCase();
  let score = 0;

  WORK_TERMS.forEach((term) => {
    if (haystack.includes(term)) score += term === 'maassluis' ? 5 : 2;
  });

  if (item.category === 'werkzaamheden') score += 3;
  if (item.category === 'bekendmakingen') score += 2;
  if (haystack.includes('gemeente maassluis')) score += 3;

  return score;
}

function normalizeItem(item, feed) {
  const rawTitle = item.title || 'Geen titel';
  const description = stripHtml(item.description || item.content || item.summary || '').slice(0, 240);
  const link = item.link || item.guid || '#';
  const source = item.source || item.author || extractSource(rawTitle, 'Gemeente Maassluis');
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

  normalized.score = workScore(normalized);
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

function rssJsonUrls(url) {
  return [`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`];
}

function proxiedXmlUrls(url) {
  return [
    `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
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
  worksState.loading = isLoading;

  if (elements.refresh) elements.refresh.disabled = isLoading;
  if (elements.status) elements.status.textContent = isLoading ? 'RSS laden' : 'Updates';
  if (elements.updated) elements.updated.textContent = isLoading ? 'Berichten ophalen.' : `Bijgewerkt ${formatTime(new Date())}`;
}

function filteredItems() {
  const search = worksState.search.toLowerCase().trim();

  return worksState.allItems.filter((item) => {
    const matchesFilter = worksState.activeFilter === 'all' || item.category === worksState.activeFilter;
    const matchesSearch = !search || `${item.title} ${item.description} ${item.source}`.toLowerCase().includes(search);
    return matchesFilter && matchesSearch;
  });
}

function renderSources(successfulFeeds = []) {
  if (!elements.sourceList) return;

  elements.sourceList.innerHTML = WORK_FEEDS.map((feed) => {
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

function renderPagination(totalPages) {
  if (!elements.pagination) return;

  if (totalPages <= 1) {
    elements.pagination.innerHTML = '';
    elements.pagination.hidden = true;
    return;
  }

  elements.pagination.hidden = false;
  elements.pagination.innerHTML = Array.from({ length: totalPages }, (_, index) => {
    const page = index + 1;
    const active = page === worksState.currentPage;
    return `<button type="button" class="works-page-button${active ? ' active' : ''}" data-page="${page}" aria-current="${active ? 'page' : 'false'}">${page}</button>`;
  }).join('');
}

function sortedVisibleItems() {
  return filteredItems()
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt) || b.score - a.score)
    .slice(0, MAX_WORK_ITEMS);
}

function renderList() {
  const items = sortedVisibleItems();
  const totalPages = Math.max(1, Math.ceil(items.length / WORK_PAGE_SIZE));

  if (worksState.currentPage > totalPages) worksState.currentPage = totalPages;
  if (worksState.currentPage < 1) worksState.currentPage = 1;

  if (elements.count) elements.count.textContent = String(worksState.allItems.length);
  if (elements.lastUpdate) elements.lastUpdate.textContent = formatTime(new Date());

  if (!elements.list) return;

  if (!items.length) {
    elements.list.innerHTML = '<div class="empty-works">Geen werkzaamheden of bekendmakingen gevonden.</div>';
    renderPagination(0);
    return;
  }

  const start = (worksState.currentPage - 1) * WORK_PAGE_SIZE;
  const pageItems = items.slice(start, start + WORK_PAGE_SIZE);

  elements.list.innerHTML = pageItems.map((item, index) => {
    const absoluteIndex = start + index;
    const workClass = item.category === 'werkzaamheden' ? 'works-work' : 'works-publication';
    const tagText = absoluteIndex === 0 ? 'Laatste bericht' : item.category === 'werkzaamheden' ? 'Werkzaamheden' : 'Bekendmaking';
    const isFeatured = absoluteIndex === 0;

    return `
      <article class="works-item ${workClass}${isFeatured ? ' is-featured' : ''}">
        <div class="works-item-header">
          <div>
            <span class="works-item-source">${escapeHtml(item.feedLabel)}</span>
            <h3><a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></h3>
          </div>
          <span class="works-tag ${isFeatured || item.score >= 5 ? 'hot' : ''}">${escapeHtml(tagText)}</span>
        </div>
        <p>${escapeHtml(item.description || 'Geen samenvatting beschikbaar via deze feed.')}</p>
        <div class="works-item-meta">
          <span>${escapeHtml(item.source)}</span>
          <span>${escapeHtml(formatDate(item.publishedAt))}</span>
        </div>
      </article>
    `;
  }).join('');

  renderPagination(totalPages);
}

async function loadWorks() {
  worksState.currentPage = 1;
  setLoadingState(true);

  if (elements.list) {
    elements.list.innerHTML = `
      <article class="works-item skeleton-works"><div><span></span><strong></strong><p></p></div></article>
      <article class="works-item skeleton-works"><div><span></span><strong></strong><p></p></div></article>
      <article class="works-item skeleton-works"><div><span></span><strong></strong><p></p></div></article>
    `;
  }
  if (elements.pagination) elements.pagination.innerHTML = '';

  const settled = await Promise.allSettled(WORK_FEEDS.map(async (feed) => ({
    feed,
    items: await loadFeed(feed),
  })));

  const successful = settled
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value);

  const failed = settled.filter((result) => result.status === 'rejected');
  const allItems = uniqueItems(successful.flatMap((result) => result.items));

  worksState.allItems = allItems;
  setLoadingState(false);

  if (elements.sourceCount) elements.sourceCount.textContent = String(successful.length);
  renderSources(successful.map((result) => result.feed.id));

  if (!allItems.length) {
    if (elements.status) elements.status.textContent = 'Niet bereikbaar';
    if (elements.updated) elements.updated.textContent = 'Geen berichten geladen.';
    if (elements.list) {
      elements.list.innerHTML = '<div class="error-works">Werkzaamheden en bekendmakingen kunnen nu niet worden geladen. Probeer het later opnieuw.</div>';
    }
    renderPagination(0);
    return;
  }

  if (failed.length && elements.updated) {
    elements.updated.textContent = `${successful.length} van ${WORK_FEEDS.length} bronnen geladen om ${formatTime(new Date())}`;
  }

  renderList();
}

function setupEvents() {
  elements.filters.forEach((button) => {
    button.addEventListener('click', () => {
      worksState.activeFilter = button.dataset.filter || 'all';
      worksState.currentPage = 1;
      elements.filters.forEach((item) => item.classList.toggle('active', item === button));
      renderList();
    });
  });

  elements.search?.addEventListener('input', (event) => {
    worksState.search = event.target.value;
    worksState.currentPage = 1;
    renderList();
  });

  elements.pagination?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-page]');
    if (!button) return;
    worksState.currentPage = Number(button.dataset.page) || 1;
    renderList();
    elements.list?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  elements.refresh?.addEventListener('click', () => {
    loadWorks();
  });
}

setupEvents();
renderSources([]);
loadWorks();