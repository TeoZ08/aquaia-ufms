const tabs = document.querySelectorAll('.tab');
const screens = document.querySelectorAll('.screen');
const form = document.querySelector('#occurrenceForm');
const resultCard = document.querySelector('#resultCard');
const analysisResult = document.querySelector('#analysisResult');
const occurrenceList = document.querySelector('#occurrenceList');
const stats = document.querySelector('#stats');
const homeStats = document.querySelector('#homeStats');
const impactStats = document.querySelector('#impactStats');
const mapLiters = document.querySelector('#mapLiters');
const trendText = document.querySelector('#trendText');
const barChart = document.querySelector('#barChart');
const typeDonut = document.querySelector('#typeDonut');
const typeLegend = document.querySelector('#typeLegend');
const refreshBtn = document.querySelector('#refreshBtn');
const searchInput = document.querySelector('#searchInput');
const statusFilter = document.querySelector('#statusFilter');
const toast = document.querySelector('#toast');
const imageInput = document.querySelector('input[name="imagem"]');
const imagePreview = document.querySelector('#imagePreview');
const geminiStatus = document.querySelector('#geminiStatus');
const descInput = document.querySelector('textarea[name="descricao"]');
const descCounter = document.querySelector('#descCounter');
const segments = document.querySelectorAll('.segment');
const mapModeButtons = document.querySelectorAll('[data-map-mode]');
const osmMapView = document.querySelector('#osmMapView');
const campusMapView = document.querySelector('#campusMapView');
const osmMapElement = document.querySelector('#osmMap');
const mapUnavailable = document.querySelector('#mapUnavailable');
const campusMarkers = document.querySelector('#campusMarkers');
const mapProviderLabel = document.querySelector('#mapProviderLabel');

const STATUSES = ['Aberto', 'Em análise', 'Resolvido'];
const DEFAULT_CAMPUS = { lat: -20.5032738, lng: -54.6134936, zoom: 16 };
const TYPE_BUCKETS = [
  { key: 'vazamento', label: 'Vazamento', color: 'var(--blue)', terms: ['vazamento', 'torneira', 'descarga', 'cano'] },
  { key: 'infiltracao', label: 'Infiltração', color: 'var(--green)', terms: ['infiltra', 'umidade', 'mofo'] },
  { key: 'reuso', label: 'Reuso', color: 'var(--orange)', terms: ['reaproveitamento', 'reuso', 'ar-condicionado', 'condensado'] },
  { key: 'outros', label: 'Outros', color: '#cbd7e2', terms: [] }
];
const CAMPUS_POINTS = [
  { key: 'biblioteca', terms: ['biblioteca'], label: 'Biblioteca Central', lat: -20.50095, lng: -54.61172, x: 66, y: 36 },
  { key: 'restaurante', terms: ['restaurante', 'ru', 'universitario'], label: 'Restaurante Universitário', lat: -20.50542, lng: -54.61598, x: 47, y: 60 },
  { key: 'facom', terms: ['facom', 'computacao'], label: 'Facom', lat: -20.50616, lng: -54.61389, x: 53, y: 62 },
  { key: 'faeng', terms: ['faeng', 'engenharia'], label: 'Faeng', lat: -20.50652, lng: -54.61294, x: 57, y: 65 },
  { key: 'inqui', terms: ['inqui', 'quimica'], label: 'Inqui', lat: -20.50858, lng: -54.61945, x: 32, y: 73 },
  { key: 'laboratorios', terms: ['laboratorio', 'laboratorios'], label: 'Laboratórios', lat: -20.50023, lng: -54.61655, x: 43, y: 28 },
  { key: 'hospital', terms: ['hospital', 'hu'], label: 'Hospital Universitário', lat: -20.50256, lng: -54.61929, x: 31, y: 39 },
  { key: 'reitoria', terms: ['reitoria', 'proece', 'proaes'], label: 'Reitoria e pró-reitorias', lat: -20.49945, lng: -54.61395, x: 55, y: 25 },
  { key: 'famed', terms: ['famed', 'medicina'], label: 'Famed', lat: -20.50115, lng: -54.61403, x: 53, y: 36 },
  { key: 'bloco-7', terms: ['bloco-7', 'banheiro'], label: 'Bloco 7 e banheiros', lat: -20.50462, lng: -54.61333, x: 56, y: 52 },
  { key: 'bloco-12', terms: ['bloco-12'], label: 'Bloco 12', lat: -20.50738, lng: -54.61509, x: 48, y: 67 },
  { key: 'administrativo', terms: ['administrativa', 'administrativo', 'sala-administrativa'], label: 'Área administrativa', lat: -20.50018, lng: -54.61462, x: 51, y: 31 },
  { key: 'bebedouro', terms: ['bebedouro', 'filtro', 'purificador'], label: 'Pontos de bebedouro', lat: -20.50400, lng: -54.61238, x: 60, y: 51 },
  { key: 'esportes', terms: ['estadio', 'moreninho', 'ginasio', 'esportivo'], label: 'Complexo esportivo', lat: -20.50455, lng: -54.60986, x: 72, y: 56 },
  { key: 'inma', terms: ['inma', 'matematica'], label: 'Inma', lat: -20.50585, lng: -54.61114, x: 67, y: 61 },
  { key: 'infi', terms: ['infi', 'fisica'], label: 'Infi', lat: -20.50566, lng: -54.61172, x: 64, y: 60 }
];

