import { Link, useLocation } from "wouter";
import { Activity, FileText, Share2, ShieldAlert, Wrench, MessageSquare, Zap, ScanEye, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: Activity },
  { href: "/documents", label: "Library", icon: FileText },
  { href: "/copilot", label: "Copilot", icon: MessageSquare },
  { href: "/knowledge-graph", label: "Graph Explorer", icon: Share2 },
  { href: "/drawings", label: "Drawings", icon: ScanEye },
  { href: "/compliance", label: "Compliance", icon: ShieldAlert },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/qms", label: "QMS Sync", icon: Workflow },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col h-[100dvh] fixed left-0 top-0">
      <div className="p-4 flex items-center gap-2 border-b border-sidebar-border/50">
        <Zap className="h-6 w-6 text-primary" />
        <span className="font-bold tracking-wider uppercase text-sm">Strata</span>
      </div>
      
      <nav className="flex-1 py-4 flex flex-col gap-1 px-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-border hover:text-sidebar-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border/50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
            OP
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold">Operator 04</span>
            <span className="text-[10px] text-primary flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block"></span> Active Shift
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
