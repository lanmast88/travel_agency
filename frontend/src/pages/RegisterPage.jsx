import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthPanel } from "../features/auth/AuthPanel";

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const accessToken = useSelector((state) => state.auth.accessToken);
  const initialMode = searchParams.get("mode") === "login" ? "login" : "register";

  useEffect(() => {
    if (accessToken) {
      navigate("/", { replace: true });
    }
  }, [accessToken, navigate]);

  return (
    <div className="min-h-screen bg-transparent px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1240px] overflow-hidden rounded-[36px] border border-white/70 bg-white/80 shadow-panel backdrop-blur">
        <div className="hidden flex-1 flex-col justify-between bg-[linear-gradient(180deg,rgba(31,111,214,0.95),rgba(18,86,179,0.92))] px-10 py-10 text-white lg:flex">
          <div>
            <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-white/80">
              StackTravel
            </div>
            <h1 className="mt-8 max-w-[420px] text-5xl font-black leading-tight tracking-tight">
              Вход и регистрация в турсистеме нового поколения
            </h1>
            <p className="mt-5 max-w-[420px] text-lg font-medium text-white/75">
              Работайте с продажами, клиентами, путёвками и внутренней
              аналитикой в одном интерфейсе без лишних переключений.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[28px] border border-white/15 bg-white/10 p-5">
              <div className="text-sm font-bold uppercase tracking-[0.18em] text-white/60">
                Уже внутри
              </div>
              <div className="mt-3 text-3xl font-black">5 разделов</div>
              <div className="mt-2 text-sm font-semibold text-white/70">
                Дашборд, путёвки, клиенты, продажи и отчёты
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-full items-center justify-center px-5 py-8 sm:px-8 lg:max-w-[560px] lg:px-10">
          <AuthPanel
            initialMode={initialMode}
            showHomeLink
            onSuccess={() => {
              navigate("/", { replace: true });
            }}
          />
        </div>
      </div>
    </div>
  );
}
