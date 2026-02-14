-- ============================================
-- CONFIGURAÇÃO SIMPLIFICADA DE LOTES
-- Usa apenas a tabela config_sistema existente
-- ============================================

-- Inserir configurações dos lotes na tabela config_sistema
-- Formato JSON para armazenar múltiplas configurações

-- Lote 1: R$ 80 (base) + R$ 25 (almoço)
INSERT INTO config_sistema (chave, valor)
VALUES 
  ('lote_1_preco_base', '80.00'),
  ('lote_1_preco_almoco', '25.00'),
  ('lote_1_checkout_url_base', 'https://mpago.li/1tmSGGZ'),
  ('lote_1_checkout_url_almoco', 'https://mpago.la/2WfnHaU'),

  ('lote_2_preco_base', '90.00'),
  ('lote_2_preco_almoco', '25.00'),
  ('lote_2_checkout_url_base', 'https://mpago.la/2LiHv88'),
  ('lote_2_checkout_url_almoco', 'https://mpago.la/1yKkmFH'),

  ('lote_3_preco_base', '100.00'),
  ('lote_3_preco_almoco', '25.00'),
  ('lote_3_checkout_url_base', 'https://mpago.la/2pg4Hdk'),
  ('lote_3_checkout_url_almoco', 'https://mpago.la/18a4pfS'),
  
  ('lote_ativo', '1')
ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor;

-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- Ver todas as configurações
SELECT * FROM config_sistema
WHERE chave LIKE 'lote%'
ORDER BY chave;

-- Ver apenas o lote ativo e seus valores
SELECT 
  (SELECT valor FROM config_sistema WHERE chave = 'lote_ativo') as lote_ativo,
  (SELECT valor FROM config_sistema WHERE chave = 'lote_' || (SELECT valor FROM config_sistema WHERE chave = 'lote_ativo') || '_preco_base') as preco_base,
  (SELECT valor FROM config_sistema WHERE chave = 'lote_' || (SELECT valor FROM config_sistema WHERE chave = 'lote_ativo') || '_preco_almoco') as preco_almoco,
  (SELECT valor FROM config_sistema WHERE chave = 'lote_' || (SELECT valor FROM config_sistema WHERE chave = 'lote_ativo') || '_checkout_url_base') as checkout_url_base,
  (SELECT valor FROM config_sistema WHERE chave = 'lote_' || (SELECT valor FROM config_sistema WHERE chave = 'lote_ativo') || '_checkout_url_almoco') as checkout_url_almoco;

-- Ver apenas os URLs de checkout
SELECT chave, valor
FROM config_sistema
WHERE chave IN (
  'lote_1_checkout_url_base','lote_1_checkout_url_almoco',
  'lote_2_checkout_url_base','lote_2_checkout_url_almoco',
  'lote_3_checkout_url_base','lote_3_checkout_url_almoco'
)
ORDER BY chave;
