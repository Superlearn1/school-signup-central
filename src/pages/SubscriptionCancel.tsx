import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

const SubscriptionCancel: React.FC = () => {
  const navigate = useNavigate();

  const handleTryAgain = () => {
    navigate("/subscription-setup");
  };

  const handleGoToDashboard = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-amber-600" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">
            Subscription Not Completed
          </CardTitle>
          <CardDescription className="text-center">
            Your subscription setup was canceled or not completed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-amber-50 p-4 rounded-md text-amber-800 text-sm">
            <p>
              You can try again or continue to the dashboard. Note that some
              features may be limited without an active subscription.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          <Button onClick={handleTryAgain} className="w-full">
            Try Again
          </Button>
          <Button
            onClick={handleGoToDashboard}
            variant="outline"
            className="w-full"
          >
            Go to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SubscriptionCancel;
