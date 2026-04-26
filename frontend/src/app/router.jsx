import { createBrowserRouter } from "react-router-dom";
import { DashboardPage } from "../pages/DashboardPage";
import TravelsPage from "../pages/TravelsPage";
import { ClientsPage } from "../pages/ClientsPage";
import { ReportsPage } from "../pages/ReportsPage";
import { SalesPage } from "../pages/SalesPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <DashboardPage />,
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
]);
