import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Project } from "@/lib/api";

interface ProjectCtx {
  current: Project | null;
  setCurrent: (p: Project | null) => void;
}

const Ctx = createContext<ProjectCtx>({ current: null, setCurrent: () => {} });

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [current, setCurrentState] = useState<Project | null>(() => {
    try {
      const saved = localStorage.getItem("ai-tester:project");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const setCurrent = useCallback((p: Project | null) => {
    setCurrentState(p);
    if (p) localStorage.setItem("ai-tester:project", JSON.stringify(p));
    else localStorage.removeItem("ai-tester:project");
  }, []);

  return <Ctx.Provider value={{ current, setCurrent }}>{children}</Ctx.Provider>;
}

export function useProject() {
  return useContext(Ctx);
}
