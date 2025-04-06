-- Create tables
CREATE TABLE IF NOT EXISTS schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    acara_id TEXT,
    name TEXT NOT NULL,
    suburb TEXT,
    state TEXT,
    postcode TEXT,
    claimed_by_user_id TEXT,
    clerk_org_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    claimed BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    full_name TEXT,
    school_id UUID NOT NULL REFERENCES schools(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    clerk_user_id TEXT
);

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id),
    admin_id TEXT NOT NULL,
    name TEXT NOT NULL,
    clerk_org_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id),
    total_teacher_seats INTEGER NOT NULL DEFAULT 1,
    used_teacher_seats INTEGER NOT NULL DEFAULT 0,
    total_student_seats INTEGER NOT NULL DEFAULT 0,
    used_student_seats INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'inactive',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    school_id UUID NOT NULL REFERENCES schools(id),
    disabilities JSONB DEFAULT '[]',
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    subject TEXT,
    objective TEXT,
    content TEXT,
    created_by TEXT NOT NULL,
    school_id UUID NOT NULL REFERENCES schools(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS resource_adaptations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID REFERENCES resources(id),
    student_id UUID NOT NULL REFERENCES students(id),
    adapted_content TEXT NOT NULL,
    disabilities_considered JSONB DEFAULT '[]',
    generated_by_ai BOOLEAN DEFAULT true,
    created_by TEXT NOT NULL,
    school_id UUID NOT NULL REFERENCES schools(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nccd_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_adaptation_id UUID NOT NULL REFERENCES resource_adaptations(id),
    student_id UUID NOT NULL REFERENCES students(id),
    teacher_id TEXT NOT NULL,
    school_id UUID NOT NULL REFERENCES schools(id),
    taught_on DATE NOT NULL,
    pdf_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create RLS Policies
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_adaptations ENABLE ROW LEVEL SECURITY;
ALTER TABLE nccd_evidence ENABLE ROW LEVEL SECURITY;

-- Schools policies
CREATE POLICY "Allow users to view their school" ON schools
    FOR SELECT TO authenticated
    USING (id IN (
        SELECT school_id FROM profiles WHERE clerk_user_id = auth.uid()::text
    ));

-- Profiles policies
CREATE POLICY "Allow users to view profiles in their school" ON profiles
    FOR SELECT TO authenticated
    USING (school_id IN (
        SELECT school_id FROM profiles WHERE clerk_user_id = auth.uid()::text
    ));

CREATE POLICY "Allow users to update their own profile" ON profiles
    FOR UPDATE TO authenticated
    USING (clerk_user_id = auth.uid()::text)
    WITH CHECK (clerk_user_id = auth.uid()::text);

-- Organizations policies
CREATE POLICY "Allow users to view their organization" ON organizations
    FOR SELECT TO authenticated
    USING (school_id IN (
        SELECT school_id FROM profiles WHERE clerk_user_id = auth.uid()::text
    ));

-- Subscriptions policies
CREATE POLICY "Allow users to view their school's subscription" ON subscriptions
    FOR SELECT TO authenticated
    USING (school_id IN (
        SELECT school_id FROM profiles WHERE clerk_user_id = auth.uid()::text
    ));

-- Students policies
CREATE POLICY "Allow users to view students in their school" ON students
    FOR SELECT TO authenticated
    USING (school_id IN (
        SELECT school_id FROM profiles WHERE clerk_user_id = auth.uid()::text
    ));

CREATE POLICY "Allow teachers to create students" ON students
    FOR INSERT TO authenticated
    WITH CHECK (school_id IN (
        SELECT school_id FROM profiles 
        WHERE clerk_user_id = auth.uid()::text 
        AND role = 'teacher'
    ));

-- Resources policies
CREATE POLICY "Allow users to view resources in their school" ON resources
    FOR SELECT TO authenticated
    USING (school_id IN (
        SELECT school_id FROM profiles WHERE clerk_user_id = auth.uid()::text
    ));

CREATE POLICY "Allow teachers to create resources" ON resources
    FOR INSERT TO authenticated
    WITH CHECK (school_id IN (
        SELECT school_id FROM profiles 
        WHERE clerk_user_id = auth.uid()::text 
        AND role = 'teacher'
    ));

-- Resource adaptations policies
CREATE POLICY "Allow users to view adaptations in their school" ON resource_adaptations
    FOR SELECT TO authenticated
    USING (school_id IN (
        SELECT school_id FROM profiles WHERE clerk_user_id = auth.uid()::text
    ));

CREATE POLICY "Allow teachers to create adaptations" ON resource_adaptations
    FOR INSERT TO authenticated
    WITH CHECK (school_id IN (
        SELECT school_id FROM profiles 
        WHERE clerk_user_id = auth.uid()::text 
        AND role = 'teacher'
    ));

-- NCCD evidence policies
CREATE POLICY "Allow users to view evidence in their school" ON nccd_evidence
    FOR SELECT TO authenticated
    USING (school_id IN (
        SELECT school_id FROM profiles WHERE clerk_user_id = auth.uid()::text
    ));

CREATE POLICY "Allow teachers to create evidence" ON nccd_evidence
    FOR INSERT TO authenticated
    WITH CHECK (school_id IN (
        SELECT school_id FROM profiles 
        WHERE clerk_user_id = auth.uid()::text 
        AND role = 'teacher'
    ));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_organizations_school_id ON organizations(school_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_school_id ON subscriptions(school_id);
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_resources_school_id ON resources(school_id);
CREATE INDEX IF NOT EXISTS idx_resource_adaptations_school_id ON resource_adaptations(school_id);
CREATE INDEX IF NOT EXISTS idx_nccd_evidence_school_id ON nccd_evidence(school_id);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resources_updated_at
    BEFORE UPDATE ON resources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resource_adaptations_updated_at
    BEFORE UPDATE ON resource_adaptations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nccd_evidence_updated_at
    BEFORE UPDATE ON nccd_evidence
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 