let occurrences = [];
let appConfig = null;
let osmMap = null;
let osmMarkersLayer = null;
let currentMapMode = 'osm';
let previewUrl = null;
let occurrencesRequest = null;

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove('hidden');
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.add('hidden'), 3200);
}

function setActiveTab(name) {
  screens.forEach(screen => screen.classList.toggle('active', screen.id === name));
  tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === name));

  if (name === 'mapa') {
    initMapExperience();
  }

  if (['painel', 'dashboard', 'mapa'].includes(name)) {
    loadOccurrences();
  }
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => setActiveTab(tab.dataset.tab));
});

document.addEventListener('click', event => {
  const target = event.target.closest('[data-tab-target]');
  if (target) {
    setActiveTab(target.dataset.tabTarget);
    return;
  }

  const reset = event.target.closest('[data-reset-analysis]');
  if (reset && resultCard) {
    resultCard.classList.add('hidden');
    form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

mapModeButtons.forEach(button => {
  button.addEventListener('click', () => {
    setMapMode(button.dataset.mapMode);
  });
});

segments.forEach(segment => {
  segment.addEventListener('click', () => {
    segments.forEach(item => item.classList.remove('active'));
    segment.classList.add('active');
    if (statusFilter) statusFilter.value = segment.dataset.statusShort || '';
    renderDashboard();
  });
});

if (descInput && descCounter) {
  descInput.addEventListener('input', () => {
    descCounter.textContent = `${descInput.value.length}/300`;
  });
}

function clearImagePreview() {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }
  if (imagePreview) {
    imagePreview.classList.add('hidden');
    imagePreview.innerHTML = '';
  }
}

if (imageInput) {
  imageInput.addEventListener('change', () => {
    clearImagePreview();
    const file = imageInput.files[0];
    if (!file || !imagePreview) return;
    previewUrl = URL.createObjectURL(file);
    imagePreview.innerHTML = `<img src="${previewUrl}" alt="Prévia da ocorrência enviada" />`;
    imagePreview.classList.remove('hidden');
  });
}

if (form) {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Analisando...';

    try {
      const data = await requestJson('/api/ocorrencias', {
        method: 'POST',
        body: new FormData(form)
      });
      renderAnalysis(data);
      resultCard?.classList.remove('hidden');
      form.reset();
      if (descCounter) descCounter.textContent = '0/300';
      clearImagePreview();
      await loadOccurrences();
      showToast('Ocorrência registrada e analisada com sucesso.');
    } catch (error) {
      showToast(error.message);
    } finally {
      button.disabled = false;
      button.textContent = 'Analisar com IA';
    }
  });
}

