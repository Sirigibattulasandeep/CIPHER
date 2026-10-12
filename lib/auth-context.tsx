"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, Role, Organization } from "@/types";
import { SEED_ORGANIZATION, SEED_USERS } from "./seed-data";

interface AuthContextType {
  user: User;
  organization: Organization;
  setRole: (role: Role) => void;
  canEditBrand: () => boolean;
  canCreateInvestigation: () => boolean;
  canTriggerResponseAction: () => boolean;
  isReadOnly: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(SEED_USERS[0]);
  const [organization] = useState<Organization>(SEED_ORGANIZATION);

  useEffect(() => {
    const savedRole = localStorage.getItem("sentrix_demo_role") as Role;
    if (savedRole) {
      const match = SEED_USERS.find((u) => u.role === savedRole) || {
        ...SEED_USERS[0],
        role: savedRole,
      };
      setUser(match);
    }
  }, []);

  const setRole = (role: Role) => {
    localStorage.setItem("sentrix_demo_role", role);
    const match = SEED_USERS.find((u) => u.role === role) || {
      ...user,
      role,
    };
    setUser(match);
  };

  const isReadOnly = () => user.role === "viewer";
  const canEditBrand = () => user.role === "owner" || user.role === "admin";
  const canCreateInvestigation = () =>
    user.role === "owner" || user.role === "admin" || user.role === "analyst" || user.role === "investigator";
  const canTriggerResponseAction = () =>
    user.role === "owner" || user.role === "admin" || user.role === "analyst" || user.role === "investigator";

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        setRole,
        canEditBrand,
        canCreateInvestigation,
        canTriggerResponseAction,
        isReadOnly,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

