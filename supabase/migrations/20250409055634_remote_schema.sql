drop trigger if exists "update_nccd_evidence_updated_at" on "public"."nccd_evidence";

drop trigger if exists "update_organizations_updated_at" on "public"."organizations";

drop trigger if exists "update_resource_adaptations_updated_at" on "public"."resource_adaptations";

drop trigger if exists "update_resources_updated_at" on "public"."resources";

drop trigger if exists "update_students_updated_at" on "public"."students";

drop trigger if exists "update_subscriptions_updated_at" on "public"."subscriptions";

drop policy "Allow teachers to create evidence" on "public"."nccd_evidence";

drop policy "Allow users to view evidence in their school" on "public"."nccd_evidence";

drop policy "Allow users to view their organization" on "public"."organizations";

drop policy "Allow users to update their own profile" on "public"."profiles";

drop policy "Allow users to view profiles in their school" on "public"."profiles";

drop policy "Allow teachers to create adaptations" on "public"."resource_adaptations";

drop policy "Allow users to view adaptations in their school" on "public"."resource_adaptations";

drop policy "Allow teachers to create resources" on "public"."resources";

drop policy "Allow users to view resources in their school" on "public"."resources";

drop policy "Allow users to view their school" on "public"."schools";

drop policy "Allow teachers to create students" on "public"."students";

drop policy "Allow users to view students in their school" on "public"."students";

drop policy "Allow users to view their school's subscription" on "public"."subscriptions";

alter table "public"."nccd_evidence" drop constraint "nccd_evidence_resource_adaptation_id_fkey";

alter table "public"."nccd_evidence" drop constraint "nccd_evidence_school_id_fkey";

alter table "public"."nccd_evidence" drop constraint "nccd_evidence_student_id_fkey";

alter table "public"."profiles" drop constraint "profiles_school_id_fkey";

alter table "public"."resource_adaptations" drop constraint "resource_adaptations_resource_id_fkey";

alter table "public"."resource_adaptations" drop constraint "resource_adaptations_school_id_fkey";

alter table "public"."resource_adaptations" drop constraint "resource_adaptations_student_id_fkey";

alter table "public"."resources" drop constraint "resources_school_id_fkey";

alter table "public"."students" drop constraint "students_school_id_fkey";

alter table "public"."subscriptions" drop constraint "subscriptions_school_id_fkey";

drop function if exists "public"."update_updated_at_column"();

alter table "public"."nccd_evidence" drop constraint "nccd_evidence_pkey";

drop index if exists "public"."idx_nccd_evidence_school_id";

drop index if exists "public"."idx_organizations_school_id";

drop index if exists "public"."idx_resource_adaptations_school_id";

drop index if exists "public"."idx_resources_school_id";

drop index if exists "public"."nccd_evidence_pkey";

alter table "public"."nccd_evidence" disable row level security;

alter table "public"."organizations" disable row level security;

alter table "public"."profiles" disable row level security;

alter table "public"."resource_adaptations" disable row level security;

alter table "public"."resources" disable row level security;

alter table "public"."schools" disable row level security;

alter table "public"."students" disable row level security;

alter table "public"."subscriptions" add column "current_period_end" timestamp with time zone;

alter table "public"."subscriptions" disable row level security;

CREATE UNIQUE INDEX dccd_evidence_pkey ON public.nccd_evidence USING btree (id);

CREATE UNIQUE INDEX dccd_evidence_resource_adaptation_id_key ON public.nccd_evidence USING btree (resource_adaptation_id);

CREATE INDEX idx_dccd_evidence_school_id_teacher_id ON public.nccd_evidence USING btree (school_id, teacher_id);

CREATE INDEX idx_dccd_evidence_student_id ON public.nccd_evidence USING btree (student_id);

CREATE INDEX idx_resource_adaptations_created_by ON public.resource_adaptations USING btree (created_by);

CREATE INDEX idx_resource_adaptations_school_id_student_id ON public.resource_adaptations USING btree (school_id, student_id);

CREATE INDEX idx_resources_school_id_created_by ON public.resources USING btree (school_id, created_by);

CREATE INDEX idx_schools_clerk_org_id ON public.schools USING btree (clerk_org_id);

