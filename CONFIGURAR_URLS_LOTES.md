# Configuração de URLs dos Lotes

## 🚨 Erro: "relation lotes_config does not exist"?

**Solução**: Execute o **Passo 1** abaixo PRIMEIRO para criar as tabelas!

---

## ⚠️ IMPORTANTE: Execute o Script SQL PRIMEIRO

Antes de configurar as URLs, você precisa criar as tabelas no Supabase.

### Passo 1: Criar as Tabelas

1. **Acesse o Supabase SQL Editor**
2. **Opção A - Script Completo (Recomendado):**

   - Abra o arquivo `database/INSTALAR_COMPLETO.sql`
   - Copie TODO o conteúdo
   - Cole no SQL Editor do Supabase
   - Clique em **RUN**
   - Aguarde: "Success. No rows returned" + tabelas de verificação

3. **Opção B - Script Básico:**
   - Abra o arquivo `database/config_lotes.sql`
   - Copie e execute da mesma forma

**O que será criado:**

- ✅ Tabela `config_sistema` (guarda qual lote está ativo)
- ✅ Tabela `lotes_config` (configurações de cada lote)
- ✅ 3 lotes pré-configurados (1, 2 e 3)
- ✅ Políticas de segurança (RLS)
- ✅ Triggers de auditoria
- ✅ Queries de verificação

---

## Passo 2: Configurar as URLs de Checkout

Após executar o script SQL `database/config_lotes.sql`, você precisa atualizar as URLs de checkout de cada lote no Supabase.

### Como obter as URLs do Mercado Pago:

1. Acesse sua conta do Mercado Pago
2. Vá em **Receber pagamentos** → **Links de pagamento**
3. Crie 3 links diferentes:
   - Link 1: Valor R$ 55,00 (Lote 1 - inscrição R$ 40 + almoço R$ 15)
   - Link 2: Valor R$ 65,00 (Lote 2 - inscrição R$ 50 + almoço R$ 15)
   - Link 3: Valor R$ 75,00 (Lote 3 - inscrição R$ 60 + almoço R$ 15)
4. Copie cada URL gerada

### Execute a query para atualizar as URLs:

```sql
-- Atualizar URL do Lote 1
UPDATE lotes_config
SET checkout_url = 'COLE_AQUI_URL_MERCADOPAGO_LOTE_1'
WHERE numero_lote = 1;

-- Atualizar URL do Lote 2
UPDATE lotes_config
SET checkout_url = 'COLE_AQUI_URL_MERCADOPAGO_LOTE_2'
WHERE numero_lote = 2;

-- Atualizar URL do Lote 3
UPDATE lotes_config
SET checkout_url = 'COLE_AQUI_URL_MERCADOPAGO_LOTE_3'
WHERE numero_lote = 3;
```

---

## Passo 3: Verificar Configuração

Execute esta query para confirmar que tudo foi criado:

```sql
SELECT numero_lote, preco_base, preco_almoco, ativo, checkout_url
FROM lotes_config
ORDER BY numero_lote;
```

**Resultado esperado:**

- 3 linhas retornadas (lotes 1, 2 e 3)
- Lote 1 com `ativo = true`
- URLs atualizadas

---

## Estrutura da Tabela

| Campo          | Tipo    | Descrição                                   |
| -------------- | ------- | ------------------------------------------- |
| `numero_lote`  | INTEGER | Número do lote (1, 2 ou 3)                  |
| `preco_base`   | DECIMAL | Valor base da inscrição (sem almoço)        |
| `preco_almoco` | DECIMAL | Valor adicional do almoço (padrão R$ 15,00) |
| `checkout_url` | TEXT    | Link do checkout do Mercado Pago            |
| `ativo`        | BOOLEAN | Se o lote está ativo no momento             |

### Valores Configurados:

- **Lote 1**: R$ 40,00 (base) + R$ 15,00 (almoço) = R$ 55,00 total
- **Lote 2**: R$ 50,00 (base) + R$ 15,00 (almoço) = R$ 65,00 total
- **Lote 3**: R$ 60,00 (base) + R$ 15,00 (almoço) = R$ 75,00 total

> **Nota**: O almoço é opcional. Se o usuário não marcar a opção de almoço, pagará apenas o valor base.

---

## Ajustar Valores (Opcional)

## Se você quiser valores diferentes (ex: R$ 80, R$ 90, R$ 100), execute:

## Ajustar Valores (Opcional)

Se você quiser valores diferentes (ex: R$ 80, R$ 90, R$ 100 COM almoço incluído), execute:

```sql
-- Para ter R$ 80/90/100 com almoço incluído
UPDATE lotes_config SET preco_base = 65.00 WHERE numero_lote = 1; -- 65 + 15 = 80
UPDATE lotes_config SET preco_base = 75.00 WHERE numero_lote = 2; -- 75 + 15 = 90
UPDATE lotes_config SET preco_base = 85.00 WHERE numero_lote = 3; -- 85 + 15 = 100
```

Ou se R$ 80/90/100 é apenas a inscrição (almoço separado):

```sql
-- Para ter R$ 80/90/100 apenas na inscrição
UPDATE lotes_config SET preco_base = 80.00 WHERE numero_lote = 1;
UPDATE lotes_config SET preco_base = 90.00 WHERE numero_lote = 2;
UPDATE lotes_config SET preco_base = 100.00 WHERE numero_lote = 3;
```

---

## Como o Sistema Funciona

1. **Admin seleciona o lote ativo** no painel administrativo
2. **Sistema salva** a configuração em `config_sistema` e marca o lote como ativo em `lotes_config`
3. **Página de inscrição** busca automaticamente o lote ativo
4. **Valores são calculados** baseado no lote ativo:
   - Preço base + preço do almoço (se marcado)
5. **Checkout redireciona** para a URL específica do lote ativo
6. **Admin pode trocar** o lote a qualquer momento, afetando apenas novas inscrições

### Exemplo de consulta para ver o lote ativo:

```sql
SELECT
  cs.valor as lote_ativo,
  lc.preco_base,
  lc.preco_almoco,
  lc.preco_base + lc.preco_almoco as preco_total,
  lc.checkout_url,
  lc.ativo
FROM config_sistema cs
JOIN lotes_config lc ON cs.valor::INTEGER = lc.numero_lote
WHERE cs.chave = 'lote_ativo';
```

## Políticas de Segurança (RLS)

O sistema já está configurado com as seguintes políticas:

- ✅ **Leitura pública**: Qualquer um pode ler as configurações (necessário para página de inscrição)
- ✅ **Atualização restrita**: Apenas admins autenticados podem alterar configurações
- ✅ **Auditoria**: Campo `updated_at` é atualizado automaticamente em cada mudança

## Troubleshooting

### Erro: "Checkout URL não configurada"

- Verifique se todas as URLs foram inseridas na tabela `lotes_config`
- Confirme que as URLs do Mercado Pago estão válidas e ativas

### Lote não muda na página de inscrição

- Limpe o cache do navegador (Ctrl + Shift + R)
- Verifique se o lote foi salvo corretamente no banco

### Preços não batem

- Confirme os valores em `lotes_config.preco_base` e `lotes_config.preco_almoco`
- Execute a query de verificação acima para conferir
