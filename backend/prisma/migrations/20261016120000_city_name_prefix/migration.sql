-- Префикс подсказки мест: lower(name) LIKE 'ка%'.
-- text_pattern_ops нужен для поиска с начала строки; ILIKE этот индекс не использует.
CREATE INDEX "City_active_name_prefix"
ON "City" (lower(name) text_pattern_ops)
WHERE status = 'ACTIVE';
