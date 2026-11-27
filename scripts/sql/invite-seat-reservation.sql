-- =============================================================================
-- JNS System — Atomic team invite seat reservation (Phase 2)
-- Run in Supabase SQL Editor once. Safe to re-run.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_invite_with_seat_check(
  p_organization_id uuid,
  p_email text,
  p_role text,
  p_invited_by uuid,
  p_token text,
  p_max_users int
)
RETURNS TABLE (invite_id uuid, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_members int;
  v_pending int;
  v_id uuid;
BEGIN
  IF p_role NOT IN ('admin', 'assistant', 'member') THEN
    RETURN QUERY SELECT NULL::uuid, 'Invalid role'::text;
    RETURN;
  END IF;

  -- Serialize seat checks per workspace
  PERFORM pg_advisory_xact_lock(hashtext(p_organization_id::text));

  SELECT count(*)::int INTO v_members
  FROM public.org_members
  WHERE organization_id = p_organization_id;

  SELECT count(*)::int INTO v_pending
  FROM public.invites
  WHERE organization_id = p_organization_id
    AND status = 'pending';

  IF (v_members + v_pending) >= p_max_users THEN
    RETURN QUERY SELECT NULL::uuid,
      format(
        'This workspace is at the seat limit (%s). Upgrade under Billing for more seats.',
        p_max_users
      )::text;
    RETURN;
  END IF;

  INSERT INTO public.invites (
    organization_id,
    email,
    role,
    invited_by,
    token,
    status
  ) VALUES (
    p_organization_id,
    lower(trim(p_email)),
    p_role,
    p_invited_by,
    p_token,
    'pending'
  )
  RETURNING id INTO v_id;

  RETURN QUERY SELECT v_id, NULL::text;
END;
$$;

REVOKE ALL ON FUNCTION public.create_invite_with_seat_check(uuid, text, text, uuid, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_invite_with_seat_check(uuid, text, text, uuid, text, int) TO service_role;
