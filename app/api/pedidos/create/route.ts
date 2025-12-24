import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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

    // Validações básicas
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

    // Buscar lote ativo
    const { data: configData, error: configError } = await supabase
      .from("config_sistema")
      .select("valor")
      .eq("chave", "lote_ativo")
      .single();

    if (configError || !configData) {
      console.error("Erro ao buscar lote ativo:", configError);
      return NextResponse.json(
        { error: "Erro ao buscar configuração do sistema" },
        { status: 500 }
      );
    }

    const loteAtivo = parseInt(configData.valor);

    // Buscar configurações do lote ativo de config_sistema
    const { data: configsData, error: configsError } = await supabase
      .from("config_sistema")
      .select("chave, valor")
      .or(
        `chave.eq.lote_${loteAtivo}_preco_base,chave.eq.lote_${loteAtivo}_preco_almoco,chave.eq.lote_${loteAtivo}_checkout_url`
      );

    if (configsError || !configsData || configsData.length === 0) {
      console.error("Erro ao buscar configuração do lote:", configsError);
      return NextResponse.json(
        { error: "Erro ao buscar configuração do lote" },
        { status: 500 }
      );
    }

    // Montar objeto de configuração do lote
    const loteConfig: any = { numero_lote: loteAtivo };
    configsData.forEach((config) => {
      if (config.chave.includes("preco_base")) {
        loteConfig.preco_base = parseFloat(config.valor);
      } else if (config.chave.includes("preco_almoco")) {
        loteConfig.preco_almoco = parseFloat(config.valor);
      } else if (config.chave.includes("checkout_url")) {
        loteConfig.checkout_url = config.valor;
      }
    });

    // 🔒 VALIDAÇÃO DE SEGURANÇA: Verificar se configurações estão completas
    if (
      !loteConfig.preco_base ||
      !loteConfig.preco_almoco ||
      !loteConfig.checkout_url
    ) {
      console.error("Configuração do lote incompleta:", loteConfig);
      return NextResponse.json(
        {
          error:
            "Configuração do lote está incompleta. Contate o administrador.",
        },
        { status: 500 }
      );
    }

    // 🔒 VALIDAÇÃO DE SEGURANÇA: Verificar se URL de checkout é válida
    if (!loteConfig.checkout_url.startsWith("http")) {
      console.error("URL de checkout inválida:", loteConfig.checkout_url);
      return NextResponse.json(
        { error: "URL de checkout não configurada corretamente" },
        { status: 500 }
      );
    }

    // 🔒 SEGURANÇA: Calcular valor total APENAS no backend
    const valorTotal =
      loteConfig.preco_base + (inclui_almoco ? loteConfig.preco_almoco : 0);

    console.log("✅ Pedido validado:", {
      lote: loteAtivo,
      valor_calculado: valorTotal,
      inclui_almoco,
    });

    // Salvar pedido no Supabase
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
      console.error("Erro ao salvar pedido:", pedidoError);
      return NextResponse.json(
        {
          error:
            "Erro ao salvar pedido no banco de dados: " + pedidoError.message,
        },
        { status: 500 }
      );
    }

    // Retornar checkout URL do lote ativo
    return NextResponse.json({
      success: true,
      pedido_id: pedidoData.id,
      init_point: loteConfig.checkout_url,
      lote: loteAtivo,
      valor_total: valorTotal,
      message: "Pedido criado com sucesso!",
    });
  } catch (error: any) {
    console.error("Erro ao criar pedido:", error);

    return NextResponse.json(
      {
        error: error.message || "Erro ao processar pedido",
      },
      { status: 500 }
    );
  }
}
