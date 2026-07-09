import { useLocation } from "wouter";

export default function NotFound() {
  const [location] = useLocation();

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-4">
      <h1 className="text-4xl font-bold font-mono tracking-tighter text-muted-foreground">404</h1>
      <p className="text-sm text-muted-foreground">Path <span className="font-mono bg-muted px-1 py-0.5 rounded">{location}</span> not found.</p>
    </div>
  );
}
