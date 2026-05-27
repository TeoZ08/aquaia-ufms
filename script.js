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

let occurrences = [];
let appConfig = null;
let osmMap = null;
let osmMarkersLayer = null;


function showToast(message) {
  toast.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3200);
}

function setActiveTab(name) {
  screens.forEach(screen => screen.classList.toggle('active', screen.id === name));
  tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === name));

  if (['painel', 'dashboard', 'mapa'].includes(name)) {
    loadOccurrences();
  }

  if (name === 'mapa') {
    initMapExperience();
  }
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => setActiveTab(tab.dataset.tab));
});

document.querySelectorAll('[data-tab-target]').forEach(button => {
  button.addEventListener('click', () => setActiveTab(button.dataset.tabTarget));
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
    statusFilter.value = segment.dataset.statusShort || '';
    renderDashboard();
  });
});

if (descInput && descCounter) {
  descInput.addEventListener('input', () => {
    descCounter.textContent = `${descInput.value.length}/300`;
  });
}

imageInput.addEventListener('change', () => {
  const file = imageInput.files[0];
  if (!file) {
    imagePreview.classList.add('hidden');
    imagePreview.innerHTML = '';
    return;
  }
  const url = URL.createObjectURL(file);
  imagePreview.innerHTML = `<img src="${url}" alt="Prévia da ocorrência enviada" />`;
  imagePreview.classList.remove('hidden');
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = 'Analisando...';

  try {
    const formData = new FormData(form);
    const response = await fetch('/api/ocorrencias', {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.erro || 'Não foi possível registrar a ocorrência.');
    renderAnalysis(data);
    resultCard.classList.remove('hidden');
    form.reset();
    descCounter.textContent = '0/300';
    imagePreview.classList.add('hidden');
    imagePreview.innerHTML = '';
    await loadOccurrences();
    showToast('Ocorrência registrada e analisada com sucesso.');
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
    button.textContent = '✨ Analisar com IA';
  }
});

function renderAnalysis(data) {
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
  `;
}

async function checkHealth() {
  try {
    const response = await fetch('/api/health');
    const data = await response.json();
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

async function loadOccurrences() {
  try {
    const response = await fetch('/api/ocorrencias');
    occurrences = await response.json();
    renderDashboard();
  } catch {
    showToast('Não foi possível carregar o painel.');
  }
}

function renderDashboard() {
  const filtered = getFilteredOccurrences();
  const total = occurrences.length;
  const open = occurrences.filter(item => item.status !== 'Resolvido').length;
  const liters = occurrences.reduce((sum, item) => sum + Number(item.litros_por_dia_estimados || 0), 0);
  const urgent = occurrences.filter(item => ['Urgente', 'Alta'].includes(item.prioridade)).length;
  const resolved = occurrences.filter(item => item.status === 'Resolvido').length;
  const estimatedSavings = Math.round(liters * 0.022);

  renderHomeStats(open, liters, urgent, resolved, estimatedSavings);
  updateMapMarkers();

  stats.innerHTML = `
    <div class="stat"><strong>Total</strong><p>${total}</p></div>
    <div class="stat"><strong>Abertas</strong><p>${open}</p></div>
    <div class="stat"><strong>Litros</strong><p>${formatNumber(liters)}</p></div>
    <div class="stat"><strong>Críticas</strong><p>${urgent}</p></div>
  `;

  if (!filtered.length) {
    occurrenceList.innerHTML = '<div class="empty-state">Nenhuma ocorrência encontrada para o filtro atual.</div>';
    return;
  }

  occurrenceList.innerHTML = filtered.map(item => {
    const priorityClass = slug(item.prioridade);
    const statusClass = slug(item.status);
    const iconContent = item.imagem_url ? `<img src="${item.imagem_url}" alt="Imagem da ocorrência" />` : iconForOccurrence(item.tipo_ocorrencia);
    return `
      <article class="occurrence-card ${priorityClass}">
        <div class="occurrence-icon">${iconContent}</div>
        <div class="occurrence-content">
          <h3>${escapeHtml(item.local)}</h3>
          <p>${escapeHtml(item.tipo_ocorrencia)}</p>
          <p>${escapeHtml(shortText(item.descricao, 86))}</p>
          <div class="occurrence-meta">
            <span class="badge ${priorityClass}">${escapeHtml(item.prioridade)} prioridade</span>
            <span class="badge blue">${formatNumber(item.litros_por_dia_estimados)} L/dia</span>
          </div>
        </div>
        <span class="card-status badge ${statusClass}">${escapeHtml(item.status)}</span>
        <select class="status-select" data-id="${item.id}" aria-label="Atualizar status da ocorrência">
          ${['Aberto', 'Em análise', 'Resolvido'].map(status => `<option ${item.status === status ? 'selected' : ''}>${status}</option>`).join('')}
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

function renderHomeStats(open, liters, urgent, resolved, estimatedSavings) {
  if (homeStats) {
    homeStats.innerHTML = `
      <article class="metric-card"><span class="metric-icon blue">💧</span><strong>${open}</strong><p>Ocorrências abertas</p></article>
      <article class="metric-card"><span class="metric-icon green">♻</span><strong>${formatNumber(liters)} L</strong><p>Litros mapeados no painel</p></article>
      <article class="metric-card"><span class="metric-icon orange">⚠</span><strong>${urgent}</strong><p>Pontos críticos em atenção</p></article>
      <article class="metric-card"><span class="metric-icon blue">📈</span><strong>92%</strong><p>Índice visual do MVP</p></article>
    `;
  }

  if (impactStats) {
    impactStats.innerHTML = `
      <div><strong>${formatNumber(liters * 7)} L</strong><span>Litros mapeados</span></div>
      <div><strong>R$ ${formatNumber(estimatedSavings)}</strong><span>Economia estimada</span></div>
      <div><strong>${resolved}</strong><span>Ocorrências resolvidas</span></div>
    `;
  }

  if (mapLiters) {
    mapLiters.textContent = `${formatNumber(liters * 7)} L`;
  }
}

function getFilteredOccurrences() {
  const query = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;
  return occurrences.filter(item => {
    const text = `${item.local} ${item.tipo_ocorrencia} ${item.status} ${item.descricao}`.toLowerCase();
    const queryOk = !query || text.includes(query);
    const statusOk = !status || item.status === status;
    return queryOk && statusOk;
  });
}

async function updateStatus(id, status) {
  try {
    const response = await fetch(`/api/ocorrencias/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!response.ok) throw new Error('Erro ao atualizar status.');
    await loadOccurrences();
    showToast('Status atualizado.');
  } catch (error) {
    showToast(error.message);
  }
}

async function loadConfig() {
  if (appConfig) return appConfig;
  try {
    const response = await fetch('/api/config');
    appConfig = await response.json();
  } catch {
    appConfig = {
      mapa_provider: 'openstreetmap',
      campus: { lat: -20.5032738, lng: -54.6134936, zoom: 16 }
    };
  }
  return appConfig;
}

async function initMapExperience() {
  const config = await loadConfig();
  setMapMode('osm');
  initOsmMap(config);
  updateMapMarkers();
}

function setMapMode(mode) {
  const targetMode = mode === 'campus' ? 'campus' : 'osm';

  mapModeButtons.forEach(button => {
    button.classList.toggle('active', button.dataset.mapMode === targetMode);
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
    initOsmMap(appConfig || {});
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

  const center = [
    Number(config.campus?.lat || -20.5032738),
    Number(config.campus?.lng || -54.6134936)
  ];

  osmMap = L.map(osmMapElement, {
    zoomControl: true,
    attributionControl: true,
    scrollWheelZoom: true
  }).setView(center, Number(config.campus?.zoom || 16));

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
        lat: -20.5032738,
        lng: -54.6134936,
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

  const points = [
    { key: 'biblioteca', terms: ['biblioteca'], label: 'Biblioteca Central', lat: -20.50095, lng: -54.61172, x: 66, y: 36 },
    { key: 'restaurante', terms: ['restaurante', 'ru', 'universitario'], label: 'Restaurante Universitário', lat: -20.50542, lng: -54.61598, x: 47, y: 60 },
    { key: 'facom', terms: ['facom', 'computacao'], label: 'Facom', lat: -20.50616, lng: -54.61389, x: 53, y: 62 },
    { key: 'faeng', terms: ['faeng', 'engenharia'], label: 'Faeng', lat: -20.50652, lng: -54.61294, x: 57, y: 65 },
    { key: 'inqui', terms: ['inqui', 'quimica'], label: 'Inqui', lat: -20.50858, lng: -54.61945, x: 32, y: 73 },
    { key: 'laboratorios', terms: ['laboratorio', 'laboratorio-2', 'laboratorios'], label: 'Laboratórios', lat: -20.50023, lng: -54.61655, x: 43, y: 28 },
    { key: 'hospital', terms: ['hospital', 'hu'], label: 'Hospital Universitário', lat: -20.50256, lng: -54.61929, x: 31, y: 39 },
    { key: 'reitoria', terms: ['reitoria', 'proece', 'proaes'], label: 'Reitoria e pró-reitorias', lat: -20.49945, lng: -54.61395, x: 55, y: 25 },
    { key: 'famed', terms: ['famed', 'medicina'], label: 'Famed', lat: -20.50115, lng: -54.61403, x: 53, y: 36 },
    { key: 'bloco-7', terms: ['bloco-7', 'bloco-7,', 'bloco 7', 'banheiro'], label: 'Bloco 7 e banheiros', lat: -20.50462, lng: -54.61333, x: 56, y: 52 },
    { key: 'administrativo', terms: ['administrativa', 'administrativo', 'sala-administrativa'], label: 'Área administrativa', lat: -20.50018, lng: -54.61462, x: 51, y: 31 },
    { key: 'bebedouro', terms: ['bebedouro', 'filtro', 'purificador'], label: 'Pontos de bebedouro', lat: -20.50400, lng: -54.61238, x: 60, y: 51 },
    { key: 'esportes', terms: ['estadio', 'moreninho', 'ginasio', 'esportivo'], label: 'Complexo esportivo', lat: -20.50455, lng: -54.60986, x: 72, y: 56 },
    { key: 'inma', terms: ['inma', 'matematica'], label: 'Inma', lat: -20.50585, lng: -54.61114, x: 67, y: 61 },
    { key: 'infi', terms: ['infi', 'fisica'], label: 'Infi', lat: -20.50566, lng: -54.61172, x: 64, y: 60 }
  ];

  const found = points.find(point => point.terms.some(term => text.includes(term)));
  if (found) return found;

  return {
    key: `geral-${text.slice(0, 24) || 'campus'}`,
    label: local || 'Campus UFMS',
    lat: -20.5032738,
    lng: -54.6134936,
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

    const marker = L.marker([point.lat, point.lng], { icon }).addTo(osmMarkersLayer);
    marker.bindPopup(`
      <div class="leaflet-info-window">
        <strong>${escapeHtml(point.label)}</strong>
        <p>${point.count} ocorrência(s) mapeada(s)</p>
        <p>${formatNumber(point.liters)} L/dia estimados</p>
        ${point.items.slice(0, 3).map(item => `<small>${escapeHtml(item.tipo_ocorrencia)} · ${escapeHtml(item.prioridade)}</small>`).join('')}
      </div>
    `);
    bounds.push([point.lat, point.lng]);
  });

  if (bounds.length > 1) {
    osmMap.fitBounds(bounds, { padding: [44, 44], maxZoom: 17 });
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
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '-');
}

refreshBtn.addEventListener('click', loadOccurrences);
searchInput.addEventListener('input', renderDashboard);
statusFilter.addEventListener('change', renderDashboard);

loadConfig();
checkHealth();
loadOccurrences();
