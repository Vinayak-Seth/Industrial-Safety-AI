import { useState, useRef, useEffect } from "react";
import { useQueryCopilot, useListCopilotHistory, getListCopilotHistoryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, ChevronRight, Loader2 } from "lucide-react";

export default function CopilotPage() {
  const [input, setInput] = useState("");
  const { data: history, isLoading } = useListCopilotHistory();
  const askCopilot = useQueryCopilot();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, askCopilot.isPending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || askCopilot.isPending) return;

    askCopilot.mutate({ data: { question: input } }, {
      onSuccess: () => {
        setInput("");
        queryClient.invalidateQueries({ queryKey: getListCopilotHistoryQueryKey() });
      }
    });
  };

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto">
      <div className="shrink-0 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Strata Copilot</h1>
        <p className="text-muted-foreground text-sm">Ask natural-language questions grounded in your plant's ingested documents.</p>
      </div>

      <Card className="flex-1 flex flex-col min-h-0 bg-card/50 backdrop-blur border-border/50">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : history?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
              <Bot className="h-12 w-12 opacity-20" />
              <p>Copilot is ready. Ask a question about procedures, regulations, or equipment.</p>
              <div className="flex gap-2 mt-4 text-xs font-mono">
                <button onClick={() => setInput("What are the shutdown steps for Pump 42?")} className="px-3 py-1.5 bg-muted rounded hover:bg-primary/20 hover:text-primary transition-colors">"What are the shutdown steps for Pump 42?"</button>
                <button onClick={() => setInput("List all recent critical compliance gaps.")} className="px-3 py-1.5 bg-muted rounded hover:bg-primary/20 hover:text-primary transition-colors">"List all recent critical compliance gaps."</button>
              </div>
            </div>
          ) : (
            history?.map((msg) => (
              <div key={msg.id} className="space-y-6">
                {/* User Message */}
                <div className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="bg-muted p-4 rounded-lg rounded-tl-none mt-1">
                    <p className="text-sm font-medium">{msg.question}</p>
                  </div>
                </div>

                {/* Copilot Message */}
                <div className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-4 mt-1">
                    <div className="bg-card border p-4 rounded-lg rounded-tl-none">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.answer}</p>
                    </div>
                    
                    {msg.citations.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Sources</p>
                        <div className="flex flex-wrap gap-2">
                          {msg.citations.map((cit, idx) => (
                            <div key={idx} className="bg-background border border-border/50 rounded p-2 text-xs max-w-[300px] flex-shrink-0 group cursor-help relative">
                              <div className="flex items-center gap-1 font-mono text-primary mb-1">
                                <ChevronRight className="h-3 w-3" />
                                <span className="truncate">{cit.documentTitle}</span>
                              </div>
                              <p className="text-muted-foreground line-clamp-2 leading-tight">{cit.excerpt}</p>
                              
                              {/* Hover tooltip for full excerpt */}
                              <div className="absolute hidden group-hover:block bottom-full left-0 mb-2 w-[400px] bg-popover text-popover-foreground border p-3 rounded-md shadow-xl z-50 text-xs">
                                <span className="font-bold block mb-1">Chunk {cit.chunkIndex}</span>
                                {cit.excerpt}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {askCopilot.isPending && (
            <div className="flex items-start gap-4 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-card border p-4 rounded-lg rounded-tl-none w-64 h-12 mt-1"></div>
            </div>
          )}
        </div>

        <div className="p-4 bg-background border-t shrink-0">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <Input 
              placeholder="Ask Copilot..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="pr-12 h-12 bg-muted/50 border-muted-foreground/20 text-base"
              disabled={askCopilot.isPending}
            />
            <Button 
              type="submit" 
              size="icon" 
              className="absolute right-1.5 h-9 w-9 rounded"
              disabled={!input.trim() || askCopilot.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <div className="text-[10px] text-center text-muted-foreground mt-2 font-mono">
            AI-generated content. Verify critical operational instructions against original documents.
          </div>
        </div>
      </Card>
    </div>
  );
}
