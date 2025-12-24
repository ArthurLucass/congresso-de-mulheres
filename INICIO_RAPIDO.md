# 🚀 Guia Rápido de Instalação - Sistema de Lotes

## ❌ Erro: "relation lotes_config does not exist"?

Você precisa executar o script SQL primeiro! Siga os passos abaixo.

---

## 📋 Instalação em 3 Passos

### 1️⃣ Criar as Tabelas no Supabase

1. Abra o **Supabase SQL Editor**
2. Copie TODO o conteúdo de: `database/INSTALAR_COMPLETO.sql`
3. Cole no editor e clique **RUN**
4. Aguarde a confirmação ✅

**Resultado esperado:**

```
Success. No rows returned
+ Tabelas de verificação mostrando 3 lotes
```

---

### 2️⃣ Configurar URLs do Mercado Pago

1. Acesse sua conta do Mercado Pago
2. Crie 3 links de pagamento:

   - R$ 55,00 (Lote 1)
   - R$ 65,00 (Lote 2)
   - R$ 75,00 (Lote 3)

3. No Supabase SQL Editor, execute:

```sql
UPDATE lotes_config
SET checkout_url = 'https://mpago.la/SEU_LINK_LOTE_1'
WHERE numero_lote = 1;

UPDATE lotes_config
SET checkout_url = 'https://mpago.la/SEU_LINK_LOTE_2'
WHERE numero_lote = 2;

UPDATE lotes_config
SET checkout_url = 'https://mpago.la/SEU_LINK_LOTE_3'
WHERE numero_lote = 3;
```

---

### 3️⃣ Testar o Sistema

1. Acesse o painel admin: `/admin`
2. Veja o dropdown "Lote Ativo" ao lado dos botões PDF/Excel
3. Selecione um lote (ex: Lote 2)
4. Acesse a página de inscrição: `/inscricao`
5. Veja o banner mostrando "Lote 2" no topo
6. Valores devem estar corretos automaticamente

---

## 🔍 Verificar Instalação

Execute no Supabase:

```sql
-- Ver qual lote está ativo
SELECT * FROM config_sistema WHERE chave = 'lote_ativo';

-- Ver todos os lotes configurados
SELECT
  numero_lote,
  preco_base,
  preco_almoco,
  ativo,
  checkout_url
FROM lotes_config
ORDER BY numero_lote;
```

---

## 🎯 Valores Configurados

**Padrão atual:**

- Lote 1: R$ 40 (inscrição) + R$ 15 (almoço) = **R$ 55 total**
- Lote 2: R$ 50 (inscrição) + R$ 15 (almoço) = **R$ 65 total**
- Lote 3: R$ 60 (inscrição) + R$ 15 (almoço) = **R$ 75 total**

**Quer R$ 80/90/100?** Veja [CONFIGURAR_URLS_LOTES.md](CONFIGURAR_URLS_LOTES.md)

---

## 📚 Documentação Completa

- [CONFIGURAR_URLS_LOTES.md](CONFIGURAR_URLS_LOTES.md) - Guia detalhado
- [SISTEMA_LOTES_COMPLETO.md](SISTEMA_LOTES_COMPLETO.md) - Como funciona
- `database/INSTALAR_COMPLETO.sql` - Script de instalação
- `database/config_lotes.sql` - Script básico

---

## 🐛 Problemas Comuns

### Erro: "relation does not exist"

→ Execute o **Passo 1** (criar tabelas)

### Erro: "checkout_url não configurada"

→ Execute o **Passo 2** (configurar URLs)

### Lote não muda na página

→ Limpe o cache (Ctrl + Shift + R)

### Valores não batem

→ Verifique `lotes_config` no Supabase

---

## ✅ Checklist

- [ ] Tabelas criadas no Supabase
- [ ] URLs do Mercado Pago configuradas
- [ ] Testado troca de lote no admin
- [ ] Página de inscrição mostra lote correto
- [ ] Valores calculados corretamente
- [ ] Checkout redireciona para link certo

**Tudo pronto?** 🎉 Seu sistema de lotes está funcionando!
