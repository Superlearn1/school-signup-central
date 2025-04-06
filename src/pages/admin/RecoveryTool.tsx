
import React, { useState, useEffect } from 'react';
import { useUser, useOrganization } from '@clerk/clerk-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/layouts/DashboardLayout';

const RecoveryTool: React.FC = () => {
  const { user } = useUser();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [hasIssue, setHasIssue] = useState(false);

  useEffect(() => {
    const checkOrganizationStatus = async () => {
      if (!user) return;

      try {
        // Get the school associated with the current user
        const { data: profile } = await supabase
          .from('profiles')
          .select('school_id, role')
          .eq('id', user.id)
          .maybeSingle();

        if (!profile || profile.role !== 'admin') {
          setHasIssue(false);
          return;
        }

        const { data: schoolData } = await supabase
          .from('schools')
          .select('*')
          .eq('id', profile.school_id)
          .maybeSingle();

        setSchool(schoolData);

        // Check if there's an issue: admin with a school but no Clerk organization
        setHasIssue(schoolData && (!schoolData.clerk_org_id || !organization));
      } catch (error) {
        console.error('Error checking organization status:', error);
      }
    };

    checkOrganizationStatus();
  }, [user, organization]);

  const handleCreateOrganization = async () => {
    if (!user || !school) return;

    setLoading(true);
    try {
      // Create a new Clerk organization
      const response = await fetch('/api/create-organization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: school.name,
          schoolId: school.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create organization');
      }

      const data = await response.json();
      const clerkOrgId = data.id;

      // Update the school record with the new Clerk org ID
      const { error: updateError } = await supabase
        .from('schools')
        .update({ clerk_org_id: clerkOrgId })
        .eq('id', school.id);

      if (updateError) {
        throw new Error(`Failed to update school: ${updateError.message}`);
      }

      // Update the organization record with the new Clerk org ID
      const { error: orgUpdateError } = await supabase
        .from('organizations')
        .update({ clerk_org_id: clerkOrgId })
        .eq('school_id', school.id);

      if (orgUpdateError) {
        console.error('Failed to update organization:', orgUpdateError);
        // Continue anyway
      }

      toast({
        title: 'Recovery successful',
        description: 'Your school has been linked to a new organization. Please refresh the page.',
      });

      // Reload the page to apply the changes
      window.location.reload();
    } catch (error: any) {
      console.error('Error creating organization:', error);
      toast({
        variant: 'destructive',
        title: 'Recovery failed',
        description: error.message || 'Failed to create organization',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!hasIssue) {
    return null; // Don't show anything if there's no issue
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <Card className="border-yellow-500 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-700">Organization Issue Detected</CardTitle>
            <CardDescription className="text-yellow-600">
              We detected an issue with your school's organization setup. This may prevent you from inviting teachers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-yellow-600 mb-4">
              Your school <strong>{school?.name}</strong> is missing a proper organization link in our system.
              This is a one-time fix that will allow you to invite teachers and manage your school correctly.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleCreateOrganization} 
              disabled={loading}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {loading ? 'Fixing...' : 'Fix Organization Issue'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default RecoveryTool;
