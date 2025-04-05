
CREATE OR REPLACE FUNCTION public.update_school_and_org(
  p_school_id UUID,
  p_clerk_org_id TEXT
) RETURNS VOID AS $$
BEGIN
  -- Update the school record
  UPDATE public.schools
  SET clerk_org_id = p_clerk_org_id
  WHERE id = p_school_id;
  
  -- Update the organization record if it exists
  UPDATE public.organizations
  SET clerk_org_id = p_clerk_org_id
  WHERE school_id = p_school_id;
END;
$$ LANGUAGE plpgsql;
