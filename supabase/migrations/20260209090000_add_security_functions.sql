/*
  # Security RPC Functions

  Implements secure server-side functions for security operations to be invoked from the client
  without exposing admin privileges in the browser.
*/

-- Ensure required extension for gen_random_uuid
DO $$ BEGIN
  PERFORM 1 FROM pg_extension WHERE extname = 'pgcrypto';
  IF NOT FOUND THEN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  END IF;
END $$;

-- Lock account by email using auth.users lookup
CREATE OR REPLACE FUNCTION lock_account_by_email(
  p_email text,
  p_reason text,
  p_duration_minutes integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = p_email LIMIT 1;

  INSERT INTO account_lockouts(user_id, email, locked_until, reason, is_active)
  VALUES (
    uid,
    p_email,
    now() + make_interval(mins => COALESCE(p_duration_minutes, 60)),
    COALESCE(p_reason, 'Account locked'),
    true
  );
END;
$$;
GRANT EXECUTE ON FUNCTION lock_account_by_email(text, text, integer) TO anon, authenticated;

-- Check if account is currently locked
CREATE OR REPLACE FUNCTION is_account_locked(p_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM account_lockouts
    WHERE email = p_email
      AND is_active = true
      AND locked_until >= now()
  );
$$;
GRANT EXECUTE ON FUNCTION is_account_locked(text) TO anon, authenticated;

-- Log failed login attempt and auto-lock after threshold
CREATE OR REPLACE FUNCTION log_failed_login_attempt(
  p_email text,
  p_ip text,
  p_user_agent text,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cnt integer;
BEGIN
  INSERT INTO failed_login_attempts(email, ip_address, user_agent, failure_reason)
  VALUES (p_email, COALESCE(p_ip, ''), COALESCE(p_user_agent, ''), COALESCE(p_reason, ''));

  SELECT COUNT(*) INTO cnt
  FROM failed_login_attempts
  WHERE email = p_email
    AND attempt_time >= (now() - interval '15 minutes');

  IF cnt >= 5 THEN
    PERFORM lock_account_by_email(p_email, 'Multiple failed login attempts', 60);
    INSERT INTO security_alerts(alert_type, severity, description, ip_address, metadata)
    VALUES (
      'multiple_failed_logins',
      'high',
      'Account ' || p_email || ' locked after ' || cnt || ' failed login attempts',
      p_ip,
      jsonb_build_object('email', p_email, 'attempt_count', cnt)
    );
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION log_failed_login_attempt(text, text, text, text) TO anon, authenticated;

-- Track session securely
CREATE OR REPLACE FUNCTION track_session_rpc(
  p_user_id uuid,
  p_business_id uuid,
  p_session_token text,
  p_ip text,
  p_user_agent text,
  p_device_fingerprint text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO security_sessions(
    user_id, business_id, session_token, ip_address, user_agent, device_fingerprint,
    expires_at, is_active
  )
  VALUES (
    p_user_id, p_business_id, p_session_token, p_ip, p_user_agent, p_device_fingerprint,
    now() + interval '24 hours', true
  );
$$;
GRANT EXECUTE ON FUNCTION track_session_rpc(uuid, uuid, text, text, text, text) TO authenticated;

-- Invalidate all active sessions for a user
CREATE OR REPLACE FUNCTION invalidate_user_sessions_rpc(p_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE security_sessions
  SET is_active = false
  WHERE user_id = p_user_id
    AND is_active = true;
$$;
GRANT EXECUTE ON FUNCTION invalidate_user_sessions_rpc(uuid) TO authenticated;

-- Rate limit check and increment
CREATE OR REPLACE FUNCTION check_rate_limit_rpc(
  p_identifier text,
  p_action_type text,
  p_window_minutes integer,
  p_max_attempts integer
)
RETURNS TABLE(allowed boolean, reset_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rl RECORD;
BEGIN
  SELECT * INTO rl
  FROM rate_limit_tracking
  WHERE identifier = p_identifier
    AND action_type = p_action_type
    AND window_end >= now()
  LIMIT 1;

  IF rl.id IS NULL THEN
    INSERT INTO rate_limit_tracking(identifier, action_type, count, window_start, window_end, blocked)
    VALUES (
      p_identifier, p_action_type, 1, now(), now() + make_interval(mins => COALESCE(p_window_minutes, 15)), false
    );
    RETURN QUERY SELECT true, NULL::timestamptz;
    RETURN;
  END IF;

  IF rl.count >= COALESCE(p_max_attempts, 5) THEN
    UPDATE rate_limit_tracking SET blocked = true WHERE id = rl.id;
    RETURN QUERY SELECT false, rl.window_end;
    RETURN;
  END IF;

  UPDATE rate_limit_tracking SET count = rl.count + 1 WHERE id = rl.id;
  RETURN QUERY SELECT true, rl.window_end;
END;
$$;
GRANT EXECUTE ON FUNCTION check_rate_limit_rpc(text, text, integer, integer) TO anon, authenticated;