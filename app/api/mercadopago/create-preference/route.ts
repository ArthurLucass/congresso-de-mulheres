import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { createClient } from "@supabase/supabase-js";

type Body = {
  pedido_id?: string | number;
  nome?: string;
  email?: string;
  valor_total?: number | string;
  lote?: number | string;
  inclui_almoco?: boolean | string | number;
  comAlmoco?: boolean | string | number;
  idade?: string | number;
  telefone?: string;
  parroquia?: string;
  cidade?: string;
  tamanho?: string;
  serverInsert?: boolean;
};

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["1", "true", "sim", "yes", "on"].includes(normalized);
  }
  return false;
}

async function getConfigValue(supabase: any, chave: string) {
  const { data, error } = await supabase
    .from("config_sistema")
    .select("valor")
    .eq("chave", chave)
    .single();

  if (error || !data?.valor) {
    throw new Error(`Config não encontrada: ${chave}`);
  }
  return data.valor as string;
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as Body;
    const lote = Number(payload.lote);
    const inclui_almoco = toBoolean(payload.inclui_almoco ?? payload.comAlmoco);
    const incomingNome = (payload.nome || "").trim();
    const incomingEmail = (payload.email || "").trim();
    const incomingIdade = Number(payload.idade);
    const incomingTelefone = (payload.telefone || "").trim();
    const incomingParroquia = (payload.parroquia || "").trim();
    const incomingCidade = (payload.cidade || "").trim();
    const incomingTamanho = (payload.tamanho || "").trim();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const supabaseReadKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "";

    if (payload.serverInsert === true) {
      if (!lote || lote < 1) {
        return NextResponse.json({ error: "Lote inválido" }, { status: 400 });
      }

      if (!incomingNome || !incomingEmail || !incomingIdade || !incomingTelefone || !incomingParroquia || !incomingCidade || !incomingTamanho) {
        return NextResponse.json(
          { error: "Dados obrigatórios faltando" },
          { status: 400 },
        );
      }

      if (!supabaseUrl || !supabaseServiceKey || !supabaseReadKey) {
        return NextResponse.json(
          { error: "Configuração do Supabase ausente" },
          { status: 500 },
        );
      }

      const serviceSupabase = createClient<any>(supabaseUrl, supabaseServiceKey);
      const readSupabase = createClient<any>(supabaseUrl, supabaseReadKey);

      const precoBase = Number(
        await getConfigValue(serviceSupabase, `lote_${lote}_preco_base`),
      );

      let precoAlmoco = 25;
      try {
        precoAlmoco = Number(
          await getConfigValue(serviceSupabase, `lote_${lote}_preco_almoco`),
        );
      } catch {
        precoAlmoco = 25;
      }

      const valor_total = precoBase + (inclui_almoco ? precoAlmoco : 0);

      if (!Number.isFinite(valor_total) || valor_total <= 0) {
        return NextResponse.json(
          { error: "Valor total inválido para o lote selecionado" },
          { status: 400 },
        );
      }

      const { data: inserted, error: insertError } = await serviceSupabase
        .from("pedidos")
        .insert([
          {
            nome: incomingNome,
            idade: incomingIdade,
            telefone: incomingTelefone,
            email: incomingEmail,
            parroquia: incomingParroquia,
            cidade: incomingCidade,
            tamanho: incomingTamanho,
            inclui_almoco,
            valor_total,
            status_pagamento: "Pendente",
          },
        ])
        .select()
        .single();

      if (insertError || !inserted?.id) {
        return NextResponse.json(
          { error: `Falha ao cadastrar pedido: ${insertError?.message || "erro desconhecido"}` },
          { status: 500 },
        );
      }

      const chavePrimaria = `lote_${lote}_checkout_url_${inclui_almoco ? "almoco" : "base"}`;
      const chaveLegada = `lote_${lote}_checkout_url`;

      let checkoutUrl = "";

      try {
        checkoutUrl = await getConfigValue(readSupabase, chavePrimaria);
      } catch {
        try {
          checkoutUrl = await getConfigValue(readSupabase, chaveLegada);
        } catch {
          return NextResponse.json(
            {
              error: `Link de checkout não encontrado para o lote ${lote}`,
              chave_tentada: chavePrimaria,
            },
            { status: 400 },
          );
        }
      }

      return NextResponse.json({
        checkoutUrl,
        pedido_id: inserted.id,
        valor_total,
        lote,
        inclui_almoco,
      });
    }

    // Validar variáveis de ambiente
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      console.error("❌ MERCADOPAGO_ACCESS_TOKEN não configurado");
      return NextResponse.json(
        { error: "Configuração do Mercado Pago ausente" },
        { status: 500 },
      );
    }

    // Variável de ambiente para URL base
    if (!process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_SITE_URL) {
      console.warn(
        "⚠️ NEXT_PUBLIC_APP_URL ou NEXT_PUBLIC_SITE_URL não configurado — será usado origin da requisição como fallback",
      );
    }

    // Configurar cliente do Mercado Pago
    const client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
    });

    const incomingPedidoId = payload.pedido_id;
    const valor_total = Number(payload.valor_total);

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn(
        "⚠️ SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_URL ausente — inserção server-side não estará disponível",
      );
      return NextResponse.json(
        { error: "Inserção não permitida no servidor" },
        { status: 500 },
      );
    }

    const serviceSupabase = createClient<any>(supabaseUrl, supabaseServiceKey);

    console.log("📥 Dados recebidos:", {
      pedido_id: incomingPedidoId,
      nome: incomingNome,
      email: incomingEmail,
      valor_total,
      lote,
      inclui_almoco,
      serverInsert: true,
    });

    // SEMPRE criar o pedido aqui no servidor primeiro para garantir ID correto
    // Validar dados obrigatórios ANTES de inserir
    if (
      !incomingNome ||
      !incomingEmail ||
      !incomingIdade ||
      !incomingTelefone ||
      !incomingParroquia ||
      !incomingCidade ||
      !incomingTamanho
    ) {
      return NextResponse.json(
        { error: "Dados obrigatórios faltando" },
        { status: 400 },
      );
    }

    // Inserir pedido como pendente
    const { data: inserted, error: insertError } = await serviceSupabase
      .from("pedidos")
      .insert([
        {
          nome: incomingNome,
          idade: Number(incomingIdade),
          telefone: incomingTelefone,
          email: incomingEmail,
          parroquia: incomingParroquia,
          cidade: incomingCidade,
          tamanho: incomingTamanho,
          inclui_almoco: !!inclui_almoco,
          valor_total: valor_total,
          status_pagamento: "Pendente",
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error("❌ Erro ao inserir pedido:", insertError);
      return NextResponse.json(
        { error: "Falha ao criar pedido: " + insertError.message },
        { status: 500 },
      );
    }

    const pedido_id = inserted.id;
    const nome = inserted.nome;
    const email = inserted.email;

    console.log("✅ Pedido criado no banco:", { pedido_id, nome, email });

    // Validar valor mínimo (Mercado Pago exige valor > 0)
    if (valor_total <= 0) {
      return NextResponse.json(
        { error: "Valor total deve ser maior que zero" },
        { status: 400 },
      );
    }

    const preference = new Preference(client);

    // Descrição do item baseado no que foi incluído
    const description = inclui_almoco
      ? `Inscrição Lote ${lote} + Almoço`
      : `Inscrição Lote ${lote}`;

    // Criar preferência de pagamento
    const originHeader = request.headers.get("origin");
    const hostHeader = request.headers.get("host");
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    let baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      originHeader ||
      `${protocol}://${hostHeader}`;

    // Garantir que baseUrl não tenha barra final
    if (baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, -1);
    }

    // Log do baseUrl para debug
    console.log("🔍 BaseURL para preferência:", {
      baseUrl,
      env: process.env.NEXT_PUBLIC_APP_URL,
      origin: originHeader,
      host: hostHeader,
    });

    // Validar se baseUrl está válido
    if (!baseUrl || baseUrl === "undefined" || !baseUrl.startsWith("http")) {
      console.error("❌ BaseURL inválido:", baseUrl);
      return NextResponse.json(
        {
          error:
            "Configuração de URL inválida. Configure NEXT_PUBLIC_APP_URL no .env",
        },
        { status: 500 },
      );
    }

    const successUrl = `${baseUrl}/pagamento/sucesso?pedido_id=${pedido_id}`;
    const failureUrl = `${baseUrl}/pagamento/falha?pedido_id=${pedido_id}`;
    const pendingUrl = `${baseUrl}/pagamento/pendente?pedido_id=${pedido_id}`;

    const body = {
      items: [
        {
          id: pedido_id,
          title: `Inscrição - Evento MW ${new Date().getFullYear()}`,
          description: description,
          quantity: 1,
          unit_price: valor_total,
          currency_id: "BRL",
        },
      ],
      payer: {
        name: nome,
        email: email,
      },
      payment_methods: {
        excluded_payment_methods: [
          { id: "master" }, // Excluir Mastercard
          { id: "visa" }, // Excluir Visa
          { id: "amex" }, // Excluir American Express
          { id: "elo" }, // Excluir Elo
          { id: "hipercard" }, // Excluir Hipercard
        ],
        excluded_payment_types: [
          { id: "credit_card" }, // Excluir cartão de crédito
          { id: "debit_card" }, // Excluir cartão de débito
          { id: "prepaid_card" }, // Excluir cartão pré-pago
          { id: "ticket" }, // Excluir outros tickets (manter apenas boleto)
          { id: "atm" }, // Excluir caixas eletrônicos
        ],
        installments: 1, // Apenas pagamento à vista
      },
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl,
      },
      external_reference: pedido_id,
      notification_url: `${baseUrl}/api/mercadopago/webhook`,
      statement_descriptor: "EVENTO MW",
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutos para completar o pagamento
    };

    console.log("🔍 URLs da preferência:", {
      successUrl,
      failureUrl,
      pendingUrl,
      notificationUrl: `${baseUrl}/api/mercadopago/webhook`,
    });

    const result = await preference.create({ body });

    console.log("✅ Preferência criada (PIX e Boleto):", {
      preference_id: result.id,
      pedido_id,
      valor: valor_total,
      metodos: "PIX e Boleto apenas",
    });

    // Garantir um URL de redirecionamento mesmo quando init_point não estiver presente
    const redirectUrl =
      result.init_point ||
      result.sandbox_init_point ||
      `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${result.id}`;

    return NextResponse.json({
      id: result.id,
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point,
      redirect_url: redirectUrl,
      pedido_id: pedido_id, // Retornar o ID do pedido criado
    });
  } catch (error: any) {
    console.error("❌ Erro ao criar preferência:", {
      message: error.message,
      cause: error.cause,
      stack: error.stack,
      response: error.response?.data,
    });
    return NextResponse.json(
      {
        error: "Erro ao criar preferência de pagamento",
        details: error.message,
        help: "Verifique: 1) Access Token válido, 2) Credenciais de teste/produção corretas, 3) Logs do servidor",
      },
      { status: 500 },
    );
  }
}
