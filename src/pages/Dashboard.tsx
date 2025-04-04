
import React, { useState, useEffect } from 'react';
import { useUser, useClerk, useOrganization } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { School, Users, UserPlus, Settings, LogOut, CreditCard, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Subscription } from '@/types';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import TeacherInviteModal from '@/components/TeacherInviteModal';

const Dashboard: React.FC = () => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { organization, isLoaded: isOrgLoaded } = useOrganization();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [teacherCount, setTeacherCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || !isOrgLoaded) return;

      try {
        setLoading(true);
        let fetchedSchoolId = null;

        // First try to get from organization
        if (organization?.id) {
          console.log("Organization found:", organization.id, organization.name);
          // Use raw query to avoid type issues
          const { data: orgData } = await supabase
            .from('organizations')
            .select('school_id')
            .eq('clerk_org_id', organization.id)
            .maybeSingle();

          if (orgData?.school_id) {
            fetchedSchoolId = orgData.school_id;
            console.log("School ID found from organization:", fetchedSchoolId);
          }
        }

        // Fallback to getting from claimed schools
        if (!fetchedSchoolId) {
          console.log("No organization or school ID found, trying claimed schools");
          const { data: schoolData } = await supabase
            .from('schools')
            .select('id')
            .eq('claimed_by_user_id', user.id)
            .maybeSingle();

          if (schoolData?.id) {
            fetchedSchoolId = schoolData.id;
            console.log("School ID found from claimed schools:", fetchedSchoolId);
          }
        }

        if (fetchedSchoolId) {
          setSchoolId(fetchedSchoolId);

          // Fetch subscription data
          const { data: subscriptionData } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('school_id', fetchedSchoolId)
            .maybeSingle();

          if (subscriptionData) {
            setSubscription(subscriptionData as Subscription);
          }
          
          // Fetch teacher count
          if (organization) {
            try {
              const members = await organization.getMemberships();
              console.log("Organization members:", members.data.length);
              
              // Count members with teacher role
              const teacherMembers = members.data.filter(
                member => member.role === 'org:teacher' || 
                          (member.publicMetadata && member.publicMetadata.role === 'teacher')
              );
              
              console.log("Teacher members found:", teacherMembers.length);
              setTeacherCount(teacherMembers.length);
            } catch (err) {
              console.error("Error fetching organization members:", err);
            }
          } else {
            console.warn("No organization found for user");
          }
        } else {
          console.error("No school ID found for user");
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, organization, isOrgLoaded]);

  const handleInviteTeacher = () => {
    if (!organization) {
      toast({
        variant: 'destructive',
        title: 'Organization not found',
        description: 'Cannot invite teachers without an active organization',
      });
      return;
    }
    setShowInviteModal(true);
  };

  const handleInviteSuccess = () => {
    // Refresh data after successful invite
    if (organization) {
      organization.getMemberships().then(result => {
        const teacherMembers = result.data.filter(
          member => member.role === 'org:teacher' || 
                   (member.publicMetadata && member.publicMetadata.role === 'teacher')
        );
        setTeacherCount(teacherMembers.length);
      }).catch(err => {
        console.error("Error refreshing organization members:", err);
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">School Dashboard</h1>
        <Button onClick={handleInviteTeacher}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Teacher
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
            <CardDescription>Your school information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <School className="h-5 w-5 text-primary" />
                <span className="font-medium">{organization?.name || 'Your School'}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Administrator: {user?.username || user?.firstName || 'Admin'}
              </p>
              <Button variant="outline" size="sm" className="mt-2">
                <Settings className="h-4 w-4 mr-2" />
                Manage School
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Teachers</CardTitle>
            <CardDescription>Manage your faculty</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="font-medium">{teacherCount} Active Teacher{teacherCount !== 1 ? 's' : ''}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {teacherCount === 0 ? 
                  "Invite teachers to join your school's platform" : 
                  `You have ${subscription?.total_teacher_seats ?? 0} teacher seats in your plan`
                }
              </p>
              <Button variant="outline" size="sm" className="mt-2" onClick={handleInviteTeacher}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Teacher
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Your current plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <span className="font-medium">Professional Plan</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {subscription ? (
                  <>
                    {subscription.total_teacher_seats} teacher seats
                    ({subscription.used_teacher_seats} used)
                  </>
                ) : (
                  'Loading subscription details...'
                )}
              </p>
              <Button variant="outline" size="sm" className="mt-2">
                Manage Subscription
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>Complete these steps to set up your school</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-lg bg-secondary/50">
              <div className="bg-primary/10 rounded-full p-2">
                <Check className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Create your account</h3>
                <p className="text-sm text-muted-foreground">Your admin account has been successfully created</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 rounded-lg bg-secondary/50">
              <div className="bg-primary/10 rounded-full p-2">
                <Check className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Set up your school</h3>
                <p className="text-sm text-muted-foreground">Your school has been successfully registered</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 rounded-lg bg-secondary/50">
              <div className="bg-primary/10 rounded-full p-2">
                <Check className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Subscribe to a plan</h3>
                <p className="text-sm text-muted-foreground">You've successfully subscribed to our platform</p>
              </div>
            </div>
            
            <div className={`flex items-start gap-4 p-4 rounded-lg ${teacherCount > 0 ? 'bg-secondary/50' : 'border border-dashed'}`}>
              <div className={`${teacherCount > 0 ? 'bg-primary/10' : 'bg-secondary'} rounded-full p-2`}>
                {teacherCount > 0 ? (
                  <Check className="h-5 w-5 text-primary" />
                ) : (
                  <UserPlus className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <h3 className="font-medium">Invite teachers</h3>
                <p className="text-sm text-muted-foreground">
                  {teacherCount > 0 
                    ? `You've invited ${teacherCount} teacher${teacherCount !== 1 ? 's' : ''} to your school`
                    : "Invite faculty members to join your school's platform"}
                </p>
                {teacherCount === 0 && (
                  <Button className="mt-2" variant="outline" size="sm" onClick={handleInviteTeacher}>
                    Start inviting
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teacher Invite Modal */}
      <TeacherInviteModal 
        isOpen={showInviteModal} 
        onClose={() => setShowInviteModal(false)} 
        onSuccess={handleInviteSuccess}
      />
    </DashboardLayout>
  );
};

export default Dashboard;
