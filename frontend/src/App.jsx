
import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NewTicket from "./pages/NewTicket";
import MyTickets from "./pages/MyTickets";
import WorkQueue from "./pages/WorkQueue";
import SupportDashboard from "./pages/SupportDashboard";
import TicketDetails from "./pages/TicketDetails";

import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";

const HomeRedirect = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Navigate
      to={user.role === "employee" ? "/" : "/work-queue"}
      replace
    />
  );
};

const AppLayout = ({ children }) => (
  <div className="app-layout">
    <Navbar />
    <div className="app-content">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  </div>
);

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <HomeRedirect /> : <Login />} />

      <Route element={<ProtectedRoute allowedRole="employee" />}>
        <Route
          path="/"
          element={
            <AppLayout>
              <Dashboard />
            </AppLayout>
          }
        />

        <Route
          path="/new-ticket"
          element={
            <AppLayout>
              <NewTicket />
            </AppLayout>
          }
        />

        <Route
          path="/my-tickets"
          element={
            <AppLayout>
              <MyTickets />
            </AppLayout>
          }
        />
      </Route>

      <Route element={<ProtectedRoute allowedRole="support" />}>
        <Route
          path="/work-queue"
          element={
            <AppLayout>
              <WorkQueue />
            </AppLayout>
          }
        />

        <Route
          path="/support-dashboard"
          element={
            <AppLayout>
              <SupportDashboard />
            </AppLayout>
          }
        />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route
          path="/tickets/:id"
          element={
            <AppLayout>
              <TicketDetails />
            </AppLayout>
          }
        />
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