function renderAnalysis(data) {
  if (!analysisResult) return;
  const observation = data.observacao_tecnica
    ? `<div class="technical-note"><strong>Observação técnica</strong><p>${escapeHtml(data.observacao_tecnica)}</p></div>`
    : '';

  analysisResult.innerHTML = `
    <div class="analysis-hero">
      <div class="analysis-drop">💧</div>
      <div>
        <small>Classificação</small>
        <strong>${escapeHtml(data.tipo_ocorrencia)}</strong>
        <p>${escapeHtml(data.justificativa)}</p>
      </div>
    </div>

    <div class="analysis-rows">
      <div class="analysis-row">
        <span>Gravidade</span>
        <strong class="status-pill ${slug(data.gravidade)}">${escapeHtml(data.gravidade)}</strong>
      </div>
      <div class="analysis-row">
        <span>Prioridade</span>
        <strong class="status-pill ${slug(data.prioridade)}">${escapeHtml(data.prioridade)}</strong>
      </div>
      <div class="analysis-row">
        <span>Litros estimados por dia</span>
        <strong class="status-pill blue">${formatNumber(data.litros_por_dia_estimados)} L/dia</strong>
      </div>
      <div class="analysis-row">
        <span>Fonte da análise</span>
        <strong>${escapeHtml(data.fonte_analise)}</strong>
      </div>
    </div>

    <div class="recommendation">
      <div class="tool-icon">🔧</div>
      <div>
        <strong>Sugestão de ação</strong>
        <p>${escapeHtml(data.acao_sugerida)}</p>
        <p class="justification">Confiança da análise: ${escapeHtml(data.confianca)}</p>
      </div>
    </div>

    ${observation}

    <div class="analysis-actions">
      <button class="secondary-action" type="button" data-tab-target="painel">Ver no painel</button>
      <button class="ghost-action" type="button" data-reset-analysis>Registrar outra</button>
    </div>
  `;
}

async function checkHealth() {
  if (!geminiStatus) return;
  try {
    const data = await requestJson('/api/health');
    geminiStatus.classList.remove('on', 'off');
    if (data.gemini_configurado) {
      geminiStatus.textContent = 'Gemini';
      geminiStatus.classList.add('on');
      geminiStatus.title = `Gemini ativo: ${data.modelo}`;
    } else {
      geminiStatus.textContent = 'MVP';
      geminiStatus.classList.add('off');
      geminiStatus.title = 'Modo fallback: regras do MVP';
    }
  } catch {
    geminiStatus.textContent = 'Off';
    geminiStatus.classList.add('off');
  }
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { erro: 'Resposta inesperada do servidor.' };
    }
  }

  if (!response.ok) {
    throw new Error(data.erro || 'Não foi possível concluir a operação.');
  }

  return data;
}

async function loadOccurrences() {
  if (occurrencesRequest) return occurrencesRequest;

  occurrencesRequest = (async () => {
    try {
      const data = await requestJson('/api/ocorrencias');
      occurrences = Array.isArray(data) ? data : [];
      renderDashboard();
    } catch {
      showToast('Não foi possível carregar o painel.');
    } finally {
      occurrencesRequest = null;
    }
  })();

  return occurrencesRequest;
}

function renderDashboard() {
  const filtered = getFilteredOccurrences();
  const total = occurrences.length;
  const open = occurrences.filter(item => item.status !== 'Resolvido').length;
  const liters = occurrences.reduce((sum, item) => sum + Number(item.litros_por_dia_estimados || 0), 0);
  const urgent = occurrences.filter(item => ['Urgente', 'Alta'].includes(item.prioridade)).length;
  const resolved = occurrences.filter(item => item.status === 'Resolvido').length;
  const weeklyLiters = liters * 7;
  const monthlyLiters = liters * 30;
  const estimatedSavings = Math.round(monthlyLiters * 0.022);

  renderHomeStats({ open, liters, urgent, resolved, total, weeklyLiters, monthlyLiters, estimatedSavings });
  renderInsights({ weeklyLiters, urgent, resolved });
  updateMapMarkers();

  if (stats) {
    stats.innerHTML = `
      <div class="stat"><strong>Total</strong><p>${total}</p></div>
      <div class="stat"><strong>Abertas</strong><p>${open}</p></div>
      <div class="stat"><strong>Litros/dia</strong><p>${formatNumber(liters)}</p></div>
      <div class="stat"><strong>Críticas</strong><p>${urgent}</p></div>
    `;
  }

  if (!occurrenceList) return;

  if (!filtered.length) {
    occurrenceList.innerHTML = '<div class="empty-state">Nenhuma ocorrência encontrada para o filtro atual.</div>';
    return;
  }

  occurrenceList.innerHTML = filtered.map(item => {
    const priorityClass = slug(item.prioridade);
    const statusClass = slug(item.status);
    const gravityClass = slug(item.gravidade);
    const iconContent = item.imagem_url ? `<img src="${escapeHtml(item.imagem_url)}" alt="Imagem da ocorrência" />` : iconForOccurrence(item.tipo_ocorrencia);
    return `
      <article class="occurrence-card ${priorityClass}">
        <div class="occurrence-icon">${iconContent}</div>
        <div class="occurrence-content">
          <h3>${escapeHtml(item.local)}</h3>
          <p>${escapeHtml(item.tipo_ocorrencia)}</p>
          <p>${escapeHtml(shortText(item.descricao, 86))}</p>
          <div class="occurrence-meta">
            <span class="badge ${priorityClass}">${escapeHtml(item.prioridade)} prioridade</span>
            <span class="badge ${gravityClass}">${escapeHtml(item.gravidade)}</span>
            <span class="badge blue">${formatNumber(item.litros_por_dia_estimados)} L/dia</span>
            <time class="occurrence-time" datetime="${formatDatetime(item.criado_em)}">${formatDate(item.criado_em)}</time>
          </div>
        </div>
        <span class="card-status badge ${statusClass}">${escapeHtml(item.status)}</span>
        <select class="status-select" data-id="${escapeHtml(item.id)}" aria-label="Atualizar status da ocorrência">
          ${STATUSES.map(status => `<option ${item.status === status ? 'selected' : ''}>${status}</option>`).join('')}
        </select>
      </article>
    `;
  }).join('');

  document.querySelectorAll('.status-select').forEach(select => {
    select.addEventListener('change', async () => {
      await updateStatus(select.dataset.id, select.value);
    });
  });
}

