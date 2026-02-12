"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface Pedido {
  id: string;
  nome: string;
  idade: number;
  telefone: string;
  email: string;
  parroquia: string;
  cidade: string;
  tamanho: string;
  inclui_almoco: boolean;
  valor_total: number;
  status_pagamento: string;
  data_compra: string;
  created_at: string;
}

interface LoteConfig {
  numero: number;
  preco_base: number;
  preco_almoco: number;
}

export default function AdminPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filteredPedidos, setFilteredPedidos] = useState<Pedido[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editingPedido, setEditingPedido] = useState<Pedido | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loteAtivo, setLoteAtivo] = useState<string>("1");
  const router = useRouter();

  const lotesConfig: Record<string, LoteConfig> = {
    "1": { numero: 1, preco_base: 80, preco_almoco: 25 },
    "2": { numero: 2, preco_base: 90, preco_almoco: 25 },
    "3": { numero: 3, preco_base: 100, preco_almoco: 25 },
  };

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [isChangingLote, setIsChangingLote] = useState(false);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    // Verificar se é admin
    const { data: adminData } = await supabase
      .from("admins")
      .select("*")
      .eq("email", session.user.email)
      .single();

    if (!adminData) {
      await supabase.auth.signOut();
      router.push("/login");
    }
  };

  const loadPedidos = async () => {
    try {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPedidos(data || []);
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLoteAtivo = async () => {
    try {
      const { data, error } = await supabase
        .from("config_sistema")
        .select("valor")
        .eq("chave", "lote_ativo")
        .single();

      if (error) throw error;
      if (data) {
        setLoteAtivo(data.valor);
      }
    } catch (error) {
      console.error("Erro ao carregar lote ativo:", error);
    }
  };

  const handleLoteChange = async (novoLote: string) => {
    if (novoLote === loteAtivo) return;

    setIsChangingLote(true);

    try {
      // Atualizar config_sistema
      const { error: configError } = await supabase
        .from("config_sistema")
        .update({ valor: novoLote })
        .eq("chave", "lote_ativo");

      if (configError) {
        console.error("Erro ao atualizar lote:", configError);
        setToastMessage(`❌ Erro ao ativar lote: ${configError.message}`);
        setToastType("error");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
        return;
      }

      setLoteAtivo(novoLote);

      const loteConfig = lotesConfig[novoLote];
      const valorBase = loteConfig.preco_base.toFixed(2).replace(".", ",");
      const valorAlmoco = "25,00";
      const valorTotal = (loteConfig.preco_base + loteConfig.preco_almoco)
        .toFixed(2)
        .replace(".", ",");

      setToastMessage(
        `✅ Lote ${novoLote} ativado! Valor: R$ ${valorTotal} (Base R$ ${valorBase} + Almoço R$ ${valorAlmoco})`,
      );
      setToastType("success");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);

      // Recarregar pedidos
      loadPedidos();
    } catch (error: any) {
      console.error("Erro ao atualizar lote:", error);
      setToastMessage(`❌ Erro ao ativar lote: ${error.message}`);
      setToastType("error");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } finally {
      setIsChangingLote(false);
    }
  };

  const filterPedidos = () => {
    let filtered = [...pedidos];

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.email.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((p) => p.status_pagamento === statusFilter);
    }

    setFilteredPedidos(filtered);
  };

  useEffect(() => {
    checkAuth();
    loadPedidos();
    loadLoteAtivo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterPedidos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter, pedidos]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePedidoId, setDeletePedidoId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deletePedidoId) return;
    try {
      const { error } = await supabase
        .from("pedidos")
        .delete()
        .eq("id", deletePedidoId);
      if (error) {
        setToastMessage("Erro ao excluir pedido. Tente novamente.");
        setToastType("error");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 4000);
        setShowDeleteModal(false);
        return;
      }
      setToastMessage("Pedido excluído com sucesso!");
      setToastType("success");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
      setShowDeleteModal(false);
      loadPedidos();
    } catch (error: any) {
      setToastMessage("Erro ao excluir pedido. Tente novamente.");
      setToastType("error");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
      setShowDeleteModal(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("pedidos")
        .update({ status_pagamento: newStatus })
        .eq("id", id);

      if (error) {
        setToastMessage("Erro ao atualizar status. Tente novamente.");
        setToastType("error");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 4000);
        return;
      }
      setToastMessage("Status atualizado com sucesso!");
      setToastType("success");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
      loadPedidos();
    } catch (error: any) {
      console.error("Erro ao atualizar status:", error);
      alert(`Erro ao atualizar status: ${error.message}`);
    }
  };

  const handleEditSubmit = async () => {
    if (!editingPedido) return;

    try {
      // Recalcular valor total baseado no almoço (R$25,00)
      const valorBase = 40;
      const valorAlmoco = editingPedido.inclui_almoco ? 25 : 0;
      const valorTotal = valorBase + valorAlmoco;

      const { error } = await supabase
        .from("pedidos")
        .update({
          nome: editingPedido.nome,
          idade: editingPedido.idade,
          telefone: editingPedido.telefone,
          email: editingPedido.email,
          parroquia: editingPedido.parroquia,
          cidade: editingPedido.cidade,
          tamanho: editingPedido.tamanho,
          inclui_almoco: editingPedido.inclui_almoco,
          valor_total: valorTotal,
        })
        .eq("id", editingPedido.id);

      if (error) {
        console.error("Erro ao atualizar pedido:", error);
        setToastMessage("Erro ao atualizar pedido. Tente novamente.");
        setToastType("error");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 4000);
        return;
      }

      setToastMessage("Pedido atualizado com sucesso!");
      setToastType("success");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
      setShowEditModal(false);
      setEditingPedido(null);
      loadPedidos();
    } catch (error: any) {
      console.error("Erro ao atualizar pedido:", error);
      setToastMessage("Erro ao atualizar pedido. Tente novamente.");
      setToastType("error");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
      setShowEditModal(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Relatório de Pedidos", 14, 22);

    autoTable(doc, {
      startY: 30,
      head: [
        [
          "Nome",
          "Email",
          "Telefone",
          "Cidade",
          "Status",
          "Valor",
          "Data de Compra",
        ],
      ],
      body: filteredPedidos.map((p) => [
        p.nome,
        p.email,
        p.telefone,
        p.cidade,
        p.status_pagamento,
        `R$ ${p.valor_total.toFixed(2)}`,
        new Date(p.created_at || p.data_compra).toLocaleDateString("pt-BR"),
      ]),
    });

    doc.save("pedidos.pdf");
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredPedidos.map((p) => ({
        Nome: p.nome,
        Idade: p.idade,
        Telefone: p.telefone,
        Email: p.email,
        Paróquia: p.parroquia,
        Cidade: p.cidade,
        Tamanho: p.tamanho,
        "Inclui Almoço": p.inclui_almoco ? "Sim" : "Não",
        "Valor Total": p.valor_total,
        Status: p.status_pagamento,
        "Data de Criação": new Date(p.created_at).toLocaleDateString("pt-BR"),
      })),
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pedidos");
    XLSX.writeFile(workbook, "pedidos.xlsx");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div
            className={`${
              toastType === "success"
                ? "bg-green-500 border-green-600"
                : "bg-red-500 border-red-600"
            } text-white px-6 py-4 rounded-lg shadow-lg border-2 flex items-center space-x-3 max-w-md`}
          >
            <span className="text-lg font-medium">{toastMessage}</span>
            <button
              onClick={() => setShowToast(false)}
              className="ml-4 text-white hover:text-gray-200 font-bold text-xl"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow">
        <div className="mx-auto px-3 sm:px-4 lg:px-6 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                Painel Administrativo
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Gerencie inscrições e configurações do evento
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
              {/* Badge do Lote Ativo */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-lg whitespace-nowrap">
                <div className="text-xs font-medium uppercase tracking-wide">
                  Lote Atual
                </div>
                <div className="text-xl sm:text-2xl font-bold">
                  Lote {loteAtivo}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm sm:text-base whitespace-nowrap"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="mx-auto px-2 sm:px-3 md:px-4 lg:px-6 py-4 sm:py-6 md:py-8">
        {/* Filtros e Exportação */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Todos os status</option>
              <option value="Pendente">Pendente</option>
              <option value="Pago">Pago</option>
              <option value="Cancelado">Cancelado</option>
            </select>

            <div className="flex gap-2">
              <button
                onClick={exportToPDF}
                className="flex-1 px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm sm:text-base"
              >
                📄 PDF
              </button>
              <button
                onClick={exportToExcel}
                className="flex-1 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm sm:text-base"
              >
                📊 Excel
              </button>
            </div>
          </div>

          {/* Seleção de Lote Ativo */}
          <div className="flex flex-col gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-gray-200">
            <label className="text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">
              🎏 Configurar Lote Ativo:
            </label>
            <select
              value={loteAtivo}
              onChange={(e) => handleLoteChange(e.target.value)}
              disabled={isChangingLote}
              className="w-full px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm border-2 border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none bg-blue-50 font-semibold text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {Object.entries(lotesConfig).map(([numero, config]) => {
                const valorBase = config.preco_base
                  .toFixed(2)
                  .replace(".", ",");
                const valorAlmoco = "25,00";
                const valorTotal = (config.preco_base + config.preco_almoco)
                  .toFixed(2)
                  .replace(".", ",");
                return (
                  <option key={numero} value={numero}>
                    Lote {numero} — R$ {valorBase} (sem almoço) / R${" "}
                    {valorTotal} (com almoço)
                  </option>
                );
              })}
            </select>
            {isChangingLote && (
              <span className="flex items-center text-blue-600 text-xs sm:text-sm">
                <svg
                  className="animate-spin h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Atualizando...
              </span>
            )}
            {!isChangingLote && (
              <span className="text-xs sm:text-sm text-gray-600 italic">
                Novas inscrições usarão o lote selecionado
              </span>
            )}
          </div>

          <div className="text-sm text-gray-600">
            Total: {filteredPedidos.length} pedido(s)
          </div>
        </div>

        {/* Tabela de Pedidos */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Idade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Telefone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    E-mail
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paróquia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cidade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tamanho
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Almoço
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data de Compra
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPedidos.map((pedido) => (
                  <tr key={pedido.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pedido.nome}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pedido.idade}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pedido.telefone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pedido.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pedido.parroquia}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pedido.cidade}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pedido.tamanho}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pedido.inclui_almoco ? "Sim" : "Não"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      R$ {pedido.valor_total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pedido.data_compra || pedido.created_at
                        ? new Date(
                            pedido.data_compra || pedido.created_at,
                          ).toLocaleDateString("pt-BR", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          })
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={pedido.status_pagamento}
                        onChange={(e) =>
                          handleUpdateStatus(pedido.id, e.target.value)
                        }
                        className={`text-sm rounded-full px-3 py-1 font-semibold ${
                          pedido.status_pagamento === "Pago"
                            ? "bg-green-100 text-green-800"
                            : pedido.status_pagamento === "Pendente"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        <option value="Pendente">Pendente</option>
                        <option value="Pago">Pago</option>
                        <option value="Cancelado">Cancelado</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setEditingPedido(pedido);
                          setShowEditModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          setDeletePedidoId(pedido.id);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Excluir
                      </button>
                      {/* Modal de Exclusão */}
                      {showDeleteModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
                            <h2 className="text-xl font-bold mb-4">
                              Confirmar Exclusão
                            </h2>
                            <p className="mb-6 text-gray-700">
                              Tem certeza que deseja excluir este pedido?
                            </p>
                            <div className="flex gap-4">
                              <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition font-semibold"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={handleDelete}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                              >
                                Excluir
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Edição */}
      {showEditModal && editingPedido && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Editar Pedido</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={editingPedido.nome}
                  onChange={(e) =>
                    setEditingPedido({ ...editingPedido, nome: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Idade
                </label>
                <input
                  type="number"
                  value={editingPedido.idade}
                  onChange={(e) =>
                    setEditingPedido({
                      ...editingPedido,
                      idade: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  type="text"
                  value={editingPedido.telefone}
                  onChange={(e) =>
                    setEditingPedido({
                      ...editingPedido,
                      telefone: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  value={editingPedido.email}
                  onChange={(e) =>
                    setEditingPedido({
                      ...editingPedido,
                      email: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Paróquia
                </label>
                <input
                  type="text"
                  value={editingPedido.parroquia}
                  onChange={(e) =>
                    setEditingPedido({
                      ...editingPedido,
                      parroquia: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  value={editingPedido.cidade}
                  onChange={(e) =>
                    setEditingPedido({
                      ...editingPedido,
                      cidade: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tamanho da Camisa
                </label>
                <select
                  value={editingPedido.tamanho}
                  onChange={(e) =>
                    setEditingPedido({
                      ...editingPedido,
                      tamanho: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="P">P</option>
                  <option value="M">M</option>
                  <option value="G">G</option>
                  <option value="GG">GG</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={editingPedido.inclui_almoco}
                  onChange={(e) =>
                    setEditingPedido({
                      ...editingPedido,
                      inclui_almoco: e.target.checked,
                    })
                  }
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-3 text-sm font-medium text-gray-700">
                  Incluir Almoço
                </label>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingPedido(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditSubmit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS para animação do toast */}
      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
