import { Brain } from "lucide-react";

export default function AppFooter() {
  return (
    <footer className="border-t bg-card/50 py-4 text-center text-xs text-muted-foreground">
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        <span>Desarrollado con</span>
        <Brain className="h-3.5 w-3.5 text-primary" />
        <span>por</span>
        <span className="font-semibold text-foreground">BZ Creators</span>
        <span>y</span>
        <span className="font-semibold text-foreground">Nocodeveloper</span>
        <span className="ml-1">🇦🇷 🇻🇪</span>
      </div>
    </footer>
  );
}
