export function formatDate(value) {
  if (!value) return "—";
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.split("T")[0].split("-");
    return `${d}.${m}.${y}`;
  }
  return new Intl.DateTimeFormat("ru-RU").format(new Date(s));
}

export function formatDateTime(value) {
  if (!value) return "Не указано";
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatMoney(value) {
  if (value === undefined || value === null) return "—";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function formatSeatsLabel(value) {
  const lastTwo = value % 100;
  const last = value % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return `${value} мест`;
  if (last === 1) return `${value} место`;
  if (last >= 2 && last <= 4) return `${value} места`;
  return `${value} мест`;
}
