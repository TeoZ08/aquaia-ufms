import { Controller } from "@hotwired/stimulus"
import { DEFAULT_CAMPUS, buildMapData, getDominantStatus, getMostCriticalItem } from "../lib/campus_points"
import { escapeHtml, formatCurrency, formatNumber, impactFor, shortText } from "../lib/format"

export default class extends Controller {
  static targets = ["map", "unavailable", "campusView", "osmView", "campusMarkers", "providerLabel", "modeButton"]
  static values = {
    markerIconUrl: String,
    centerLat: { type: Number, default: DEFAULT_CAMPUS.lat },
    centerLng: { type: Number, default: DEFAULT_CAMPUS.lng },
    zoom: { type: Number, default: DEFAULT_CAMPUS.zoom },
    tariff: { type: Number, default: 71.03 },
  }

  connect() {
    this.occurrences = []
    this.mode = "osm"
    this.map = null
    this.layer = null
  }

  handleScreenChange(event) {
    if (event.detail?.screen === "mapa") {
      this.initMap()
      this.render()
    }
  }

  updateFromEvent(event) {
    this.occurrences = event.detail?.occurrences || []
    this.render()
  }

  setMode(event) {
    this.mode = event.params.mode || "osm"
    this.modeButtonTargets.forEach((button) => button.classList.toggle("is-active", button.dataset.mapModeParam === this.mode))
    this.osmViewTarget.classList.toggle("hidden", this.mode !== "osm")
    this.campusViewTarget.classList.toggle("hidden", this.mode !== "campus")
    if (this.hasProviderLabelTarget) {
      this.providerLabelTarget.textContent = this.mode === "osm"
        ? "OpenStreetMap + Leaflet, sem cadastro"
        : "Mapa oficial UFMS com pontos do MVP"
    }
    if (this.mode === "osm") {
      this.initMap()
      window.setTimeout(() => {
        if (this.map) this.map.invalidateSize()
      }, 120)
    }
    this.render()
  }

  initMap() {
    if (this.map || !this.hasMapTarget) return
    if (!window.L) {
      this.showUnavailable()
      this.mode = "campus"
      return
    }

    this.map = L.map(this.mapTarget, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
    }).setView([this.centerLatValue, this.centerLngValue], this.zoomValue)

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(this.map)

    this.layer = L.layerGroup().addTo(this.map)
    if (this.hasUnavailableTarget) this.unavailableTarget.classList.add("hidden")
  }

  showUnavailable() {
    if (this.hasUnavailableTarget) this.unavailableTarget.classList.remove("hidden")
    if (this.hasOsmViewTarget) this.osmViewTarget.classList.add("hidden")
    if (this.hasCampusViewTarget) this.campusViewTarget.classList.remove("hidden")
  }

  render() {
    this.renderCampusMarkers()
    this.renderOsmMarkers()
  }

  renderCampusMarkers() {
    if (!this.hasCampusMarkersTarget) return
    const data = buildMapData(this.occurrences)
    this.campusMarkersTarget.innerHTML = data.map((point) => {
      const tone = this.toneForPoint(point)
      const color = this.colorForTone(tone)
      const label = point.count || "•"
      return `
        <button class="aqua-campus-marker" style="left:${point.x}%; top:${point.y}%; --aqua-marker-ring:${color}" type="button" title="${escapeHtml(point.label)}">
          ${escapeHtml(label)}
          <small>${escapeHtml(point.label)}</small>
        </button>
      `
    }).join("")
  }

  renderOsmMarkers() {
    if (!this.map || !window.L || !this.layer) return
    this.layer.clearLayers()
    const data = buildMapData(this.occurrences)
    const bounds = []

    data.forEach((point) => {
      const tone = this.toneForPoint(point)
      const color = this.colorForTone(tone)
      const label = point.count || "•"
      const icon = L.divIcon({
        className: "aquaia-marker-icon",
        html: `<div class="aqua-leaflet-marker" style="--aqua-marker-url:url('${this.markerIconUrlValue}');--aqua-marker-ring:${color}"><span>${escapeHtml(label)}</span></div>`,
        iconSize: [46, 46],
        iconAnchor: [23, 23],
      })

      const marker = L.marker([point.lat, point.lng], { icon }).addTo(this.layer)
      marker.bindPopup(this.popupHtml(point))
      bounds.push([point.lat, point.lng])
    })

    if (bounds.length > 1) {
      this.map.fitBounds(bounds, { padding: [44, 44], maxZoom: 17 })
    } else if (bounds.length === 1) {
      this.map.setView(bounds[0], Math.max(this.map.getZoom(), 16))
    }
  }

  popupHtml(point) {
    const critical = getMostCriticalItem(point.items)
    const dominantStatus = getDominantStatus(point.items)
    const impact = impactFor({ litros_por_dia_estimados: point.liters }, this.tariffValue)
    const itemsHtml = point.items.length
      ? point.items.slice(0, 3).map((item) => `
          <small class="block">
            <b>${escapeHtml(shortText(item.local, 42))}</b>
            <span>${escapeHtml(item.tipo_ocorrencia)} · ${escapeHtml(item.prioridade)} · ${formatNumber(item.litros_por_dia_estimados)} L/dia</span>
          </small>
        `).join("")
      : "<small>Sem ocorrências cadastradas neste ponto.</small>"

    return `
      <div class="min-w-52 font-sans">
        <strong class="block text-sm">${escapeHtml(point.label)}</strong>
        <p class="mt-1 text-xs text-slate-600">${point.count} ocorrência(s) mapeada(s)</p>
        <p class="text-xs text-slate-600">${formatNumber(point.liters)} L/dia · ${formatCurrency(impact.costPerMonth)}/mês</p>
        <p class="text-xs text-slate-600">Mais crítica: ${critical ? `${escapeHtml(critical.prioridade)} · ${escapeHtml(shortText(critical.tipo_ocorrencia, 44))}` : "Sem ocorrências"}</p>
        <p class="text-xs text-slate-600">Status predominante: ${escapeHtml(dominantStatus)}</p>
        <div class="mt-2 grid gap-1 text-xs">${itemsHtml}</div>
      </div>
    `
  }

  toneForPoint(point) {
    if (!point.count) return "institutional"
    if (point.urgent > 0) return "red"
    if (point.count > 1) return "orange"
    return "blue"
  }

  colorForTone(tone) {
    if (tone === "red") return "#ef5b51"
    if (tone === "orange") return "#ff9c3d"
    if (tone === "institutional") return "#238689"
    return "#25c5e9"
  }
}