function renderHomeStats({ open, liters, urgent, resolved, total, monthlyLiters, estimatedSavings }) {
  const efficiency = calculateEfficiency(total, open, urgent, resolved);

  if (homeStats) {
    homeStats.innerHTML = `
      <article class="metric-card"><span class="metric-icon blue">💧</span><strong>${open}</strong><p>Ocorrências abertas</p></article>
      <article class="metric-card"><span class="metric-icon green">♻</span><strong>${formatNumber(liters)} L</strong><p>Litros estimados por dia</p></article>
      <article class="metric-card"><span class="metric-icon orange">⚠</span><strong>${urgent}</strong><p>Pontos críticos em atenção</p></article>
      <article class="metric-card"><span class="metric-icon blue">📈</span><strong>${efficiency}%</strong><p>Índice de resposta</p></article>
    `;
  }

  if (impactStats) {
    impactStats.innerHTML = `
      <div><strong>${formatNumber(monthlyLiters)} L</strong><span>Litros mapeados</span></div>
      <div><strong>R$ ${formatNumber(estimatedSavings)}</strong><span>Economia estimada</span></div>
      <div><strong>${resolved}</strong><span>Ocorrências resolvidas</span></div>
    `;
  }
}

function renderInsights({ weeklyLiters, urgent, resolved }) {
  if (mapLiters) {
    mapLiters.textContent = `${formatNumber(weeklyLiters)} L`;
  }

  if (trendText) {
    trendText.textContent = occurrences.length
      ? `${resolved} resolvidas, ${urgent} críticas`
      : 'Sem ocorrências cadastradas';
  }

  renderTypeDistribution();
  renderWeeklyBars();
}

function renderTypeDistribution() {
  const counts = TYPE_BUCKETS.map(bucket => ({ ...bucket, count: 0 }));

  occurrences.forEach(item => {
    const text = slug(`${item.tipo_ocorrencia} ${item.descricao}`);
    const match = counts.find(bucket => bucket.terms.some(term => text.includes(slug(term)))) || counts[counts.length - 1];
    match.count += 1;
  });

  const total = counts.reduce((sum, bucket) => sum + bucket.count, 0);

  if (typeDonut) {
    if (!total) {
      typeDonut.style.background = '#d8e4ee';
    } else {
      let cursor = 0;
      const gradient = counts.map(bucket => {
        const start = cursor;
        cursor += (bucket.count / total) * 100;
        return `${bucket.color} ${start}% ${cursor}%`;
      }).join(', ');
      typeDonut.style.background = `conic-gradient(${gradient})`;
    }
  }

  if (typeLegend) {
    typeLegend.innerHTML = counts.map(bucket => `
      <li><span class="dot" style="background:${bucket.color}"></span>${bucket.label}: ${bucket.count}</li>
    `).join('');
  }
}

