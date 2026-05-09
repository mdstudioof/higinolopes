import React, { useState } from "react";
import { UserRole, User } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Croissant, LogIn, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface LoginProps {
  onLogin: (user: User) => void;
  logoUrl?: string;
}

const Login: React.FC<LoginProps> = ({ onLogin, logoUrl }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    const { data: user, error } = await supabase
      .from("app_users")
      .select("id, email, name, role")
      .eq("email", email)
      .eq("password", password)
      .single();

    setLoading(false);

    if (user && !error) {
      onLogin(user as User);
    } else {
      toast.error("E-mail ou senha incorretos.");
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-xl shadow-orange-200 overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <Croissant size={32} />
            )}
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Bem-vindo</h2>
          <p className="mt-2 text-slate-500">Acesse o sistema da Panificadora Higino Lopes</p>
        </div>

        <Card className="border-none shadow-2xl shadow-slate-200">
          <CardHeader>
            <CardTitle className="text-xl">Login</CardTitle>
            <CardDescription>
              Use seu e-mail e senha para entrar.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="exemplo@higinolopes.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={loading} className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white font-semibold">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;
