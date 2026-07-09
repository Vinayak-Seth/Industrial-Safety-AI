import { useGetDashboardSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Share2, ShieldAlert, Wrench, MessageSquare, AlertTriangle, Activity } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";

export default function DashboardPage() {
  const { data: summary, isLoading } = useGetDashboardSummary();

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 w-64 bg-muted rounded"></div>
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded"></div>)}
      </div>
    </div>;
  }

  if (!summary) return null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Plant Overview</h1>
        <p className="text-muted-foreground text-sm">Real-time status of operations and knowledge base.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Knowledge Base</p>
                <h3 className="text-2xl font-bold mt-1">{summary.documentCount} <span className="text-sm font-normal text-muted-foreground">docs</span></h3>
              </div>
              <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <FileText className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground flex items-center gap-2">
              <Share2 className="h-3 w-3" />
              {summary.entityCount} Entities / {summary.relationCount} Edges
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Compliance Gaps</p>
                <h3 className="text-2xl font-bold mt-1">{summary.openComplianceGaps} <span className="text-sm font-normal text-muted-foreground">open</span></h3>
              </div>
              <div className="h-10 w-10 bg-destructive/10 rounded-full flex items-center justify-center text-destructive">
                <ShieldAlert className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 text-xs text-destructive font-medium flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {summary.criticalComplianceGaps} Critical action required
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Work Orders</p>
                <h3 className="text-2xl font-bold mt-1">{summary.openWorkOrders} <span className="text-sm font-normal text-muted-foreground">active</span></h3>
              </div>
              <div className="h-10 w-10 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500">
                <Wrench className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground flex items-center gap-2">
              <Activity className="h-3 w-3" />
              {summary.rcaInsightCount} RCA insights generated
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Copilot Queries</p>
                <h3 className="text-2xl font-bold mt-1">{summary.copilotQueryCount}</h3>
              </div>
              <div className="h-10 w-10 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500">
                <MessageSquare className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground flex items-center gap-2">
              <Activity className="h-3 w-3" />
              Active learning in progress
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Compliance Gaps</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {summary.recentGaps.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No recent gaps found.</div>
              ) : (
                summary.recentGaps.map(gap => (
                  <div key={gap.id} className="p-4 flex items-start gap-4 hover:bg-muted/50 transition-colors">
                    <div className="mt-1">
                      <Badge variant={gap.severity === 'critical' ? 'destructive' : gap.severity === 'high' ? 'warning' : 'outline'}>
                        {gap.severity}
                      </Badge>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm leading-tight mb-1">{gap.ruleTitle}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{gap.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-2 font-mono">{formatTimeAgo(gap.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Copilot Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {summary.recentQueries.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No recent queries.</div>
              ) : (
                summary.recentQueries.map(q => (
                  <div key={q.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <p className="font-medium text-sm mb-2 flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                      "{q.question}"
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 border-l-2 border-primary/30 pl-2 ml-1">
                      {q.answer}
                    </p>
                    <div className="mt-2 text-[10px] font-mono text-muted-foreground flex items-center gap-2">
                      <span>{formatTimeAgo(q.createdAt)}</span>
                      <span>•</span>
                      <span>{q.citations.length} sources</span>
                      <span>•</span>
                      <span>{q.responseTimeMs}ms</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
