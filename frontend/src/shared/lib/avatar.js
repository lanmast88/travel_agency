export const AVATAR_PALETTE = [
  "bg-brand-500", "bg-emerald-500", "bg-violet-500",
  "bg-amber-500", "bg-rose-500", "bg-sky-600", "bg-teal-500", "bg-purple-500",
];

export function getAvatarColor(id) {
  const n = id ? parseInt(id.replace(/-/g, "").slice(0, 8), 16) : 0;
  return AVATAR_PALETTE[n % AVATAR_PALETTE.length];
}

export function getInitials(name) {
  if (!name) return "?";
  return (
    name
      .split(" ")
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}
