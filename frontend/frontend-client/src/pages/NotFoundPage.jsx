import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-100 text-5xl">
        🗺️
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">Страница не найдена</h1>
      <p className="text-sm font-semibold text-slate-400 mb-8">Возможно, адрес устарел или такой страницы не существует.</p>
      <Link to="/"
        className="rounded-2xl bg-brand-500 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-600 no-underline">
        Вернуться в каталог
      </Link>
    </div>
  );
}
