import { useState } from "react";
import {
  useGetQmsExport,
  useSyncToQms,
  useListQmsSyncLog,
  getListQmsSyncLogQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Workflow, Send, RefreshCw } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function QmsPage() {
  const { data: exportPayload, isLoading: loadingExport, isError: exportError } = useGetQmsExport();
  const { data: syncLog, isLoading: loadingLog } = useListQmsSyncLog();
  const syncToQms = useSyncToQms();
  const queryClient = useQueryClient();
  const [targetUrl, setTargetUrl] = useState("");

  const handleSync = () => {
    syncToQms.mutate(
      { data: targetUrl.trim() ? { targetUrl: targetUrl.trim() } : {} },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListQmsSyncLogQueryKey() });
        },
      },
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto flex flex-col h-full">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Workflow className="h-6 w-6 text-primary" /> QMS Integration
        </h1>
        <p className="text-muted-foreground text-sm">
          Export open compliance gaps and work orders as nonconformance/CAPA records for an external
          Quality Management System, and push them to a QMS webhook.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Push to QMS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Optionally provide your QMS system's webhook/ingest URL. If left blank, the sync is
              simulated and validated locally (useful for demos without a live QMS endpoint).
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="https://your-qms.example.com/api/ingest (optional)"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
              />
              <Button onClick={handleSync} disabled={syncToQms.isPending} className="gap-2 shrink-0">
                {syncToQms.isPending ? (
                  <span className="animate-pulse flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Syncing...</span>
                ) : (
                  <><Send className="h-4 w-4" /> Sync Now</>
                )}
              </Button>
            </div>
            {syncToQms.isSuccess && (
              <div className="text-sm rounded border border-border/50 bg-muted/30 p-3">
                <Badge variant={syncToQms.data.status === "success" ? "success" : "destructive"} className="mb-2">
                  {syncToQms.data.status}
                </Badge>
                <p className="font-mono text-xs text-muted-foreground">{syncToQms.data.responseSnippet}</p>
              </div>
            )}
            {syncToQms.isError && (
              <p className="text-sm text-destructive">Sync request failed. Check the target URL and try again.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-muted">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider mb-1">Records Ready</p>
              <h2 className="text-3xl font-black">
                {loadingExport ? "…" : exportError ? "—" : exportPayload?.records.length ?? 0}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">Open gaps + open work orders</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <CardHeader className="shrink-0 pb-3">
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
            Export Preview ({exportPayload?.schemaVersion ?? "strata-qms-export-v1"})
          </CardTitle>
        </CardHeader>
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>External ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead className="w-1/3">Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingExport ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center">Loading export...</TableCell></TableRow>
              ) : !exportPayload || exportPayload.records.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Nothing to export — no open gaps or work orders.</TableCell></TableRow>
              ) : (
                exportPayload.records.map((r) => (
                  <TableRow key={r.externalId}>
                    <TableCell className="font-mono text-xs">{r.externalId}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] uppercase">{r.findingType.replace("_", " ")}</Badge></TableCell>
                    <TableCell className="text-sm">{r.title}</TableCell>
                    <TableCell><Badge variant="outline" className="uppercase text-[10px]">{r.severity}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.description}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="shrink-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Sync History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Records</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingLog ? (
                <TableRow><TableCell colSpan={4} className="h-16 text-center">Loading...</TableCell></TableRow>
              ) : !syncLog || syncLog.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-16 text-center text-muted-foreground">No sync attempts yet.</TableCell></TableRow>
              ) : (
                syncLog.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs font-mono text-muted-foreground">{formatDate(log.createdAt)}</TableCell>
                    <TableCell className="text-xs font-mono">{log.targetUrl ?? "(simulated)"}</TableCell>
                    <TableCell className="text-xs">{log.recordCount}</TableCell>
                    <TableCell>
                      <Badge variant={log.status === "success" ? "success" : "destructive"}>{log.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
