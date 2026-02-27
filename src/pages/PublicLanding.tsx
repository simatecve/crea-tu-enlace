import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type LandingPage = Tables<"landing_pages">;
type LinkRow = Tables<"links">;

export default function PublicLanding() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<LandingPage | null>(null);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [profile, setProfile] = useState<{ avatar_url: string | null } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPage = async () => {
      if (!slug) return;
      const { data: pageData, error } = await supabase
        .from("landing_pages")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (error || !pageData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setPage(pageData);

      // Fetch links and profile in parallel
      const [linksRes, profileRes] = await Promise.all([
        supabase
          .from("links")
          .select("*")
          .eq("landing_page_id", pageData.id)
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase.from("profiles").select("avatar_url").eq("user_id", pageData.user_id).single(),
      ]);

      if (linksRes.data) setLinks(linksRes.data);
      if (profileRes.data) setProfile(profileRes.data);

      // Track visit via edge function
      try {
        await supabase.functions.invoke("track-event", {
          body: {
            landing_page_id: pageData.id,
            event_type: "visit",
            referrer: document.referrer || null,
          },
        });
      } catch {}

      setLoading(false);
    };

    fetchPage();
  }, [slug]);

  const handleClick = async (link: LinkRow) => {
    try {
      await supabase.functions.invoke("track-event", {
        body: {
          landing_page_id: page!.id,
          link_id: link.id,
          event_type: "click",
          referrer: document.referrer || null,
        },
      });
    } catch {}
    window.open(link.url, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-gray-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Página no encontrada</h1>
          <p className="text-muted-foreground">Esta página no existe o no está activa.</p>
        </div>
      </div>
    );
  }

  const getButtonClasses = () => {
    const base = "w-full py-3 px-4 text-center font-medium transition-all cursor-pointer hover:opacity-90 hover:scale-[1.02]";
    switch (page.button_style) {
      case "square": return `${base} rounded-none`;
      case "pill": return `${base} rounded-full`;
      case "outline": return `${base} rounded-xl bg-transparent border-2`;
      default: return `${base} rounded-xl`;
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{
        backgroundColor: page.bg_color || "#ffffff",
        backgroundImage: page.bg_image_url ? `url(${page.bg_image_url})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: page.text_color || "#000000",
      }}
    >
      <div className="w-full max-w-md flex flex-col items-center">
        {profile?.avatar_url && (
          <img
            src={profile.avatar_url}
            alt="Avatar"
            className="h-24 w-24 rounded-full object-cover mb-4 border-2 border-white/50 shadow-lg"
          />
        )}
        <h1 className="text-2xl font-bold mb-1 text-center">{page.title}</h1>
        {page.description && (
          <p className="text-sm opacity-80 mb-8 text-center max-w-xs">{page.description}</p>
        )}
        <div className="w-full space-y-3">
          {links.map((link) => (
            <button
              key={link.id}
              onClick={() => handleClick(link)}
              className={getButtonClasses()}
              style={{
                backgroundColor: page.button_style === "outline" ? "transparent" : (page.button_color || "#000"),
                color: page.button_style === "outline" ? (page.button_color || "#000") : (page.button_text_color || "#fff"),
                borderColor: page.button_color || "#000",
              }}
            >
              {link.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