function renderWeeklyBars() {
  if (!barChart) return;

  const bars = [...barChart.querySelectorAll('i')];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daily = Array(7).fill(0);

  occurrences.forEach(item => {
    if (!item.criado_em) return;
    const created = new Date(Number(item.criado_em) * 1000);
    created.setHours(0, 0, 0, 0);
    const diff = Math.round((today - created) / 86400000);
    if (diff >= 0 && diff < 7) {
      daily[6 - diff] += Number(item.litros_por_dia_estimados || 0);
    }
  });

  const max = Math.max(...daily, 1);
  bars.forEach((bar, index) => {
    const height = daily[index] ? Math.max(16, Math.round((daily[index] / max) * 100)) : 12;
    bar.style.height = `${height}%`;
  });
}

function calculateEfficiency(total, open, urgent, resolved) {
  if (!total) return 100;
  const score = 100 - (open * 4) - (urgent * 8) + (resolved * 5);
  return Math.max(45, Math.min(99, score));
}

function getFilteredOccurrences() {
  const query = normalizeSearch(searchInput?.value);
  const status = statusFilter?.value || '';

  return occurrences.filter(item => {
    const text = normalizeSearch(`${item.local} ${item.tipo_ocorrencia} ${item.status} ${item.descricao} ${item.gravidade}`);
    const queryOk = !query || text.includes(query);
    const statusOk = !status || item.status === status;
    return queryOk && statusOk;
  });
}

