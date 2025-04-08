import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSignUp } from "@clerk/clerk-react";
import { School, SignupFormData } from "@/types";
import {
  fetchSchools,
  checkSchoolAvailability,
  claimSchool,
  createOrganization,
  createProfile,
  initializeSubscription,
} from "@/services/api";
import { createClerkOrganization } from "@/services/organization";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  School as SchoolIcon,
  LucideMailCheck,
  CreditCard,
  Users,
  Search,
  Plus,
  Minus,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import StepIndicator from "@/components/StepIndicator";
import { supabase } from "@/integrations/supabase/client";

const AdminSignup: React.FC = () => {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [code, setCode] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<number>(0);
  const steps = ["Account", "School", "Verify", "Subscribe"];
  const [teacherSeats, setTeacherSeats] = useState<number>(1); // Minimum 1 teacher seat
  const [studentSeats, setStudentSeats] = useState<number>(10);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredSchools, setFilteredSchools] = useState<School[]>([]);

  const [formData, setFormData] = useState<SignupFormData>({
    username: "",
    email: "",
    password: "",
    schoolId: null,
  });

  const [errors, setErrors] = useState({
    username: "",
    email: "",
    password: "",
    schoolId: "",
    code: "",
  });

  useEffect(() => {
    const loadSchools = async () => {
      try {
        const schoolsList = await fetchSchools();
        setSchools(schoolsList);
        setFilteredSchools(schoolsList);
      } catch (error) {
        console.error("Failed to load schools:", error);
        toast({
          variant: "destructive",
          title: "Error loading schools",
          description: "Please try again later.",
        });
      }
    };

    loadSchools();
  }, [toast]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredSchools(schools);
    } else {
      const filtered = schools.filter((school) =>
        school.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      setFilteredSchools(filtered);
    }
  }, [searchQuery, schools]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    if (errors[name as keyof typeof errors]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  const handleSchoolChange = (value: string) => {
    setFormData({
      ...formData,
      schoolId: value,
    });
    if (errors.schoolId) {
      setErrors({
        ...errors,
        schoolId: "",
      });
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const validateStep = async (): Promise<boolean> => {
    const newErrors = { ...errors };
    let isValid = true;

    if (currentStep === 0) {
      if (!formData.username.trim()) {
        newErrors.username = "Username is required";
        isValid = false;
      }
      if (!formData.email.trim()) {
        newErrors.email = "Email is required";
        isValid = false;
      } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
        newErrors.email = "Invalid email format";
        isValid = false;
      }
      if (!formData.password.trim()) {
        newErrors.password = "Password is required";
        isValid = false;
      } else if (formData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters";
        isValid = false;
      }
    } else if (currentStep === 1) {
      if (!formData.schoolId) {
        newErrors.schoolId = "Please select a school";
        isValid = false;
      } else {
        try {
          const isAvailable = await checkSchoolAvailability(formData.schoolId);
          if (!isAvailable) {
            newErrors.schoolId = "This school has already been claimed";
            isValid = false;
          }
        } catch (error) {
          console.error("Failed to check school availability:", error);
          toast({
            variant: "destructive",
            title: "Error checking school availability",
            description: "Please try again later.",
          });
          isValid = false;
        }
      }
    } else if (currentStep === 2) {
      if (!code.trim()) {
        newErrors.code = "Verification code is required";
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleCreateAccount = async () => {
    if (!isLoaded) return;

    try {
      setIsLoading(true);
      const isValid = await validateStep();
      if (!isValid) {
        setIsLoading(false);
        return;
      }

      await signUp.create({
        emailAddress: formData.email,
        password: formData.password,
      });

      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      setCurrentStep(2);
      toast({
        title: "Verification email sent",
        description: "Please check your email for a verification code.",
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      toast({
        variant: "destructive",
        title: "Signup failed",
        description: error.message || "An error occurred during signup.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!isLoaded || !signUp) return;

    try {
      setVerifying(true);

      const result = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (result.status !== "complete") {
        throw new Error("Email verification failed");
      }

      await setActive({ session: result.createdSessionId });

      const selectedSchool = schools.find(
        (school) => school.id === formData.schoolId,
      );

      if (selectedSchool && result.createdUserId) {
        try {
          let clerkOrgId;
          try {
            const startTime = Date.now();
            console.log(
              `Starting creation of Clerk organization for ${selectedSchool.name} at ${new Date(startTime).toISOString()}`,
            );

            clerkOrgId = await createClerkOrganization(
              selectedSchool.name,
              formData.schoolId!,
              result.createdUserId,
            );

            if (!clerkOrgId) {
              throw new Error("No organization ID returned from the server");
            }

            const endTime = Date.now();
            console.log(
              `Clerk organization created with ID: ${clerkOrgId} in ${endTime - startTime}ms`,
            );
          } catch (error: any) {
            console.error("Failed to create Clerk organization:", error);
            toast({
              variant: "destructive",
              title: "Organization creation failed",
              description:
                error.message || "Failed to create organization in Clerk.",
            });
            throw error;
          }

          await claimSchool(
            formData.schoolId!,
            result.createdUserId,
            clerkOrgId,
          );

          const organization = await createOrganization(
            formData.schoolId!,
            result.createdUserId,
            selectedSchool.name,
            clerkOrgId,
          );

          await createProfile(
            result.createdUserId,
            formData.schoolId!,
            "admin",
            formData.username,
          );

          await initializeSubscription(
            formData.schoolId!,
            teacherSeats,
            studentSeats,
          );

          toast({
            title: "School setup completed",
            description: "You are now the administrator for this school.",
          });
        } catch (error: any) {
          console.error("Failed to set up school:", error);
          toast({
            variant: "destructive",
            title: "Setup failed",
            description:
              error.message || "An error occurred during school setup.",
          });
        }
      }

      setCurrentStep(3);
    } catch (error: any) {
      console.error("Verification error:", error);
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: error.message || "Invalid verification code.",
      });
      setErrors({
        ...errors,
        code: "Invalid verification code",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleTeacherSeatsChange = (value: number) => {
    // Ensure at least 1 teacher seat
    setTeacherSeats(Math.max(1, value));
  };

  const handleStudentSeatsChange = (value: number) => {
    // Allow 0 or more student seats
    setStudentSeats(Math.max(0, value));
  };

  const handleStartSubscription = async () => {
    try {
      setIsLoading(true);

      if (!formData.schoolId) {
        toast({
          variant: "destructive",
          title: "Missing school information",
          description: "Could not find your school. Please try again later.",
        });
        return;
      }

      // Get JWT token for Supabase auth
      const token = (await signUp.createdSessionId)
        ? await fetch(
            `/api/get-token?sessionId=${signUp.createdSessionId}`,
          ).then((r) => r.text())
        : null;

      if (!token) {
        throw new Error("Authentication failed. Please try again later.");
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
            schoolId: formData.schoolId,
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
    } catch (error: any) {
      console.error("Subscription error:", error);

      // Fallback to direct database update for demo purposes
      try {
        if (formData.schoolId) {
          const { error: subscriptionError } = await supabase
            .from("subscriptions")
            .update({
              total_teacher_seats: teacherSeats,
              total_student_seats: studentSeats,
              status: "active",
              updated_at: new Date().toISOString(),
            })
            .eq("school_id", formData.schoolId);

          if (!subscriptionError) {
            toast({
              title: "Subscription activated",
              description:
                "Your subscription has been successfully activated (demo mode).",
            });

            // Navigate to dashboard
            setTimeout(() => {
              navigate("/dashboard");
            }, 1500);
            return;
          }
        }
      } catch (fallbackError) {
        console.error("Fallback subscription update failed:", fallbackError);
      }

      toast({
        variant: "destructive",
        title: "Subscription failed",
        description:
          error.message ||
          "An error occurred while processing your subscription.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = async () => {
    const isValid = await validateStep();
    if (isValid) {
      if (currentStep === 0) {
        setCurrentStep(1);
      } else if (currentStep === 1) {
        handleCreateAccount();
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">
                Create your account
              </CardTitle>
              <CardDescription>
                Sign up to start managing your school in our platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  placeholder="Enter a username"
                  value={formData.username}
                  onChange={handleInputChange}
                />
                {errors.username && (
                  <p className="text-destructive text-sm">{errors.username}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
                {errors.email && (
                  <p className="text-destructive text-sm">{errors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleInputChange}
                />
                {errors.password && (
                  <p className="text-destructive text-sm">{errors.password}</p>
                )}
              </div>
            </CardContent>
          </>
        );
      case 1:
        return (
          <>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">
                Select your school
              </CardTitle>
              <CardDescription>
                Choose the school you'll be administrating
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="schoolSearch">Search for a school</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="schoolSearch"
                    placeholder="Search schools..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={handleSearchChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="school">School</Label>
                <Select
                  onValueChange={handleSchoolChange}
                  value={formData.schoolId || undefined}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a school" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    <SelectGroup>
                      <SelectLabel>Schools</SelectLabel>
                      {filteredSchools.length > 0 ? (
                        filteredSchools.map((school) => (
                          <SelectItem
                            key={school.id}
                            value={school.id}
                            disabled={school.claimed}
                          >
                            {school.name}{" "}
                            {school.claimed && "(Already claimed)"}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-center text-muted-foreground">
                          No schools found
                        </div>
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {errors.schoolId && (
                  <p className="text-destructive text-sm">{errors.schoolId}</p>
                )}
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You'll become the administrator for this school. This action
                  cannot be undone.
                </AlertDescription>
              </Alert>
            </CardContent>
          </>
        );
      case 2:
        return (
          <>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">
                Verify your email
              </CardTitle>
              <CardDescription>
                Enter the verification code sent to {formData.email}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  name="code"
                  placeholder="Enter verification code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
                {errors.code && (
                  <p className="text-destructive text-sm">{errors.code}</p>
                )}
              </div>
            </CardContent>
          </>
        );
      case 3:
        return (
          <>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">
                Set up your subscription
              </CardTitle>
              <CardDescription>
                Choose the number of seats for your school
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Teacher Seats */}
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

              {/* Student Seats */}
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

              {/* Cost Summary */}
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Monthly Subscription:</span>
                  <span className="font-bold text-lg">
                    ${((teacherSeats + studentSeats) * 2).toFixed(2)} AUD
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
          </>
        );
      default:
        return null;
    }
  };

  const renderStepActions = () => {
    switch (currentStep) {
      case 0:
      case 1:
        return (
          <div className="flex justify-between">
            {currentStep > 0 && (
              <Button variant="outline" onClick={prevStep}>
                Back
              </Button>
            )}
            <Button onClick={nextStep} disabled={isLoading}>
              {isLoading ? "Loading..." : "Continue"}
            </Button>
          </div>
        );
      case 2:
        return (
          <div className="flex justify-between">
            <Button variant="outline" onClick={prevStep} disabled={verifying}>
              Back
            </Button>
            <Button onClick={handleVerifyEmail} disabled={verifying}>
              {verifying ? "Verifying..." : "Verify Email"}
            </Button>
          </div>
        );
      case 3:
        return (
          <Button
            onClick={handleStartSubscription}
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-r-transparent"></span>
                Processing...
              </>
            ) : (
              <>Complete Setup & Go to Dashboard</>
            )}
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col">
      <header className="bg-white border-b py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-primary flex items-center">
            <SchoolIcon className="mr-2" /> Superlearn
          </h1>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="signup-container">
          <Card className="w-full">
            <div className="p-6 pb-0">
              <StepIndicator currentStep={currentStep} steps={steps} />
            </div>

            {renderStepContent()}

            <CardFooter className="flex flex-col space-y-4">
              {renderStepActions()}
            </CardFooter>
          </Card>
        </div>
      </main>

      <footer className="bg-white border-t py-4 px-6 text-center text-sm text-muted-foreground">
        <div className="max-w-7xl mx-auto">
          &copy; {new Date().getFullYear()} Superlearn. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default AdminSignup;
