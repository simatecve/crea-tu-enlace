import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SocialIcon from "@/components/SocialIcon";
import { X } from "lucide-react";
import logoDefault from "@/assets/logo-default.png";
import verticalPattern from "@/assets/patterns/verticalpattern.png";
import diagonalPattern from "@/assets/patterns/diagonalpattern.png";

function getOrCreateVisitorId(): string {
  const cookieName = "_vid";
  const match = document.cookie.match(new RegExp(`(?:^|; )${cookieName}=([^;]*)`));
  if (match) return decodeURIComponent(match[1]);
  const id = crypto.randomUUID();
  document.cookie = `${cookieName}=${id}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
  return id;
}

export default function PublicLanding() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<any>(null);
  const [links, setLinks] = useState<any[]>([]);
  const [profile, setProfile] = useState<{ avatar_url: string | null } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [visitorId] = useState(() => getOrCreateVisitorId());

  // Inject Meta Pixel
  useEffect(() => {
    if (!page?.meta_pixel_id) return;
    const pixelId = page.meta_pixel_id;
    const w = window as any;

    // Initialize fbq queue if not exists
    if (!w.fbq) {
      const n: any = (w.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      });
      if (!w._fbq) w._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
    }

    // Ensure script is in DOM (don't duplicate)
    if (!document.querySelector('script[src*="fbevents.js"]')) {
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(script);
    }

    // Always call init + track (fbq deduplicates internally)
    w.fbq("init", pixelId);
    w.fbq("track", "PageView");

    // noscript fallback
    if (!document.querySelector('img[src*="facebook.com/tr"]')) {
      const noscript = document.createElement("noscript");
      noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/>`;
      document.head.appendChild(noscript);
    }

    // No cleanup — pixel must persist for the session
  }, [page?.meta_pixel_id]);

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

  const handleClick = (link: any) => {
    // Open link FIRST — must be synchronous for Safari iOS popup blocker
    const newWindow = window.open(link.url, "_blank", "noopener,noreferrer");
    if (!newWindow) {
      // Fallback if popup was blocked
      window.location.href = link.url;
    }

    // Use sendBeacon for reliable tracking even during navigation
    const trackBody = JSON.stringify({
      landing_page_id: page!.id,
      link_id: link.id,
      event_type: "click",
      referrer: document.referrer || null,
    });
    const trackUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-event`;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(trackUrl, new Blob([trackBody], { type: "application/json" }));
    } else {
      fetch(trackUrl, { method: "POST", body: trackBody, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    }

    // Meta Pixel Lead event
    if (page?.meta_pixel_id && typeof (window as any).fbq === "function") {
      (window as any).fbq("track", "Lead");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-gray-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (notFound || !page) {
    if (slug === 'test') {
      const mockPage = { logo_url: logoDefault, cta_text: "Join now", promo_title: "Promo title", promo_text: "Promo text", promo_subtitle: "Subtitle" };
      return <DefaultLanding page={mockPage} links={[]} profile={{ avatar_url: "https://github.com/shadcn.png" }} modalOpen={modalOpen} setModalOpen={setModalOpen} onClickLink={handleClick} />;
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Página no encontrada</h1>
          <p className="text-muted-foreground">Esta página no existe o no está activa.</p>
        </div>
      </div>
    );
  }

  // Use page.avatar_url first, fallback to profile
  const effectiveProfile = { avatar_url: page.avatar_url || profile?.avatar_url || null };

  if (page.design_mode === "default") {
    return <DefaultLanding page={page} links={links} profile={effectiveProfile} modalOpen={modalOpen} setModalOpen={setModalOpen} onClickLink={handleClick} />;
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
        {(page.avatar_url || effectiveProfile?.avatar_url) && (
          <img
            src={page.avatar_url || effectiveProfile?.avatar_url}
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
        className="flex flex-col min-h-screen relative overflow-hidden bg-gradient-mobile md:bg-gradient-desktop"
        style={{
          background: "linear-gradient(to bottom, #98330d, #1B0E05)",
        }}
      >
        <style>{`
          @media (min-width: 768px) {
            .bg-gradient-mobile.md\\:bg-gradient-desktop {
              background: linear-gradient(to right, #98330d, #1B0E05) !important;
            }
          }
          .custom-avatar-box {
            width: 220px !important;
            height: 220px !important;
            min-width: 220px !important;
            min-height: 220px !important;
          }
          @media (min-width: 768px) {
            .custom-avatar-box {
              width: 380px !important;
              height: 380px !important;
              min-width: 380px !important;
              min-height: 380px !important;
            }
          }
          @media (min-width: 1024px) {
            .custom-avatar-box {
              width: 440px !important;
              height: 440px !important;
              min-width: 440px !important;
              min-height: 440px !important;
            }
          }
        `}</style>
        {/* Main content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[1100px] flex flex-col md:flex-row items-center justify-center relative z-10 px-4 py-8">
            {/* Left: Avatar with patterns — matches .conteiner-image */}
            <div className="relative flex items-center justify-center w-full md:w-[50%] min-h-[280px] md:min-h-[520px]">
              {/* pattern1 — vertical, top-left — shown on mobile now */}
              <img
                src={verticalPattern}
                alt=""
                className="absolute top-0 left-0 w-[120px] opacity-50 pointer-events-none select-none"
              />
              
              {/* Avatar — .image img */}
              <div 
                className="custom-avatar-box flex items-center justify-center shrink-0 rounded-full border-[5px] border-[#e8871e] overflow-hidden shadow-2xl shadow-orange-900/50 relative z-20 bg-black/20"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 w-full h-full bg-amber-900/30 flex items-center justify-center">
                    <span className="text-6xl text-white/20">?</span>
                  </div>
                )}
              </div>

              {/* pattern2 — diagonal, bottom-right — shown on mobile now */}
              <img
                src={diagonalPattern}
                alt=""
                className="absolute bottom-0 right-0 w-[140px] opacity-50 pointer-events-none select-none"
              />
            </div>

            {/* Right: Info — matches .conteiner-info */}
            <div className="flex flex-col items-start w-full md:w-[55%] text-white px-4 md:px-10">
              {/* Logo — .image-info img */}
              <img
                src={page.logo_url || logoDefault}
                alt="Logo"
                className="h-[50px] md:h-[70px] object-contain mb-[15px] md:mb-6 self-center md:self-start"
              />

              {/* CTA Button — solid orange bg, black text */}
              <button
                onClick={() => setModalOpen(true)}
                className="w-full max-w-[320px] h-[50px] rounded-[10px] text-black font-semibold text-[22px] transition-all duration-200 hover:scale-105 mb-2 whitespace-nowrap border-none"
                style={{ backgroundColor: "#ff9c42", fontFamily: "sans-serif" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e88a35")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ff9c42")}
              >
                {page.cta_text || "Registrate GRATIS"}
              </button>

              {/* Dotted divider - square dots */}
              <div className="w-full max-w-[380px]" style={{ height: "6px", backgroundImage: "repeating-linear-gradient(to right, #f9aa69 0px, #f9aa69 6px, transparent 6px, transparent 12px)", margin: "0px 0 15px 0" }} />

              {/* .small-text */}
              <p className="text-white text-[20px] mb-0" style={{ fontWeight: 900, fontFamily: 'sans-serif' }}>
                {page.promo_title || "Registrate y obtené:"}
              </p>

              {/* .bold-text1 + gift icon inline on mobile */}
              <div className="flex flex-row md:flex-col items-baseline md:items-start flex-wrap">
                <p className="text-white text-[30px] md:text-[46px] lg:text-[50px] leading-[1] max-w-[500px]" style={{ fontFamily: 'sans-serif', fontWeight: 900 }}>
                  {page.promo_text || "$25.000 DE BONO Y DUPLICAMOS TU PRIMERA CARGA."}
                </p>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block md:block w-[28px] h-[28px] md:w-[32px] md:h-[32px] ml-1 md:ml-0 md:my-2 shrink-0"><path d="M12 7V20M12 7H8.46429C7.94332 7 7.4437 6.78929 7.07533 6.41421C6.70695 6.03914 6.5 5.53043 6.5 5C6.5 4.46957 6.70695 3.96086 7.07533 3.58579C7.4437 3.21071 7.94332 3 8.46429 3C11.2143 3 12 7 12 7ZM12 7H15.5357C16.0567 7 16.5563 6.78929 16.9247 6.41421C17.293 6.03914 17.5 5.53043 17.5 5C17.5 4.46957 17.293 3.96086 16.9247 3.58579C16.5563 3.21071 16.0567 3 15.5357 3C12.7857 3 12 7 12 7ZM5 12H19V17.8C19 18.9201 19 19.4802 18.782 19.908C18.5903 20.2843 18.2843 20.5903 17.908 20.782C17.4802 21 16.9201 21 15.8 21H8.2C7.07989 21 6.51984 21 6.09202 20.782C5.71569 20.5903 5.40973 20.2843 5.21799 19.908C5 19.4802 5 18.9201 5 17.8V12ZM4.6 12H19.4C19.9601 12 20.2401 12 20.454 11.891C20.6422 11.7951 20.7951 11.6422 20.891 11.454C21 11.2401 21 10.9601 21 10.4V8.6C21 8.03995 21 7.75992 20.891 7.54601C20.7951 7.35785 20.6422 7.20487 20.454 7.10899C20.2401 7 19.9601 7 19.4 7H4.6C4.03995 7 3.75992 7 3.54601 7.10899C3.35785 7.20487 3.20487 7.35785 3.10899 7.54601C3 7.75992 3 8.03995 3 8.6V10.4C3 10.9601 3 11.2401 3.10899 11.454C3.20487 11.6422 3.35785 11.7951 3.54601 11.891C3.75992 12 4.03995 12 4.6 12Z" stroke="#ff9c42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>

              {/* .bold-text2 — promo subtitle */}
              {(page as any).promo_subtitle && (
                <p className="text-white text-[30px] md:text-[36px] lg:text-[40px] leading-[1] mb-[10px] max-w-[380px]" style={{ fontFamily: 'sans-serif', fontWeight: 900 }}>
                  {(page as any).promo_subtitle}
                </p>
              )}

              {/* Dotted divider - square dots */}
              <div className="w-full max-w-[380px]" style={{ height: "6px", backgroundImage: "repeating-linear-gradient(to right, #f9aa69 0px, #f9aa69 6px, transparent 6px, transparent 12px)", margin: "10px 0 0 0" }} />
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
             style={{ backgroundColor: "#1a2535" }}
           >
             <button
               onClick={() => setModalOpen(false)}
               className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
             >
               <X className="h-6 w-6" />
             </button>

             <h2 className="text-white text-3xl font-black text-center mb-2 italic">
               {page.modal_title || "¡Regístrate ahora!"}
             </h2>
             <p className="text-white/60 text-center mb-8">
               {page.modal_subtitle || "Y participa por premios"}
             </p>

             <div className="space-y-3 flex flex-col items-center">
               {links.map((link) => (
                 <button
                   key={link.id}
                   onClick={() => onClickLink(link)}
                   className="w-full max-w-[300px] py-3 px-6 rounded-full bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition-all duration-200 hover:scale-[1.02]"
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
