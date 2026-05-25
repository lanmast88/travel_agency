import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import { AuthDialog } from "../auth/AuthDialog";

export function RootLayout() {
  return (
    <>
      <Outlet />
      <AuthDialog />
    </>
  );
}

export function ProtectedRoute() {
  const { accessToken, authDialogOpen } = useSelector((state) => state.auth);

  if (!accessToken && !authDialogOpen) {
    return <Navigate to="/register?mode=login" replace />;
  }

  return <Outlet />;
}
