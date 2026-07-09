import { useState } from "react";
import { 
  useListComplianceGaps, 
  useListComplianceRules, 
  useRunComplianceScan, 
  useUpdateComplianceGap,
  getListComplianceGapsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert, CheckCircle2, Play, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState<'gaps' | 'rules'>('gaps');
  const { data: gaps, isLoading: loadingGaps } = useListComplianceGaps();
  const { data: rules, isLoading: loadingRules } = useListComplianceRules();
  const runScan = useRunComplianceScan();
  const updateGap = useUpdateComplianceGap();
  const queryClient = useQueryClient();

  const handleRunScan = () => {
    runScan.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListComplianceGapsQueryKey() });
        setActiveTab('gaps');
      }
    });
  };

  const handleResolve = (id: number) => {
    updateGap.mutate({ id, data: { status: 'resolved' } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListComplianceGapsQueryKey() });
      }
    });
  };

  const openGapsCount = gaps?.filter(g => g.status === 'open').length || 0;
  const criticalGapsCount = gaps?.filter(g => g.status === 'open' && g.severity === 'critical').length || 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto flex flex-col h-full">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" /> Compliance Agent
          </h1>
          <p className="text-muted-foreground text-sm">Automatically detects operational violations across procedures and records.</p>
        </div>
        <Button onClick={handleRunScan} disabled={runScan.isPending} className="gap-2 font-mono uppercase tracking-wider">
          {runScan.isPending ? (
            <span className="animate-pulse flex items-center gap-2"><Play className="h-4 w-4" /> Scanning...</span>
          ) : (
            <><Play className="h-4 w-4" /> Run Scan</>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <Card className="bg-destructive/10 border-destructive/20 text-destructive">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider mb-1">Critical Open</p>
              <h2 className="text-3xl font-black">{criticalGapsCount}</h2>
            </div>
            <AlertTriangle className="h-8 w-8 opacity-50" />
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider mb-1">Total Open</p>
              <h2 className="text-3xl font-black">{openGapsCount}</h2>
            </div>
            <ShieldAlert className="h-8 w-8 opacity-50" />
          </CardContent>
        </Card>
        <Card className="bg-muted">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider mb-1">Rules Active</p>
              <h2 className="text-3xl font-black">{rules?.length || 0}</h2>
            </div>
            <CheckCircle2 className="h-8 w-8 opacity-20" />
          </CardContent>
        </Card>
      </div>

      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="border-b flex gap-4 px-4 bg-muted/20 shrink-0">
          <button 
            className={`py-3 px-2 border-b-2 text-sm font-medium transition-colors ${activeTab === 'gaps' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('gaps')}
          >
            Detected Gaps
          </button>
          <button 
            className={`py-3 px-2 border-b-2 text-sm font-medium transition-colors ${activeTab === 'rules' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('rules')}
          >
            Active Rules
          </button>
        </div>

        <div className="flex-1 overflow-auto p-0">
          {activeTab === 'gaps' ? (
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead className="w-1/3">Rule / Description</TableHead>
                  <TableHead className="w-1/3">Recommendation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingGaps ? (
                  <TableRow><TableCell colSpan={5} className="h-24 text-center">Loading...</TableCell></TableRow>
                ) : gaps?.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No compliance gaps detected. System is green.</TableCell></TableRow>
                ) : (
                  gaps?.map(gap => (
                    <TableRow key={gap.id} className={gap.status === 'resolved' ? 'opacity-60' : ''}>
                      <TableCell>
                        <Badge variant={gap.severity === 'critical' ? 'destructive' : gap.severity === 'high' ? 'warning' : 'outline'} className="uppercase">
                          {gap.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold text-sm mb-1">{gap.ruleTitle}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{gap.description}</p>
                        {gap.documentId && (
                          <Link href={`/documents/${gap.documentId}`} className="text-[10px] font-mono text-primary mt-2 inline-block">
                            View Source Doc #{gap.documentId}
                          </Link>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="bg-muted/50 p-2 rounded text-xs border border-border/50">
                          {gap.recommendation}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={gap.status === 'open' ? 'default' : 'secondary'} className={gap.status === 'open' ? 'bg-amber-500 hover:bg-amber-600 text-white border-none' : ''}>
                          {gap.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {gap.status === 'open' && (
                          <Button size="sm" variant="outline" onClick={() => handleResolve(gap.id)} disabled={updateGap.isPending}>
                            Mark Resolved
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="w-1/2">Title / Description</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingRules ? (
                  <TableRow><TableCell colSpan={3} className="h-24 text-center">Loading...</TableCell></TableRow>
                ) : rules?.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="h-32 text-center text-muted-foreground">No rules defined. Ingest regulation documents to extract rules.</TableCell></TableRow>
                ) : (
                  rules?.map(rule => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px] uppercase">{rule.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold text-sm mb-1">{rule.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{rule.description}</p>
                      </TableCell>
                      <TableCell>
                        {rule.sourceDocumentId ? (
                          <Link href={`/documents/${rule.sourceDocumentId}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                            Doc #{rule.sourceDocumentId}
                          </Link>
                        ) : <span className="text-xs text-muted-foreground">System</span>}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
}
