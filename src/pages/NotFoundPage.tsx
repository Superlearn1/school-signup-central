import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { School } from "lucide-react";

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
      <div className="flex items-center gap-2 mb-6">
        <School className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Superlearn</h1>
      </div>

      <h2 className="text-4xl font-bold mb-2">404</h2>
      <h3 className="text-2xl font-semibold mb-4">Page Not Found</h3>
      <p className="text-muted-foreground max-w-md mb-8">
        The page you are looking for doesn't exist or has been moved.
      </p>

      <div className="space-x-4">
        <Button asChild>
          <Link to="/">Go to Home</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFoundPage;