CREATE INDEX organizations_admin_id_idx ON public.organizations USING btree (admin_id);

CREATE INDEX organizations_clerk_org_id_idx ON public.organizations USING btree (clerk_org_id);

CREATE INDEX organizations_school_id_idx ON public.organizations USING btree (school_id);

CREATE INDEX profiles_clerk_user_id_idx ON public.profiles USING btree (clerk_user_id);

CREATE UNIQUE INDEX schools_acara_id_key ON public.schools USING btree (acara_id);

CREATE UNIQUE INDEX schools_claimed_by_user_id_key ON public.schools USING btree (claimed_by_user_id);

CREATE UNIQUE INDEX schools_clerk_org_id_key ON public.schools USING btree (clerk_org_id);

CREATE UNIQUE INDEX subscriptions_school_id_key ON public.subscriptions USING btree (school_id);

CREATE UNIQUE INDEX subscriptions_stripe_customer_id_key ON public.subscriptions USING btree (stripe_customer_id);

CREATE UNIQUE INDEX subscriptions_stripe_subscription_id_key ON public.subscriptions USING btree (stripe_subscription_id);

CREATE UNIQUE INDEX unique_student_per_school ON public.students USING btree (school_id, student_id);

alter table "public"."nccd_evidence" add constraint "dccd_evidence_pkey" PRIMARY KEY using index "dccd_evidence_pkey";

alter table "public"."nccd_evidence" add constraint "dccd_evidence_resource_adaptation_id_fkey" FOREIGN KEY (resource_adaptation_id) REFERENCES resource_adaptations(id) ON DELETE CASCADE not valid;

alter table "public"."nccd_evidence" validate constraint "dccd_evidence_resource_adaptation_id_fkey";

alter table "public"."nccd_evidence" add constraint "dccd_evidence_resource_adaptation_id_key" UNIQUE using index "dccd_evidence_resource_adaptation_id_key";

alter table "public"."nccd_evidence" add constraint "dccd_evidence_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE not valid;

alter table "public"."nccd_evidence" validate constraint "dccd_evidence_school_id_fkey";

alter table "public"."nccd_evidence" add constraint "dccd_evidence_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE not valid;

alter table "public"."nccd_evidence" validate constraint "dccd_evidence_student_id_fkey";

alter table "public"."nccd_evidence" add constraint "dccd_evidence_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE RESTRICT not valid;

alter table "public"."nccd_evidence" validate constraint "dccd_evidence_teacher_id_fkey";

alter table "public"."profiles" add constraint "profiles_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'teacher'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_role_check";

alter table "public"."resource_adaptations" add constraint "resource_adaptations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE RESTRICT not valid;

alter table "public"."resource_adaptations" validate constraint "resource_adaptations_created_by_fkey";

alter table "public"."resources" add constraint "resources_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE RESTRICT not valid;

alter table "public"."resources" validate constraint "resources_created_by_fkey";

alter table "public"."resources" add constraint "resources_type_check" CHECK ((type = ANY (ARRAY['lesson_plan'::text, 'assessment'::text, 'other_activity'::text]))) not valid;

alter table "public"."resources" validate constraint "resources_type_check";

alter table "public"."schools" add constraint "schools_acara_id_key" UNIQUE using index "schools_acara_id_key";

alter table "public"."schools" add constraint "schools_claimed_by_user_id_key" UNIQUE using index "schools_claimed_by_user_id_key";

alter table "public"."schools" add constraint "schools_clerk_org_id_key" UNIQUE using index "schools_clerk_org_id_key";

alter table "public"."students" add constraint "students_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL not valid;

alter table "public"."students" validate constraint "students_created_by_fkey";

alter table "public"."students" add constraint "students_disabilities_check" CHECK ((jsonb_typeof(disabilities) = 'array'::text)) not valid;

alter table "public"."students" validate constraint "students_disabilities_check";

alter table "public"."students" add constraint "unique_student_per_school" UNIQUE using index "unique_student_per_school";

alter table "public"."subscriptions" add constraint "subscriptions_school_id_key" UNIQUE using index "subscriptions_school_id_key";

