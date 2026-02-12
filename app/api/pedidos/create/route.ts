import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { MercadoPagoConfig, Preference } from "mercadopago";

// Função auxiliar para criar preferência no Mercado Pago
async function createMercadoPagoPreference(data: {
  pedido_id: string;
  nome: string;
  email: string;
  valor_total: number;
  lote_id: number;
  preco_base: number;
  preco_almoco: number;
  inclui_almoco: boolean;
}) {
  const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
  });

  const preference = new Preference(client);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  console.log("🔍 AppURL sendo usada:", appUrl);
  console.log("🔍 URLs que serão enviadas:", {
    success: `${appUrl}/pagamento/sucesso`,
    failure: `${appUrl}/pagamento/falha`,
    pending: `${appUrl}/pagamento/pendente`,
  });

  const preferenceBody: any = {
    items: [
      {
        id: data.lote_id.toString(),
        title: `Inscrição Missão de Carnaval 2025 - Lote ${data.lote_id}`,
        description: `Ingresso: R$ ${data.preco_base.toFixed(2)}${
          data.inclui_almoco
            ? ` + Almoço: R$ ${data.preco_almoco.toFixed(2)}`
            : ""
        }`,
        quantity: 1,
        unit_price: data.valor_total,
        currency_id: "BRL",
      },
    ],
    payer: {
      name: data.nome,
      email: data.email,
    },
    external_reference: data.pedido_id,
    notification_url: `${appUrl}/api/webhook/mercadopago`,
    statement_descriptor: "MISSAO CARNAVAL 2025",
  };

  // Adicionar apenas back_urls, sem auto_return
  preferenceBody.back_urls = {
    success: `${appUrl}/pagamento/sucesso`,
    failure: `${appUrl}/pagamento/falha`,
    pending: `${appUrl}/pagamento/pendente`,
  };

  // Remover auto_return temporariamente para testar
  // preferenceBody.auto_return = "approved";

  return await preference.create({ body: preferenceBody });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      nome,
      idade,
      telefone,
      email,
      parroquia,
      cidade,
      tamanho,
      inclui_almoco,
    } = body;

    // 🔒 Validações básicas
    if (
      !nome ||
      !idade ||
      !telefone ||
      !email ||
      !parroquia ||
      !cidade ||
      !tamanho
    ) {
      return NextResponse.json(
        { error: "Todos os campos são obrigatórios" },
        { status: 400 },
      );
    }

    // 🔒 Buscar lote ativo
    const { data: configData, error: configError } = await supabase
      .from("config_sistema")
      .select("valor")
      .eq("chave", "lote_ativo")
      .single();

    if (configError || !configData) {
      console.error("❌ Erro ao buscar lote ativo:", configError);
      return NextResponse.json(
        { error: "Erro ao buscar configuração do sistema" },
        { status: 500 },
      );
    }

    const loteAtivo = parseInt(configData.valor);

    // 🔒 Buscar configurações de preço do lote ativo
    const { data: configsData, error: configsError } = await supabase
      .from("config_sistema")
      .select("chave, valor")
      .or(
        `chave.eq.lote_${loteAtivo}_preco_base,chave.eq.lote_${loteAtivo}_preco_almoco`,
      );

    if (configsError || !configsData || configsData.length === 0) {
      console.error("❌ Erro ao buscar configuração do lote:", configsError);
      return NextResponse.json(
        { error: "Erro ao buscar configuração do lote" },
        { status: 500 },
      );
    }

    // Valores base fixos conforme solicitado
    let precoBase = 0;
    let precoAlmoco = 25;
    if (loteAtivo === 1) {
      precoBase = 80;
    } else if (loteAtivo === 2) {
      precoBase = 90;
    } else if (loteAtivo === 3) {
      precoBase = 100;
    }
    const valorTotal = precoBase + (inclui_almoco ? precoAlmoco : 0);

    console.log("✅ Pedido validado:", {
      lote: loteAtivo,
      preco_base: precoBase,
      preco_almoco: 25,
      valor_calculado: valorTotal,
      inclui_almoco,
    });

    // 🆕 Criar preferência no Mercado Pago ANTES de salvar no banco
    // Isso evita criar registros órfãos se o pagamento falhar
    console.log("📞 Criando preferência de pagamento...");

    let preference;
    try {
      const preferenceMp = await createMercadoPagoPreference({
        pedido_id: `temp_${Date.now()}`, // ID temporário para criar preferência
        nome,
        email,
        valor_total: valorTotal,
        lote_id: loteAtivo,
        preco_base: precoBase,
        preco_almoco: 25,
        inclui_almoco: inclui_almoco || false,
      });

      preference = {
        id: preferenceMp.id,
        init_point: preferenceMp.init_point,
        sandbox_init_point: preferenceMp.sandbox_init_point,
      };

      console.log("✅ Preferência criada com sucesso:", preference.id);
    } catch (error: any) {
      console.error("❌ Erro ao criar preferência:", error);
      return NextResponse.json(
        {
          error: error.message || "Erro ao criar preferência de pagamento",
        },
        { status: 500 },
      );
    }

    // ✅ Agora sim, salvar pedido no Supabase
    const { data: pedidoData, error: pedidoError } = await supabase
      .from("pedidos")
      .insert([
        {
          nome,
          idade: parseInt(idade),
          telefone,
          email,
          parroquia,
          cidade,
          tamanho,
          inclui_almoco: inclui_almoco || false,
          valor_total: valorTotal,
          status_pagamento: "Pendente",
          // data_compra removido, será preenchido automaticamente pelo banco
        },
      ])
      .select()
      .single();

    if (pedidoError) {
      console.error("❌ Erro ao salvar pedido:", pedidoError);
      return NextResponse.json(
        {
          error:
            "Erro ao salvar pedido no banco de dados: " + pedidoError.message,
        },
        { status: 500 },
      );
    }
    console.log("✅ Pedido criado com sucesso:", {
      pedido_id: pedidoData.id,
      lote: loteAtivo,
      valor_total: valorTotal,
      preference_id: preference.id,
      data_compra: pedidoData.data_compra,
    });

    return NextResponse.json({
      success: true,
      pedido_id: pedidoData.id,
      init_point: preference.init_point,
      lote: loteAtivo,
      valor_total: valorTotal,
      data_compra: pedidoData.data_compra,
      message: "Pedido criado com sucesso!",
    });
  } catch (error: any) {
    console.error("❌ Erro ao criar pedido:", error);

    return NextResponse.json(
      {
        error: error.message || "Erro ao processar pedido",
      },
      { status: 500 },
    );
  }
}
