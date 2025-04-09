import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useOrganization } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, CreditCard, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Subscription: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { user } = useUser();
  const { organization } = useOrganization();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [schoolId, setSchoolId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch the school ID for the current user
    const fetchSchoolId = async () => {
      if (!user?.id) return;

      try {
        // First try to get from organization
        if (organization?.id) {
          // Use raw query to avoid type issues
          const { data } = await supabase
            .from('organizations')
            .select('school_id')
            .eq('clerk_org_id', organization.id)
            .maybeSingle();

          if (data?.school_id) {
            setSchoolId(data.school_id);
            return;
          }
        }

        // Fallback to getting from claimed schools
        const { data } = await supabase
          .from('schools')
          .select('id')
          .eq('claimed_by_user_id', user.id)
          .maybeSingle();

        if (data?.id) {
          setSchoolId(data.id);
        }
      } catch (error) {
        console.error('Failed to fetch school ID:', error);
      }
    };

    fetchSchoolId();
  }, [user, organization]);

  const handleSubscribe = async (planId: string) => {
    try {
      setIsLoading(true);
      
      if (!schoolId) {
        toast({
          variant: 'destructive',
          title: 'Missing school information',
          description: 'Could not find your school. Please try again later.',
        });
        return;
      }
      
      // Calculate number of seats based on plan
      const teacherSeats = 1; // Default to 1 teacher seat
      const studentSeats = planId === 'basic' ? 500 : planId === 'pro' ? 1500 : 5000;
      
      // Call the create-checkout-session endpoint
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          schoolId,
          teacherSeats,
          studentSeats
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      // Redirect to the Stripe checkout URL
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL returned');
      }
      
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast({
        variant: 'destructive',
        title: 'Subscription failed',
        description: error.message || 'An error occurred while processing your subscription.',
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col">
      <header className="bg-white border-b py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-primary">SchoolSignup Central</h1>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Choose your subscription plan</h1>
            <p className="text-muted-foreground">
              Select the plan that best fits your school's needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Basic Plan */}
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-muted px-3 py-1 text-xs font-medium">
                STARTER
              </div>
              <CardHeader>
                <CardTitle>Basic</CardTitle>
                <CardDescription>For small schools just getting started</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-bold">$99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <Check className="h-4 w-4 mr-2 text-primary" />
                    <span>Up to 500 students</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 mr-2 text-primary" />
                    <span>Basic reporting</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 mr-2 text-primary" />
                    <span>Email support</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => handleSubscribe('basic')}
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : 'Select Basic'}
                </Button>
              </CardFooter>
            </Card>

            {/* Pro Plan */}
            <Card className="relative overflow-hidden border-primary">
              <div className="absolute top-0 right-0 bg-primary text-white px-3 py-1 text-xs font-medium">
                POPULAR
              </div>
              <CardHeader>
                <CardTitle>Professional</CardTitle>
                <CardDescription>Perfect for medium-sized schools</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-bold">$199</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <Check className="h-4 w-4 mr-2 text-primary" />
                    <span>Up to 1,500 students</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 mr-2 text-primary" />
                    <span>Advanced reporting</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 mr-2 text-primary" />
                    <span>Priority support</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 mr-2 text-primary" />
                    <span>Teacher management</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full"
                  onClick={() => handleSubscribe('pro')}
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : 'Select Professional'}
                </Button>
              </CardFooter>
            </Card>

            {/* Enterprise Plan */}
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-muted px-3 py-1 text-xs font-medium">
                ADVANCED
              </div>
              <CardHeader>
                <CardTitle>Enterprise</CardTitle>
                <CardDescription>For large school districts</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-bold">$399</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <Check className="h-4 w-4 mr-2 text-primary" />
                    <span>Unlimited students</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 mr-2 text-primary" />
                    <span>Advanced analytics</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 mr-2 text-primary" />
                    <span>24/7 dedicated support</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 mr-2 text-primary" />
                    <span>District-level management</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 mr-2 text-primary" />
                    <span>Custom integrations</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => handleSubscribe('enterprise')}
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : 'Select Enterprise'}
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="mt-10 text-center">
            <div className="bg-muted/50 rounded-lg p-4 inline-flex items-center gap-2 text-sm">
              <Shield className="text-primary h-5 w-5" />
              <span>All plans include a 14-day free trial. No credit card required to start.</span>
            </div>
          </div>
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

export default Subscription;
