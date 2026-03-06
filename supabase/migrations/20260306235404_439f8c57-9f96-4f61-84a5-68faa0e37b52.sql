CREATE POLICY "Permitir leer foto de perfil"
ON public.profiles
FOR SELECT
TO public
USING (true);