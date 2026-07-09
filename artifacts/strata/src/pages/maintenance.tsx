import { useState } from "react";
import { 
  useListWorkOrders, 
  useListRcaInsights, 
  useGenerateRcaInsights,
  getListRcaInsightsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wrench, Zap, FileText } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Link } from "wouter";

export default function MaintenancePage() {
  const { data: workOrders, isLoading: loadingOrders } = useListWorkOrders();
  const { data: insights, isLoading: loadingInsights } = useListRcaInsights();
  const generateRca = useGenerateRcaInsights();
  const queryClient = useQueryClient();

  const handleRunRca = () => {
    generateRca.mutate({ data: {} }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRcaInsightsQueryKey() });
      }
    });
  };

  const priorityColor = (p: string) => {
    switch(p) {
      case 'critical': return 'destructive';
      case 'high': return 'warning';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto flex flex-col h-full">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" /> Maintenance & RCA
          </h1>
          <p className="text-muted-foreground text-sm">Review work orders and generate AI-driven Root Cause Analysis based on historical data.</p>
        </div>
        <Button onClick={handleRunRca} disabled={generateRca.isPending} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-mono uppercase tracking-wider">
          {generateRca.isPending ? (
            <span className="animate-pulse flex items-center gap-2"><Zap className="h-4 w-4" /> Analyzing...</span>
          ) : (
            <><Zap className="h-4 w-4" /> Run AI RCA</>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        <Card className="flex flex-col min-h-0">
          <CardHeader className="border-b bg-muted/20 pb-4 shrink-0">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Active Work Orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto flex-1">
            <div className="divide-y">
              {loadingOrders ? (
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
              ) : workOrders?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No active work orders.</div>
              ) : (
                workOrders?.map(wo => (
                  <div key={wo.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm font-mono text-primary">{wo.equipmentName}</span>
                        <Badge variant={priorityColor(wo.priority)} className="text-[10px] uppercase h-5">{wo.priority}</Badge>
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase">{wo.status.replace('_', ' ')}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{wo.description}</p>
                    <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground">
                      <span>Reported: {formatDate(wo.reportedDate)}</span>
                      {wo.documentId && (
                        <Link href={`/documents/${wo.documentId}`} className="text-primary hover:underline flex items-center gap-1">
                          <FileText className="h-3 w-3" /> Record
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col min-h-0 border-indigo-500/30">
          <CardHeader className="border-b bg-indigo-500/5 pb-4 shrink-0">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">
              <Zap className="h-4 w-4" /> Generated Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto flex-1">
            <div className="divide-y divide-indigo-500/10">
              {loadingInsights ? (
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
              ) : insights?.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                  <Zap className="h-8 w-8 opacity-20 mb-4" />
                  <p>No RCA insights generated yet.<br/>Click "Run AI RCA" to analyze open work orders against historical data.</p>
                </div>
              ) : (
                insights?.map(rca => (
                  <div key={rca.id} className="p-5 hover:bg-indigo-500/5 transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-mono text-[10px]">
                        {rca.equipmentName}
                      </Badge>
                      <h3 className="font-bold text-sm leading-tight">{rca.title}</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-destructive/5 border border-destructive/10 p-3 rounded text-sm">
                        <span className="font-bold text-destructive text-xs uppercase tracking-wider block mb-1">Root Cause</span>
                        <p>{rca.rootCause}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="font-bold text-muted-foreground text-xs uppercase tracking-wider block mb-2">Contributing Factors</span>
                          <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
                            {rca.contributingFactors.map((f, i) => <li key={i}>{f}</li>)}
                          </ul>
                        </div>
                        <div>
                          <span className="font-bold text-primary text-xs uppercase tracking-wider block mb-2">Recommendations</span>
                          <ul className="list-disc pl-4 space-y-1 text-xs text-foreground">
                            {rca.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-border/50 text-[10px] font-mono text-muted-foreground flex justify-between">
                      <span>Generated: {formatDate(rca.createdAt)}</span>
                      {rca.workOrderId && <span>Source: WO #{rca.workOrderId}</span>}
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
