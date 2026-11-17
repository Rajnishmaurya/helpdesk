
import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = sessionStorage.getItem("helpdesk_user");

    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      sessionStorage.removeItem("helpdesk_user");
      return null;
    }
  });

  const login = async (name, email, selectedRole) => {
    const response = await fetch("/data/users.json");

    if (!response.ok) {
      throw new Error("Unable to load authorized users.");
    }

    const usersData = await response.json();

    const userList =
      selectedRole === "employee"
        ? usersData.employees
        : usersData.support;

    const matchedUser = userList.find(
      (item) =>
        item.name.trim().toLowerCase() === name.trim().toLowerCase() &&
        item.email.trim().toLowerCase() === email.trim().toLowerCase()
    );

    if (!matchedUser) {
      throw new Error("Invalid name or email for the selected account type.");
    }

    const loggedInUser = {
      ...matchedUser,
      role: selectedRole,
    };

    sessionStorage.setItem(
      "helpdesk_user",
      JSON.stringify(loggedInUser)
    );

    setUser(loggedInUser);

    return loggedInUser;
  };

  // Logout and clear the current session
  const logout = () => {
    sessionStorage.removeItem("helpdesk_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};
