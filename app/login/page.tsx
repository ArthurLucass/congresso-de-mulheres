"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Importação dinâmica do Supabase para evitar problemas de inicialização
      const { supabase } = await import("@/lib/supabase");

      // Autenticar com Supabase
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Erro ao autenticar");
      }

      // Verificar se o usuário é admin
      console.log("Verificando admin para email:", email);

      const { data: adminData, error: adminError } = await supabase
        .from("admins")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      console.log("Admin Data:", adminData);
      console.log("Admin Error:", adminError);

      if (adminError) {
        await supabase.auth.signOut();
        throw new Error(`Erro ao verificar admin: ${adminError.message}`);
      }

      if (!adminData) {
        await supabase.auth.signOut();
        throw new Error(
          "Acesso negado. Email não cadastrado como administrador.",
        );
      }

      // Redirecionar para o painel administrativo
      router.push("/admin");
    } catch (err: any) {
      setError(
        err.message || "Erro ao fazer login. Verifique suas credenciais.",
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center py-4 sm:py-8 px-3 sm:px-4 lg:px-8">
      <div className="max-w-md w-full">
        {/* Card de Login */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl p-6 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
              Login Administrativo
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 sm:mt-2">
              Acesso restrito para administradores
            </p>
          </div>

          {error && (
            <div className="mb-4 sm:mb-6 bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm sm:text-base">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* E-mail */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2"
              >
                E-mail
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                required
                autoComplete="email"
              />
            </div>

            {/* Senha */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2"
              >
                Senha
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                required
                autoComplete="current-password"
              />
            </div>

            {/* Botão de Login */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="mt-4 sm:mt-6 text-center">
            <a
              href="/inscricao"
              className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              Voltar para o formulário de inscrição
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
