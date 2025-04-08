import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const StripeWebhookGuide: React.FC = () => {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">
        Stripe Webhook Configuration Guide
      </h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Webhook Configuration Checklist</CardTitle>
            <CardDescription>
              Follow these steps to verify your Stripe webhook configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You need access to the Stripe dashboard to complete these steps.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h3 className="font-medium text-lg">
                1. Access Webhook Settings
              </h3>
              <p className="text-muted-foreground">
                Log into the Stripe dashboard and navigate to Developers &gt;
                Webhooks
              </p>
              <Button
                variant="outline"
                onClick={() =>
                  window.open("https://dashboard.stripe.com/webhooks", "_blank")
                }
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open Stripe Webhooks Dashboard
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-lg">2. Verify Endpoint URL</h3>
              <p className="text-muted-foreground">
                Ensure the webhook endpoint URL is correctly set to your
                Supabase function URL:
              </p>
              <div className="bg-muted p-3 rounded-md font-mono text-sm break-all">
                {import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-webhook
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                If the URL is incorrect, add a new webhook endpoint with the
                correct URL.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-lg">
                3. Check Event Subscriptions
              </h3>
              <p className="text-muted-foreground">
                Verify that the webhook is subscribed to these events:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>checkout.session.completed</li>
                <li>customer.subscription.updated</li>
                <li>customer.subscription.deleted</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-lg">4. Verify Webhook Secret</h3>
              <p className="text-muted-foreground">
                Check that you have the correct webhook signing secret:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Click on the webhook endpoint in the Stripe dashboard</li>
                <li>Click "Reveal" next to "Signing secret"</li>
                <li>
                  Copy this value and ensure it matches your
                  STRIPE_WEBHOOK_SECRET environment variable
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-lg">
                5. Check Recent Deliveries
              </h3>
              <p className="text-muted-foreground">
                Review recent webhook delivery attempts:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Click on the webhook endpoint in the Stripe dashboard</li>
                <li>Go to "Recent events" tab</li>
                <li>
                  Check for any failed deliveries and their error messages
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-lg">6. Test the Webhook</h3>
              <p className="text-muted-foreground">
                Use Stripe's webhook testing tool:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Click "Send test webhook" on the webhook details page</li>
                <li>Select "checkout.session.completed" as the event type</li>
                <li>Click "Send test webhook"</li>
                <li>Check the Supabase logs for the webhook response</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment Variables Check</CardTitle>
            <CardDescription>
              Ensure these environment variables are correctly set in your
              Supabase project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                <div>
                  <p className="font-medium">STRIPE_SECRET_KEY</p>
                  <p className="text-sm text-muted-foreground">
                    Your Stripe secret key (starts with sk_test_ or sk_live_)
                  </p>
                </div>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                <div>
                  <p className="font-medium">STRIPE_WEBHOOK_SECRET</p>
                  <p className="text-sm text-muted-foreground">
                    The signing secret for your webhook endpoint (starts with
                    whsec_)
                  </p>
                </div>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                <div>
                  <p className="font-medium">STRIPE_TEACHER_PRICE_ID</p>
                  <p className="text-sm text-muted-foreground">
                    The Stripe price ID for teacher seats (starts with price_)
                  </p>
                </div>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                <div>
                  <p className="font-medium">STRIPE_STUDENT_PRICE_ID</p>
                  <p className="text-sm text-muted-foreground">
                    The Stripe price ID for student seats (starts with price_)
                  </p>
                </div>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                <div>
                  <p className="font-medium">FRONTEND_URL</p>
                  <p className="text-sm text-muted-foreground">
                    The URL of your frontend application (for success/cancel
                    redirects)
                  </p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StripeWebhookGuide;
