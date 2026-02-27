import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Link2, Eye, EyeOff } from "lucide-react";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  if (authLoading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isForgot) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setLoading(false);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Correo enviado", description: "Revisa tu bandeja de entrada para restablecer tu contraseña." });
        setIsForgot(false);
      }
      return;
    }

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        toast({ title: "Error al iniciar sesión", description: error.message, variant: "destructive" });
      } else {
        navigate("/dashboard");
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      setLoading(false);
      if (error) {
        toast({ title: "Error al registrarse", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "¡Registro exitoso!", description: "Revisa tu correo para confirmar tu cuenta." });
        setIsLogin(true);
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Link2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">
            {isForgot ? "Recuperar contraseña" : isLogin ? "Iniciar sesión" : "Crear cuenta"}
          </CardTitle>
          <CardDescription>
            {isForgot
              ? "Ingresa tu correo y te enviaremos un enlace"
              : isLogin
              ? "Accede a tu cuenta para gestionar tus páginas"
              : "Regístrate para crear tus mini landings"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {!isForgot && (
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Cargando..."
                : isForgot
                ? "Enviar enlace"
                : isLogin
                ? "Iniciar sesión"
                : "Registrarse"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm space-y-2">
            {!isForgot && isLogin && (
              <button
                className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                onClick={() => setIsForgot(true)}
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}
            <div>
              {isForgot ? (
                <button
                  className="text-primary hover:underline"
                  onClick={() => setIsForgot(false)}
                >
                  Volver al inicio de sesión
                </button>
              ) : (
                <button
                  className="text-primary hover:underline"
                  onClick={() => setIsLogin(!isLogin)}
                >
                  {isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
