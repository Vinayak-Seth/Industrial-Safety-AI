import { useState, useMemo } from "react";
import { useGetKnowledgeGraph, useGetEntity, getGetEntityQueryKey } from "@workspace/api-client-react";
import type { Entity, EntityRelation } from "@workspace/api-client-react";

type GraphNode = Entity & {
  x: number;
  y: number;
  connected: boolean;
  isCenter?: boolean;
};
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Share2, ZoomIn, Info } from "lucide-react";
import { Link } from "wouter";

// Very basic custom D3-like SVG layout engine for a concentric interactive graph
interface GraphRendererProps {
  nodes: Entity[];
  edges: EntityRelation[];
  onNodeClick: (id: number) => void;
  selectedNodeId: number | null;
  hoveredNodeId: number | null;
  onNodeHover?: (id: number | null) => void;
}

function GraphRenderer({ nodes, edges, onNodeClick, selectedNodeId, hoveredNodeId, onNodeHover }: GraphRendererProps) {
  const width = 800;
  const height = 600;
  const cx = width / 2;
  const cy = height / 2;

  // Simple layout logic: 
  // If a node is selected, put it in center, and connected nodes in a circle around it.
  // Others fade out or go to outer circle.
  
  const layout = useMemo(() => {
    const nodeMap = new Map<number, GraphNode>(
      nodes.map((n) => [n.id, { ...n, x: cx, y: cy, connected: false }]),
    );
    
    if (selectedNodeId && nodeMap.has(selectedNodeId)) {
      const selected = nodeMap.get(selectedNodeId)!;
      selected.x = cx;
      selected.y = cy;
      selected.connected = true;
      selected.isCenter = true;

      // Find connected
      const connectedIds = new Set<number>();
      edges.forEach((e) => {
        if (e.sourceEntityId === selectedNodeId) connectedIds.add(e.targetEntityId);
        if (e.targetEntityId === selectedNodeId) connectedIds.add(e.sourceEntityId);
      });

      const connectedList = Array.from(connectedIds)
        .map((id) => nodeMap.get(id))
        .filter((n): n is GraphNode => Boolean(n));
      const angleStep = (2 * Math.PI) / (connectedList.length || 1);
      const radius = 180;

      connectedList.forEach((n, i) => {
        n.x = cx + radius * Math.cos(i * angleStep);
        n.y = cy + radius * Math.sin(i * angleStep);
        n.connected = true;
      });

      // Scatter others far away
      nodeMap.forEach((n) => {
        if (!n.connected) {
          const r = 350 + Math.random() * 100;
          const a = Math.random() * 2 * Math.PI;
          n.x = cx + r * Math.cos(a);
          n.y = cy + r * Math.sin(a);
        }
      });
    } else {
      // Default overview layout: a Vogel/Fermat spiral distributes nodes evenly
      // across the whole canvas instead of cramming them onto a single ring,
      // which keeps labels legible even with 100+ nodes.
      const total = nodes.length || 1;
      const maxRadius = Math.min(width, height) / 2 - 40;
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      let i = 0;
      nodeMap.forEach(n => {
        const r = maxRadius * Math.sqrt(i / total);
        const a = i * goldenAngle;
        n.x = cx + r * Math.cos(a);
        n.y = cy + r * Math.sin(a);
        n.connected = true; // all visible
        i++;
      });
    }

    return Array.from(nodeMap.values());
  }, [nodes, edges, selectedNodeId, cx, cy]);

  const colorForType = (type: string) => {
    switch (type) {
      case 'equipment': return 'hsl(215 25% 60%)'; // slate
      case 'procedure': return 'hsl(142 76% 36%)'; // green
      case 'hazard': return 'hsl(0 84% 60%)'; // red
      case 'regulation': return 'hsl(45 93% 47%)'; // amber
      default: return 'hsl(210 40% 80%)';
    }
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--muted-foreground))" opacity="0.5" />
        </marker>
      </defs>

      {/* Edges */}
      {edges.map((e) => {
        const source = layout.find(n => n.id === e.sourceEntityId);
        const target = layout.find(n => n.id === e.targetEntityId);
        if (!source || !target) return null;
        
        const isHighlight = selectedNodeId === source.id || selectedNodeId === target.id;
        if (selectedNodeId && !isHighlight) return null;

        return (
          <line
            key={e.id}
            x1={source.x} y1={source.y}
            x2={target.x} y2={target.y}
            stroke={isHighlight ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
            strokeWidth={isHighlight ? 2 : 1}
            opacity={isHighlight ? 0.8 : 0.2}
            markerEnd="url(#arrow)"
            className="transition-all duration-500"
          />
        );
      })}

      {/* Nodes */}
      {layout.map((n) => {
        const isSelected = n.id === selectedNodeId;
        return (
          <g 
            key={n.id} 
            transform={`translate(${n.x}, ${n.y})`} 
            className="transition-all duration-500 cursor-pointer"
            onClick={() => onNodeClick(n.id)}
            onMouseEnter={() => onNodeHover?.(n.id)}
            onMouseLeave={() => onNodeHover?.(null)}
            opacity={n.connected ? 1 : 0.1}
          >
            <circle 
              r={isSelected ? 16 : 6} 
              fill={isSelected ? "hsl(var(--primary))" : colorForType(n.entityType)}
              stroke="hsl(var(--background))"
              strokeWidth={2}
              className="hover:stroke-primary transition-colors"
            />
            {(n.isCenter || (selectedNodeId && n.connected) || n.id === hoveredNodeId) && (
              <text 
                y={isSelected ? 28 : 18} 
                textAnchor="middle" 
                fill="hsl(var(--foreground))" 
                fontSize={isSelected ? "14px" : "10px"}
                fontWeight={isSelected || n.id === hoveredNodeId ? "bold" : "normal"}
                className="font-mono pointer-events-none drop-shadow-md"
              >
                {n.name}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function KnowledgeGraphPage() {
  const { data: graph, isLoading } = useGetKnowledgeGraph();
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);
  
  const { data: entityDetail, isLoading: isLoadingEntity } = useGetEntity(
    selectedNodeId as number, 
    { query: { enabled: selectedNodeId !== null, queryKey: getGetEntityQueryKey(selectedNodeId as number) } }
  );

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Graph Explorer</h1>
          <p className="text-muted-foreground text-sm">Visualize operational relationships extracted from documents.</p>
        </div>
        <div className="flex gap-2">
          {['equipment', 'procedure', 'hazard', 'regulation'].map(type => (
            <Badge key={type} variant="outline" className="capitalize text-[10px]">
              <span className="w-2 h-2 rounded-full mr-1.5 inline-block" style={{
                background: type === 'equipment' ? 'hsl(215 25% 60%)' :
                           type === 'procedure' ? 'hsl(142 76% 36%)' :
                           type === 'hazard' ? 'hsl(0 84% 60%)' :
                           'hsl(45 93% 47%)'
              }}></span>
              {type}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        <Card className="flex-1 relative overflow-hidden bg-card/50">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : graph?.nodes.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <Share2 className="h-12 w-12 opacity-20 mb-4" />
              <p>No entities found. Ingest documents to build the graph.</p>
            </div>
          ) : (
            <>
              <div className="absolute top-4 left-4 z-10 flex gap-2">
                {selectedNodeId && (
                  <button 
                    onClick={() => setSelectedNodeId(null)}
                    className="text-xs bg-background/80 backdrop-blur border px-2 py-1 rounded hover:bg-muted font-mono"
                  >
                    Reset View
                  </button>
                )}
              </div>
              <GraphRenderer 
                nodes={graph?.nodes || []} 
                edges={graph?.edges || []} 
                onNodeClick={setSelectedNodeId}
                selectedNodeId={selectedNodeId}
                hoveredNodeId={hoveredNodeId}
                onNodeHover={setHoveredNodeId}
              />
            </>
          )}
        </Card>

        {/* Sidebar Detail */}
        <div className="w-80 shrink-0 flex flex-col gap-4">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="border-b bg-muted/20 pb-4 shrink-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" /> Node Detail
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto flex-1">
              {!selectedNodeId ? (
                <div className="p-6 text-center text-sm text-muted-foreground flex flex-col items-center">
                  <ZoomIn className="h-8 w-8 opacity-20 mb-2" />
                  <p>Click a node in the graph to view its details and connections.</p>
                </div>
              ) : isLoadingEntity ? (
                <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : entityDetail ? (
                <div className="p-6 space-y-6">
                  <div>
                    <Badge variant="secondary" className="mb-2 uppercase text-[10px] tracking-wider">
                      {entityDetail.entityType}
                    </Badge>
                    <h3 className="text-xl font-bold leading-tight">{entityDetail.name}</h3>
                    {entityDetail.description && (
                      <p className="text-sm text-muted-foreground mt-2">{entityDetail.description}</p>
                    )}
                  </div>
                  
                  {entityDetail.documentId && (
                    <div className="bg-muted/30 p-3 rounded border text-xs">
                      <span className="font-bold text-muted-foreground block mb-1">Source Document</span>
                      <Link href={`/documents/${entityDetail.documentId}`} className="text-primary hover:underline">
                        View Document #{entityDetail.documentId}
                      </Link>
                    </div>
                  )}

                  {entityDetail.outgoingRelations.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 border-b pb-1">Outgoing Relations</h4>
                      <div className="space-y-2">
                        {entityDetail.outgoingRelations.map(rel => {
                          const targetNode = graph?.nodes.find(n => n.id === rel.targetEntityId);
                          return (
                            <div key={rel.id} className="text-xs bg-muted/50 p-2 rounded cursor-pointer hover:bg-primary/10 transition-colors" onClick={() => setSelectedNodeId(targetNode?.id || null)}>
                              <span className="font-mono text-primary mr-2">{rel.relationType}</span>
                              <span className="font-semibold">{targetNode?.name || `Node ${rel.targetEntityId}`}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {entityDetail.incomingRelations.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 border-b pb-1">Incoming Relations</h4>
                      <div className="space-y-2">
                        {entityDetail.incomingRelations.map(rel => {
                          const sourceNode = graph?.nodes.find(n => n.id === rel.sourceEntityId);
                          return (
                            <div key={rel.id} className="text-xs bg-muted/50 p-2 rounded cursor-pointer hover:bg-primary/10 transition-colors" onClick={() => setSelectedNodeId(sourceNode?.id || null)}>
                              <span className="font-semibold mr-2">{sourceNode?.name || `Node ${rel.sourceEntityId}`}</span>
                              <span className="font-mono text-muted-foreground">{rel.relationType}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
