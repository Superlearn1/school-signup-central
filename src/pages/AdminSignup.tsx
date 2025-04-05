import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignUp, useClerk } from '@clerk/clerk-react';
import { School, SignupFormData } from '@/types';
import { 
  fetchSchools, 
  checkSchoolAvailability, 
  claimSchool, 
  createOrganization,
  createProfile,
  initializeSubscription,
  updateSchoolWithClerkOrgId
} from '@/services/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, School as SchoolIcon, LucideMailCheck, CreditCard, Users, Search } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import StepIndicator from '@/components/StepIndicator';

const AdminSignup: React.FC = () => {
  const { isLoaded, signUp, setActive } = useSignUp();
  const clerk = useClerk();
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [code, setCode] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<number>(0);
  const steps = ['Account', 'School', 'Verify', 'Subscribe'];
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredSchools, setFilteredSchools] = useState<School[]>([]);

  const [formData, setFormData] = useState<SignupFormData>({
    username: '',
    email: '',
    password: '',
    schoolId: null,
  });

  const [errors, setErrors] = useState({
    username: '',
    email: '',
    password: '',
    schoolId: '',
    code: '',
  });

  useEffect(() => {
    const loadSchools = async () => {
      try {
        const schoolsList = await fetchSchools();
        setSchools(schoolsList);
        setFilteredSchools(schoolsList);
      } catch (error) {
        console.error('Failed to load schools:', error);
        toast({
          variant: 'destructive',
          title: 'Error loading schools',
          description: 'Please try again later.',
        });
      }
    };

    loadSchools();
  }, [toast]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSchools(schools);
    } else {
      const filtered = schools.filter(school => 
        school.name.toLowerCase().includes(searchQuery.toLowerCase())
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
        [name]: '',
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
        schoolId: '',
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
        newErrors.username = 'Username is required';
        isValid = false;
      }
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
        isValid = false;
      } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
        newErrors.email = 'Invalid email format';
        isValid = false;
      }
      if (!formData.password.trim()) {
        newErrors.password = 'Password is required';
        isValid = false;
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
        isValid = false;
      }
    } else if (currentStep === 1) {
      if (!formData.schoolId) {
        newErrors.schoolId = 'Please select a school';
        isValid = false;
      } else {
        try {
          const isAvailable = await checkSchoolAvailability(formData.schoolId);
          if (!isAvailable) {
            newErrors.schoolId = 'This school has already been claimed';
            isValid = false;
          }
        } catch (error) {
          console.error('Failed to check school availability:', error);
          toast({
            variant: 'destructive',
            title: 'Error checking school availability',
            description: 'Please try again later.',
          });
          isValid = false;
        }
      }
    } else if (currentStep === 2) {
      if (!code.trim()) {
        newErrors.code = 'Verification code is required';
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

      // Updated: Remove username parameter and use firstName instead
      await signUp.create({
        emailAddress: formData.email,
        password: formData.password,
        firstName: formData.username, // Use username as firstName
      });

      await signUp.prepareEmailAddressVerification({
        strategy: 'email_code',
      });

      setCurrentStep(2);
      toast({
        title: 'Verification email sent',
        description: 'Please check your email for a verification code.',
      });
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        variant: 'destructive',
        title: 'Signup failed',
        description: error.message || 'An error occurred during signup.',
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
      
      if (result.status !== 'complete') {
        throw new Error('Email verification failed');
      }

      // Set the active session for the newly created user
      await setActive({ session: result.createdSessionId });

      const selectedSchool = schools.find(school => school.id === formData.schoolId);
      
      if (selectedSchool && result.createdUserId) {
        try {
          console.log("Starting school setup with userId:", result.createdUserId);
          
          // First, claim the school
          await claimSchool(formData.schoolId!, result.createdUserId);
          
          console.log("School claimed successfully, creating Clerk organization for school:", selectedSchool.name);
          
          // Create the Clerk organization
          const clerkOrganization = await clerk.createOrganization({
            name: selectedSchool.name,
            // Adding slug for better URLs
            slug: selectedSchool.name.toLowerCase().replace(/\s+/g, '-')
          });
          
          if (!clerkOrganization || !clerkOrganization.id) {
            throw new Error('Failed to create Clerk organization');
          }
          
          console.log("Clerk organization created with ID:", clerkOrganization.id);
          
          // Add a delay to ensure the organization is fully created before adding a member
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Get the available organization roles for debugging
          try {
            const roles = await clerk.organization.getRoles();
            console.log("Available organization roles:", roles);
          } catch (rolesError) {
            console.error("Failed to get organization roles:", rolesError);
            // Continue with the flow, as this is just for debugging
          }
          
          // Try to add the user with 'admin' role first
          try {
            console.log("Attempting to add member with role 'admin'");
            await clerkOrganization.addMember({
              userId: result.createdUserId,
              role: "admin"
            });
            console.log("Successfully added user as admin to organization");
          } catch (adminRoleError) {
            console.error("Failed to add member with 'admin' role:", adminRoleError);
            
            // Try with 'org:admin' as fallback
            try {
              console.log("Attempting to add member with role 'org:admin'");
              await clerkOrganization.addMember({
                userId: result.createdUserId,
                role: "org:admin"
              });
              console.log("Successfully added user as org:admin to organization");
            } catch (orgAdminRoleError) {
              console.error("Failed with 'org:admin' role as well:", orgAdminRoleError);
              throw new Error(`Failed to add member to organization: ${orgAdminRoleError.message}`);
            }
          }
          
          // Set this organization as active for the current user
          await clerk.setActive({ organization: clerkOrganization.id });
          console.log("Set organization as active for user");
          
          // Update the school record with the clerk_org_id first
          console.log("Updating school with Clerk org ID");
          await updateSchoolWithClerkOrgId(formData.schoolId!, clerkOrganization.id);
          
          // Create organization record in database
          console.log("Creating organization record in Supabase");
          const organization = await createOrganization(
            formData.schoolId!, 
            result.createdUserId, 
            selectedSchool.name,
            clerkOrganization.id
          );
          
          // Create the admin profile
          console.log("Creating admin profile in Supabase");
          await createProfile(
            result.createdUserId,
            formData.schoolId!,
            'admin',
            formData.username
          );
          
          // Initialize subscription
          console.log("Initializing subscription record");
          await initializeSubscription(formData.schoolId!);
          
          toast({
            title: 'School setup completed',
            description: 'You are now the administrator for this school.',
          });
          
          console.log("Signup and onboarding completed successfully");
        } catch (error: any) {
          console.error('Failed to set up school:', error);
          toast({
            variant: 'destructive',
            title: 'Setup failed',
            description: error.message || 'An error occurred during school setup.',
          });
        }
      }

      setCurrentStep(3);
    } catch (error: any) {
      console.error('Verification error:', error);
      toast({
        variant: 'destructive',
        title: 'Verification failed',
        description: error.message || 'Invalid verification code.',
      });
      setErrors({
        ...errors,
        code: 'Invalid verification code',
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleStartSubscription = () => {
    navigate('/subscription');
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
              <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
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
              <CardTitle className="text-2xl font-bold">Select your school</CardTitle>
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
                            {school.name} {school.claimed && "(Already claimed)"}
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
                  You'll become the administrator for this school. This action cannot be undone.
                </AlertDescription>
              </Alert>
            </CardContent>
          </>
        );
      case 2:
        return (
          <>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Verify your email</CardTitle>
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
              <CardTitle className="text-2xl font-bold">Subscribe to our service</CardTitle>
              <CardDescription>
                Choose a subscription plan for your school
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-6">
                <CreditCard className="mx-auto h-12 w-12 text-primary mb-4" />
                <h3 className="font-semibold text-lg mb-2">Ready to get started?</h3>
                <p className="text-muted-foreground mb-4">
                  Select a subscription plan that fits your school's needs.
                </p>
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
              {isLoading ? 'Loading...' : 'Continue'}
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
              {verifying ? 'Verifying...' : 'Verify Email'}
            </Button>
          </div>
        );
      case 3:
        return (
          <Button onClick={handleStartSubscription} className="w-full">
            Continue to Subscription
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
