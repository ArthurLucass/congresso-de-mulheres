-- ============================================
-- SCRIPT DE INSTALAÇÃO COMPLETA
-- Sistema de Lotes - Inscrições
-- ============================================

-- PASSO 1: Criar tabela de configuração do sistema
-- ============================================
CREATE TABLE IF NOT EXISTS config_sistema (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chave TEXT UNIQUE NOT NULL,
  valor TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inserir configuração inicial do lote ativo (Lote 1)
INSERT INTO config_sistema (chave, valor)
VALUES ('lote_ativo', '1')
ON CONFLICT (chave) DO NOTHING;

-- PASSO 2: Criar tabela de configurações dos lotes
-- ============================================
CREATE TABLE IF NOT EXISTS lotes_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_lote INTEGER UNIQUE NOT NULL,
  preco_base DECIMAL(10,2) NOT NULL,
  preco_almoco DECIMAL(10,2) DEFAULT 15.00,
  checkout_url TEXT NOT NULL,
  ativo BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inserir configurações dos 3 lotes com URLs temporárias
INSERT INTO lotes_config (numero_lote, preco_base, preco_almoco, checkout_url, ativo)
VALUES 
  (1, 40.00, 15.00, 'https://mpago.la/2Kf6yov', true),
  (2, 50.00, 15.00, 'https://mpago.la/CONFIGURE_LOTE_2', false),
  (3, 60.00, 15.00, 'https://mpago.la/CONFIGURE_LOTE_3', false)
ON CONFLICT (numero_lote) DO NOTHING;

-- PASSO 3: Habilitar Row Level Security (RLS)
-- ============================================
ALTER TABLE config_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotes_config ENABLE ROW LEVEL SECURITY;

-- PASSO 4: Criar políticas de segurança
-- ============================================

-- Permitir leitura pública das configurações
DROP POLICY IF EXISTS "Permitir leitura pública de configurações" ON config_sistema;
CREATE POLICY "Permitir leitura pública de configurações"
  ON config_sistema FOR SELECT
  USING (true);

-- Permitir apenas admins atualizarem config_sistema
DROP POLICY IF EXISTS "Apenas admins podem atualizar configurações" ON config_sistema;
CREATE POLICY "Apenas admins podem atualizar configurações"
  ON config_sistema FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.email = auth.jwt() ->> 'email'
    )
  );

-- Permitir leitura pública das configurações dos lotes
DROP POLICY IF EXISTS "Permitir leitura pública de lotes" ON lotes_config;
CREATE POLICY "Permitir leitura pública de lotes"
  ON lotes_config FOR SELECT
  USING (true);

-- Permitir apenas admins atualizarem lotes_config
DROP POLICY IF EXISTS "Apenas admins podem atualizar lotes" ON lotes_config;
CREATE POLICY "Apenas admins podem atualizar lotes"
  ON lotes_config FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.email = auth.jwt() ->> 'email'
    )
  );

-- PASSO 5: Criar função para atualizar timestamp automaticamente
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASSO 6: Criar triggers para atualizar updated_at
-- ============================================
DROP TRIGGER IF EXISTS update_config_sistema_updated_at ON config_sistema;
CREATE TRIGGER update_config_sistema_updated_at
  BEFORE UPDATE ON config_sistema
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lotes_config_updated_at ON lotes_config;
CREATE TRIGGER update_lotes_config_updated_at
  BEFORE UPDATE ON lotes_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

-- Verificar se as tabelas foram criadas
SELECT 'Tabelas criadas com sucesso!' as status;

-- Mostrar configuração atual
SELECT 
  'Configuração Atual' as tipo,
  cs.valor as lote_ativo,
  lc.numero_lote,
  lc.preco_base,
  lc.preco_almoco,
  lc.preco_base + lc.preco_almoco as valor_total_com_almoco,
  lc.ativo,
  lc.checkout_url
FROM config_sistema cs
JOIN lotes_config lc ON cs.valor::INTEGER = lc.numero_lote
WHERE cs.chave = 'lote_ativo';

-- Mostrar todos os lotes
SELECT 
  numero_lote,
  preco_base,
  preco_almoco,
  preco_base + preco_almoco as valor_total,
  ativo,
  CASE 
    WHEN checkout_url LIKE '%CONFIGURE%' THEN '⚠️ PRECISA CONFIGURAR'
    ELSE '✅ Configurado'
  END as status_url
FROM lotes_config
ORDER BY numero_lote;

-- ============================================
-- PRÓXIMOS PASSOS
-- ============================================
-- 1. Configure as URLs do Mercado Pago em lotes_config
-- 2. Ajuste os valores de preco_base se necessário
-- 3. Teste o sistema acessando a página de inscrição
-- ============================================
