import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, ExternalLink, BarChart3, Edit, LogOut, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Tables } from "@/integrations/supabase/types";

type LandingPage = Tables<"landing_pages">;

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchPages = async () => {
    const { data, error } = await supabase
      .from("landing_pages")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    if (!error && data) setPages(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPages();
  }, [user]);

  const createPage = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = newSlug.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!slug) {
      toast({ title: "Error", description: "El slug no es válido", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("landing_pages").insert({
      user_id: user!.id,
      title: newTitle,
      slug,
    });
    setCreating(false);
    if (error) {
      toast({ title: "Error", description: error.message.includes("unique") ? "Ese slug ya existe" : error.message, variant: "destructive" });
    } else {
      setNewTitle("");
      setNewSlug("");
      setDialogOpen(false);
      fetchPages();
      toast({ title: "¡Creada!", description: "Tu nueva mini landing está lista para editar." });
    }
  };

  const toggleActive = async (page: LandingPage) => {
    await supabase.from("landing_pages").update({ is_active: !page.is_active }).eq("id", page.id);
    fetchPages();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold">Mis Páginas</h1>
          <div className="flex items-center gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-1 h-4 w-4" /> Nueva
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear mini landing</DialogTitle>
                </DialogHeader>
                <form onSubmit={createPage} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Mi página" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug (URL)</Label>
                    <Input
                      value={newSlug}
                      onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      placeholder="mi-pagina"
                      required
                    />
                    <p className="text-xs text-muted-foreground">Tu página será accesible en /{newSlug || "mi-pagina"}</p>
                  </div>
                  <Button type="submit" className="w-full" disabled={creating}>
                    {creating ? "Creando..." : "Crear página"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : pages.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">Aún no tienes mini landings</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Crear tu primera página
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pages.map((page) => (
              <Card key={page.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{page.title || "Sin título"}</CardTitle>
                    <button
                      onClick={() => toggleActive(page)}
                      className={`text-xs px-2 py-1 rounded-full ${
                        page.is_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {page.is_active ? "Activa" : "Inactiva"}
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground">/{page.slug}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/editor/${page.id}`}>
                        <Edit className="mr-1 h-3 w-3" /> Editar
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/analytics/${page.id}`}>
                        <BarChart3 className="mr-1 h-3 w-3" /> Analíticas
                      </Link>
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <a href={`/${page.slug}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