async function updateStatus(id, status) {
  try {
    await requestJson(`/api/ocorrencias/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    await loadOccurrences();
    showToast('Status atualizado.');
  } catch (error) {
    showToast(error.message);
  }
}

async function loadConfig() {
  if (appConfig) return appConfig;
  try {
    appConfig = await requestJson('/api/config');
  } catch {
    appConfig = {
      mapa_provider: 'openstreetmap',
      campus: DEFAULT_CAMPUS
    };
  }
  return appConfig;
}

async function initMapExperience() {
  const config = await loadConfig();
  initOsmMap(config);
  setMapMode(currentMapMode);
  updateMapMarkers();
}

function setMapMode(mode) {
  const targetMode = mode === 'campus' ? 'campus' : 'osm';
  currentMapMode = targetMode;

  mapModeButtons.forEach(button => {
    button.classList.toggle('active', button.classList.contains('map-mode') && button.dataset.mapMode === targetMode);
  });

  if (osmMapView && campusMapView) {
    osmMapView.classList.toggle('hidden', targetMode !== 'osm');
    campusMapView.classList.toggle('hidden', targetMode !== 'campus');
  }

  if (mapProviderLabel) {
    mapProviderLabel.textContent = targetMode === 'osm'
      ? 'OpenStreetMap + Leaflet, sem cadastro'
      : 'Mapa oficial UFMS com pontos do MVP';
  }

  if (targetMode === 'osm') {
    initOsmMap(appConfig || { campus: DEFAULT_CAMPUS });
    setTimeout(() => {
      if (osmMap) osmMap.invalidateSize();
      renderOsmMarkers();
    }, 120);
  }

  if (targetMode === 'campus') {
    renderCampusMarkers();
  }
}

function showMapUnavailable() {
  if (mapUnavailable) {
    mapUnavailable.classList.remove('hidden');
  }
  if (osmMapElement) {
    osmMapElement.classList.add('muted-map');
  }
  if (mapProviderLabel) {
    mapProviderLabel.textContent = 'Modo apoio: mapa oficial UFMS';
  }
}

function initOsmMap(config = {}) {
  if (!osmMapElement || osmMap) return;

  if (!window.L) {
    showMapUnavailable();
    setMapMode('campus');
    return;
  }

  const campus = { ...DEFAULT_CAMPUS, ...(config.campus || {}) };
  const center = [Number(campus.lat), Number(campus.lng)];

  osmMap = L.map(osmMapElement, {
    zoomControl: true,
    attributionControl: true,
    scrollWheelZoom: true
  }).setView(center, Number(campus.zoom));

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(osmMap);

  osmMarkersLayer = L.layerGroup().addTo(osmMap);

  if (mapUnavailable) mapUnavailable.classList.add('hidden');
  if (osmMapElement) osmMapElement.classList.remove('muted-map');

  renderOsmMarkers();
}

function updateMapMarkers() {
  renderCampusMarkers();
  renderOsmMarkers();
}

function buildMapData() {
  const grouped = new Map();

  occurrences.forEach(item => {
    const point = resolveCampusPoint(item.local);
    const key = point.key;
    const current = grouped.get(key) || {
      ...point,
      count: 0,
      liters: 0,
      urgent: 0,
      items: []
    };

    current.count += 1;
    current.liters += Number(item.litros_por_dia_estimados || 0);
    current.urgent += ['Urgente', 'Alta'].includes(item.prioridade) ? 1 : 0;
    current.items.push(item);
    grouped.set(key, current);
  });

  if (!grouped.size) {
    return [
      {
        key: 'demo-centro',
        label: 'Centro do campus',
        count: 0,
        liters: 0,
        urgent: 0,
        lat: DEFAULT_CAMPUS.lat,
        lng: DEFAULT_CAMPUS.lng,
        x: 57,
        y: 48,
        items: []
      }
    ];
  }

  return [...grouped.values()];
}

function resolveCampusPoint(local) {
  const text = slug(local);
  const found = CAMPUS_POINTS.find(point => point.terms.some(term => text.includes(slug(term))));
  if (found) return found;

  return {
    key: `geral-${text.slice(0, 24) || 'campus'}`,
    label: local || 'Campus UFMS',
    lat: DEFAULT_CAMPUS.lat,
    lng: DEFAULT_CAMPUS.lng,
    x: 57,
    y: 48
  };
}

function renderCampusMarkers() {
  if (!campusMarkers) return;

  const data = buildMapData();
  campusMarkers.innerHTML = data.map(point => {
    const tone = point.urgent > 0 ? 'red' : point.count > 1 ? 'orange' : 'blue';
    const label = point.count || '•';
    return `
      <button class="campus-marker ${tone}" style="left:${point.x}%; top:${point.y}%;" type="button" title="${escapeHtml(point.label)}">
        <span>${label}</span>
        <small>${escapeHtml(point.label)}</small>
      </button>
    `;
  }).join('');
}

function renderOsmMarkers() {
  if (!osmMap || !window.L || !osmMarkersLayer) return;

  osmMarkersLayer.clearLayers();
  const data = buildMapData();
  const bounds = [];

  data.forEach(point => {
    const tone = point.urgent > 0 ? 'red' : point.count > 1 ? 'orange' : 'blue';
    const label = point.count || '•';
    const icon = L.divIcon({
      className: 'aquaia-marker-icon',
      html: `<div class="aquaia-marker ${tone}">${label}</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    const itemsHtml = point.items.length
      ? point.items.slice(0, 3).map(item => `
          <small>
            <b>${escapeHtml(shortText(item.local, 42))}</b>
            <span>${escapeHtml(item.tipo_ocorrencia)} · ${escapeHtml(item.gravidade)} · ${escapeHtml(item.prioridade)} · ${formatNumber(item.litros_por_dia_estimados)} L/dia</span>
          </small>
        `).join('')
      : '<small><span>Sem ocorrências cadastradas neste ponto.</span></small>';

    const marker = L.marker([point.lat, point.lng], { icon }).addTo(osmMarkersLayer);
    marker.bindPopup(`
      <div class="leaflet-info-window">
        <strong>${escapeHtml(point.label)}</strong>
        <p>${point.count} ocorrência(s) mapeada(s)</p>
        <p>${formatNumber(point.liters)} L/dia estimados</p>
        ${itemsHtml}
      </div>
    `);
    bounds.push([point.lat, point.lng]);
  });

  if (bounds.length > 1) {
    osmMap.fitBounds(bounds, { padding: [44, 44], maxZoom: 17 });
  } else if (bounds.length === 1) {
    osmMap.setView(bounds[0], Math.max(osmMap.getZoom(), 16));
  }
}

function iconForOccurrence(type) {
  const value = slug(type);
  if (value.includes('infiltra')) return '▧';
  if (value.includes('reaproveitamento')) return '♻';
  if (value.includes('descarga')) return '⚠';
  if (value.includes('bebedouro')) return '◌';
  return '💧';
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

function formatDate(timestamp) {
  if (!timestamp) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(Number(timestamp) * 1000));
}

function formatDatetime(timestamp) {
  if (!timestamp) return '';
  return new Date(Number(timestamp) * 1000).toISOString();
}

function shortText(value, maxLength) {
  const text = String(value || '');
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function slug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function normalizeSearch(value) {
  return slug(value).replace(/-/g, ' ');
}

refreshBtn?.addEventListener('click', loadOccurrences);
searchInput?.addEventListener('input', renderDashboard);
statusFilter?.addEventListener('change', () => {
  segments.forEach(segment => {
    segment.classList.toggle('active', (segment.dataset.statusShort || '') === statusFilter.value);
  });
  renderDashboard();
});

loadConfig();
checkHealth();
loadOccurrences();
