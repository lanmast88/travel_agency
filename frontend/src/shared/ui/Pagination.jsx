export function Pagination({ page, pages, onPageChange }) {
  if (pages <= 1) return null;
  const nums = Array.from({ length: pages }, (_, i) => i + 1);
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-lg font-bold text-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ‹
      </button>
      {nums.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onPageChange(n)}
          className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ${
            n === page
              ? "bg-brand-500 text-white"
              : "border border-slate-200 text-slate-700"
          }`}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pages}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-lg font-bold text-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ›
      </button>
    </div>
  );
}
