import { Button, Checkbox } from "@mui/material";
import { useSelector } from "react-redux";
import Aside from "../features/components/Aside";

const seatToneMap = {
  success: "bg-emerald-500",
  warning: "bg-amber-400",
  danger: "bg-rose-500",
};

const statusToneMap = {
  hot: "bg-rose-50 text-rose-500",
  success: "bg-emerald-50 text-emerald-500",
  soon: "bg-blue-50 text-blue-500",
  neutral: "bg-slate-100 text-slate-500",
};

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5 text-slate-400"
      aria-hidden="true"
    >
      <path
        d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15a7.5 7.5 0 0 1 0 15z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5 text-slate-500"
      aria-hidden="true"
    >
      <path
        d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GlobeDot() {
  return (
    <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand-500" />
  );
}

function TravelsPage() {
  const travel = useSelector((state) => state.travel);

  return (
    <div className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
        <div className="flex min-h-[calc(100vh-2rem)] overflow-hidden rounded-[32px] border border-white/70 bg-white/75 shadow-panel backdrop-blur sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)]">
          <Aside />

          <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 lg:px-8">
            <header className="flex flex-col gap-4 border-b border-slate-200/80 px-6 py-6 xl:flex-row xl:items-center xl:justify-between lg:px-10">
              <div className="min-w-0 flex flex-col gap-4 xl:flex-row xl:items-center xl:flex-1">
                <h1 className="shrink-0 text-3xl font-extrabold tracking-tight text-slate-950">
                  Путёвки
                </h1>

                <label className="flex w-full max-w-[380px] min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm shadow-slate-200/40 xl:flex-1">
                  <SearchIcon />
                  <input
                    type="text"
                    placeholder="Поиск по названию, городу..."
                    className="w-full bg-transparent text-base font-medium text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </label>
              </div>

              <Button
                variant="contained"
                className="!min-w-[168px] shrink-0 !rounded-2xl !bg-brand-500 !px-5 !py-3 !text-sm !font-bold !normal-case !shadow-none hover:!bg-brand-600"
              >
                <span className="mr-2 inline-flex">
                  <PlusIcon />
                </span>
                Добавить
              </Button>
            </header>

            <div className="space-y-6 px-6 py-7 lg:px-10 lg:py-8">
              <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm shadow-slate-200/60">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] md:grid-cols-2">
                  <div className="min-w-0 flex items-center gap-3">
                    <span className="shrink-0 text-sm font-bold text-slate-500">
                      Город
                    </span>
                    <select className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-700 outline-none">
                      <option>{travel.filters.city}</option>
                    </select>
                  </div>

                  <div className="min-w-0 flex items-center gap-3">
                    <span className="shrink-0 text-sm font-bold text-slate-500">
                      Дата c
                    </span>
                    <label className="flex h-12 w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4">
                      <span className="text-base font-semibold text-slate-700">
                        {travel.filters.dateFrom}
                      </span>
                      <CalendarIcon />
                    </label>
                  </div>

                  <div className="min-w-0 flex items-center gap-3">
                    <span className="shrink-0 text-sm font-bold text-slate-500">
                      по
                    </span>
                    <label className="flex h-12 w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4">
                      <span className="text-base font-semibold text-slate-700">
                        {travel.filters.dateTo}
                      </span>
                      <CalendarIcon />
                    </label>
                  </div>

                  <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                    <span className="text-sm font-bold text-slate-500">
                      Цена от
                    </span>
                    <input
                      value={travel.filters.priceFrom}
                      readOnly
                      className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-700 outline-none"
                    />
                    <span className="text-sm font-bold text-slate-500">до</span>
                    <input
                      value={travel.filters.priceTo}
                      readOnly
                      className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-700 outline-none"
                    />
                  </div>

                  <label className="flex items-center justify-start gap-2 border-l border-slate-200 pl-4 text-base font-bold text-slate-700">
                    <Checkbox checked={travel.filters.urgentOnly} />
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      Только горячие <span>🔥</span>
                    </span>
                  </label>
                </div>
              </section>

              <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
                <div className="border-b border-slate-200 px-6 py-5">
                  <div className="text-2xl font-extrabold tracking-tight">
                    Все путёвки
                  </div>
                </div>

                <div className="overflow-hidden">
                  <table className="w-full table-fixed border-collapse">
                    <colgroup>
                      <col className="w-[20%]" />
                      <col className="w-[14%]" />
                      <col className="w-[12%]" />
                      <col className="w-[12%]" />
                      <col className="w-[10%]" />
                      <col className="w-[11%]" />
                      <col className="w-[13%]" />
                      <col className="w-[8%]" />
                    </colgroup>
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs uppercase tracking-[0.1em] text-slate-400">
                        <th className="px-5 py-4">Название</th>
                        <th className="px-5 py-4">Город</th>
                        <th className="px-5 py-4">Начало</th>
                        <th className="px-5 py-4">Конец</th>
                        <th className="px-5 py-4">Цена</th>
                        <th className="px-5 py-4">В наличии</th>
                        <th className="px-5 py-4">Услуги</th>
                        <th className="px-5 py-4">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {travel.tours.map((tour) => (
                        <tr
                          key={tour.id}
                          className={`border-t border-slate-100 align-top ${
                            tour.highlighted ? "bg-amber-50/80" : "bg-white"
                          }`}
                        >
                          <td className="px-5 py-5 text-base font-extrabold leading-tight text-slate-900">
                            {tour.title}
                          </td>
                          <td className="px-5 py-5">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                              <GlobeDot />
                              <span>{tour.city}</span>
                            </div>
                          </td>
                          <td className="px-5 py-5 text-sm font-semibold text-slate-700">
                            {tour.startDate}
                          </td>
                          <td className="px-5 py-5 text-sm font-semibold text-slate-700">
                            {tour.endDate}
                          </td>
                          <td className="px-5 py-5 text-base font-black text-slate-900">
                            {tour.price}
                          </td>
                          <td className="px-5 py-5">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                              <span
                                className={`h-3 w-3 rounded-full ${seatToneMap[tour.seatsTone]}`}
                              />
                              <span>{tour.seatsLabel}</span>
                            </div>
                          </td>
                          <td className="px-5 py-5">
                            <div className="flex flex-wrap gap-1.5">
                              {tour.services.map((service) => (
                                <span
                                  key={service}
                                  className="rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700"
                                >
                                  {service}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-0 py-5">
                            <span
                              className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ${statusToneMap[tour.statusTone]}`}
                            >
                              {tour.statusTone === "hot" ? "🔥 " : ""}
                              {tour.statusTone === "success" ? "✓ " : ""}
                              {tour.statusTone === "soon" ? "◔ " : ""}
                              {tour.statusTone === "neutral" ? "◉ " : ""}
                              {tour.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-lg font-medium text-slate-500">
                    {travel.resultRange}
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-xl font-bold text-slate-400">
                      ‹
                    </button>
                    {travel.pagination.map((page) => (
                      <button
                        key={page}
                        className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold ${
                          page === 1
                            ? "bg-brand-500 text-white"
                            : "border border-slate-200 text-slate-700"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default TravelsPage;
