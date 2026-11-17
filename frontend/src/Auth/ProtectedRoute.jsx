
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

const ProtectedRoute = ({ allowedRole }) => {
  const { user } = useAuth();

  // Redirect to login if the user is not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Prevent access to another role's pages
  if (allowedRole && user.role !== allowedRole) {
    return (
      <Navigate
        to={user.role === "employee" ? "/" : "/work-queue"}
        replace
      />
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
