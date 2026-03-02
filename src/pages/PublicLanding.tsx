import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SocialIcon from "@/components/SocialIcon";
import { X } from "lucide-react";
import logoDefault from "@/assets/logo-default.png";
import verticalPattern from "@/assets/patterns/verticalpattern.png";
import diagonalPattern from "@/assets/patterns/diagonalpattern.png";

export default function PublicLanding() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<any>(null);
  const [links, setLinks] = useState<any[]>([]);
  const [profile, setProfile] = useState<{ avatar_url: string | null } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

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

  const handleClick = async (link: any) => {
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

  if (page.design_mode === "default") {
    return <DefaultLanding page={page} links={links} profile={profile} modalOpen={modalOpen} setModalOpen={setModalOpen} onClickLink={handleClick} />;
  }

  // Custom design
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
              <span className="flex items-center justify-center gap-2">
                {link.icon && <SocialIcon name={link.icon} size={20} />}
                {link.title}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DefaultLanding({
  page,
  links,
  profile,
  modalOpen,
  setModalOpen,
  onClickLink,
}: {
  page: any;
  links: any[];
  profile: any;
  modalOpen: boolean;
  setModalOpen: (v: boolean) => void;
  onClickLink: (link: any) => void;
}) {
  const avatarUrl = profile?.avatar_url;

  return (
    <>
      <div
        className="flex flex-col min-h-screen relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1a0e00 0%, #3d1e00 40%, #5a2d00 70%, #2a1500 100%)",
        }}
      >
        {/* Main content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[1100px] flex flex-col md:flex-row items-center justify-center relative z-10 px-4 py-8">
            {/* Left: Avatar with patterns — matches .conteiner-image */}
            <div className="relative flex items-center justify-center w-full md:w-[45%] min-h-[320px] md:min-h-[480px]">
              {/* pattern1 — vertical, top-left */}
              <img
                src={verticalPattern}
                alt=""
                className="absolute top-0 left-0 w-[90px] md:w-[120px] opacity-40 pointer-events-none select-none"
              />
              {/* Avatar — .image img */}
              <div className="w-[220px] h-[220px] md:w-[300px] md:h-[300px] lg:w-[340px] lg:h-[340px] rounded-full border-[5px] border-amber-500/50 overflow-hidden shadow-2xl shadow-amber-900/50 relative z-10">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-amber-900/30 flex items-center justify-center">
                    <span className="text-6xl text-white/20">?</span>
                  </div>
                )}
              </div>
              {/* pattern2 — diagonal, bottom-right */}
              <img
                src={diagonalPattern}
                alt=""
                className="absolute bottom-0 right-0 w-[100px] md:w-[140px] opacity-40 pointer-events-none select-none"
              />
            </div>

            {/* Right: Info — matches .conteiner-info */}
            <div className="flex flex-col items-center md:items-start w-full md:w-[55%] text-white px-4 md:px-10">
              {/* Logo — .image-info img */}
              <img
                src={page.logo_url || logoDefault}
                alt="Logo"
                className="h-[50px] md:h-[70px] object-contain mb-6"
              />

              {/* CTA Button — .button-registration button */}
              <button
                onClick={() => setModalOpen(true)}
                className="w-full max-w-[320px] py-4 px-8 rounded-full border-[3px] border-amber-500 text-amber-500 font-extrabold text-xl tracking-wide hover:bg-amber-500 hover:text-black transition-all duration-200 hover:scale-105 mb-5 uppercase"
              >
                {page.cta_text || "Registrate GRATIS"}
              </button>

              {/* hr divider */}
              <div className="w-full max-w-[320px] h-[1px] bg-amber-500/40 mb-4" />

              {/* .small-text */}
              <p className="text-amber-400 font-bold text-base md:text-lg mb-2">
                {page.promo_title || "Registrate y obtené:"}
              </p>

              {/* .bold-text1 + .bold-text2 */}
              <p className="text-white font-black text-[22px] md:text-[32px] lg:text-[36px] leading-tight uppercase max-w-[380px] mb-4">
                {page.promo_text || "$25.000 DE BONO Y DUPLICAMOS TU PRIMERA CARGA."}
              </p>

              {/* hr divider */}
              <div className="w-full max-w-[320px] h-[1px] bg-amber-500/40" />
            </div>
          </div>
        </div>

        {/* Footer legales — .footerLegales */}
        <div className="w-full py-3 px-4 text-center" style={{ backgroundColor: "#111111" }}>
          <p className="text-white/50 text-xs">
            +18 años / Jugar compulsivamente es perjudicial para la salud
          </p>
        </div>
      </div>

      {/* Modal — .modal- */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div
            className="relative w-full max-w-md rounded-2xl p-8 shadow-2xl animate-scale-in"
            style={{ backgroundColor: "#1e2a3a" }}
          >
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            <h2 className="text-white text-3xl font-black text-center mb-1">
              {page.modal_title || "¡Regístrate ahora!"}
            </h2>
            <p className="text-white/60 text-center mb-6">
              {page.modal_subtitle || "Y participa por premios"}
            </p>

            <div className="space-y-3">
              {links.map((link) => (
                <button
                  key={link.id}
                  onClick={() => onClickLink(link)}
                  className="w-full py-3 px-6 rounded-full bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition-all duration-200 hover:scale-[1.02]"
                >
                  {link.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
