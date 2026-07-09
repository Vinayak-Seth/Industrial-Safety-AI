import { useRoute, Link } from "wouter";
import { useGetDocument, getGetDocumentQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Share2, Layers } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function DocumentDetailPage() {
  const [, params] = useRoute("/documents/:id");
  const id = params?.id ? parseInt(params.id) : 0;
  
  const { data: doc, isLoading } = useGetDocument(id, { 
    query: { enabled: !!id, queryKey: getGetDocumentQueryKey(id) } 
  });

  if (isLoading) return <div className="p-8 animate-pulse">Loading document context...</div>;
  if (!doc) return <div className="p-8 text-muted-foreground">Document not found.</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <Link href="/documents" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Library
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold tracking-tight">{doc.title}</h1>
              <Badge variant={doc.status === 'ready' ? 'success' : 'warning'}>{doc.status}</Badge>
            </div>
            <p className="text-muted-foreground font-mono text-sm">{doc.fileName} • {formatDate(doc.createdAt)}</p>
          </div>
          <Badge variant="outline" className="capitalize text-sm px-3 py-1">
            {doc.docType.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {doc.processingError && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20 text-sm font-mono">
          <p className="font-bold mb-1">Processing Error</p>
          {doc.processingError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> AI Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {doc.summary || "No summary available."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" /> Document Chunks ({doc.chunks?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-[500px] overflow-y-auto">
                {doc.chunks?.map(chunk => (
                  <div key={chunk.id} className="p-4 text-sm font-mono text-muted-foreground hover:bg-muted/30 transition-colors">
                    <span className="inline-block bg-muted px-2 py-0.5 rounded text-xs text-foreground mb-2">Chunk {chunk.chunkIndex}</span>
                    <p className="line-clamp-3">{chunk.content}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Share2 className="h-4 w-4 text-primary" /> Extracted Entities
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-[800px] overflow-y-auto">
                {doc.entities?.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">No entities extracted.</div>
                ) : (
                  doc.entities?.map(entity => (
                    <div key={entity.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-semibold text-sm">{entity.name}</span>
                        <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">{entity.entityType}</Badge>
                      </div>
                      {entity.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{entity.description}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
