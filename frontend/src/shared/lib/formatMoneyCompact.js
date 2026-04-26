export function formatMoneyCompact(value) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();
  const isNegative = trimmedValue.includes("-");
  const numericPart = Number(trimmedValue.replace(/[^\d]/g, ""));

  if (!numericPart || numericPart < 1_000_000) {
    return value;
  }

  const millions = numericPart / 1_000_000;
  const compactMillions = Number.isInteger(millions)
    ? String(millions)
    : millions.toFixed(1).replace(".0", "");

  return `${isNegative ? "-" : ""}₽${compactMillions} кк`;
}
