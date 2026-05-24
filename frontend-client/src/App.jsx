import { useEffect } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { useDispatch, useSelector } from "react-redux";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";
import { muiTheme } from "./app/theme";
import { expireSession, fetchCurrentUser } from "./features/auth/authSlice";

function AppBootstrap() {
  const dispatch = useDispatch();
  const { accessToken, currentUser, profileStatus } = useSelector((s) => s.auth);

  useEffect(() => {
    function onSessionExpired(e) { dispatch(expireSession(e.detail?.message)); }
    window.addEventListener("auth:session-expired", onSessionExpired);
    return () => window.removeEventListener("auth:session-expired", onSessionExpired);
  }, [dispatch]);

  useEffect(() => {
    if (!accessToken || currentUser || profileStatus === "loading") return;
    dispatch(fetchCurrentUser()).unwrap().catch(() => {});
  }, [accessToken, currentUser, profileStatus, dispatch]);

  return null;
}

export default function App() {
  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <AppBootstrap />
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
