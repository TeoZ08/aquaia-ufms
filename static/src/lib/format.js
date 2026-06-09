export const STATUSES = ["Aberto", "Em análise", "Resolvido"]
export const PRIORITY_WEIGHT = { Urgente: 4, Alta: 3, Média: 2, Baixa: 1 }
export const STATUS_WEIGHT = { Aberto: 3, "Em análise": 2, Resolvido: 1 }
export const WATER_TARIFF_LABEL = "Tarifa estimada para cálculo do MVP"

export function formatNumber(value, maximumFractionDigits = 0) {
  return Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits })
}

export function formatDecimal(value, maximumFractionDigits = 2) {
  return Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  })
}

export function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatDate(timestamp) {
  if (!timestamp) return "Sem data"
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(Number(timestamp) * 1000))
}

export function formatDatetime(timestamp) {
  if (!timestamp) return ""
  return new Date(Number(timestamp) * 1000).toISOString()
}

export function shortText(value, maxLength) {
  const text = String(value || "")
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text
}

export function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[char])
}

export function slug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export function normalizeSearch(value) {
  return slug(value).replace(/-/g, " ")
}

export function toneForPriority(priority) {
  const value = slug(priority)
  if (value === "urgente" || value === "alta") return "red"
  if (value === "media") return "orange"
  return "green"
}

export function badgeClass(value) {
  const tone = toneForPriority(value)
  if (tone === "red") return "aqua-badge aqua-badge-red"
  if (tone === "orange") return "aqua-badge aqua-badge-orange"
  if (slug(value) === "resolvido" || slug(value) === "baixa") return "aqua-badge aqua-badge-green"
  return "aqua-badge aqua-badge-blue"
}

export function impactFor(item, tariff = 71.03) {
  const litersPerDay = Number(item.litros_por_dia_estimados || item.litros_dia || 0)
  const litersPerMonth = Number(item.litros_mes || litersPerDay * 30)
  const cubicMetersPerMonth = Number(item.m3_mes || litersPerMonth / 1000)
  const costPerMonth = Number(item.custo_mes || cubicMetersPerMonth * tariff)
  const costPerYear = Number(item.custo_ano || costPerMonth * 12)
  return {
    litersPerDay,
    litersPerMonth,
    cubicMetersPerMonth,
    costPerMonth,
    costPerYear,
  }
}
