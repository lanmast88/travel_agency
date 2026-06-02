import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Alert, CircularProgress } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { fetchCities, fetchTours, setPage } from "../features/tours/toursSlice";

const MEAL_LABELS = {
  none: "Без питания",
  breakfast: "Завтраки",
  half_board: "Полупансион",
  full_board: "Полный пансион",
  all_inclusive: "Всё включено",
};

const STATUS_TONE = {
  hot: "bg-rose-50 text-rose-500",
  active: "bg-emerald-50 text-emerald-600",
  sold: "bg-slate-100 text-slate-500",
};

function formatDate(d) {
  return new Intl.DateTimeFormat("ru-RU").format(new Date(d));
}

function formatPrice(p) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(Number(p));
}

function getSeatTone(n) {
  if (n === 0) return "bg-rose-500";
  if (n <= 3) return "bg-rose-500";
  if (n <= 10) return "bg-amber-400";
  return "bg-emerald-500";
}

function seatsLabel(n) {
  if (n === 0) return "Нет мест";
  const last2 = n % 100, last1 = n % 10;
  if (last2 >= 11 && last2 <= 14) return `${n} мест`;
  if (last1 === 1) return `${n} место`;
  if (last1 >= 2 && last1 <= 4) return `${n} места`;
  return `${n} мест`;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-slate-400" aria-hidden="true">
      <path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-slate-400" aria-hidden="true">
      <path d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon({ dir }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TourCard({ tour, cityName }) {
  const gradients = [
    "from-blue-400 to-indigo-500",
    "from-teal-400 to-cyan-500",
    "from-violet-400 to-purple-500",
    "from-orange-400 to-rose-500",
    "from-green-400 to-emerald-500",
    "from-sky-400 to-blue-500",
  ];
  const gradient = gradients[tour.name.charCodeAt(0) % gradients.length];
  const statusTone = tour.is_hot ? STATUS_TONE.hot : tour.available === 0 ? STATUS_TONE.sold : STATUS_TONE.active;
  const statusLabel = tour.is_hot ? "🔥 Горящий" : tour.available === 0 ? "◉ Нет мест" : "✓ Есть места";

  return (
    <Link
      to={`/tours/${tour.id}`}
      className="group flex flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm shadow-slate-200/60 transition hover:-translate-y-1 hover:shadow-md hover:border-slate-300 no-underline"
    >
      <div className={`relative h-32 flex items-end p-4 ${tour.photo_url ? "" : `bg-gradient-to-br ${gradient}`}`}>
        {tour.photo_url && (
          <img
            src={tour.photo_url}
            alt={tour.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className={`absolute inset-0 ${tour.photo_url ? "bg-black/35" : ""}`} />
        <span className={`relative inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${statusTone} bg-white/90`}>
          {statusLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-base font-extrabold leading-tight text-slate-900 line-clamp-2 group-hover:text-brand-600 transition-colors">
          {tour.name}
        </p>

        {cityName && (
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <span className="inline-block h-2 w-2 rounded-full bg-brand-500 shrink-0" />
            {cityName}
          </div>
        )}

        <p className="text-sm font-semibold text-slate-500">
          {formatDate(tour.start_date)} — {formatDate(tour.end_date)}
        </p>

        <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
          <span className="rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">
            {MEAL_LABELS[tour.meal_type] ?? tour.meal_type}
          </span>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
            {tour.duration_nights} ноч.
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-xl font-black text-slate-900">{formatPrice(tour.price)}</span>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <span className={`h-2.5 w-2.5 rounded-full ${getSeatTone(tour.available)}`} />
            {seatsLabel(tour.available)}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { items, total, page, pageSize, status, error, cities } = useSelector((s) => s.tours);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    city_id: searchParams.get("city_id") ?? "",
    min_price: searchParams.get("min_price") ?? "",
    max_price: searchParams.get("max_price") ?? "",
    start_date_from: searchParams.get("start_date_from") ?? "",
    start_date_to: searchParams.get("start_date_to") ?? "",
    meal_type: searchParams.get("meal_type") ?? "",
    only_hot: searchParams.get("hot") === "1",
  });

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      only_hot: searchParams.get("hot") === "1",
    }));
  }, [searchParams]);

  const cityMap = useMemo(() => Object.fromEntries(cities.map((c) => [c.id, c.name])), [cities]);

  const buildParams = useCallback((f, p) => {
    const params = { page: p, page_size: pageSize ?? 12 };
    if (f.city_id) params.city_id = f.city_id;
    if (f.min_price) params.min_price = f.min_price;
    if (f.max_price) params.max_price = f.max_price;
    if (f.start_date_from) params.start_date_from = f.start_date_from;
    if (f.start_date_to) params.start_date_to = f.start_date_to;
    if (f.meal_type) params.meal_type = f.meal_type;
    if (f.only_hot) params.only_hot = true;
    return params;
  }, [pageSize]);

  useEffect(() => { dispatch(fetchCities()); }, [dispatch]);

  useEffect(() => {
    dispatch(fetchTours(buildParams(filters, 1)));
    dispatch(setPage(1));
  }, [dispatch, filters, buildParams]);

  function handleFilter(field, value) {
    setFilters((p) => ({ ...p, [field]: value }));
  }

  function handleReset() {
    setFilters({ city_id: "", min_price: "", max_price: "", start_date_from: "", start_date_to: "", meal_type: "", only_hot: false });
    setSearch("");
    setSearchParams({});
  }

  function handlePageChange(newPage) {
    dispatch(setPage(newPage));
    dispatch(fetchTours(buildParams(filters, newPage)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const visibleTours = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((t) => t.name.toLowerCase().includes(q) || (cityMap[t.city_id] ?? "").toLowerCase().includes(q));
  }, [items, search, cityMap]);

  const totalPages = Math.ceil(total / (pageSize ?? 12));

  const resultRange = useMemo(() => {
    if (total === 0 || visibleTours.length === 0) return "Туры не найдены";
    const start = (page - 1) * (pageSize ?? 12) + 1;
    const end = start + visibleTours.length - 1;
    return `Показано ${start}–${end} из ${total}`;
  }, [page, pageSize, total, visibleTours.length]);

  return (
    <div className="space-y-6">
      {/* Заголовок + поиск */}
      <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Каталог туров</h1>
        <label className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
          <SearchIcon />
          <input
            type="text"
            placeholder="Поиск по названию, городу..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
          />
        </label>
      </header>

      {/* Фильтры */}
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-sm shadow-slate-200/60">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto]">
          <div className="flex items-center gap-3 min-w-0">
            <span className="shrink-0 text-sm font-bold text-slate-500">Город</span>
            <select
              value={filters.city_id}
              onChange={(e) => handleFilter("city_id", e.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-brand-400 focus:bg-white"
            >
              <option value="">Все города</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-3 min-w-0">
            <span className="shrink-0 text-sm font-bold text-slate-500">Питание</span>
            <select
              value={filters.meal_type}
              onChange={(e) => handleFilter("meal_type", e.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-brand-400 focus:bg-white"
            >
              <option value="">Любое</option>
              {Object.entries(MEAL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-3 min-w-0">
            <span className="text-sm font-bold text-slate-500 shrink-0">от</span>
            <input type="number" min="0" value={filters.min_price} onChange={(e) => handleFilter("min_price", e.target.value)}
              placeholder="0"
              className="h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-brand-400 focus:bg-white" />
            <span className="text-sm font-bold text-slate-500 shrink-0">до</span>
            <input type="number" min="0" value={filters.max_price} onChange={(e) => handleFilter("max_price", e.target.value)}
              placeholder="∞"
              className="h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-brand-400 focus:bg-white" />
          </div>

          <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-3 min-w-0">
            <CalendarIcon />
            <input type="date" value={filters.start_date_from} onChange={(e) => handleFilter("start_date_from", e.target.value)}
              className="h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-brand-400 focus:bg-white" />
            <span className="text-sm font-bold text-slate-500 shrink-0">—</span>
            <input type="date" value={filters.start_date_to} onChange={(e) => handleFilter("start_date_to", e.target.value)}
              className="h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-brand-400 focus:bg-white" />
          </div>

          <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
            <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={filters.only_hot}
                onChange={(e) => handleFilter("only_hot", e.target.checked)}
                className="h-4 w-4 rounded accent-brand-500"
              />
              Горящие 🔥
            </label>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-sm text-slate-500 font-medium">{resultRange}</span>
          <button onClick={handleReset} className="text-sm font-semibold text-slate-400 hover:text-slate-700 transition">
            Сбросить фильтры
          </button>
        </div>
      </section>

      {/* Список туров */}
      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="text-2xl font-extrabold tracking-tight text-slate-900">Все туры</div>
        </div>

        {status === "loading" && (
          <div className="flex justify-center py-24">
            <CircularProgress />
          </div>
        )}
        {status === "failed" && (
          <div className="px-6 py-5"><Alert severity="error" className="!rounded-2xl">{error}</Alert></div>
        )}
        {status === "succeeded" && visibleTours.length === 0 && (
          <div className="py-24 text-center">
            <p className="text-4xl mb-3">🏖️</p>
            <p className="text-lg font-bold text-slate-500">Туры не найдены</p>
            <p className="text-sm text-slate-400 mt-1">Попробуйте изменить фильтры</p>
          </div>
        )}
        {status === "succeeded" && visibleTours.length > 0 && (
          <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleTours.map((tour) => (
              <TourCard key={tour.id} tour={tour} cityName={cityMap[tour.city_id]} />
            ))}
          </div>
        )}

        {/* Пагинация */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-5">
            <span className="text-sm font-medium text-slate-500">{resultRange}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronIcon dir="left" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={`h-9 w-9 rounded-xl text-sm font-bold transition ${
                    p === page
                      ? "bg-brand-500 text-white shadow-sm"
                      : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronIcon dir="right" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
