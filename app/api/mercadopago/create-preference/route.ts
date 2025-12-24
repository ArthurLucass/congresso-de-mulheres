import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";

export async function POST(request: NextRequest) {
  try {
    // 🌐 Detectar URL base automaticamente (funciona em qualquer ambiente)
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : `${request.nextUrl.protocol}//${request.nextUrl.host}`);

    console.log("🔗 Base URL detectada:", baseUrl);

    // Validar variáveis de ambiente
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      console.error("❌ MERCADOPAGO_ACCESS_TOKEN não configurado");
      return NextResponse.json(
        { error: "Configuração do Mercado Pago ausente" },
        { status: 500 }
      );
    }

    // Configurar cliente do Mercado Pago
    const client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
    });

    const { pedido_id, nome, email, valor_total, lote, inclui_almoco } =
      await request.json();

    console.log("📥 Dados recebidos:", {
      pedido_id,
      nome,
      email,
      valor_total,
      lote,
      inclui_almoco,
    });

    // Validação de dados obrigatórios
    if (!pedido_id || !nome || !email || !valor_total || !lote) {
      return NextResponse.json(
        { error: "Dados obrigatórios faltando" },
        { status: 400 }
      );
    }

    // Validar valor mínimo (Mercado Pago exige valor > 0)
    if (valor_total <= 0) {
      return NextResponse.json(
        { error: "Valor total deve ser maior que zero" },
        { status: 400 }
      );
    }

    const preference = new Preference(client);

    // Descrição do item baseado no que foi incluído
    const description = inclui_almoco
      ? `Inscrição Lote ${lote} + Almoço`
      : `Inscrição Lote ${lote}`;

    // Criar preferência de pagamento
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
        success: `${baseUrl}/pagamento/sucesso?pedido_id=${pedido_id}`,
        failure: `${baseUrl}/pagamento/falha?pedido_id=${pedido_id}`,
        pending: `${baseUrl}/pagamento/pendente?pedido_id=${pedido_id}`,
      },
      auto_return: "all" as const, // Redirecionar automaticamente em todos os casos
      external_reference: pedido_id,
      notification_url: `${baseUrl}/api/mercadopago/webhook`,
      statement_descriptor: "EVENTO MW",
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutos para completar o pagamento
    };

    const result = await preference.create({ body });

    console.log("✅ Preferência criada (PIX e Boleto):", {
      preference_id: result.id,
      pedido_id,
      valor: valor_total,
      metodos: "PIX e Boleto apenas",
    });

    return NextResponse.json({
      id: result.id,
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point,
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
      { status: 500 }
    );
  }
}
