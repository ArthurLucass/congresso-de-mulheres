-- Tabela para armazenar configuração do lote ativo
CREATE TABLE IF NOT EXISTS config_sistema (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chave TEXT UNIQUE NOT NULL,
  valor TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inserir configuração inicial do lote (Lote 1 - R$ 80,00)
INSERT INTO config_sistema (chave, valor)
VALUES ('lote_ativo', '1')
ON CONFLICT (chave) DO NOTHING;

-- Tabela para armazenar configurações de cada lote
CREATE TABLE IF NOT EXISTS lotes_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_lote INTEGER UNIQUE NOT NULL,
  preco_base DECIMAL(10,2) NOT NULL,
  preco_almoco DECIMAL(10,2) DEFAULT 25.00,
  checkout_url TEXT NOT NULL,
  ativo BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inserir configurações dos 3 lotes
INSERT INTO lotes_config (numero_lote, preco_base, preco_almoco, checkout_url, ativo)
VALUES 
  (1, 40.00, 25.00, 'https://mpago.la/2Kf6yov', true),
  (2, 50.00, 25.00, 'INSIRA_URL_LOTE_2_AQUI', false),
  (3, 60.00, 25.00, 'INSIRA_URL_LOTE_3_AQUI', false)
ON CONFLICT (numero_lote) DO NOTHING;

-- Habilitar RLS
ALTER TABLE config_sistema ENABLE ROW LEVEL SECURITY;

-- Policy para permitir leitura pública
CREATE POLICY "Permitir leitura pública de configurações"
  ON config_sistema FOR SELECT
  USING (true);

-- Policy para permitir apenas admins atualizarem
CREATE POLICY "Apenas admins podem atualizar configurações"
  ON config_sistema FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.email = auth.jwt() ->> 'email'
    )
  );

-- Criar função para atualizar o timestamp automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_config_sistema_updated_at
  BEFORE UPDATE ON config_sistema
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
