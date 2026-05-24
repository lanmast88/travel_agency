import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, CircularProgress } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { changePassword, clearPasswordState, updateCurrentUser } from "../features/auth/authSlice";

function Section({ title, children }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white px-6 py-6 shadow-sm shadow-slate-200/60 space-y-5">
      <h2 className="text-lg font-extrabold tracking-tight text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 disabled:opacity-50 disabled:cursor-not-allowed";

export default function ProfilePage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentUser, accessToken, profileUpdateStatus, profileUpdateError, passwordStatus, passwordError } =
    useSelector((s) => s.auth);

  const [profile, setProfile] = useState({ first_name: "", last_name: "" });
  const [pwd, setPwd] = useState({ current_password: "", new_password: "", confirm: "" });
  const [pwdMismatch, setPwdMismatch] = useState(false);

  useEffect(() => {
    if (!accessToken) { navigate("/"); return; }
    if (currentUser) setProfile({ first_name: currentUser.first_name ?? "", last_name: currentUser.last_name ?? "" });
  }, [accessToken, currentUser, navigate]);

  useEffect(() => {
    if (passwordStatus === "succeeded") {
      setPwd({ current_password: "", new_password: "", confirm: "" });
      setTimeout(() => dispatch(clearPasswordState()), 3000);
    }
  }, [passwordStatus, dispatch]);

  function handleProfileSave(e) {
    e.preventDefault();
    dispatch(updateCurrentUser({ first_name: profile.first_name, last_name: profile.last_name }));
  }

  function handlePasswordChange(e) {
    e.preventDefault();
    if (pwd.new_password !== pwd.confirm) { setPwdMismatch(true); return; }
    setPwdMismatch(false);
    dispatch(changePassword({ current_password: pwd.current_password, new_password: pwd.new_password, new_password_confirm: pwd.confirm }));
  }

  if (!accessToken) return null;

  const initials = currentUser
    ? `${currentUser.first_name?.[0] ?? ""}${currentUser.last_name?.[0] ?? ""}`.toUpperCase()
    : "?";

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Мой профиль</h1>

      {/* Карточка пользователя */}
      <div className="flex items-center gap-5 rounded-[24px] border border-slate-200 bg-white px-6 py-5 shadow-sm shadow-slate-200/60">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xl font-extrabold text-white">
          {initials}
        </div>
        <div>
          <p className="text-xl font-extrabold text-slate-900">
            {currentUser?.first_name} {currentUser?.last_name}
          </p>
          <p className="text-sm font-semibold text-slate-400">{currentUser?.email}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Личные данные */}
        <Section title="Личные данные">
          {profileUpdateStatus === "succeeded" && (
            <Alert severity="success" className="!rounded-2xl">Данные сохранены</Alert>
          )}
          {profileUpdateError && <Alert severity="error" className="!rounded-2xl">{profileUpdateError}</Alert>}
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Имя">
                <input value={profile.first_name} onChange={(e) => setProfile((p) => ({ ...p, first_name: e.target.value }))}
                  className={inputCls} />
              </Field>
              <Field label="Фамилия">
                <input value={profile.last_name} onChange={(e) => setProfile((p) => ({ ...p, last_name: e.target.value }))}
                  className={inputCls} />
              </Field>
            </div>
            <Field label="Email">
              <input value={currentUser?.email ?? ""} disabled className={inputCls} />
            </Field>
            <button type="submit" disabled={profileUpdateStatus === "loading"}
              className="rounded-2xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-60 flex items-center gap-2">
              {profileUpdateStatus === "loading" && <CircularProgress size={14} color="inherit" />}
              Сохранить изменения
            </button>
          </form>
        </Section>

        {/* Смена пароля */}
        <Section title="Смена пароля">
          {passwordStatus === "succeeded" && (
            <Alert severity="success" className="!rounded-2xl">Пароль успешно изменён</Alert>
          )}
          {passwordError && <Alert severity="error" className="!rounded-2xl">{passwordError}</Alert>}
          {pwdMismatch && <Alert severity="error" className="!rounded-2xl">Пароли не совпадают</Alert>}
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <Field label="Текущий пароль">
              <input type="password" value={pwd.current_password} onChange={(e) => setPwd((p) => ({ ...p, current_password: e.target.value }))}
                required className={inputCls} />
            </Field>
            <Field label="Новый пароль">
              <input type="password" value={pwd.new_password} onChange={(e) => setPwd((p) => ({ ...p, new_password: e.target.value }))}
                required className={inputCls} />
            </Field>
            <Field label="Повторите новый пароль">
              <input type="password" value={pwd.confirm} onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
                required className={inputCls} />
            </Field>
            <button type="submit" disabled={passwordStatus === "loading"}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 flex items-center gap-2">
              {passwordStatus === "loading" && <CircularProgress size={14} color="inherit" />}
              Изменить пароль
            </button>
          </form>
        </Section>
      </div>
    </div>
  );
}
