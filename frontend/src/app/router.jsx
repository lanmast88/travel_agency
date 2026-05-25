import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute, RootLayout } from "../features/components/RouteWrappers";
import { CatalogsPage } from "../pages/CatalogsPage";
import { ClientDetailPage } from "../pages/ClientDetailPage";
import { ClientsPage } from "../pages/ClientsPage";
import { DashboardPage } from "../pages/DashboardPage";
import { ProfilePage } from "../pages/ProfilePage";
import { RegisterPage } from "../pages/RegisterPage";
import { ReportsPage } from "../pages/ReportsPage";
import { SaleDetailPage } from "../pages/SaleDetailPage";
import { SalesPage } from "../pages/SalesPage";
import { TourDetailPage } from "../pages/TourDetailPage";
import TravelsPage from "../pages/TravelsPage";
import { UserDetailPage } from "../pages/UserDetailPage";
import { UsersPage } from "../pages/UsersPage";

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
            path: "/travels/:id",
            element: <TourDetailPage />,
          },
          {
            path: "/catalogs",
            element: <CatalogsPage />,
          },
          {
            path: "/clients",
            element: <ClientsPage />,
          },
          {
            path: "/clients/:id",
            element: <ClientDetailPage />,
          },
          {
            path: "/sales",
            element: <SalesPage />,
          },
          {
            path: "/sales/:id",
            element: <SaleDetailPage />,
          },
          {
            path: "/reports",
            element: <ReportsPage />,
          },
          {
            path: "/users",
            element: <UsersPage />,
          },
          {
            path: "/users/:id",
            element: <UserDetailPage />,
          },
        ],
      },
    ],
  },
]);
