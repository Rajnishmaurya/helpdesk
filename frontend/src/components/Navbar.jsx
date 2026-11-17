
import React from "react";
import { Headset, UserCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import "./Navbar.css";

const Navbar = () => {
  const { user } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-left">
        <div className="navbar-logo">
          <Headset size={25} strokeWidth={2.2} />
        </div>

        <div className="navbar-brand">
          <h2>Employee Helpdesk</h2>
          <span>Support Management Portal</span>
        </div>
      </div>

      <div className="navbar-right">
        <div className="navbar-status">
          <span className="status-dot"></span>
          <span>System Online</span>
        </div>

        {user && (
          <div className="navbar-user">
            <div className="navbar-user-avatar">
              {user.name?.charAt(0).toUpperCase()}
            </div>

            <div className="navbar-user-info">
              <span className="navbar-user-name">
                {user.name}
              </span>

              <span className="navbar-user-role">
                {user.role === "employee" ? (
                  <>
                    <UserCircle size={13} />
                    Employee
                  </>
                ) : (
                  <>
                    <ShieldCheck size={13} />
                    Support Analyst
                  </>
                )}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
