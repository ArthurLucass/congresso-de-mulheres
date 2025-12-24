# ⚡ Instalação Rápida - Sistema de Lotes (Versão Simplificada)

## ✅ Você já tem a tabela `config_sistema`!

Ótimo! Vamos apenas adicionar as configurações dos lotes.

---

## 📋 Instalação em 2 Passos

### 1️⃣ Adicionar Configurações dos Lotes

Copie e execute este SQL no **Supabase SQL Editor**:

```sql
-- Inserir configurações dos 3 lotes
INSERT INTO config_sistema (chave, valor)
VALUES
  -- Lote 1
  ('lote_1_preco_base', '40.00'),
  ('lote_1_preco_almoco', '15.00'),
  ('lote_1_checkout_url', 'https://mpago.la/2Kf6yov'),

  -- Lote 2
  ('lote_2_preco_base', '50.00'),
  ('lote_2_preco_almoco', '15.00'),
  ('lote_2_checkout_url', 'CONFIGURE_URL_LOTE_2'),

  -- Lote 3
  ('lote_3_preco_base', '60.00'),
  ('lote_3_preco_almoco', '15.00'),
  ('lote_3_checkout_url', 'CONFIGURE_URL_LOTE_3'),

  -- Lote ativo (padrão: 1)
  ('lote_ativo', '1')
ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor;
```

**Pronto!** Agora você tem 3 lotes configurados.

---

### 2️⃣ Configurar URLs do Mercado Pago

1. Acesse sua conta do Mercado Pago
2. Crie 3 links de pagamento:

   - **Lote 1**: R$ 55,00 (ou R$ 40 se sem almoço)
   - **Lote 2**: R$ 65,00 (ou R$ 50 se sem almoço)
   - **Lote 3**: R$ 75,00 (ou R$ 60 se sem almoço)

3. Atualize as URLs no Supabase:

```sql
-- Atualizar URL do Lote 1
UPDATE config_sistema
SET valor = 'COLE_AQUI_URL_MERCADOPAGO_LOTE_1'
WHERE chave = 'lote_1_checkout_url';

-- Atualizar URL do Lote 2
UPDATE config_sistema
SET valor = 'COLE_AQUI_URL_MERCADOPAGO_LOTE_2'
WHERE chave = 'lote_2_checkout_url';

-- Atualizar URL do Lote 3
UPDATE config_sistema
SET valor = 'COLE_AQUI_URL_MERCADOPAGO_LOTE_3'
WHERE chave = 'lote_3_checkout_url';
```

---

## 🔍 Verificar Configuração

```sql
-- Ver todas as configurações dos lotes
SELECT * FROM config_sistema
WHERE chave LIKE 'lote%'
ORDER BY chave;
```

**Resultado esperado:**

```
lote_1_checkout_url | https://mpago.la/...
lote_1_preco_almoco | 15.00
lote_1_preco_base   | 40.00
lote_2_checkout_url | https://mpago.la/...
lote_2_preco_almoco | 15.00
lote_2_preco_base   | 50.00
lote_3_checkout_url | https://mpago.la/...
lote_3_preco_almoco | 15.00
lote_3_preco_base   | 60.00
lote_ativo          | 1
```

---

## 🎯 Como Usar

### No Painel Admin (`/admin`):

1. Veja o dropdown "Lote Ativo" ao lado dos botões PDF/Excel
2. Selecione o lote desejado (1, 2 ou 3)
3. O sistema salva automaticamente

### Na Página de Inscrição (`/inscricao`):

1. Banner mostra o lote ativo atual
2. Valores são calculados automaticamente
3. Checkout redireciona para o link correto

---

## 🔧 Ajustar Valores (Opcional)

### Para ter R$ 80, R$ 90, R$ 100 COM almoço incluído:

```sql
UPDATE config_sistema SET valor = '65.00' WHERE chave = 'lote_1_preco_base'; -- 65 + 15 = 80
UPDATE config_sistema SET valor = '75.00' WHERE chave = 'lote_2_preco_base'; -- 75 + 15 = 90
UPDATE config_sistema SET valor = '85.00' WHERE chave = 'lote_3_preco_base'; -- 85 + 15 = 100
```

### Para ter R$ 80, R$ 90, R$ 100 APENAS na inscrição:

```sql
UPDATE config_sistema SET valor = '80.00' WHERE chave = 'lote_1_preco_base';
UPDATE config_sistema SET valor = '90.00' WHERE chave = 'lote_2_preco_base';
UPDATE config_sistema SET valor = '100.00' WHERE chave = 'lote_3_preco_base';
```

---

## 🎉 Pronto!

Seu sistema de lotes está funcionando com apenas a tabela `config_sistema`!

**Testando:**

1. Acesse `/admin` e mude o lote
2. Acesse `/inscricao` e veja o lote ativo
3. Complete uma inscrição e veja o redirect correto

---

## 💡 Como Funciona

**Estrutura na `config_sistema`:**

- `lote_ativo`: Qual lote está vigente (1, 2 ou 3)
- `lote_X_preco_base`: Valor da inscrição
- `lote_X_preco_almoco`: Valor do almoço (opcional)
- `lote_X_checkout_url`: Link do Mercado Pago

**Fluxo:**

1. Admin seleciona lote → Atualiza `lote_ativo`
2. Usuário acessa formulário → Busca configs do lote ativo
3. Usuário completa → Redireciona para URL do lote ativo

Zero possibilidade de erro! 🎯
