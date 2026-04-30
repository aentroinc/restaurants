"use client";

import { createContext, useContext, useState } from "react";
import type { Role } from "./mock-data";

const RoleContext = createContext<{
  role: Role;
  setRole: (r: Role) => void;
}>({ role: "manager", setRole: () => {} });

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>("manager");
  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
