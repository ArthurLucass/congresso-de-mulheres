-- Atualiza todas as inscrições antigas que estão sem data_compra, usando a data de criação como referência
UPDATE pedidos
SET data_compra = created_at
WHERE data_compra IS NULL OR data_compra = '';
