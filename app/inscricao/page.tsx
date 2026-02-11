"use client";

import { useState, useEffect, FormEvent } from "react";
import InputMask from "react-input-mask";
import axios from "axios";
import { supabase } from "@/lib/supabase";
import { DIRETRIZES_IMAGEM_DADOS, REGULAMENTO_CMC } from "@/lib/termos";

export default function InscricaoPage() {
  const [formData, setFormData] = useState({
    nome: "",
    idade: "",
    telefone: "",
    email: "",
    parroquia: "",
    cidade: "",
    tamanho: "",
    incluiAlmoco: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [aceitaUsoImagem, setAceitaUsoImagem] = useState(false);
  const [aceitaRegulamento, setAceitaRegulamento] = useState(false);
  const [showModalDiretrizes, setShowModalDiretrizes] = useState(false);
  const [showModalRegulamento, setShowModalRegulamento] = useState(false);
  const [loteConfig, setLoteConfig] = useState<{
    numero_lote: number;
    preco_base: number;
    preco_almoco: number;
  } | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  const valorBase = loteConfig?.preco_base || 40;
  const valorAlmoco = loteConfig?.preco_almoco || 25;
  const valorTotal = valorBase + (formData.incluiAlmoco ? valorAlmoco : 0);

  useEffect(() => {
    const loadLoteConfig = async () => {
      try {
        // Buscar lote ativo
        const { data: configData, error: configError } = await supabase
          .from("config_sistema")
          .select("valor")
          .eq("chave", "lote_ativo")
          .single();

        if (configError) throw configError;

        const loteAtivo = parseInt(configData.valor);

        // Buscar configurações do lote ativo de config_sistema
        const { data: configsData, error: configsError } = await supabase
          .from("config_sistema")
          .select("chave, valor")
          .or(
            `chave.eq.lote_${loteAtivo}_preco_base,chave.eq.lote_${loteAtivo}_preco_almoco`,
          );

        if (configsError) throw configsError;

        // Montar objeto de configuração
        const config: any = { numero_lote: loteAtivo };
        configsData?.forEach((item) => {
          if (item.chave.includes("preco_base")) {
            config.preco_base = parseFloat(item.valor);
          } else if (item.chave.includes("preco_almoco")) {
            config.preco_almoco = parseFloat(item.valor);
          }
        });

        setLoteConfig(config);
      } catch (error) {
        console.error("Erro ao carregar configuração do lote:", error);
        // Manter valores padrão em caso de erro
      } finally {
        setIsLoadingConfig(false);
      }
    };

    loadLoteConfig();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCancel = () => {
    setFormData({
      nome: "",
      idade: "",
      telefone: "",
      email: "",
      parroquia: "",
      cidade: "",
      tamanho: "",
      incluiAlmoco: false,
    });
    setError("");
  };

  const validateForm = () => {
    if (!formData.nome.trim()) return "Nome completo é obrigatório";
    if (!formData.idade || parseInt(formData.idade) <= 0)
      return "Idade válida é obrigatória";
    if (!formData.telefone.replace(/\D/g, "").match(/^\d{11}$/))
      return "Telefone inválido";
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
      return "E-mail inválido";
    if (!formData.parroquia.trim()) return "Paróquia é obrigatória";
    if (!formData.cidade.trim()) return "Cidade é obrigatória";
    if (!formData.tamanho) return "Tamanho da camisa é obrigatório";
    if (!aceitaUsoImagem)
      return "Você deve aceitar as Diretrizes de Uso de Imagem e Dados Pessoais";
    if (!aceitaRegulamento) return "Você deve aceitar o Regulamento Geral";
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      // 🔒 SEGURANÇA: Enviar apenas dados do formulário
      // NÃO enviar valor_total ou checkout_url
      const response = await axios.post("/api/pedidos/create", {
        nome: formData.nome,
        idade: parseInt(formData.idade),
        telefone: formData.telefone,
        email: formData.email,
        parroquia: formData.parroquia,
        cidade: formData.cidade,
        tamanho: formData.tamanho,
        inclui_almoco: formData.incluiAlmoco,
        // ❌ NÃO enviar: valor_total, checkout_url, lote
      });

      // 🔒 VALIDAÇÃO: Verificar se resposta do backend é válida
      if (!response.data.init_point) {
        throw new Error("Link de pagamento não foi gerado");
      }

      // 🔒 VALIDAÇÃO: Verificar se URL é válida
      if (!response.data.init_point.startsWith("http")) {
        throw new Error("URL de checkout inválida");
      }

      console.log("✅ Pedido validado pelo backend:", {
        lote: response.data.lote,
        valor: response.data.valor_total,
      });

      // Redirecionar para o checkout validado pelo backend
      window.location.href = response.data.init_point;
    } catch (err: any) {
      console.error("❌ Erro ao processar pedido:", err);
      setError("Erro interno. Tente novamente.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Loading State */}
        {isLoadingConfig && (
          <div className="mb-6 bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="animate-pulse">
              <div className="text-gray-600 font-medium">
                Carregando configurações do lote...
              </div>
            </div>
          </div>
        )}

        {/* Banner do Lote Ativo */}
        {!isLoadingConfig && loteConfig && (
          <div className="mb-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-lg p-6">
            <div className="text-center">
              <div className="text-sm font-semibold uppercase tracking-wider mb-2 opacity-90">
                Lote Ativo
              </div>
              <div className="text-4xl font-bold mb-3">
                Lote {loteConfig.numero_lote}
              </div>
              <div className="text-xl sm:text-2xl font-semibold mb-2">
                R$ {(loteConfig.preco_base + 25).toFixed(2).replace(".", ",")}
              </div>
              <div className="text-sm opacity-90">
                Inscrição: R${" "}
                {loteConfig.preco_base.toFixed(2).replace(".", ",")} | Almoço:
                R$ 25,00
              </div>
            </div>
          </div>
        )}

        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-8">
            Formulário de Inscrição
          </h1>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nome Completo */}
            <div>
              <label
                htmlFor="nome"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Nome Completo *
              </label>
              <input
                type="text"
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                required
              />
            </div>

            {/* Idade */}
            <div>
              <label
                htmlFor="idade"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Idade *
              </label>
              <input
                type="number"
                id="idade"
                name="idade"
                value={formData.idade}
                onChange={handleChange}
                min="1"
                max="120"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                required
              />
            </div>

            {/* Telefone */}
            <div>
              <label
                htmlFor="telefone"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Telefone *
              </label>
              <InputMask
                mask="(99) 99999-9999"
                value={formData.telefone}
                onChange={handleChange}
              >
                {(inputProps: any) => (
                  <input
                    {...inputProps}
                    type="tel"
                    id="telefone"
                    name="telefone"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    required
                  />
                )}
              </InputMask>
            </div>

            {/* E-mail */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                E-mail *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                required
              />
            </div>

            {/* Paróquia */}
            <div>
              <label
                htmlFor="parroquia"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Paróquia que frequenta *
              </label>
              <input
                type="text"
                id="parroquia"
                name="parroquia"
                value={formData.parroquia}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                required
              />
            </div>

            {/* Cidade */}
            <div>
              <label
                htmlFor="cidade"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Cidade *
              </label>
              <input
                type="text"
                id="cidade"
                name="cidade"
                value={formData.cidade}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                required
              />
            </div>

            {/* Tamanho da Camisa */}
            <div>
              <label
                htmlFor="tamanho"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Tamanho da Camisa *
              </label>
              <select
                id="tamanho"
                name="tamanho"
                value={formData.tamanho}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                required
              >
                <option value="">Selecione um tamanho</option>
                <option value="P">P</option>
                <option value="M">M</option>
                <option value="G">G</option>
                <option value="GG">GG</option>
              </select>
            </div>

            {/* Checkbox Almoço */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="incluiAlmoco"
                  name="incluiAlmoco"
                  checked={formData.incluiAlmoco}
                  onChange={handleChange}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="incluiAlmoco"
                  className="ml-3 text-sm font-medium text-gray-700"
                >
                  Incluir Almoço (+R$ 25,00) )
                </label>
              </div>
            </div>

            {/* Valor Total com Breakdown */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl p-6 space-y-3">
              <div className="text-center mb-4">
                <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  Resumo do Pedido
                </div>
                {loteConfig && (
                  <div className="text-xs text-gray-500">
                    Lote {loteConfig.numero_lote} vigente
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-gray-700">
                  <span className="font-medium">
                    Inscrição (Lote {loteConfig?.numero_lote || 1}):
                  </span>
                  <span className="font-semibold">
                    R$ {valorBase.toFixed(2).replace(".", ",")}
                  </span>
                </div>

                {formData.incluiAlmoco && (
                  <div className="flex justify-between items-center text-gray-700">
                    <span className="font-medium">Almoço:</span>
                    <span className="font-semibold">R$ 25,00</span>
                  </div>
                )}

                <div className="border-t-2 border-blue-300 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-gray-800">
                      Valor Total:
                    </span>
                    <span className="text-2xl sm:text-3xl font-bold text-blue-600">
                      R$ {valorTotal.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-center text-xs text-gray-600 mt-4 pt-4 border-t border-blue-200 space-y-2">
                <p className="font-semibold text-sm text-gray-700">
                  🔒 Pagamento Seguro
                </p>
                <p className="text-gray-600">
                  Pagamento processado via{" "}
                  <span className="font-semibold">Mercado Pago</span>
                </p>
                <p className="text-green-700 font-medium">
                  💳 PIX (Instantâneo) | 📄 Boleto (até 2 dias)
                </p>
                <p className="text-gray-500 text-xs">
                  Você NÃO precisa ter conta no Mercado Pago.
                  <br />
                  Pague com{" "}
                  <span className="font-semibold">qualquer banco</span> de sua
                  preferência.
                </p>
              </div>
            </div>

            {/* Termos de Aceite */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="aceitaUsoImagem"
                  checked={aceitaUsoImagem}
                  onChange={(e) => setAceitaUsoImagem(e.target.checked)}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5 flex-shrink-0"
                />
                <div className="flex-1">
                  <label
                    htmlFor="aceitaUsoImagem"
                    className="text-sm text-gray-700"
                  >
                    Declaro que li e aceito as{" "}
                    <button
                      type="button"
                      onClick={() => setShowModalDiretrizes(true)}
                      className="font-semibold text-blue-600 hover:text-blue-800 underline"
                    >
                      Diretrizes de Uso de Imagem e Dados Pessoais
                    </button>
                    .
                  </label>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="aceitaRegulamento"
                  checked={aceitaRegulamento}
                  onChange={(e) => setAceitaRegulamento(e.target.checked)}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5 flex-shrink-0"
                />
                <div className="flex-1">
                  <label
                    htmlFor="aceitaRegulamento"
                    className="text-sm text-gray-700"
                  >
                    Declaro que li e concordo com o{" "}
                    <button
                      type="button"
                      onClick={() => setShowModalRegulamento(true)}
                      className="font-semibold text-blue-600 hover:text-blue-800 underline"
                    >
                      Regulamento Geral
                    </button>
                    .
                  </label>
                </div>
              </div>
            </div>

            {/* Aviso sobre Métodos de Pagamento */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800 mb-1">
                    💡 Como funciona o pagamento:
                  </p>
                  <ul className="text-xs text-gray-700 space-y-1">
                    <li>
                      ✅ <span className="font-medium">PIX:</span> Pague
                      instantaneamente com qualquer banco ou app
                    </li>
                    <li>
                      ✅ <span className="font-medium">Boleto:</span> Código de
                      barras válido em qualquer banco
                    </li>
                    <li>
                      ✅ <span className="font-medium">Não precisa</span> ter
                      conta no Mercado Pago
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  isLoadingConfig ||
                  !aceitaUsoImagem ||
                  !aceitaRegulamento
                }
                className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? "Processando..."
                  : "Finalizar Inscrição e Ir para Pagamento"}
              </button>
            </div>
          </form>
        </div>

        {/* Footer com Redes Sociais */}
        <footer className="mt-8 bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Siga nossas redes sociais
            </h3>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-6">
              {/* WhatsApp */}
              <a
                href="https://chat.whatsapp.com/IV6CXOqwRsnLxLdPmo5wCJ"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition shadow-md hover:shadow-lg text-sm sm:text-base"
              >
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                Grupo WhatsApp
              </a>

              {/* Instagram */}
              <a
                href="https://www.instagram.com/congmulherescatolicasitb"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg transition shadow-md hover:shadow-lg text-sm sm:text-base"
              >
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
                Instagram
              </a>
            </div>
          </div>
        </footer>

        {/* Modal - Diretrizes de Uso de Imagem */}
        {showModalDiretrizes && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  Diretrizes de Uso de Imagem e Dados Pessoais
                </h2>
                <button
                  onClick={() => setShowModalDiretrizes(false)}
                  className="text-2xl hover:opacity-80 transition"
                >
                  ×
                </button>
              </div>

              <div className="p-6 whitespace-pre-wrap text-sm text-gray-700 leading-relaxed space-y-4">
                {DIRETRIZES_IMAGEM_DADOS}
              </div>

              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex gap-4">
                <button
                  onClick={() => setShowModalDiretrizes(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition font-semibold"
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    setAceitaUsoImagem(true);
                    setShowModalDiretrizes(false);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                >
                  Eu Aceito
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal - Regulamento Geral */}
        {showModalRegulamento && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Regulamento Geral</h2>
                <button
                  onClick={() => setShowModalRegulamento(false)}
                  className="text-2xl hover:opacity-80 transition"
                >
                  ×
                </button>
              </div>

              <div className="p-6 whitespace-pre-wrap text-sm text-gray-700 leading-relaxed space-y-4">
                {REGULAMENTO_CMC}
              </div>

              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex gap-4">
                <button
                  onClick={() => setShowModalRegulamento(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition font-semibold"
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    setAceitaRegulamento(true);
                    setShowModalRegulamento(false);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                >
                  Eu Aceito
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
