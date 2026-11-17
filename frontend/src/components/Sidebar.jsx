
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";

import {
  LayoutDashboard,
  PlusCircle,
  Ticket,
  ClipboardList,
  LogOut,
  Headset,
  ChevronRight,
} from "lucide-react";

import { useAuth } from "../auth/AuthContext";
import "./Sidebar.css";

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isEmployee = user?.role === "employee";
  const isSupport = user?.role === "support";

  const employeeLinks = [
    {
      name: "Dashboard",
      path: "/",
      icon: LayoutDashboard,
      description: "Overview",
    },
    {
      name: "Create Ticket",
      path: "/new-ticket",
      icon: PlusCircle,
      description: "Submit a request",
    },
    {
      name: "My Tickets",
      path: "/my-tickets",
      icon: Ticket,
      description: "Track your requests",
    },
  ];

  const supportLinks = [
    {
      name: "Work Queue",
      path: "/work-queue",
      icon: ClipboardList,
      description: "Manage requests",
    },
    {
      name: "Support Dashboard",
      path: "/support-dashboard",
      icon: LayoutDashboard,
      description: "Support overview",
    },
  ];

  const links = isEmployee
    ? employeeLinks
    : isSupport
      ? supportLinks
      : [];

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="sidebar">

      <div className="sidebar-workspace">
        <div className="sidebar-section-heading">
          WORKSPACE
        </div>

        <nav className="sidebar-nav">
          {links.map((link) => {
            const Icon = link.icon;

            return (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.path === "/"}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? "active" : ""}`
                }
              >
                <div className="sidebar-link-icon">
                  <Icon size={19} />
                </div>

                <div className="sidebar-link-content">
                  <span className="sidebar-link-name">
                    {link.name}
                  </span>

                  <span className="sidebar-link-description">
                    {link.description}
                  </span>
                </div>

                <ChevronRight
                  className="sidebar-link-arrow"
                  size={16}
                />
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-bottom">

        <div className="sidebar-help-card">
          <div className="sidebar-help-icon">
            <Headset size={19} />
          </div>

          <div>
            <strong>Need assistance?</strong>
            <span>Contact your support team.</span>
          </div>
        </div>

        <div className="sidebar-profile">
          <div className="sidebar-avatar">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>

          <div className="sidebar-profile-info">
            <span className="sidebar-profile-name">
              {user?.name || "User"}
            </span>

            <span className="sidebar-profile-role">
              {isEmployee ? "Employee" : "Support Analyst"}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="sidebar-logout"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          <span>Sign out</span>
        </button>

        <div className="sidebar-footer">
          Employee Helpdesk · 2026
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
