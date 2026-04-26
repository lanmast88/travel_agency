import { Button } from "@mui/material";
import { useSelector } from "react-redux";
import Aside from "../features/components/Aside";

const discountToneMap = {
  success: "bg-emerald-100 text-emerald-600",
  neutral: "bg-slate-100 text-slate-400",
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

function ClientsSummaryIcon({ type }) {
  if (type === "users") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
        <path
          d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M16 7a3 3 0 1 1 0 6M19 21v-2a4 4 0 0 0-3-3.85M12 7a4 4 0 1 1-8 0a4 4 0 0 1 8 0z"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === "star") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
        <path
          d="m12 3 2.78 5.63 6.22.91-4.5 4.39 1.06 6.2L12 17.2 6.44 20.13l1.06-6.2L3 9.54l6.22-.91L12 3Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === "plane") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
        <path
          d="m2 19 20-7-20-7 5 7-5 7Zm5-7h15"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function UserActionIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-[18px] w-[18px]"
      aria-hidden="true"
    >
      <path
        d="M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8a4 4 0 0 0 0 8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CardActionIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-[18px] w-[18px]"
      aria-hidden="true"
    >
      <rect
        x="3.5"
        y="5.5"
        width="17"
        height="13"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M3.5 10.5h17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EditActionIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-[18px] w-[18px]"
      aria-hidden="true"
    >
      <path
        d="m4 20 4.2-1 9.5-9.5a2.12 2.12 0 0 0-3-3L5.2 16 4 20ZM13.5 7.5l3 3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatClientName(fullName) {
  const parts = fullName.split(" ");

  if (parts.length < 3) {
    return fullName;
  }

  return `${parts[0]} ${parts[1]}\n${parts[2]}`;
}

export function ClientsPage() {
  const clients = useSelector((state) => state.clients);

  return (
    <div className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
        <div className="flex min-h-[calc(100vh-2rem)] overflow-hidden rounded-[32px] border border-white/70 bg-white/75 shadow-panel backdrop-blur sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)]">
          <Aside />

          <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 lg:px-8">
            <header className="flex flex-col gap-4 border-b border-slate-200/80 px-6 py-6 xl:flex-row xl:items-center xl:justify-between lg:px-10">
              <div className="min-w-0 flex flex-col gap-4 xl:flex-row xl:items-center xl:flex-1">
                <h1 className="shrink-0 text-3xl font-extrabold tracking-tight text-slate-950">
                  Клиенты
                </h1>

                <label className="flex w-full max-w-[420px] min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm shadow-slate-200/40 xl:flex-1">
                  <SearchIcon />
                  <input
                    type="text"
                    placeholder={clients.searchPlaceholder}
                    className="w-full bg-transparent text-base font-medium text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </label>
              </div>

              <Button
                variant="contained"
                className="!min-w-[220px] shrink-0 !rounded-2xl !bg-brand-500 !px-5 !py-3 !text-sm !font-bold !normal-case !shadow-none hover:!bg-brand-600"
              >
                <span className="mr-2 inline-flex">
                  <PlusIcon />
                </span>
                Добавить клиента
              </Button>
            </header>

            <div className="space-y-6 px-6 py-7 lg:px-10 lg:py-8">
              <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4 xl:grid-cols-2">
                {clients.summary.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-sm shadow-slate-200/60"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${item.iconTone}`}
                      >
                        <ClientsSummaryIcon type={item.icon} />
                      </div>
                      <div>
                        <div className="text-4xl font-black tracking-tight text-slate-950">
                          {item.value}
                        </div>
                        <div className="mt-1 text-lg font-semibold text-slate-500">
                          {item.label}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </section>

              <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
                <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                    <div className="text-2xl font-extrabold tracking-tight">
                      Список клиентов
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {clients.tabs.map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          className={`rounded-2xl border px-4 py-2 text-base font-bold transition ${
                            tab.active
                              ? "border-brand-200 bg-brand-50 text-brand-600"
                              : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="text-lg font-bold text-slate-500">
                    {clients.totalClientsLabel}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-[1120px] border-collapse">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-sm uppercase tracking-[0.12em] text-slate-400">
                        <th className="px-6 py-5">ФИО клиента</th>
                        <th className="px-6 py-5">Телефон</th>
                        <th className="px-6 py-5">Паспорт</th>
                        <th className="px-6 py-5">Скидка</th>
                        <th className="px-6 py-5">Текущая путёвка</th>
                        <th className="px-6 py-5">Покупок</th>
                        <th className="px-6 py-5">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.clients.map((client) => (
                        <tr
                          key={client.id}
                          className={`border-t border-slate-100 align-top ${
                            client.highlighted ? "bg-emerald-50/40" : "bg-white"
                          }`}
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-4">
                              <div
                                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-black text-white ${client.avatarTone}`}
                              >
                                {client.initials}
                              </div>
                              <div>
                                <div className="whitespace-pre-line text-[1.65rem] font-extrabold leading-tight tracking-tight text-slate-900">
                                  {formatClientName(client.fullName)}
                                </div>
                                <div className="mt-2 text-base font-semibold text-slate-400">
                                  {client.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-xl font-bold leading-tight text-slate-800">
                            {client.phone}
                          </td>
                          <td className="px-6 py-5 text-xl font-bold tracking-[0.06em] text-slate-500">
                            {client.passportMasked}
                          </td>
                          <td className="px-6 py-5">
                            <span
                              className={`inline-flex rounded-full px-4 py-2 text-lg font-black ${discountToneMap[client.discountTone]}`}
                            >
                              {client.discount}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-xl font-bold text-brand-600">
                            {client.currentTrip}
                          </td>
                          <td className="px-6 py-5 text-xl font-black text-slate-800">
                            {client.purchases}
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm shadow-slate-200/40 transition hover:border-slate-300 hover:text-slate-700"
                              >
                                <UserActionIcon />
                              </button>
                              <button
                                type="button"
                                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm shadow-slate-200/40 transition hover:border-slate-300 hover:text-slate-700"
                              >
                                <CardActionIcon />
                              </button>
                              <button
                                type="button"
                                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-amber-500 shadow-sm shadow-slate-200/40 transition hover:border-amber-200 hover:text-amber-600"
                              >
                                <EditActionIcon />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-lg font-semibold text-slate-500">
                    {clients.resultLabel}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-bold text-slate-400 transition hover:border-slate-300 hover:text-slate-600"
                    >
                      ‹
                    </button>

                    {clients.pagination.pages.map((page) => (
                      <button
                        key={String(page)}
                        type="button"
                        className={`flex h-11 min-w-11 items-center justify-center rounded-xl border px-3 text-base font-bold transition ${
                          page === clients.pagination.currentPage
                            ? "border-brand-500 bg-brand-500 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      type="button"
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-bold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                    >
                      ›
                    </button>
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
