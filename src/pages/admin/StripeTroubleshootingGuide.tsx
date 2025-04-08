import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const StripeTroubleshootingGuide: React.FC = () => {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Stripe Integration Troubleshooting Guide</h1>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="checkout">Checkout Flow</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stripe Integration Overview</CardTitle>
              <CardDescription>
                Understanding the complete subscription flow
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                The Stripe subscription flow involves several components working together:
              </p>

              <div className="space-y-4">
                <div className="border rounded-md p-4">
                  <h3 className="font-medium text-lg mb-2">1. Frontend Checkout Initiation</h3>
                  <p className="text-sm text-muted-foreground">
                    The user selects subscription options on the frontend (SubscriptionSetupPage.tsx)
                    and clicks "Subscribe". This calls the create-checkout-session Edge Function with
                    the schoolId, teacherSeats, and studentSeats.
                  </p>
                </div>

                <div className="border rounded-md p-4">
                  <h3 className="font-medium text-lg mb-2">2. Checkout Session Creation</h3>
                  <p className="text-sm text-muted-foreground">
                    The create-checkout-session function creates a Stripe checkout session with
                    the appropriate line items, metadata (schoolId, teacherSeats, studentSeats),
                    and success/cancel URLs. It returns the checkout URL to the frontend.
                  </p>
                </div>

                <div className="border rounded-md p-4">
                  <h3 className="font-medium text-lg mb-2">3. User Payment on Stripe</h3>
                  <p className="text-sm text-muted-foreground">
                    The user is redirected to Stripe's hosted checkout page where they enter
                    payment details and complete the subscription. Stripe then creates a
                    subscription and customer in their system.
                  </p>
                </div>

                <div className="border rounded-md p-4">
                  <h3 className="font-medium text-lg mb-2">4. Webhook Event</h3>
                  <p className="text-sm text-muted-foreground">
                    Stripe sends a webhook event (checkout.session.completed) to our
                    stripe-webhook Edge Function. This contains the session details including
                    customer ID, subscription ID, and metadata.
                  </p>
                </div>

                <div className="border rounded-md p-4">
                  <h3 className="font-medium text-lg mb-2">5. Database Update</h3>
                  <p className="text-sm text-muted-foreground">
                    The stripe-webhook function extracts the schoolId, customer ID, and subscription ID
                    from the event and updates the subscription record in the database with these values.
                  </p>
                </div>

                <div className="border rounded-md p-4">
                  <h3 className="font-medium text-lg mb-2">6. Success Redirect</h3>
                  <p className="text-sm text-muted-foreground">
                    The user is redirected to the success page (SubscriptionSuccess.tsx) which
                    verifies the checkout session using the verify-checkout-session function
                    and shows a success message.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Common Issues</CardTitle>
              <CardDescription>
                Frequent problems and their solutions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-md p-4">
                  <h3 className="font-medium text-lg mb-2">Missing Stripe IDs in Database</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    The most common issue is that the stripe_customer_id and stripe_subscription_id
                    are missing from the subscriptions table after checkout completion.
                  </p>
                  <p className="text-sm font-medium">Possible causes:</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground ml-2 space-y-1">
                    <li>Webhook events not being received</li>
                    <li>Webhook signature verification failing</li>
                    <li>Database update errors</li>
                    <li>Missing or incorrect schoolId in metadata</li>
                  </ul>
                </div>

                <div className="border rounded-md p-4">
                  <h3 className="font-medium text-lg mb-2">Webhook Signature Verification Failures</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Webhook events may be received but fail signature verification.
                  </p>
                  <p className="text-sm font-medium">Possible causes:</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground ml-2 space-y-1">
                    <li>Incorrect STRIPE_WEBHOOK_SECRET environment variable</li>
                    <li>Webhook created with a different secret than what's in the environment</li>
                    <li>Request body being modified before verification</li>
                  </ul>
                </div>

                <div className="border rounded-md p-4">
                  <h3 className="font-medium text-lg mb-2">Database Update Failures</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    The webhook may be received and verified, but the database update fails.
                  </p>
                  <p className="text-sm font-medium">Possible causes:</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground ml-2 space-y-1">
                    <li>Missing or incorrect schoolId in metadata</li>
                    <li>No subscription record exists for the schoolId</li>
                    <li>Database permissions issues</li>
                    <li>Schema validation errors</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checkout" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Checkout Flow Troubleshooting</CardTitle>
              <CardDescription>
                Diagnosing issues with the checkout process
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <h3 className="font-medium text-lg">1. Check Frontend Request</h3>
                <p className="text-muted-foreground">
                  Verify that the frontend is correctly calling the create-checkout-session function:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground ml-2 space-y-1">
                  <li>Open browser developer tools and check the Network tab</li>
                  <li>Look for the request to /functions/v1/create-checkout-session</li>
                  <li>Verify the request payload includes schoolId, teacherSeats, and studentSeats</li>
                  <li>Check that the response includes a checkoutUrl</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-lg">2. Check Edge Function Logs</h3>
                <p className="text-muted-foreground">
                  Examine the logs for the create-checkout-session function:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground ml-2 space-y-1">
                  <li>Go to the Supabase dashboard</li>
                  <li>Navigate to Edge Functions</li>
                  <li>Select the create-checkout-session function</li>
                  <li>Check the logs for any errors or warnings</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-lg">3. Verify Stripe API Connection</h3>
                <p className="text-muted-foreground">
                  Ensure the function can connect to the Stripe API:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground ml-2 space-y-1">
                  <li>Check that STRIPE_SECRET_KEY is correctly set</li>
                  <li>Verify the key is valid and has the necessary permissions</li>
                  <li>Use the diagnostic tools to test the Stripe API connection</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-lg">4. Check Checkout Session Creation</h3>
                <p className="text-muted-foreground">
                  Verify that the checkout session is being created correctly:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground ml-2 space-y-1">
                  <li>Check that the line items are correctly configured</li>
                  <li>Verify that the metadata includes schoolId, teacherSeats, and studentSeats</li>
                  <li>Ensure the success and cancel URLs are correct</li>
                </ul>