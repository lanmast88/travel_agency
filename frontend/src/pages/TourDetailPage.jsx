import { CircularProgress } from "@mui/material";
import { useEffect, useReducer } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Aside from "../features/components/Aside";
import { http } from "../shared/api/http";
import { formatDate, formatMoney } from "../shared/lib/format";

const MEAL_LABELS = {
  none: "Без питания",
  breakfast: "Завтрак",
  all: "Всё включено",
};

const STATUS_LABELS = {
  draft: "Черновик",
  active: "Активен",
  archived: "В архиве",
};

const STATUS_CLASSES = {
  draft: "bg-slate-100 text-slate-500",
  active: "bg-emerald-100 text-emerald-700",
  archived: "bg-slate-200 text-slate-500",
};

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M19 12H5M5 12l7 7M5 12l7-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <span className="text-sm font-semibold text-slate-800">
        {value ?? "—"}
      </span>
    </div>
  );
}

function StarRating({ stars }) {
  return (
    <span className="text-lg leading-none">
      <span className="text-amber-400">{"★".repeat(stars)}</span>
      <span className="text-slate-200">{"★".repeat(5 - stars)}</span>
    </span>
  );
}

export function TourDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [{ tour, loading, error }, dispatch] = useReducer(
    (_, next) => next,
    { tour: null, loading: true, error: null },
  );

  useEffect(() => {
    dispatch({ tour: null, loading: true, error: null });
    http
      .get(`/v1/tours/${id}`)
      .then(({ data }) => dispatch({ tour: data, loading: false, error: null }))
      .catch(() => dispatch({ tour: null, loading: false, error: "Не удалось загрузить тур." }));
  }, [id]);

  return (
    <div className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
        <div className="flex min-h-[calc(100vh-2rem)] overflow-hidden rounded-[32px] border border-white/70 bg-white/75 shadow-panel backdrop-blur sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)]">
          <Aside />

          <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 lg:px-8">
            <header className="flex items-center gap-4 border-b border-slate-200/80 px-6 py-6 lg:px-10">
              <button
                type="button"
                onClick={() => navigate("/travels")}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                title="Назад к путёвкам"
              >
                <BackIcon />
              </button>
              <h1 className="truncate text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                {loading ? "Загрузка..." : (tour?.name ?? "Путёвка")}
              </h1>
            </header>

            <div className="px-6 py-7 lg:px-10 lg:py-8">
              {loading && (
                <div className="flex justify-center py-24">
                  <CircularProgress />
                </div>
              )}

              {error && (
                <div className="rounded-2xl bg-rose-50 px-6 py-5 text-sm font-semibold text-rose-600">
                  {error}
                </div>
              )}

              {tour && !loading && (
                <div className="grid gap-6 lg:grid-cols-3">
                  {/* ── Left column ── */}
                  <div className="flex flex-col gap-6 lg:col-span-2">
                    {/* Photo */}
                    {tour.photo_url ? (
                      <div className="overflow-hidden rounded-[28px] border border-slate-200 shadow-sm shadow-slate-200/60">
                        <img
                          src={tour.photo_url}
                          alt={tour.name}
                          className="h-56 w-full object-cover lg:h-72"
                        />
                      </div>
                    ) : (
                      <div className="flex h-40 items-center justify-center gap-3 rounded-[28px] border border-dashed border-slate-200 bg-slate-50 text-slate-400 lg:h-52">
                        <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 shrink-0" aria-hidden="true">
                          <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                          <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M9 5l1.5-2h3L15 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className="text-sm font-semibold">Фото не добавлено</span>
                      </div>
                    )}

                    {/* Main details */}
                    <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm shadow-slate-200/60">
                      <div className="mb-5 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${STATUS_CLASSES[tour.status] ?? "bg-slate-100 text-slate-500"}`}
                        >
                          {STATUS_LABELS[tour.status] ?? tour.status}
                        </span>
                        {tour.is_hot && (
                          <span className="inline-flex rounded-full bg-rose-500 px-3 py-1 text-xs font-bold text-white">
                            Горящий 🔥
                          </span>
                        )}
                        <span className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                          {MEAL_LABELS[tour.meal_type] ?? tour.meal_type}
                        </span>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        <InfoRow
                          label="Дата начала"
                          value={formatDate(tour.start_date)}
                        />
                        <InfoRow
                          label="Дата окончания"
                          value={formatDate(tour.end_date)}
                        />
                        <InfoRow
                          label="Продолжительность"
                          value={`${tour.duration_nights} ночей`}
                        />
                        <InfoRow label="Мест доступно" value={tour.available} />
                        <InfoRow
                          label="Цена за человека"
                          value={formatMoney(tour.price)}
                        />
                      </div>
                    </section>

                    {/* Description */}
                    {tour.description && (
                      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm shadow-slate-200/60">
                        <div className="mb-3 text-base font-extrabold tracking-tight text-slate-950">
                          Описание
                        </div>
                        <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-slate-700">
                          {tour.description}
                        </p>
                      </section>
                    )}
                  </div>

                  {/* ── Right column ── */}
                  <div className="flex flex-col gap-6">
                    {/* City */}
                    <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm shadow-slate-200/60">
                      <div className="mb-4 text-base font-extrabold tracking-tight text-slate-950">
                        Город
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="text-base font-bold text-slate-900">
                          {tour.city.name}
                        </div>
                        <div className="text-sm font-semibold text-slate-500">
                          {tour.city.country}
                        </div>
                        {tour.city.climate && (
                          <div className="text-sm text-slate-600">
                            <span className="font-semibold">Климат:</span>{" "}
                            {tour.city.climate}
                          </div>
                        )}
                        {tour.city.description && (
                          <p className="mt-1 text-sm leading-relaxed text-slate-600">
                            {tour.city.description}
                          </p>
                        )}
                      </div>
                    </section>

                    {/* Hotel */}
                    <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm shadow-slate-200/60">
                      <div className="mb-4 text-base font-extrabold tracking-tight text-slate-950">
                        Отель
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="text-base font-bold text-slate-900">
                          {tour.hotel.name}
                        </div>
                        <StarRating stars={tour.hotel.stars} />
                        <div className="text-sm text-slate-600">
                          {tour.hotel.address}
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
