import { NavLink } from "react-router-dom";
import {
  AnalyticsIcon,
  ClientsIcon,
  DashboardIcon,
  ReportsIcon,
  SalesIcon,
  TravelIcon,
} from "../../shared/ui/Icons";

const navigationItems = [
  { label: "Дашборд", active: true, icon: DashboardIcon, path: "/" },
  { label: "Путёвки", active: false, icon: TravelIcon, path: "/travels" },
  { label: "Клиенты", active: false, icon: ClientsIcon, path: "/clients" },
  {
    label: "Продажи",
    active: false,
    badge: "10",
    icon: SalesIcon,
    path: "/sales",
  },
  { label: "Отчёты", active: false, icon: ReportsIcon, path: "/reports" },
];

function Aside() {
  return (
    <aside className="hidden w-[280px] shrink-0 border-r border-slate-200/80 bg-white/80 px-6 py-7 xl:flex xl:flex-col">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-6">
        <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-50 ring-1 ring-brand-100">
          <img
            src="/logo.png"
            alt="StackTravel Logo"
            className="h-50 w-50 object-contain"
          />
        </div>
        <div>
          <div className="text-xl font-extrabold tracking-tight">
            StackTravel
          </div>
          <div className="text-sm text-slate-500">Внутренняя турсистема</div>
        </div>
      </div>

      <nav className="mt-8 space-y-2">
        <div className="px-3 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
          Главное
        </div>
        {navigationItems.map((item) => (
          <NavLink
            to={item.path}
            key={item.label}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? "bg-brand-50 text-brand-600"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`
            }
          >
            <span className="flex items-center gap-3">
              <item.icon size={18} className="shrink-0" />
              <span>{item.label}</span>
            </span>
            {item.badge ? (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-600">
                {item.badge}
              </span>
            ) : null}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
            Т
          </div>
          <div>
            <div className="font-bold">Тест</div>
            <div className="text-sm text-slate-500">Менеджер</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
export default Aside;
