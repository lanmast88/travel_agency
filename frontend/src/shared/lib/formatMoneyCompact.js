export function formatMoneyCompact(value) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();
  const isNegative = trimmedValue.includes("-");
  const hasCurrency = trimmedValue.includes("₽");
  const numericPart = Number(trimmedValue.replace(/[^\d]/g, ""));

  if (!numericPart || numericPart < 1_000) {
    return value;
  }

  const sign = isNegative ? "-" : "";

  if (numericPart >= 1_000_000) {
    const millions = numericPart / 1_000_000;
    const compact = Number.isInteger(millions)
      ? String(millions)
      : millions.toFixed(1).replace(".0", "");
    return `${sign}${compact}кк ₽`;
  }

  const thousands = numericPart / 1_000;
  const compact = Number.isInteger(thousands)
    ? String(thousands)
    : thousands.toFixed(1).replace(".0", "");
  return `${sign}${compact}к${hasCurrency ? " ₽" : ""}`;
}
