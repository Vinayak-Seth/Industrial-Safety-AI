import { useRoute, Link } from "wouter";
import { useGetDrawing, getGetDrawingQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ScanEye } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useMemo } from "react";

const TYPE_COLOR: Record<string, string> = {
  valve: "hsl(0 84% 60%)",
  pump: "hsl(215 25% 60%)",
  vessel: "hsl(210 90% 60%)",
  compressor: "hsl(280 70% 60%)",
  instrument: "hsl(45 93% 47%)",
  sensor: "hsl(45 93% 47%)",
  pipe_segment: "hsl(210 15% 50%)",
  other: "hsl(210 15% 70%)",
};

export default function DrawingDetailPage() {
  const [, params] = useRoute("/drawings/:id");
  const id = params?.id ? parseInt(params.id) : 0;

  const { data: drawing, isLoading, isError } = useGetDrawing(id, {
    query: { enabled: !!id, queryKey: getGetDrawingQueryKey(id) },
  });

  const layout = useMemo(() => {
    if (!drawing) return [];
    const n = drawing.components.length || 1;
    return drawing.components.map((c, i) => {
      const cols = Math.ceil(Math.sqrt(n));
      const col = i % cols;
      const row = Math.floor(i / cols);
      return { ...c, x: 80 + col * 140, y: 60 + row * 110 };
    });
  }, [drawing]);

  if (isLoading) return <div className="p-8 animate-pulse">Loading digitized drawing...</div>;
  if (isError) return <div className="p-8 text-destructive">Failed to load this drawing.</div>;
  if (!drawing) return <div className="p-8 text-muted-foreground">Drawing not found.</div>;

  const posById = new Map(layout.map((c) => [c.id, c]));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <Link href="/drawings" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Drawings
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <ScanEye className="h-5 w-5 text-primary" /> {drawing.title}
              </h1>
              <Badge variant={drawing.status === "ready" ? "success" : drawing.status === "failed" ? "destructive" : "warning"}>
                {drawing.status}
              </Badge>
            </div>
            <p className="text-xs font-mono text-muted-foreground">
              {drawing.fileName} • {formatDate(drawing.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {drawing.status === "failed" && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">
            {drawing.processingError ?? "Digitization failed."}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
              Digitized Component Diagram
            </CardTitle>
          </CardHeader>
          <CardContent>
            {drawing.components.length === 0 ? (
              <p className="text-sm text-muted-foreground">No components extracted from this drawing.</p>
            ) : (
              <svg viewBox={`0 0 ${Math.ceil(Math.sqrt(drawing.components.length)) * 140 + 40} ${Math.ceil(drawing.components.length / Math.ceil(Math.sqrt(drawing.components.length))) * 110 + 40}`} className="w-full h-auto">
                {drawing.connections.map((conn) => {
                  const from = posById.get(conn.fromComponentId);
                  const to = posById.get(conn.toComponentId);
                  if (!from || !to) return null;
                  return (
                    <line
                      key={conn.id}
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={1.5}
                      opacity={0.5}
                    />
                  );
                })}
                {layout.map((c) => (
                  <g key={c.id} transform={`translate(${c.x}, ${c.y})`}>
                    <circle r={14} fill={TYPE_COLOR[c.componentType] ?? TYPE_COLOR.other} stroke="hsl(var(--background))" strokeWidth={2} />
                    <text y={26} textAnchor="middle" fontSize="10px" className="font-mono" fill="hsl(var(--foreground))">
                      {c.tag}
                    </text>
                  </g>
                ))}
              </svg>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Summary</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed">{drawing.summary ?? "No summary available."}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
                Components ({drawing.components.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-auto">
              {drawing.components.map((c) => (
                <div key={c.id} className="border-b border-border/50 pb-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full inline-block" style={{ background: TYPE_COLOR[c.componentType] }} />
                    <span className="font-mono text-xs font-semibold">{c.tag}</span>
                    <Badge variant="outline" className="text-[10px] uppercase">{c.componentType.replace("_", " ")}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
                </div>
              ))}
              {drawing.components.length === 0 && (
                <p className="text-xs text-muted-foreground">Nothing extracted yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
