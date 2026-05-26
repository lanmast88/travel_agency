import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, MenuItem } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { logout, logoutUser, openAuthDialog } from "../features/auth/authSlice";

function FlameIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M12 2C12 2 7 8 7 13a5 5 0 0 0 10 0c0-2-1-4-2-5 0 0 0 3-2 4-1-2-1-4-1-6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <rect
        x="3"
        y="3"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect
        x="14"
        y="3"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect
        x="3"
        y="14"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect
        x="14"
        y="14"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export default function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentUser, accessToken } = useSelector((s) => s.auth);
  const [anchor, setAnchor] = useState(null);

  function handleLogout() {
    setAnchor(null);
    dispatch(logoutUser()).finally(() => dispatch(logout()));
    navigate("/");
  }

  const initials = currentUser
    ? `${currentUser.first_name?.[0] ?? ""}${currentUser.last_name?.[0] ?? ""}`.toUpperCase()
    : "";

  const fullName = currentUser
    ? `${currentUser.first_name ?? ""} ${currentUser.last_name ?? ""}`.trim()
    : "";

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
      isActive
        ? "bg-brand-50 text-brand-600"
        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <header className="flex items-center justify-between border-b border-slate-200/80 px-6 py-4 lg:px-10">
      <div className="flex items-center gap-8">
        <Link to="/" className="flex items-center gap-3 no-underline">
          <div className="flex h-10 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-50 ring-1 ring-brand-100">
            <img
              src="/logo.png"
              alt="StackTravel"
              className="h-10 w-10 object-contain"
            />
          </div>
          <div>
            <div className="text-lg font-extrabold tracking-tight text-slate-950">
              StackTravel
            </div>
            <div className="text-xs text-slate-400 leading-none">
              Туры и путешествия
            </div>
          </div>
        </Link>

        <nav className="hidden sm:flex items-center gap-1">
          <NavLink to="/" end className={navLinkClass}>
            <GridIcon />
            Каталог
          </NavLink>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {accessToken && currentUser ? (
          <>
            <button
              onClick={(e) => setAnchor(e.currentTarget)}
              className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-inherit transition hover:border-brand-200 hover:bg-brand-50/60"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
                {initials}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-bold text-slate-800 leading-tight">
                  {fullName}
                </div>
                <div className="text-xs text-slate-400 leading-none">
                  Мой профиль
                </div>
              </div>
            </button>
            <Menu
              anchorEl={anchor}
              open={Boolean(anchor)}
              onClose={() => setAnchor(null)}
              PaperProps={{ className: "!rounded-2xl !shadow-lg" }}
            >
              <MenuItem
                component={Link}
                to="/profile"
                onClick={() => setAnchor(null)}
                className="!text-sm !font-semibold"
              >
                Мой профиль
              </MenuItem>
              <MenuItem
                onClick={handleLogout}
                className="!text-sm !font-semibold !text-red-500"
              >
                Выйти
              </MenuItem>
            </Menu>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => dispatch(openAuthDialog({ mode: "register" }))}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Регистрация
            </button>
            <button
              onClick={() => dispatch(openAuthDialog({ mode: "login" }))}
              className="rounded-2xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-600"
            >
              Войти
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
