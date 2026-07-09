import { useState, useRef } from "react";
import { Link } from "wouter";
import {
  useListDrawings,
  useCreateDrawing,
  useDeleteDrawing,
  getListDrawingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScanEye, Plus, Trash2, UploadCloud } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function DrawingsPage() {
  const { data: drawings, isLoading } = useListDrawings();
  const deleteDrawing = useDeleteDrawing();
  const queryClient = useQueryClient();
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const handleDelete = (id: number) => {
    if (confirm("Delete this drawing? This will remove all digitized components and connections.")) {
      deleteDrawing.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListDrawingsQueryKey() });
          },
        },
      );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto flex flex-col h-full">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ScanEye className="h-6 w-6 text-primary" /> Drawing Digitizer
          </h1>
          <p className="text-muted-foreground text-sm">
            Upload P&IDs and engineering drawings — computer vision extracts tagged components and connections.
          </p>
        </div>
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Digitize Drawing
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload P&ID / Drawing</DialogTitle>
            </DialogHeader>
            <UploadDrawingForm onSuccess={() => setIsUploadOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">Loading...</TableCell>
                </TableRow>
              ) : !drawings || drawings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No drawings digitized yet.
                  </TableCell>
                </TableRow>
              ) : (
                drawings.map((drawing) => (
                  <TableRow key={drawing.id}>
                    <TableCell>
                      <Link
                        href={`/drawings/${drawing.id}`}
                        className="font-medium hover:text-primary transition-colors flex items-center gap-2"
                      >
                        <ScanEye className="h-4 w-4 text-muted-foreground" />
                        {drawing.title}
                      </Link>
                      <div className="text-xs text-muted-foreground mt-1 font-mono">{drawing.fileName}</div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          drawing.status === "ready"
                            ? "success"
                            : drawing.status === "failed"
                              ? "destructive"
                              : "warning"
                        }
                      >
                        {drawing.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-sm text-xs text-muted-foreground truncate">
                      {drawing.summary ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {formatDate(drawing.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(drawing.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
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

function UploadDrawingForm({ onSuccess }: { onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDrawing = useCreateDrawing();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;

    setIsUploading(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result as string;
        const base64 = result.split(",")[1];

        try {
          const created = await createDrawing.mutateAsync({
            data: {
              title,
              fileName: file.name,
              mimeType: file.type || "image/png",
              fileBase64: base64,
            },
          });
          queryClient.invalidateQueries({ queryKey: getListDrawingsQueryKey() });
          if (created.status === "failed") {
            setError(created.processingError ?? "Digitization failed.");
            setIsUploading(false);
            return;
          }
          onSuccess();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Upload failed.");
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Upload failed.");
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Title</label>
        <Input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Compressor Train P&ID Sheet 3"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Drawing Image / PDF</label>
        <div
          className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">{file ? file.name : "Click to select a file"}</p>
          <p className="text-xs text-muted-foreground mt-1">PNG, JPEG, WEBP, or PDF supported</p>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png,image/jpeg,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <DialogFooter className="pt-4">
        <Button type="button" variant="outline" onClick={onSuccess} disabled={isUploading}>
          Cancel
        </Button>
        <Button type="submit" disabled={!file || !title || isUploading}>
          {isUploading ? "Digitizing..." : "Upload & Digitize"}
        </Button>
      </DialogFooter>
    </form>
  );
}
