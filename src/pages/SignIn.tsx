import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSignIn } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { School } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SignIn: React.FC = () => {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoaded) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Authentication system is not ready yet.",
      });
      return;
    }

    try {
      setIsLoading(true);

      // Start the sign-in process
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        // Set the session as active
        await setActive({ session: result.createdSessionId });

        // Redirect to dashboard
        navigate("/dashboard");

        toast({
          title: "Sign in successful",
          description: "Welcome back!",
        });
      } else {
        // Handle additional verification if needed
        toast({
          title: "Additional verification required",
          description: "Please complete the verification process.",
        });
      }
    } catch (error: any) {
      console.error("Sign in error:", error);
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: error.message || "Invalid email or password.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col p-8 lg:p-16 justify-center">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-primary flex items-center">
            <School className="mr-2" /> SchoolSignup Central
          </h1>
        </div>

        <div className="max-w-md w-full mx-auto">
          <h2 className="text-3xl font-bold mb-2">Sign In</h2>
          <p className="text-gray-600 mb-8">
            Welcome back! Sign in to your account
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="block font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <label htmlFor="password" className="block font-medium">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p>
              Don't have an account?{" "}
              <Link to="/sign-up" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
            <p className="mt-2">
              Are you a school administrator?{" "}
              <Link to="/admin-signup" className="text-primary hover:underline">
                Sign up as admin
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Image and text */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col items-center justify-center text-white p-16">
        <div className="max-w-md mx-auto text-center">
          <img
            src="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80"
            alt="Student thinking"
            className="mx-auto mb-8 w-64"
          />
          <h2 className="text-3xl font-bold mb-4">Access Your Dashboard</h2>
          <p className="text-xl">
            Sign in to manage your school, access resources, and track student
            progress.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
