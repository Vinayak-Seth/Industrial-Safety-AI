import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { useHealthCheck } from "@workspace/api-client-react";
import { Activity } from "lucide-react";

export function AppLayout({ children }: { children: ReactNode }) {
  const { data: health } = useHealthCheck();

  return (
    <div className="min-h-[100dvh] bg-background flex text-foreground">
      <Sidebar />
      <main className="flex-1 ml-64 flex flex-col relative h-[100dvh] overflow-hidden">
        <header className="h-12 border-b bg-background/95 backdrop-blur flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center text-xs font-mono text-muted-foreground">
            {new Date().toISOString().split('T')[0]} // SYS_TIME
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span>SYS_STATUS:</span>
            {health?.status === "ok" ? (
              <span className="text-emerald-500 flex items-center gap-1">
                <Activity className="h-3 w-3" /> NORMAL
              </span>
            ) : (
              <span className="text-destructive flex items-center gap-1">
                <Activity className="h-3 w-3" /> DEGRADED
              </span>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-y-auto control-grid p-6 relative">
          {children}
        </div>
      </main>
    </div>
  );
}
