import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const StripeDebugger: React.FC = () => {
  const { user } = useUser();
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [schoolId, setSchoolId] = useState<string>("");
  const [checkoutSessionId, setCheckoutSessionId] = useState<string>("");
  const [subscriptionId, setSubscriptionId] = useState<string>("");
  const [activeTest, setActiveTest] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("diagnostics");

  useEffect(() => {
    const fetchSchoolId = async () => {
      if (!user?.id) return;

      try {
        const { data } = await supabase
          .from("schools")
          .select("id")
          .eq("claimed_by_user_id", user.id)
          .maybeSingle();

        if (data?.id) {
          setSchoolId(data.id);
        }
      } catch (error) {
        console.error("Error fetching school ID:", error);
      }
    };

    fetchSchoolId();
  }, [user]);

  const runDiagnosticTest = async (endpoint: string, payload: any = {}) => {
    setLoading(true);
    setActiveTest(endpoint);
    setError("");
    setResults(null);

    try {
      console.log(`Running diagnostic test: ${endpoint}`);
      console.log(`Payload: ${JSON.stringify(payload)}`);

      // Always use anonymous access for diagnostic functions to avoid auth issues
      try {
        // First try with a preflight OPTIONS request to ensure CORS is working
        try {
          await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`,
            {
              method: "OPTIONS",
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type, apikey",
              },
            },
          );
        } catch (optionsError) {
          console.log(
            "OPTIONS preflight request failed, continuing anyway",
            optionsError,
          );
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`,
          {
            method: "POST",
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
        );

        const responseText = await response.text();
        console.log(`Raw response from ${endpoint}:`, responseText);

        if (!response.ok) {
          throw new Error(
            `HTTP error! Status: ${response.status}, Response: ${responseText}`,
          );
        }

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          throw new Error(`Failed to parse response as JSON: ${responseText}`);
        }

        console.log(`Parsed response from ${endpoint}:`, data);
        setResults(data);
      } catch (fetchError: any) {
        console.error(`Fetch error in ${endpoint}:`, fetchError);
        throw new Error(fetchError.message || `Failed to fetch ${endpoint}`);
      }
    } catch (err: any) {
      console.error(`Error in ${endpoint} diagnostic:`, err);
      setError(err.message || `Failed to run ${endpoint} diagnostic`);
    } finally {
      setLoading(false);
    }
  };

  const testCheckoutSession = async () => {
    if (!schoolId) {
      setError("School ID is required");
      return;
    }

    await runDiagnosticTest("diagnostic-checkout", {
      teacherSeats: 1,
      studentSeats: 10,
      schoolId,
    });
  };

  const testWebhook = async () => {
    await runDiagnosticTest("diagnostic-webhook");
  };

  const testSubscription = async () => {
    await runDiagnosticTest("diagnostic-subscription");
  };

  const checkEnvVars = async () => {
    await runDiagnosticTest("check-env-vars");
  };

  const verifyCheckoutSession = async () => {
    if (!checkoutSessionId) {
      setError("Checkout Session ID is required");
      return;
    }

    await runDiagnosticTest("verify-checkout-session", {
      sessionId: checkoutSessionId,
    });
  };

  const updateSubscription = async () => {
    if (!schoolId) {
      setError("School ID is required");
      return;
    }

    await runDiagnosticTest("update-subscription", {
      teacherSeats: 2,
      studentSeats: 15,
      schoolId,
    });
  };

  const runStripeDiagnostic = async (action: string, params: any = {}) => {
    setLoading(true);
    setActiveTest(`stripe-diagnostic-${action}`);
    setError("");
    setResults(null);

    try {
      console.log(`Running stripe diagnostic: ${action}`);

      // Always use anonymous access for diagnostic functions to avoid auth issues
      try {
        // First try with a preflight OPTIONS request to ensure CORS is working
        try {
          await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-diagnostic`,
            {
              method: "OPTIONS",
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type, apikey",
              },
            },
          );
        } catch (optionsError) {
          console.log(
            "OPTIONS preflight request failed, continuing anyway",
            optionsError,
          );
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-diagnostic`,
          {
            method: "POST",
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action,
              schoolId: params.schoolId || schoolId,
              sessionId: params.sessionId || checkoutSessionId,
              subscriptionId: params.subscriptionId || subscriptionId,
            }),
          },
        );

        const responseText = await response.text();
        console.log(`Raw response from stripe-diagnostic:`, responseText);

        if (!response.ok) {
          throw new Error(
            `HTTP error! Status: ${response.status}, Response: ${responseText}`,
          );
        }

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          throw new Error(`Failed to parse response as JSON: ${responseText}`);
        }

        console.log(`Parsed response from stripe-diagnostic:`, data);
        setResults(data);
      } catch (fetchError: any) {
        console.error(`Fetch error in stripe-diagnostic:`, fetchError);
        throw new Error(
          fetchError.message || `Failed to fetch stripe-diagnostic`,
        );
      }
    } catch (err: any) {
      console.error(`Error in ${action} diagnostic:`, err);
      setError(err.message || `Failed to run ${action} diagnostic`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Stripe Integration Debugger</h1>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full mb-6"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="diagnostics">Basic Diagnostics</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Tools</TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <TabsContent value="diagnostics" className="mt-0 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Diagnostic Tests</CardTitle>
                <CardDescription>
                  Run diagnostic tests on Stripe integration components
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="schoolId">School ID</Label>
                  <Input
                    id="schoolId"
                    value={schoolId}
                    onChange={(e) => setSchoolId(e.target.value)}
                    placeholder="Enter school ID"
                  />
                </div>

                <div className="space-y-4">
                  <Button
                    onClick={testCheckoutSession}
                    disabled={loading || !schoolId}
                    className="w-full"
                    variant="outline"
                  >
                    {loading && activeTest === "diagnostic-checkout" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Test Checkout Session Creation
                  </Button>

                  <Button
                    onClick={testWebhook}
                    disabled={loading}
                    className="w-full"
                    variant="outline"
                  >
                    {loading && activeTest === "diagnostic-webhook" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Test Webhook Configuration
                  </Button>

                  <Button
                    onClick={() =>
                      runDiagnosticTest("test-webhook", { schoolId })
                    }
                    disabled={loading || !schoolId}
                    className="w-full"
                    variant="outline"
                  >
                    {loading && activeTest === "test-webhook" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Run Test Webhook
                  </Button>

                  <Button
                    onClick={testSubscription}
                    disabled={loading}
                    className="w-full"
                    variant="outline"
                  >
                    {loading && activeTest === "diagnostic-subscription" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Test Subscription Database
                  </Button>

                  <Button
                    onClick={checkEnvVars}
                    disabled={loading}
                    className="w-full"
                    variant="outline"
                  >
                    {loading && activeTest === "check-env-vars" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Check Environment Variables
                  </Button>
                </div>

                <Separator className="my-4" />

                <div className="space-y-2">
                  <Label htmlFor="checkoutSessionId">Checkout Session ID</Label>
                  <Input
                    id="checkoutSessionId"
                    value={checkoutSessionId}
                    onChange={(e) => setCheckoutSessionId(e.target.value)}
                    placeholder="Enter Stripe checkout session ID"
                  />
                  <Button
                    onClick={verifyCheckoutSession}
                    disabled={loading || !checkoutSessionId}
                    className="w-full mt-2"
                    variant="outline"
                  >
                    {loading && activeTest === "verify-checkout-session" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Verify Checkout Session
                  </Button>
                </div>

                <Separator className="my-4" />

                <Button
                  onClick={updateSubscription}
                  disabled={loading || !schoolId}
                  className="w-full"
                  variant="outline"
                >
                  {loading && activeTest === "update-subscription" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Test Update Subscription
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="mt-0 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Stripe Diagnostics</CardTitle>
                <CardDescription>
                  Detailed diagnostics and repair tools
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <Button
                    onClick={() => runStripeDiagnostic("check-environment")}
                    disabled={loading}
                    className="w-full"
                    variant="outline"
                  >
                    {loading &&
                    activeTest === "stripe-diagnostic-check-environment" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Check Environment Variables
                  </Button>

                  <Button
                    onClick={() =>
                      runStripeDiagnostic("check-stripe-connection")
                    }
                    disabled={loading}
                    className="w-full"
                    variant="outline"
                  >
                    {loading &&
                    activeTest ===
                      "stripe-diagnostic-check-stripe-connection" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Test Stripe API Connection
                  </Button>

                  <Button
                    onClick={() =>
                      runStripeDiagnostic("check-subscription-table")
                    }
                    disabled={loading}
                    className="w-full"
                    variant="outline"
                  >
                    {loading &&
                    activeTest ===
                      "stripe-diagnostic-check-subscription-table" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Check Subscription Table
                  </Button>
                </div>

                <Separator className="my-4" />

                <div className="space-y-2">
                  <Label htmlFor="schoolId">School ID</Label>
                  <Input
                    id="schoolId"
                    value={schoolId}
                    onChange={(e) => setSchoolId(e.target.value)}
                    placeholder="Enter school ID"
                  />
                  <Button
                    onClick={() =>
                      runStripeDiagnostic("get-school-subscription")
                    }
                    disabled={loading || !schoolId}
                    className="w-full mt-2"
                    variant="outline"
                  >
                    {loading &&
                    activeTest ===
                      "stripe-diagnostic-get-school-subscription" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Get School Subscription
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="checkoutSessionId">Checkout Session ID</Label>
                  <Input
                    id="checkoutSessionId"
                    value={checkoutSessionId}
                    onChange={(e) => setCheckoutSessionId(e.target.value)}
                    placeholder="Enter Stripe checkout session ID"
                  />
                  <Button
                    onClick={() => runStripeDiagnostic("get-checkout-session")}
                    disabled={loading || !checkoutSessionId}
                    className="w-full mt-2"
                    variant="outline"
                  >
                    {loading &&
                    activeTest === "stripe-diagnostic-get-checkout-session" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Get Checkout Session Details
                  </Button>
                </div>

                <Separator className="my-4" />

                <div className="space-y-2">
                  <Button
                    onClick={() =>
                      runStripeDiagnostic("fix-missing-stripe-ids")
                    }
                    disabled={loading || !schoolId || !checkoutSessionId}
                    className="w-full"
                    variant="default"
                  >
                    {loading &&
                    activeTest ===
                      "stripe-diagnostic-fix-missing-stripe-ids" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Fix Missing Stripe IDs
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    This will update the subscription for the given school with
                    Stripe customer and subscription IDs from the checkout
                    session.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <Card className="md:row-span-2">
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>
                Results from the diagnostic tests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Running diagnostic test...</span>
                </div>
              ) : results ? (
                <div className="bg-muted p-4 rounded-md overflow-auto max-h-[400px]">
                  <pre className="text-xs">
                    {JSON.stringify(results, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  Run a test to see results
                </div>
              )}
            </CardContent>
            <CardFooter>
              <div className="text-xs text-muted-foreground">
                Check the browser console and Supabase logs for more detailed
                information.
              </div>
            </CardFooter>
          </Card>
        </div>
      </Tabs>
    </div>
  );
};

export default StripeDebugger;
