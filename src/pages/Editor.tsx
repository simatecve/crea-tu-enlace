import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, GripVertical, Save, Eye } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SocialIcon, { SOCIAL_OPTIONS } from "@/components/SocialIcon";
import type { Tables } from "@/integrations/supabase/types";

type LandingPage = Tables<"landing_pages">;
type LinkRow = Tables<"links">;

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [page, setPage] = useState<LandingPage | null>(null);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [textColor, setTextColor] = useState("#000000");
  const [buttonColor, setButtonColor] = useState("#000000");
  const [buttonTextColor, setButtonTextColor] = useState("#ffffff");
  const [buttonStyle, setButtonStyle] = useState("rounded");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bgImageUrl, setBgImageUrl] = useState("");

  const fetchData = useCallback(async () => {
    if (!id) return;
    const { data: pageData } = await supabase
      .from("landing_pages")
      .select("*")
      .eq("id", id)
      .single();

    if (pageData) {
      setPage(pageData);
      setTitle(pageData.title);
      setDescription(pageData.description || "");
      setSlug(pageData.slug);
      setBgColor(pageData.bg_color || "#ffffff");
      setTextColor(pageData.text_color || "#000000");
      setButtonColor(pageData.button_color || "#000000");
      setButtonTextColor(pageData.button_text_color || "#ffffff");
      setButtonStyle(pageData.button_style || "rounded");
      setBgImageUrl(pageData.bg_image_url || "");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("user_id", user!.id)
      .single();
    if (profile) setAvatarUrl(profile.avatar_url || "");

    const { data: linksData } = await supabase
      .from("links")
      .select("*")
      .eq("landing_page_id", id)
      .order("sort_order", { ascending: true });
    if (linksData) setLinks(linksData);
  }, [id, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const savePage = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase
      .from("landing_pages")
      .update({
        title,
        description,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
        bg_color: bgColor,
        text_color: textColor,
        button_color: buttonColor,
        button_text_color: buttonTextColor,
        button_style: buttonStyle,
        bg_image_url: bgImageUrl || null,
      })
      .eq("id", id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Guardado", description: "Los cambios se han guardado correctamente." });
    }
  };

  const uploadImage = async (file: File, type: "avatar" | "bg") => {
    const ext = file.name.split(".").pop();
    const path = `${user!.id}/${type}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file);
    if (error) {
      toast({ title: "Error al subir imagen", description: error.message, variant: "destructive" });
      return;
    }
    const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
    if (type === "avatar") {
      setAvatarUrl(urlData.publicUrl);
      await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("user_id", user!.id);
    } else {
      setBgImageUrl(urlData.publicUrl);
    }
  };

  const addLink = async () => {
    if (!id) return;
    const { error } = await supabase.from("links").insert({
      landing_page_id: id,
      title: "Nuevo enlace",
      url: "https://",
      sort_order: links.length,
    });
    if (!error) fetchData();
  };

  const updateLink = async (linkId: string, field: Partial<LinkRow>) => {
    await supabase.from("links").update(field).eq("id", linkId);
  };

  const deleteLink = async (linkId: string) => {
    await supabase.from("links").delete().eq("id", linkId);
    setLinks((prev) => prev.filter((l) => l.id !== linkId));
  };

  const handleIconChange = (linkId: string, icon: string) => {
    updateLink(linkId, { icon: icon === "none" ? null : icon });
    setLinks((prev) => prev.map((l) => l.id === linkId ? { ...l, icon: icon === "none" ? null : icon } : l));
  };

  const getButtonClasses = () => {
    const base = "w-full py-3 px-4 text-center font-medium transition-all";
    switch (buttonStyle) {
      case "square": return `${base} rounded-none`;
      case "pill": return `${base} rounded-full`;
      case "outline": return `${base} rounded-xl bg-transparent border-2`;
      default: return `${base} rounded-xl`;
    }
  };

  if (!page) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Volver
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
              <Eye className="mr-1 h-4 w-4" /> {showPreview ? "Editar" : "Vista previa"}
            </Button>
            <Button size="sm" onClick={savePage} disabled={saving}>
              <Save className="mr-1 h-4 w-4" /> {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Editor Panel */}
          <div className={`space-y-6 ${showPreview ? "hidden lg:block" : ""}`}>
            <Card>
              <CardHeader><CardTitle className="text-base">Información básica</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Slug (URL)</Label>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Personalización visual</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Avatar</Label>
                  <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "avatar")} />
                </div>
                <div className="space-y-2">
                  <Label>Imagen de fondo</Label>
                  <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "bg")} />
                  {bgImageUrl && (
                    <Button variant="ghost" size="sm" onClick={() => setBgImageUrl("")}>Quitar fondo</Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Fondo</Label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="h-8 w-8 rounded cursor-pointer border-0" />
                      <Input value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="flex-1 h-8 text-xs" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Texto</Label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="h-8 w-8 rounded cursor-pointer border-0" />
                      <Input value={textColor} onChange={(e) => setTextColor(e.target.value)} className="flex-1 h-8 text-xs" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Botón</Label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={buttonColor} onChange={(e) => setButtonColor(e.target.value)} className="h-8 w-8 rounded cursor-pointer border-0" />
                      <Input value={buttonColor} onChange={(e) => setButtonColor(e.target.value)} className="flex-1 h-8 text-xs" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Texto botón</Label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={buttonTextColor} onChange={(e) => setButtonTextColor(e.target.value)} className="h-8 w-8 rounded cursor-pointer border-0" />
                      <Input value={buttonTextColor} onChange={(e) => setButtonTextColor(e.target.value)} className="flex-1 h-8 text-xs" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Estilo de botones</Label>
                  <Select value={buttonStyle} onValueChange={setButtonStyle}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rounded">Redondeado</SelectItem>
                      <SelectItem value="square">Cuadrado</SelectItem>
                      <SelectItem value="pill">Píldora</SelectItem>
                      <SelectItem value="outline">Solo borde</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Links */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Enlaces</CardTitle>
                  <Button size="sm" variant="outline" onClick={addLink}>
                    <Plus className="mr-1 h-3 w-3" /> Agregar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {links.map((link) => (
                  <div key={link.id} className="flex items-start gap-2 rounded-lg border p-3">
                    <GripVertical className="mt-2 h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Input
                        defaultValue={link.title}
                        placeholder="Título del enlace"
                        onBlur={(e) => updateLink(link.id, { title: e.target.value })}
                      />
                      <Input
                        defaultValue={link.url}
                        placeholder="https://..."
                        onBlur={(e) => updateLink(link.id, { url: e.target.value })}
                      />
                      <div className="flex items-center gap-3">
                        <Select
                          value={link.icon || "none"}
                          onValueChange={(val) => handleIconChange(link.id, val)}
                        >
                          <SelectTrigger className="w-[160px] h-8 text-xs">
                            <SelectValue placeholder="Tipo de enlace" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin ícono</SelectItem>
                            {SOCIAL_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <span className="flex items-center gap-2">
                                  <SocialIcon name={opt.value} size={14} />
                                  {opt.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1.5">
                          <Switch
                            checked={link.is_active}
                            onCheckedChange={(checked) => {
                              updateLink(link.id, { is_active: checked });
                              setLinks((prev) => prev.map((l) => l.id === link.id ? { ...l, is_active: checked } : l));
                            }}
                          />
                          <span className="text-xs text-muted-foreground">{link.is_active ? "Activo" : "Inactivo"}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteLink(link.id)} className="shrink-0">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {links.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">No hay enlaces aún</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <div className={`${!showPreview ? "hidden lg:block" : ""}`}>
            <Card className="sticky top-20 overflow-hidden">
              <CardHeader><CardTitle className="text-base">Vista previa</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div
                  className="flex flex-col items-center px-6 py-10 min-h-[500px]"
                  style={{
                    backgroundColor: bgColor,
                    backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    color: textColor,
                  }}
                >
                  {avatarUrl && (
                    <img src={avatarUrl} alt="Avatar" className="h-20 w-20 rounded-full object-cover mb-4 border-2 border-white/50" />
                  )}
                  <h2 className="text-xl font-bold mb-1">{title || "Tu título"}</h2>
                  <p className="text-sm opacity-80 mb-6 text-center">{description || "Tu descripción"}</p>
                  <div className="w-full max-w-xs space-y-3">
                    {links.filter(l => l.is_active).map((link) => (
                      <div
                        key={link.id}
                        className={getButtonClasses()}
                        style={{
                          backgroundColor: buttonStyle === "outline" ? "transparent" : buttonColor,
                          color: buttonStyle === "outline" ? buttonColor : buttonTextColor,
                          borderColor: buttonColor,
                        }}
                      >
                        <span className="flex items-center justify-center gap-2">
                          {link.icon && <SocialIcon name={link.icon} size={18} />}
                          {link.title || "Enlace"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