alter table "public"."subscriptions" add constraint "subscriptions_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'past_due'::text, 'canceled'::text]))) not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_status_check";

alter table "public"."subscriptions" add constraint "subscriptions_stripe_customer_id_key" UNIQUE using index "subscriptions_stripe_customer_id_key";

alter table "public"."subscriptions" add constraint "subscriptions_stripe_subscription_id_key" UNIQUE using index "subscriptions_stripe_subscription_id_key";

alter table "public"."subscriptions" add constraint "subscriptions_total_student_seats_check" CHECK ((total_student_seats >= 0)) not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_total_student_seats_check";

alter table "public"."subscriptions" add constraint "subscriptions_total_teacher_seats_check" CHECK ((total_teacher_seats >= 1)) not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_total_teacher_seats_check";

alter table "public"."subscriptions" add constraint "subscriptions_used_student_seats_check" CHECK ((used_student_seats >= 0)) not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_used_student_seats_check";

alter table "public"."subscriptions" add constraint "subscriptions_used_teacher_seats_check" CHECK ((used_teacher_seats >= 0)) not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_used_teacher_seats_check";

alter table "public"."profiles" add constraint "profiles_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT not valid;

alter table "public"."profiles" validate constraint "profiles_school_id_fkey";

alter table "public"."resource_adaptations" add constraint "resource_adaptations_resource_id_fkey" FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE SET NULL not valid;

alter table "public"."resource_adaptations" validate constraint "resource_adaptations_resource_id_fkey";

alter table "public"."resource_adaptations" add constraint "resource_adaptations_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE not valid;

alter table "public"."resource_adaptations" validate constraint "resource_adaptations_school_id_fkey";

alter table "public"."resource_adaptations" add constraint "resource_adaptations_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE not valid;

alter table "public"."resource_adaptations" validate constraint "resource_adaptations_student_id_fkey";

alter table "public"."resources" add constraint "resources_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE not valid;

alter table "public"."resources" validate constraint "resources_school_id_fkey";

alter table "public"."students" add constraint "students_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE not valid;

alter table "public"."students" validate constraint "students_school_id_fkey";

alter table "public"."subscriptions" add constraint "subscriptions_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_school_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_subscription(p_school_id uuid, p_stripe_customer_id text, p_stripe_subscription_id text, p_status text, p_total_teacher_seats integer, p_total_student_seats integer, p_current_period_end timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Insert new subscription
  INSERT INTO subscriptions (
    school_id,
    stripe_customer_id,
    stripe_subscription_id,
    status,
    total_teacher_seats,
    total_student_seats,
    current_period_end,
    created_at,
    updated_at
  ) VALUES (
    p_school_id,
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_status,
    p_total_teacher_seats,
    p_total_student_seats,
    p_current_period_end,
    NOW(),
    NOW()
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_school_and_org(p_school_id uuid, p_clerk_org_id text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_subscription(p_school_id uuid, p_stripe_customer_id text, p_stripe_subscription_id text, p_status text, p_total_teacher_seats integer, p_total_student_seats integer, p_current_period_end timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_subscription_id UUID;
BEGIN
  -- Check if a subscription already exists for this school
  SELECT id INTO v_subscription_id
  FROM subscriptions
  WHERE school_id = p_school_id;
  
  IF v_subscription_id IS NULL THEN
    -- Insert new subscription
    INSERT INTO subscriptions (
      school_id,
      stripe_customer_id,
      stripe_subscription_id,
      status,
      total_teacher_seats,
      total_student_seats,
      current_period_end
    ) VALUES (
      p_school_id,
      p_stripe_customer_id,
      p_stripe_subscription_id,
      p_status,
      p_total_teacher_seats,
      p_total_student_seats,
      p_current_period_end
    );
  ELSE
    -- Update existing subscription
    UPDATE subscriptions
    SET
      stripe_customer_id = p_stripe_customer_id,
      stripe_subscription_id = p_stripe_subscription_id,
      status = p_status,
      total_teacher_seats = p_total_teacher_seats,
      total_student_seats = p_total_student_seats,
      current_period_end = p_current_period_end,
      updated_at = NOW()
    WHERE
      school_id = p_school_id;
  END IF;
END;
$function$
;


