
import React, { useState, useEffect } from 'react';
import { useUser, useClerk, useOrganization } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { School, Users, UserPlus, Settings, LogOut, CreditCard, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Subscription } from '@/types';

const Dashboard: React.FC = () => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        let fetchedSchoolId = null;

        // First try to get from organization
        if (organization?.id) {
          // Use raw query to avoid type issues
          const { data: orgData } = await supabase
            .from('organizations')
            .select('school_id')
            .eq('clerk_org_id', organization.id)
            .maybeSingle();

          if (orgData?.school_id) {
            fetchedSchoolId = orgData.school_id;
          }
        }

        // Fallback to getting from claimed schools
        if (!fetchedSchoolId) {
          const { data: schoolData } = await supabase
            .from('schools')
            .select('id')
            .eq('claimed_by_user_id', user.id)
            .maybeSingle();

          if (schoolData?.id) {
            fetchedSchoolId = schoolData.id;
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
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, organization]);

  const handleInviteTeacher = () => {
    toast({
      title: 'Feature coming soon',
      description: 'Teacher invitation functionality is being implemented.',
    });
  };

  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col">
      <header className="bg-white border-b py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-primary flex items-center">
            <School className="mr-2" /> SchoolSignup Central
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              Welcome, {user?.username || user?.firstName || 'Admin'}
            </span>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
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
                    <span className="font-medium">0 Active Teachers</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Invite teachers to join your school's platform
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
                    Next billing date: {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
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
                
                <div className="flex items-start gap-4 p-4 rounded-lg border border-dashed">
                  <div className="bg-secondary rounded-full p-2">
                    <UserPlus className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium">Invite teachers</h3>
                    <p className="text-sm text-muted-foreground">Invite faculty members to join your school's platform</p>
                    <Button className="mt-2" variant="outline" size="sm" onClick={handleInviteTeacher}>
                      Start inviting
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="bg-white border-t py-4 px-6 text-center text-sm text-muted-foreground">
        <div className="max-w-7xl mx-auto">
          &copy; {new Date().getFullYear()} SchoolSignup Central. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
