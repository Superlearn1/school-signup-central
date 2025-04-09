
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
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Testing with Stripe CLI</CardTitle>
              <CardDescription>
                Using the Stripe CLI to test your integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  The Stripe CLI is a useful tool for testing your integration:
                </p>
                <ol className="list-decimal list-inside text-sm text-muted-foreground ml-2 space-y-1">
                  <li>
                    <span className="font-medium">Install the Stripe CLI</span> - Download and install
                    the CLI from the Stripe website
                  </li>
                  <li>
                    <span className="font-medium">Login to your Stripe account</span> - Run
                    <code className="mx-2 bg-muted p-1 rounded">stripe login</code>
                  </li>
                  <li>
                    <span className="font-medium">Forward webhook events</span> - Run
                    <code className="mx-2 bg-muted p-1 rounded">
                      stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
                    </code>
                  </li>
                  <li>
                    <span className="font-medium">Trigger test events</span> - In another terminal, run
                    <code className="mx-2 bg-muted p-1 rounded">
                      stripe trigger checkout.session.completed
                    </code>
                  </li>
                </ol>
                <p className="text-sm text-muted-foreground mt-4">
                  This will send a test webhook event to your local function endpoint, allowing you
                  to debug without making actual payments.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Troubleshooting</CardTitle>
              <CardDescription>
                Diagnosing webhook-related issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <h3 className="font-medium text-lg">1. Check Webhook Configuration</h3>
                <p className="text-muted-foreground">
                  Ensure your webhook is correctly configured in the Stripe dashboard:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground ml-2 space-y-1">
                  <li>Verify the webhook endpoint URL is correct</li>
                  <li>Check that the webhook is listening for checkout.session.completed events</li>
                  <li>Ensure the webhook signing secret is correctly set in your environment</li>
                </ul>

                <div className="border rounded-md p-4 mt-4">
                  <h4 className="font-medium text-base mb-2">Webhook URL Format</h4>
                  <div className="bg-muted p-2 rounded-md font-mono text-xs">
                    https://[YOUR-PROJECT-REF].supabase.co/functions/v1/stripe-webhook
                  </div>
                </div>
              </div>

              <div className="space-y-4 mt-6">
                <h3 className="font-medium text-lg">2. Check Webhook Logs</h3>
                <p className="text-muted-foreground">
                  Examine the logs for the stripe-webhook function:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground ml-2 space-y-1">
                  <li>Go to the Supabase dashboard</li>
                  <li>Navigate to Edge Functions</li>
                  <li>Select the stripe-webhook function</li>
                  <li>Check the logs for any errors or warnings</li>
                </ul>
              </div>

              <div className="space-y-4 mt-6">
                <h3 className="font-medium text-lg">3. Test with Stripe Dashboard</h3>
                <p className="text-muted-foreground">
                  Use the Stripe dashboard to test your webhook:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground ml-2 space-y-1">
                  <li>Go to the Stripe dashboard</li>
                  <li>Navigate to Developers &gt; Webhooks</li>
                  <li>Click on your webhook endpoint</li>
                  <li>Click "Send test webhook" and select checkout.session.completed</li>
                  <li>Check your function logs for the response</li>
                </ul>
                <Button
                  variant="outline"
                  onClick={() =>
                    window.open("https://dashboard.stripe.com/webhooks", "_blank")
                  }
                  className="gap-2 mt-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Stripe Webhooks Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Common Webhook Errors</CardTitle>
              <CardDescription>
                Typical webhook errors and their solutions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="border rounded-md p-4">
                  <h3 className="font-medium text-lg mb-2">Signature Verification Failed</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    This error occurs when the webhook signature cannot be verified.
                  </p>
                  <p className="text-sm font-medium">Solutions:</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground ml-2 space-y-1">
                    <li>Check that STRIPE_WEBHOOK_SECRET is correctly set</li>
                    <li>Verify you're using the correct secret for the webhook endpoint</li>
                    <li>Ensure the request body is not being modified before verification</li>
                  </ul>
                </div>

                <div className="border rounded-md p-4">
                  <h3 className="font-medium text-lg mb-2">No Handler for Event Type</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    This error occurs when your webhook receives an event it doesn't know how to handle.
                  </p>
                  <p className="text-sm font-medium">Solutions:</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground ml-2 space-y-1">
                    <li>Check that your webhook is handling checkout.session.completed events</li>
                    <li>Verify the event type in the logs</li>
                    <li>Add a handler for the event type if needed</li>
                  </ul>
                </div>

                <div className="border rounded-md p-4">
                  <h3 className="font-medium text-lg mb-2">Missing Metadata</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    This error occurs when the webhook receives an event without the expected metadata.
                  </p>
                  <p className="text-sm font-medium">Solutions:</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground ml-2 space-y-1">
                    <li>Check that your create-checkout-session function is including metadata</li>
                    <li>Verify the metadata in the Stripe dashboard</li>
                    <li>Add error handling for missing metadata in your webhook handler</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Database Troubleshooting</CardTitle>
              <CardDescription>
                Diagnosing database-related issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <h3 className="font-medium text-lg">1. Check Subscription Records</h3>
                <p className="text-muted-foreground">
                  Verify that subscription records are being correctly created and updated:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground ml-2 space-y-1">
                  <li>Go to the Supabase dashboard</li>
                  <li>Navigate to Table Editor</li>
                  <li>Select the subscriptions table</li>
                  <li>Check for records with missing stripe_customer_id or stripe_subscription_id</li>
                </ul>
              </div>

              <div className="space-y-4 mt-6">
                <h3 className="font-medium text-lg">2. Check Database Permissions</h3>
                <p className="text-muted-foreground">
                  Ensure the stripe-webhook function has permission to update the subscriptions table:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground ml-2 space-y-1">
                  <li>Go to the Supabase dashboard</li>
                  <li>Navigate to Authentication &gt; Policies</li>
                  <li>Check the policies for the subscriptions table</li>
                  <li>Ensure the service role has permission to update the table</li>
                </ul>
              </div>

              <div className="space-y-4 mt-6">
                <h3 className="font-medium text-lg">3. Check Schema Constraints</h3>
                <p className="text-muted-foreground">
                  Verify that there are no schema constraints preventing updates:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground ml-2 space-y-1">
                  <li>Check for unique constraints on the stripe_customer_id or stripe_subscription_id</li>
                  <li>Verify that the columns allow null values if needed</li>
                  <li>Check for any foreign key constraints that might be failing</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manual Database Fixes</CardTitle>
              <CardDescription>
                How to manually fix database issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Manual database fixes should be used as a last resort. Always try to fix the underlying issue first.
                  </AlertDescription>
                </Alert>

                <h3 className="font-medium text-lg mt-4">1. Update Missing Stripe IDs</h3>
                <p className="text-muted-foreground">
                  If a subscription record is missing Stripe IDs, you can update it manually:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground ml-2 space-y-1">
                  <li>Find the customer and subscription IDs in the Stripe dashboard</li>
                  <li>Use the stripe-diagnostic function with the fix-missing-stripe-ids action</li>
                  <li>Alternatively, update the record directly in the Supabase Table Editor</li>
                </ul>
              </div>

              <div className="space-y-4 mt-6">
                <h3 className="font-medium text-lg">2. Check Subscription Status</h3>
                <p className="text-muted-foreground">
                  If a subscription status is incorrect, you can update it manually:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground ml-2 space-y-1">
                  <li>Find the subscription status in the Stripe dashboard</li>
                  <li>Update the status in the Supabase Table Editor</li>
                  <li>Ensure the current_period_end is also correctly set</li>
                </ul>
              </div>

              <div className="space-y-4 mt-6">
                <h3 className="font-medium text-lg">3. Run Diagnostic Tools</h3>
                <p className="text-muted-foreground">
                  Use the stripe-diagnostic function to check and fix issues:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground ml-2 space-y-1">
                  <li>The check-environment action verifies environment variables</li>
                  <li>The check-stripe-connection action tests the Stripe API connection</li>
                  <li>The check-subscription-table action examines the subscription table</li>
                  <li>The get-school-subscription action gets details for a specific school</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StripeTroubleshootingGuide;
