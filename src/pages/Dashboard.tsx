import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, ExternalLink, BarChart3, Edit, LogOut, Trash2, Copy } from "lucide-react";
import logoIcon from "@/assets/logo-icon.jpg";
import AppFooter from "@/components/AppFooter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
    const { data: insertedPage, error } = await supabase.from("landing_pages").insert({
      user_id: user!.id,
      title: newTitle,
      slug,
    }).select().single();
    setCreating(false);
    if (error) {
      toast({ title: "Error", description: error.message.includes("unique") ? "Ese slug ya existe" : error.message, variant: "destructive" });
    } else {
      // Create default city links
      const defaultCities = [
        "Pcia. Bs. As.",
        "Ciudad de Buenos Aires",
        "Córdoba",
        "Entre Ríos",
        "Mendoza",
        "Resto del país",
      ];
      await supabase.from("links").insert(
        defaultCities.map((city, i) => ({
          landing_page_id: insertedPage.id,
          title: city,
          url: "",
          sort_order: i,
        }))
      );
      setNewTitle("");
      setNewSlug("");
      setDialogOpen(false);
      fetchPages();
      toast({ title: "¡Creada!", description: "Tu nueva mini landing está lista para editar." });
    }
  };

  const deletePage = async (page: LandingPage) => {
    // Delete links and events first, then the page
    await supabase.from("analytics_events").delete().eq("landing_page_id", page.id);
    await supabase.from("links").delete().eq("landing_page_id", page.id);
    const { error } = await supabase.from("landing_pages").delete().eq("id", page.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setPages((prev) => prev.filter((p) => p.id !== page.id));
      toast({ title: "Eliminada", description: "La página ha sido eliminada." });
    }
  };

  const toggleActive = async (page: LandingPage) => {
    await supabase.from("landing_pages").update({ is_active: !page.is_active }).eq("id", page.id);
    fetchPages();
  };

  const duplicatePage = async (page: LandingPage) => {
    const newSlug = `${page.slug}-copia-${Date.now().toString(36)}`;
    const { data: newPage, error } = await supabase.from("landing_pages").insert({
      user_id: user!.id,
      title: `${page.title} (copia)`,
      slug: newSlug,
      description: page.description,
      bg_color: page.bg_color,
      bg_image_url: page.bg_image_url,
      text_color: page.text_color,
      button_color: page.button_color,
      button_text_color: page.button_text_color,
      button_style: page.button_style,
      design_mode: page.design_mode,
      promo_title: page.promo_title,
      promo_text: page.promo_text,
      cta_text: page.cta_text,
      modal_title: page.modal_title,
      modal_subtitle: page.modal_subtitle,
      logo_url: page.logo_url,
      promo_subtitle: (page as any).promo_subtitle,
      is_active: false,
    }).select().single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    // Duplicate links
    const { data: links } = await supabase.from("links").select("*").eq("landing_page_id", page.id).order("sort_order");
    if (links && links.length > 0) {
      await supabase.from("links").insert(
        links.map((link) => ({
          landing_page_id: newPage.id,
          title: link.title,
          url: link.url,
          icon: link.icon,
          sort_order: link.sort_order,
          is_active: link.is_active,
        }))
      );
    }

    fetchPages();
    toast({ title: "¡Duplicada!", description: "La página fue duplicada correctamente." });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={logoIcon} alt="Logo" className="h-9 w-9 rounded-lg object-contain" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Mis Páginas
            </h1>
          </div>
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
                    <p className="text-xs text-muted-foreground">Tu página será accesible en /l/{newSlug || "mi-pagina"}</p>
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
          <div className="text-center py-20">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <p className="text-muted-foreground mb-4">Aún no tienes mini landings</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Crear tu primera página
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pages.map((page) => (
              <Card
                key={page.id}
                className="group relative transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{page.title || "Sin título"}</CardTitle>
                    <button
                      onClick={() => toggleActive(page)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${page.is_active
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                        }`}
                    >
                      {page.is_active ? "Activa" : "Inactiva"}
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">/l/{page.slug}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
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
                      <a href={`/l/${page.slug}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => duplicatePage(page)} title="Duplicar">
                      <Copy className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="ml-auto text-destructive hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar esta página?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminarán todos los enlaces y analíticas asociadas a "{page.title}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deletePage(page)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
