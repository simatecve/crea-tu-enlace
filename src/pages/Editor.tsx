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
import AppFooter from "@/components/AppFooter";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SocialIcon, { SOCIAL_OPTIONS } from "@/components/SocialIcon";
import logoDefault from "@/assets/logo-default.png";

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [page, setPage] = useState<any>(null);
  const [links, setLinks] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Form fields
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
  const [designMode, setDesignMode] = useState("default");
  const [promoTitle, setPromoTitle] = useState("Registrate y obtené:");
  const [promoText, setPromoText] = useState("$25.000 DE BONO Y DUPLICAMOS TU PRIMERA CARGA.");
  const [promoSubtitle, setPromoSubtitle] = useState("Y MILES DE PREMIOS MÁS.");
  const [ctaText, setCtaText] = useState("Registrate GRATIS");
  const [modalTitle, setModalTitle] = useState("¡Regístrate ahora!");
  const [modalSubtitle, setModalSubtitle] = useState("Y participa por premios");
  const [logoUrl, setLogoUrl] = useState("");
  const [metaPixelId, setMetaPixelId] = useState("");

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
      setDesignMode(pageData.design_mode || "default");
      setPromoTitle(pageData.promo_title || "Registrate y obtené:");
      setPromoText(pageData.promo_text || "$25.000 DE BONO Y DUPLICAMOS TU PRIMERA CARGA.");
      setPromoSubtitle((pageData as any).promo_subtitle || "Y MILES DE PREMIOS MÁS.");
      setCtaText(pageData.cta_text || "Registrate GRATIS");
      setModalTitle(pageData.modal_title || "¡Regístrate ahora!");
      setModalSubtitle(pageData.modal_subtitle || "Y participa por premios");
      setLogoUrl(pageData.logo_url || "");
      setMetaPixelId((pageData as any).meta_pixel_id || "");
    }

    if (pageData) setAvatarUrl((pageData as any).avatar_url || "");

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
        design_mode: designMode,
        promo_title: promoTitle,
        promo_text: promoText,
        promo_subtitle: promoSubtitle,
        cta_text: ctaText,
        modal_title: modalTitle,
        modal_subtitle: modalSubtitle,
        logo_url: logoUrl || null,
        avatar_url: avatarUrl || null,
        meta_pixel_id: metaPixelId || null,
      } as any)
      .eq("id", id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Cambios guardados y publicados", description: "Tu landing está lista. Redirigiendo al panel..." });
      setTimeout(() => navigate("/dashboard"), 1500);
    }
  };

  const uploadImage = async (file: File, type: "avatar" | "bg" | "logo") => {
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
      if (id) await supabase.from("landing_pages").update({ avatar_url: urlData.publicUrl } as any).eq("id", id);
    } else if (type === "logo") {
      setLogoUrl(urlData.publicUrl);
    } else {
      setBgImageUrl(urlData.publicUrl);
    }
  };

  const addLink = async () => {
    if (!id) return;
    const { error } = await supabase.from("links").insert({
      landing_page_id: id,
      title: designMode === "default" ? "Nueva ciudad" : "Nuevo enlace",
      url: "https://",
      sort_order: links.length,
    });
    if (!error) fetchData();
  };

  const updateLink = async (linkId: string, field: Partial<any>) => {
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
            {/* Design Mode Switch */}
            <Card>
              <CardHeader><CardTitle className="text-base">Modo de diseño</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{designMode === "default" ? "Diseño Default" : "Diseño Personalizado"}</p>
                    <p className="text-xs text-muted-foreground">
                      {designMode === "default"
                        ? "Layout prediseñado con avatar, logo, CTA y modal de ciudades"
                        : "Personaliza colores, fuentes y estilos libremente"}
                    </p>
                  </div>
                  <Switch
                    checked={designMode === "custom"}
                    onCheckedChange={(checked) => setDesignMode(checked ? "custom" : "default")}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Basic Info */}
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

            {/* Default Design Options */}
            {designMode === "default" && (
              <Card>
                <CardHeader><CardTitle className="text-base">Diseño Default</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Avatar (foto circular)</Label>
                    <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "avatar")} />
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                    <img src={logoDefault} alt="Logo" className="h-8 object-contain" />
                    <span className="text-xs text-muted-foreground">Logo por defecto</span>
                  </div>
                  <div className="space-y-2">
                    <Label>Texto del botón CTA</Label>
                    <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Texto promocional (título)</Label>
                    <Input value={promoTitle} onChange={(e) => setPromoTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Texto promocional (contenido)</Label>
                    <Textarea value={promoText} onChange={(e) => setPromoText(e.target.value)} rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>Subtítulo promocional</Label>
                    <Input value={promoSubtitle} onChange={(e) => setPromoSubtitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Título del modal</Label>
                    <Input value={modalTitle} onChange={(e) => setModalTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Subtítulo del modal</Label>
                    <Input value={modalSubtitle} onChange={(e) => setModalSubtitle(e.target.value)} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Meta Pixel */}
            <Card>
              <CardHeader><CardTitle className="text-base">Meta Pixel (Facebook)</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Label>Pixel ID</Label>
                <Input
                  value={metaPixelId}
                  onChange={(e) => setMetaPixelId(e.target.value.replace(/\D/g, ""))}
                  placeholder="Ej: 123456789012345"
                />
                <p className="text-xs text-muted-foreground">
                  Ingresá solo el número del Pixel. Se cargará automáticamente en tu landing pública.
                </p>
              </CardContent>
            </Card>

            {/* Custom Design Options */}
            {designMode === "custom" && (
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
            )}

            {/* Links */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {designMode === "default" ? "Enlaces por ciudad" : "Enlaces"}
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={addLink}>
                    <Plus className="mr-1 h-3 w-3" /> Agregar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {designMode === "default" ? (
                  /* Default mode: city list with title, URL, and toggle */
                  links.map((link) => (
                    <div key={link.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <Switch
                        checked={link.is_active}
                        onCheckedChange={(checked) => {
                          updateLink(link.id, { is_active: checked });
                          setLinks((prev) => prev.map((l) => l.id === link.id ? { ...l, is_active: checked } : l));
                        }}
                      />
                      <Input
                        defaultValue={link.title}
                        placeholder="Nombre de la ciudad"
                        onBlur={(e) => {
                          updateLink(link.id, { title: e.target.value });
                          setLinks((prev) => prev.map((l) => l.id === link.id ? { ...l, title: e.target.value } : l));
                        }}
                        className="min-w-[120px] max-w-[160px]"
                      />
                      <Input
                        defaultValue={link.url}
                        placeholder="https://enlace-de-registro..."
                        onBlur={(e) => updateLink(link.id, { url: e.target.value })}
                        className="flex-1"
                      />
                      <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-destructive" onClick={() => deleteLink(link.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  /* Custom mode: full link editing */
                  <>
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
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <div className={`${!showPreview ? "hidden lg:block" : ""}`}>
            <Card className="sticky top-20 overflow-hidden">
              <CardHeader><CardTitle className="text-base">Vista previa</CardTitle></CardHeader>
              <CardContent className="p-0">
                {designMode === "default" ? (
                  <DefaultPreview
                    avatarUrl={avatarUrl}
                    ctaText={ctaText}
                    promoTitle={promoTitle}
                    promoText={promoText}
                  />
                ) : (
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
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}

function DefaultPreview({
  avatarUrl,
  ctaText,
  promoTitle,
  promoText,
}: {
  avatarUrl: string;
  ctaText: string;
  promoTitle: string;
  promoText: string;
}) {
  return (
    <div
      className="min-h-[500px] p-6 flex flex-col md:flex-row items-center justify-center gap-6"
      style={{
        background: "linear-gradient(135deg, #1a0e00 0%, #3d1e00 40%, #5a2d00 70%, #2a1500 100%)",
      }}
    >
      <div className="shrink-0">
        <div className="w-40 h-40 rounded-full border-4 border-amber-500/50 overflow-hidden bg-blue-900/50">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">Avatar</div>
          )}
        </div>
      </div>
      <div className="flex flex-col items-center md:items-start gap-3 text-white">
        <img src={logoDefault} alt="Logo" className="h-10 object-contain" />
        <button className="px-8 py-2.5 rounded-lg border-2 border-amber-500 text-amber-500 font-bold text-sm">
          {ctaText}
        </button>
        <p className="text-amber-500 font-bold text-sm mt-2">{promoTitle}</p>
        <p className="text-white font-black text-xl leading-tight uppercase max-w-[250px]">{promoText}</p>
      </div>
    </div>
  );
}
