
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Headset,
  UserRound,
  ShieldCheck,
  Mail,
  User,
  ArrowRight,
  LockKeyhole,
} from "lucide-react";

import { useAuth } from "../auth/AuthContext";
import "./Login.css";

const Login = () => {
  const [role, setRole] = useState("employee");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim()) {
      setError("Please enter your full name and email address.");
      return;
    }

    try {
      setLoading(true);

      const loggedInUser = await login(name.trim(), email.trim(), role);

      if (loggedInUser.role === "employee") {
        navigate("/", { replace: true });
      } else {
        navigate("/work-queue", { replace: true });
      }
    } catch (err) {
      setError(err.message || "Invalid name or email address.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-background-shape shape-one"></div>
      <div className="login-background-shape shape-two"></div>

      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-icon">
            <Headset size={30} />
          </div>

          <h1>Employee Helpdesk</h1>
          <p>Your workplace support, simplified.</p>
        </div>

        <div className="login-heading">
          <h2>Welcome back</h2>
          <p>Sign in to access your helpdesk workspace.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="login-label">Select your account type</label>

          <div className="login-role-options">
            <button
              type="button"
              className={`login-role-card ${
                role === "employee" ? "selected" : ""
              }`}
              onClick={() => {
                setRole("employee");
                setError("");
              }}
            >
              <UserRound size={23} />
              <span>Employee</span>
              <small>Raise and track tickets</small>
            </button>

            <button
              type="button"
              className={`login-role-card ${
                role === "support" ? "selected" : ""
              }`}
              onClick={() => {
                setRole("support");
                setError("");
              }}
            >
              <ShieldCheck size={23} />
              <span>Support</span>
              <small>Manage support requests</small>
            </button>
          </div>

          <div className="login-input-group">
            <label htmlFor="fullName" className="login-label">
              Full name
            </label>

            <div className="login-input-wrapper">
              <User size={19} />
              <input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          </div>

          <div className="login-input-group">
            <label htmlFor="email" className="login-label">
              Email address
            </label>

            <div className="login-input-wrapper">
              <Mail size={19} />
              <input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          {error && <div className="login-error">{error}</div>}

          <button
            type="submit"
            className="login-submit"
            disabled={loading}
          >
            <span>{loading ? "Signing in..." : "Sign in"}</span>
            {!loading && <ArrowRight size={19} />}
          </button>
        </form>

        <div className="login-security">
          <LockKeyhole size={15} />
          <span>Access restricted to authorized users</span>
        </div>

        <div className="login-footer">
          Employee Helpdesk Portal © 2026
        </div>
      </div>
    </div>
  );
};

export default Login;
