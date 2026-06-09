import { PRIORITY_WEIGHT, STATUS_WEIGHT, slug } from "./format"

export const DEFAULT_CAMPUS = { lat: -20.5032738, lng: -54.6134936, zoom: 16 }

const CAMPUS_POINT_GROUPS = [
  [
    { key: "bloco-7", terms: ["bloco-7"], label: "Bloco 7", lat: -20.50462, lng: -54.61333, x: 56, y: 52 },
    { key: "bloco-12", terms: ["bloco-12"], label: "Bloco 12", lat: -20.50738, lng: -54.61509, x: 48, y: 67 },
  ],
  [
    { key: "biblioteca", terms: ["biblioteca", "biblioteca-central"], label: "Biblioteca Central", lat: -20.50095, lng: -54.61172, x: 66, y: 36 },
    { key: "restaurante", terms: ["restaurante-universitario", "ru"], label: "Restaurante Universitário", lat: -20.50542, lng: -54.61598, x: 47, y: 60 },
    { key: "facom", terms: ["facom", "computacao"], label: "Facom", lat: -20.50616, lng: -54.61389, x: 53, y: 62 },
    { key: "faeng", terms: ["faeng", "engenharia"], label: "Faeng", lat: -20.50652, lng: -54.61294, x: 57, y: 65 },
    { key: "inqui", terms: ["inqui", "quimica"], label: "Inqui", lat: -20.50858, lng: -54.61945, x: 32, y: 73 },
    { key: "hospital", terms: ["hospital-universitario", "hospital", "hu"], label: "Hospital Universitário", lat: -20.50256, lng: -54.61929, x: 31, y: 39 },
    { key: "reitoria", terms: ["reitoria", "proece", "proaes"], label: "Reitoria e pró-reitorias", lat: -20.49945, lng: -54.61395, x: 55, y: 25 },
    { key: "famed", terms: ["famed", "medicina"], label: "Famed", lat: -20.50115, lng: -54.61403, x: 53, y: 36 },
    { key: "inma", terms: ["inma", "matematica"], label: "Inma", lat: -20.50585, lng: -54.61114, x: 67, y: 61 },
    { key: "infi", terms: ["infi", "fisica"], label: "Infi", lat: -20.50566, lng: -54.61172, x: 64, y: 60 },
  ],
  [
    { key: "laboratorios", terms: ["laboratorio", "laboratorios"], label: "Laboratórios", lat: -20.50023, lng: -54.61655, x: 43, y: 28 },
    { key: "banheiros", terms: ["banheiro", "sanitario", "sanitarios"], label: "Banheiros do campus", lat: -20.504, lng: -54.6131, x: 57, y: 50 },
    { key: "bebedouro", terms: ["bebedouro", "filtro", "purificador"], label: "Pontos de bebedouro", lat: -20.504, lng: -54.61238, x: 60, y: 51 },
    { key: "administrativo", terms: ["administrativa", "administrativo", "sala-administrativa"], label: "Área administrativa", lat: -20.50018, lng: -54.61462, x: 51, y: 31 },
    { key: "area-externa", terms: ["area-externa", "externa", "jardim", "irrigacao"], label: "Área externa", lat: -20.5037, lng: -54.6112, x: 64, y: 49 },
    { key: "esportes", terms: ["estadio", "moreninho", "ginasio", "esportivo"], label: "Complexo esportivo", lat: -20.50455, lng: -54.60986, x: 72, y: 56 },
  ],
]

function matchesPointTerm(text, term) {
  const normalizedTerm = slug(term)
  if (!normalizedTerm) return false
  if (normalizedTerm.length <= 2) return text.split("-").includes(normalizedTerm)
  return text.includes(normalizedTerm)
}

export function resolveCampusPoint(local) {
  const text = slug(local)
  for (const group of CAMPUS_POINT_GROUPS) {
    const found = group.find((point) => point.terms.some((term) => matchesPointTerm(text, term)))
    if (found) return found
  }

  return {
    key: "campus-centro",
    label: "Centro da Cidade Universitária",
    lat: DEFAULT_CAMPUS.lat,
    lng: DEFAULT_CAMPUS.lng,
    x: 57,
    y: 48,
  }
}

export function getMostCriticalItem(items = []) {
  return [...items].sort((a, b) => {
    const priorityDiff = (PRIORITY_WEIGHT[b.prioridade] || 0) - (PRIORITY_WEIGHT[a.prioridade] || 0)
    if (priorityDiff) return priorityDiff
    return Number(b.litros_por_dia_estimados || 0) - Number(a.litros_por_dia_estimados || 0)
  })[0] || null
}

export function getDominantStatus(items = []) {
  const counts = new Map()
  items.forEach((item) => counts.set(item.status, (counts.get(item.status) || 0) + 1))
  const dominant = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || (STATUS_WEIGHT[b[0]] || 0) - (STATUS_WEIGHT[a[0]] || 0))[0]
  return dominant ? dominant[0] : "Sem status"
}

export function buildMapData(occurrences = []) {
  const grouped = new Map()

  occurrences.forEach((item) => {
    const point = resolveCampusPoint(item.local)
    const current = grouped.get(point.key) || {
      ...point,
      count: 0,
      liters: 0,
      urgent: 0,
      items: [],
    }

    current.count += 1
    current.liters += Number(item.litros_por_dia_estimados || 0)
    current.urgent += ["Urgente", "Alta"].includes(item.prioridade) ? 1 : 0
    current.items.push(item)
    grouped.set(point.key, current)
  })

  if (!grouped.size) {
    return [{
      key: "demo-centro",
      label: "Centro do campus",
      count: 0,
      liters: 0,
      urgent: 0,
      lat: DEFAULT_CAMPUS.lat,
      lng: DEFAULT_CAMPUS.lng,
      x: 57,
      y: 48,
      items: [],
    }]
  }

  return [...grouped.values()]
}
