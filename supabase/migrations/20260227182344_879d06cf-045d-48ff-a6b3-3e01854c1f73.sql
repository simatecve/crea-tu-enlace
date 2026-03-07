
-- Add design_mode column to landing_pages
ALTER TABLE public.landing_pages 
ADD COLUMN design_mode text NOT NULL DEFAULT 'default';

-- Add promo_title and promo_subtitle for default design
ALTER TABLE public.landing_pages 
ADD COLUMN promo_title text DEFAULT 'Registrate y obtené:';

ALTER TABLE public.landing_pages 
ADD COLUMN promo_text text DEFAULT '$25.000 DE BONO Y DUPLICAMOS TU PRIMERA CARGA.';

ALTER TABLE public.landing_pages 
ADD COLUMN cta_text text DEFAULT 'Registrate GRATIS';

ALTER TABLE public.landing_pages 
ADD COLUMN modal_title text DEFAULT '¡Regístrate ahora!';

ALTER TABLE public.landing_pages 
ADD COLUMN modal_subtitle text DEFAULT 'Y participa por premios';

ALTER TABLE public.landing_pages 
ADD COLUMN logo_url text;
