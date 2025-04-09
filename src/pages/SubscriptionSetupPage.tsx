import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser, useOrganization } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, CreditCard, Plus, Minus, School } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SubscriptionSetupPage: React.FC = () => {
  const { user } = useUser();
  const { organization } = useOrganization();
  const [teacherSeats, setTeacherSeats] = useState(1); // Minimum 1 teacher seat
  const [studentSeats, setStudentSeats] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string>("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const pricePerSeat = 2; // $2 AUD per seat
  const totalMonthlyCost = (teacherSeats + studentSeats) * pricePerSeat;

  useEffect(() => {
    const fetchSchoolInfo = async () => {
      try {
        if (organization?.id) {
          // Try to get school info from organization
          const { data: orgData } = await supabase
            .from("organizations")
            .select("school_id")
            .eq("clerk_org_id", organization.id)
            .maybeSingle();

          if (orgData?.school_id) {
            setSchoolId(orgData.school_id);

            // Get school name
            const { data: schoolData } = await supabase
              .from("schools")
              .select("name")
              .eq("id", orgData.school_id)
              .maybeSingle();

            if (schoolData?.name) {
              setSchoolName(schoolData.name);
            }

            return;
          }
        }

        if (user?.id) {
          // Try to get school info from user
          const { data: schoolData } = await supabase
            .from("schools")
            .select("id, name")
            .eq("claimed_by_user_id", user.id)
            .maybeSingle();

          if (schoolData?.id) {
            setSchoolId(schoolData.id);
            setSchoolName(schoolData.name || "");
          }
        }
      } catch (error) {
        console.error("Error fetching school info:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load school information.",
        });
      }
    };

    fetchSchoolInfo();
  }, [user, organization, toast]);

  const handleTeacherSeatsChange = (value: number) => {
    // Ensure at least 1 teacher seat
    setTeacherSeats(Math.max(1, value));
  };

  const handleStudentSeatsChange = (value: number) => {
    // Allow 0 or more student seats
    setStudentSeats(Math.max(0, value));
  };

  const handleSubscribe = async () => {
    setError("");
    try {
      setIsLoading(true);

      if (!schoolId) {
        throw new Error("School information not found");
      }

      // Get JWT token for Supabase auth - using the correct method
      let token = "";
      try {
        // Try using the clerk-js SDK method
        if (user) {
          // Cast to any to bypass TypeScript checking for the getToken method
          const userWithToken = user as any;
          if (typeof userWithToken.getToken === 'function') {
            token = await userWithToken.getToken({ template: "supabase" });
          } else {
            console.warn("User getToken method not available - using fallback");
            // Fallback: use another method to get auth token if available
            token = localStorage.getItem('supabase_token') || '';
          }
        }
      } catch (tokenError) {
        console.error("Error getting token:", tokenError);
        throw new Error("Authentication failed");
      }

      if (!token) {
        throw new Error("Authentication failed");
      }

      // Call the Supabase Edge Function to create a checkout session
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            teacherSeats,
            studentSeats,
            schoolId,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create checkout session");
      }

      const { checkoutUrl } = await response.json();

      // Redirect to Stripe Checkout
      window.location.href = checkoutUrl;
    } catch (err: any) {
      console.error("Subscription error:", err);
      setError(err.message || "Failed to set up subscription");
      toast({
        variant: "destructive",
        title: "Subscription Error",
        description: err.message || "Failed to set up subscription",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            <School className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Superlearn</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Subscription Setup</CardTitle>
            <CardDescription>
              Set up your school's subscription to Superlearn
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>School</Label>
              <div className="p-3 bg-muted rounded-md">
                <p className="font-medium">{schoolName || "Your School"}</p>
                {!schoolName && (
                  <p className="text-sm text-muted-foreground">
                    School information not available
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Teacher Seats</h3>
              <div className="flex items-center">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleTeacherSeatsChange(teacherSeats - 1)}
                  disabled={teacherSeats <= 1 || isLoading}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min="1"
                  value={teacherSeats}
                  onChange={(e) =>
                    handleTeacherSeatsChange(parseInt(e.target.value) || 1)
                  }
                  className="mx-2 text-center"
                  disabled={isLoading}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleTeacherSeatsChange(teacherSeats + 1)}
                  disabled={isLoading}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                $2 AUD per teacher / month
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Student Seats</h3>
              <div className="flex items-center">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleStudentSeatsChange(studentSeats - 1)}
                  disabled={studentSeats <= 0 || isLoading}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min="0"
                  value={studentSeats}
                  onChange={(e) =>
                    handleStudentSeatsChange(parseInt(e.target.value) || 0)
                  }
                  className="mx-2 text-center"
                  disabled={isLoading}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleStudentSeatsChange(studentSeats + 1)}
                  disabled={isLoading}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                $2 AUD per student / month
              </p>
            </div>

            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex justify-between items-center">
                <span className="font-medium">Monthly Subscription:</span>
                <span className="font-bold text-lg">
                  ${totalMonthlyCost.toFixed(2)} AUD
                </span>
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                <p>
                  Teacher Seats: {teacherSeats} × $2 = ${teacherSeats * 2} AUD
                </p>
                <p>
                  Student Seats: {studentSeats} × $2 = ${studentSeats * 2} AUD
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              onClick={handleSubscribe}
              disabled={isLoading || !schoolId}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-r-transparent"></span>
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Subscribe Now
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              You will be redirected to our secure payment processor to complete
              your subscription. Your subscription will begin immediately after
              payment is processed.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default SubscriptionSetupPage;
