import { useSelector } from "react-redux";
import {
  Navigate,
  Outlet,
  createBrowserRouter,
} from "react-router-dom";
import { AuthDialog } from "../features/auth/AuthDialog";
import { DashboardPage } from "../pages/DashboardPage";
import { ProfilePage } from "../pages/ProfilePage";
import { RegisterPage } from "../pages/RegisterPage";
import TravelsPage from "../pages/TravelsPage";
import { ClientsPage } from "../pages/ClientsPage";
import { ReportsPage } from "../pages/ReportsPage";
import { SalesPage } from "../pages/SalesPage";

function RootLayout() {
  return (
    <>
      <Outlet />
      <AuthDialog />
    </>
  );
}

function ProtectedRoute() {
  const { accessToken, authDialogOpen } = useSelector((state) => state.auth);

  if (!accessToken && !authDialogOpen) {
    return <Navigate to="/register?mode=login" replace />;
  }

  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: "/register",
        element: <RegisterPage />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "/",
            element: <DashboardPage />,
          },
          {
            path: "/profile",
            element: <ProfilePage />,
          },
          {
            path: "/travels",
            element: <TravelsPage />,
          },
          {
            path: "/clients",
            element: <ClientsPage />,
          },
          {
            path: "/sales",
            element: <SalesPage />,
          },
          {
            path: "/reports",
            element: <ReportsPage />,
          },
        ],
      },
    ],
  },
]);
