-- ============================================
-- CONFIGURAÇÃO SIMPLIFICADA DE LOTES
-- Usa apenas a tabela config_sistema existente
-- ============================================

-- Inserir configurações dos lotes na tabela config_sistema
-- Formato JSON para armazenar múltiplas configurações

-- Lote 1: R$ 40 (base) + R$ 15 (almoço)
INSERT INTO config_sistema (chave, valor)
VALUES 
  ('lote_1_preco_base', '40.00'),
  ('lote_1_preco_almoco', '15.00'),
  ('lote_1_checkout_url', 'https://mpago.la/2Kf6yov'),
  
  ('lote_2_preco_base', '50.00'),
  ('lote_2_preco_almoco', '15.00'),
  ('lote_2_checkout_url', 'CONFIGURE_URL_LOTE_2'),
  
  ('lote_3_preco_base', '60.00'),
  ('lote_3_preco_almoco', '15.00'),
  ('lote_3_checkout_url', 'CONFIGURE_URL_LOTE_3'),
  
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
  (SELECT valor FROM config_sistema WHERE chave = 'lote_' || (SELECT valor FROM config_sistema WHERE chave = 'lote_ativo') || '_checkout_url') as checkout_url;
