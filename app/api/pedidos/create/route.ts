import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    // 🌐 Detectar URL base automaticamente (funciona em qualquer ambiente)
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : `${request.nextUrl.protocol}//${request.nextUrl.host}`;

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
        { status: 400 }
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
        { status: 500 }
      );
    }

    const loteAtivo = parseInt(configData.valor);

    // 🔒 Buscar configurações de preço do lote ativo
    const { data: configsData, error: configsError } = await supabase
      .from("config_sistema")
      .select("chave, valor")
      .or(
        `chave.eq.lote_${loteAtivo}_preco_base,chave.eq.lote_${loteAtivo}_preco_almoco`
      );

    if (configsError || !configsData || configsData.length === 0) {
      console.error("❌ Erro ao buscar configuração do lote:", configsError);
      return NextResponse.json(
        { error: "Erro ao buscar configuração do lote" },
        { status: 500 }
      );
    }

    // Montar objeto de configuração do lote
    let precoBase = 0;
    let precoAlmoco = 0;

    configsData.forEach((config) => {
      if (config.chave.includes("preco_base")) {
        precoBase = parseFloat(config.valor);
      } else if (config.chave.includes("preco_almoco")) {
        precoAlmoco = parseFloat(config.valor);
      }
    });

    // 🔒 VALIDAÇÃO DE SEGURANÇA: Verificar se preços estão configurados
    if (!precoBase || !precoAlmoco) {
      console.error("❌ Configuração de preço incompleta:", {
        precoBase,
        precoAlmoco,
      });
      return NextResponse.json(
        {
          error:
            "Configuração de preço do lote está incompleta. Contate o administrador.",
        },
        { status: 500 }
      );
    }

    // 🔒 SEGURANÇA: Calcular valor total APENAS no backend
    const valorTotal = precoBase + (inclui_almoco ? precoAlmoco : 0);

    console.log("✅ Pedido validado:", {
      lote: loteAtivo,
      preco_base: precoBase,
      preco_almoco: precoAlmoco,
      valor_calculado: valorTotal,
      inclui_almoco,
    });

    // 🆕 Criar preferência no Mercado Pago ANTES de salvar no banco
    // Isso evita criar registros órfãos se o pagamento falhar
    console.log("📞 Criando preferência de pagamento...");
    const preferenceResponse = await fetch(
      `${baseUrl}/api/mercadopago/create-preference`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pedido_id: `temp_${Date.now()}`, // ID temporário para criar preferência
          nome,
          email,
          valor_total: valorTotal,
          lote: loteAtivo,
          inclui_almoco: inclui_almoco || false,
        }),
      }
    );

    if (!preferenceResponse.ok) {
      const errorData = await preferenceResponse.json();
      console.error("❌ Erro ao criar preferência:", {
        status: preferenceResponse.status,
        statusText: preferenceResponse.statusText,
        errorData,
      });
      return NextResponse.json(
        {
          error:
            errorData.details ||
            errorData.error ||
            "Erro ao criar preferência de pagamento",
        },
        { status: 500 }
      );
    }

    const preference = await preferenceResponse.json();
    console.log("✅ Preferência criada com sucesso:", preference.id);

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
        { status: 500 }
      );
    }
    console.log("✅ Pedido criado com sucesso:", {
      pedido_id: pedidoData.id,
      lote: loteAtivo,
      valor_total: valorTotal,
      preference_id: preference.id,
    });

    return NextResponse.json({
      success: true,
      pedido_id: pedidoData.id,
      init_point: preference.init_point,
      lote: loteAtivo,
      valor_total: valorTotal,
      message: "Pedido criado com sucesso!",
    });
  } catch (error: any) {
    console.error("❌ Erro ao criar pedido:", error);

    return NextResponse.json(
      {
        error: error.message || "Erro ao processar pedido",
      },
      { status: 500 }
    );
  }
}
