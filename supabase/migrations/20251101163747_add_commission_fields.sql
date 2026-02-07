/*
  # Agregar Campos de Comisión a Transferencias

  1. Cambios en Tabla `transfers`
    - `commission_amount` (decimal): Monto de la comisión cobrada
    - `commission_included` (boolean): Si la comisión está incluida en el monto o pagada aparte
    - `net_amount` (decimal, calculado): Monto neto que cuenta para el límite semanal

  2. Lógica de Cálculo
    - Si comisión incluida: net_amount = amount - commission_amount
    - Si comisión pagada aparte: net_amount = amount (el total cuenta para el límite)

  3. Seguridad
    - Actualiza función de verificación de elegibilidad para usar net_amount
    - Actualiza políticas RLS si es necesario

  4. Notas Importantes
    - El límite de 999€ se calcula sobre net_amount
    - La comisión no se suma al límite si fue pagada aparte
    - Si la comisión está incluida, solo cuenta el monto neto enviado al beneficiario
*/

-- Agregar campos de comisión a la tabla transfers
DO $$
BEGIN
  -- Agregar campo commission_amount si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transfers' AND column_name = 'commission_amount'
  ) THEN
    ALTER TABLE transfers ADD COLUMN commission_amount DECIMAL(10,2) DEFAULT 0 NOT NULL;
  END IF;

  -- Agregar campo commission_included si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transfers' AND column_name = 'commission_included'
  ) THEN
    ALTER TABLE transfers ADD COLUMN commission_included BOOLEAN DEFAULT false NOT NULL;
  END IF;

  -- Agregar campo net_amount (calculado) si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transfers' AND column_name = 'net_amount'
  ) THEN
    ALTER TABLE transfers ADD COLUMN net_amount DECIMAL(10,2);
  END IF;
END $$;

-- Crear índice para mejorar performance en consultas de net_amount
CREATE INDEX IF NOT EXISTS idx_transfers_net_amount ON transfers(net_amount);
CREATE INDEX IF NOT EXISTS idx_transfers_commission_included ON transfers(commission_included);

-- Actualizar net_amount para registros existentes
UPDATE transfers
SET net_amount = amount
WHERE net_amount IS NULL;

-- Hacer net_amount NOT NULL después de la actualización
ALTER TABLE transfers ALTER COLUMN net_amount SET NOT NULL;

-- Crear función para calcular net_amount automáticamente
CREATE OR REPLACE FUNCTION calculate_net_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la comisión está incluida en el monto
  IF NEW.commission_included = true THEN
    -- El monto neto es el monto total menos la comisión
    NEW.net_amount := NEW.amount - COALESCE(NEW.commission_amount, 0);
  ELSE
    -- Si la comisión fue pagada aparte, el monto total cuenta para el límite
    NEW.net_amount := NEW.amount;
  END IF;

  -- Asegurar que net_amount no sea negativo
  IF NEW.net_amount < 0 THEN
    NEW.net_amount := 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para calcular net_amount automáticamente
DROP TRIGGER IF EXISTS trigger_calculate_net_amount ON transfers;
CREATE TRIGGER trigger_calculate_net_amount
  BEFORE INSERT OR UPDATE OF amount, commission_amount, commission_included
  ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION calculate_net_amount();

-- Actualizar la función check_transfer_eligibility para usar net_amount
CREATE OR REPLACE FUNCTION check_transfer_eligibility(
  p_client_id UUID,
  p_amount DECIMAL
)
RETURNS JSON AS $$
DECLARE
  v_total_used DECIMAL;
  v_amount_available DECIMAL;
  v_oldest_transfer_date TIMESTAMPTZ;
  v_days_until_available INTEGER;
  v_can_transfer BOOLEAN;
  v_message TEXT;
BEGIN
  -- Calcular el total usado en los últimos 8 días (usando net_amount)
  SELECT COALESCE(SUM(net_amount), 0), MIN(transfer_date)
  INTO v_total_used, v_oldest_transfer_date
  FROM transfers
  WHERE client_id = p_client_id
    AND transfer_date >= NOW() - INTERVAL '8 days'
    AND status = 'completed';

  -- Calcular cuánto le queda disponible
  v_amount_available := 999 - v_total_used;

  -- Si tiene suficiente disponible
  IF v_amount_available >= p_amount THEN
    v_can_transfer := true;
    v_days_until_available := 0;
    v_message := 'Cliente puede transferir';
  ELSE
    v_can_transfer := false;

    -- Calcular días hasta que pueda transferir
    IF v_oldest_transfer_date IS NOT NULL THEN
      v_days_until_available := GREATEST(0,
        EXTRACT(DAY FROM (v_oldest_transfer_date + INTERVAL '8 days') - NOW())::INTEGER
      );
    ELSE
      v_days_until_available := 0;
    END IF;

    v_message := format('Cliente debe esperar %s días', v_days_until_available);
  END IF;

  RETURN json_build_object(
    'can_transfer', v_can_transfer,
    'amount_used', v_total_used,
    'amount_available', v_amount_available,
    'days_until_available', v_days_until_available,
    'message', v_message,
    'next_available_date', v_oldest_transfer_date + INTERVAL '8 days'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agregar comentarios para documentación
COMMENT ON COLUMN transfers.commission_amount IS 'Monto de la comisión cobrada por la transferencia';
COMMENT ON COLUMN transfers.commission_included IS 'Indica si la comisión está incluida en el monto (true) o pagada aparte (false)';
COMMENT ON COLUMN transfers.net_amount IS 'Monto neto que cuenta para el cálculo del límite semanal de 999€';

-- Actualizar net_amount para todas las transferencias existentes
UPDATE transfers
SET net_amount = amount
WHERE commission_amount = 0 OR commission_amount IS NULL;
