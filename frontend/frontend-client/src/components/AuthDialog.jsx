import { useState } from "react";
import { Alert, CircularProgress, Dialog, DialogContent, DialogTitle } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { closeAuthDialog, loginUser, openAuthDialog, registerUser } from "../features/auth/authSlice";

export default function AuthDialog() {
  const dispatch = useDispatch();
  const { dialogOpen, dialogMode, dialogMessage, loginStatus, loginError, registerStatus, registerError } =
    useSelector((s) => s.auth);

  const [form, setForm] = useState({ email: "", password: "", password_confirm: "", first_name: "", last_name: "" });
  const [confirmMismatch, setConfirmMismatch] = useState(false);

  const isLogin = dialogMode === "login";
  const loading = loginStatus === "loading" || registerStatus === "loading";
  const error = isLogin ? loginError : registerError;

  function handleChange(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (isLogin) {
      dispatch(loginUser({ email: form.email, password: form.password }));
    } else {
      if (form.password !== form.password_confirm) { setConfirmMismatch(true); return; }
      setConfirmMismatch(false);
      dispatch(registerUser({ email: form.email, password: form.password, password_confirm: form.password_confirm, first_name: form.first_name, last_name: form.last_name }));
    }
  }

  function switchMode() {
    dispatch(openAuthDialog({ mode: isLogin ? "register" : "login" }));
    setForm({ email: "", password: "", password_confirm: "", first_name: "", last_name: "" });
    setConfirmMismatch(false);
  }

  return (
    <Dialog
      open={dialogOpen}
      onClose={() => dispatch(closeAuthDialog())}
      fullWidth
      maxWidth="xs"
      PaperProps={{ className: "!rounded-[28px] !bg-white/95 !shadow-2xl backdrop-blur supports-[backdrop-filter]:!bg-white/90" }}
    >
      <DialogTitle className="!px-7 !pt-7 !text-2xl !font-extrabold !tracking-tight !text-slate-950">
        {isLogin ? "Вход в аккаунт" : "Регистрация"}
      </DialogTitle>
      <DialogContent className="!px-7 !pb-7">
        {dialogMessage && <Alert severity="info" className="!mb-4 !rounded-2xl">{dialogMessage}</Alert>}
        {error && <Alert severity="error" className="!mb-4 !rounded-2xl">{error}</Alert>}
        {confirmMismatch && <Alert severity="error" className="!mb-4 !rounded-2xl">Пароли не совпадают</Alert>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-1">
          {!isLogin && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Имя</label>
                <input name="first_name" value={form.first_name} onChange={handleChange} required
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Фамилия</label>
                <input name="last_name" value={form.last_name} onChange={handleChange} required
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100" />
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} required
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Пароль</label>
            <input name="password" type="password" value={form.password} onChange={handleChange} required
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100" />
          </div>
          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Подтвердите пароль</label>
              <input name="password_confirm" type="password" value={form.password_confirm} onChange={handleChange} required
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100" />
            </div>
          )}
          <button type="submit" disabled={loading}
            className="mt-1 h-11 w-full rounded-2xl bg-brand-500 text-sm font-bold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <CircularProgress size={18} color="inherit" /> : isLogin ? "Войти" : "Создать аккаунт"}
          </button>
        </form>

        <div className="mt-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-semibold text-slate-400">или</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <p className="mt-4 text-center text-sm text-slate-500">
          {isLogin ? "Нет аккаунта?" : "Уже есть аккаунт?"}{" "}
          <button onClick={switchMode} className="font-bold text-brand-500 hover:underline">
            {isLogin ? "Зарегистрироваться" : "Войти"}
          </button>
        </p>
      </DialogContent>
    </Dialog>
  );
}
