import { useState, useRef } from "react";
import { Link } from "wouter";
import { 
  useListDocuments, 
  useCreateDocument, 
  useDeleteDocument,
  getListDocumentsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { FileText, Plus, Trash2, Search, UploadCloud } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function DocumentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: documents, isLoading } = useListDocuments();
  const deleteDoc = useDeleteDocument();
  const queryClient = useQueryClient();
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const filteredDocs = documents?.filter(d => 
    d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleDelete = (id: number) => {
    if (confirm("Delete this document? This will remove all associated entities and compliance rules.")) {
      deleteDoc.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
        }
      });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto flex flex-col h-full">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Document Library</h1>
          <p className="text-muted-foreground text-sm">Manage standard operating procedures, manuals, and records.</p>
        </div>
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Ingest Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ingest New Document</DialogTitle>
            </DialogHeader>
            <UploadForm onSuccess={() => setIsUploadOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="p-4 border-b flex items-center gap-4 bg-muted/20 shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search documents..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">Loading...</TableCell>
                </TableRow>
              ) : filteredDocs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No documents found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocs.map(doc => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <Link href={`/documents/${doc.id}`} className="font-medium hover:text-primary transition-colors flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {doc.title}
                      </Link>
                      <div className="text-xs text-muted-foreground mt-1 font-mono">{doc.fileName}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{doc.docType.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        doc.status === 'ready' ? 'success' : 
                        doc.status === 'failed' ? 'destructive' : 'warning'
                      }>
                        {doc.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {formatDate(doc.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function UploadForm({ onSuccess }: { onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState<any>("safety_procedure");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const createDoc = useCreateDocument();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;
    
    setIsUploading(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result as string;
        const base64 = result.split(',')[1];
        
        await createDoc.mutateAsync({
          data: {
            title,
            docType,
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            fileBase64: base64
          }
        });
        
        queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
        onSuccess();
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Title</label>
        <Input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Pump 42 Maintenance Manual" />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Document Type</label>
        <select 
          value={docType} 
          onChange={e => setDocType(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="safety_procedure">Safety Procedure</option>
          <option value="equipment_manual">Equipment Manual</option>
          <option value="inspection_report">Inspection Report</option>
          <option value="regulation">Regulation</option>
          <option value="maintenance_record">Maintenance Record</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">File</label>
        <div 
          className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">{file ? file.name : "Click to select a file"}</p>
          <p className="text-xs text-muted-foreground mt-1">PDF, TXT, DOCX supported</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={e => setFile(e.target.files?.[0] || null)} 
          />
        </div>
      </div>

      <DialogFooter className="pt-4">
        <Button type="button" variant="outline" onClick={onSuccess} disabled={isUploading}>Cancel</Button>
        <Button type="submit" disabled={!file || !title || isUploading}>
          {isUploading ? "Processing..." : "Upload & Ingest"}
        </Button>
      </DialogFooter>
    </form>
  );
}
