import React, { useState, useEffect, useCallback } from 'react';
import { useOrganization, useUser, useClerk } from '@clerk/clerk-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { checkAndFixOrganizationAdmin, verifyOrganizationAdminWithRetry } from '@/services/organization';
import { setupClerkDiagnostics, diagnoseClerkOrganization } from '@/utils/clerk-diagnostics';

// Add this interface at the top of the file
declare global {
  interface Window {
    Clerk?: {
      organization?: any;
      load?: () => Promise<void>;
    };
  }
}

// Extended type definition for Clerk organization
interface ExtendedOrganizationResource {
  id: string;
  name: string;
  // Add privateMetadata and publicMetadata properties
  privateMetadata?: {
    schoolId?: string;
    [key: string]: any;
  };
  publicMetadata?: {
    schoolId?: string;
    [key: string]: any;
  };
  // Include other methods from Clerk's OrganizationResource
  reload: () => Promise<void>;
  getMemberships: () => Promise<any>;
  inviteMember: (params: { emailAddress: string; role: string }) => Promise<any>;
}

// Debugging helper functions
const debugLog = (message: string, data?: any) => {
  console.log(`[TeacherInvite] 🔍 ${message}`, data !== undefined ? data : '');
};

const errorLog = (message: string, error?: any) => {
  console.error(`[TeacherInvite] ❌ ${message}`, error !== undefined ? error : '');
  if (error?.stack) {
    console.error(`[TeacherInvite] Stack:`, error.stack);
  }
};

// Global diagnostic tool for console debugging
const setupGlobalDiagnosticTool = (organization: any) => {
  try {
    (window as any).__diagnoseClerData = {
      organization,
      inspectOrg: () => {
        console.group('🔎 Organization Inspector');
        console.log('Organization object:', organization);
        console.log('Organization constructor:', organization?.constructor?.name);
        console.log('Organization prototype:', Object.getPrototypeOf(organization));
        console.log('Organization keys:', Object.keys(organization));
        console.log('Has privateMetadata property:', Object.prototype.hasOwnProperty.call(organization, 'privateMetadata'));
        console.log('Has publicMetadata property:', Object.prototype.hasOwnProperty.call(organization, 'publicMetadata'));
        
        // Try to access properties with different methods
        const privateMetaDescriptor = Object.getOwnPropertyDescriptor(
          Object.getPrototypeOf(organization) || {}, 
          'privateMetadata'
        );
        console.log('privateMetadata property descriptor:', privateMetaDescriptor);
        
        // Test alternative methods to access metadata
        console.log('Direct access - organization.privateMetadata:', organization.privateMetadata);
        console.log('Bracket access - organization["privateMetadata"]:', organization['privateMetadata']);
        console.log('Using reflect - Reflect.get(organization, "privateMetadata"):', 
          Reflect.get(organization, 'privateMetadata'));
        
        console.groupEnd();
      },
      testReload: async () => {
        console.group('🔄 Organization Reload Test');
        console.log('Before reload - privateMetadata:', organization.privateMetadata);
        console.log('Before reload - publicMetadata:', organization.publicMetadata);
        
        try {
          console.log('Calling organization.reload()...');
          await organization.reload();
          console.log('Reload successful');
          console.log('After reload - privateMetadata:', organization.privateMetadata);
          console.log('After reload - publicMetadata:', organization.publicMetadata);
        } catch (err) {
          console.error('Reload failed:', err);
        }
        
        console.groupEnd();
      },
      rescueMetadata: async (schoolId: string) => {
        console.group('🚨 RESCUE MODE: Fixing metadata');
        
        if (!schoolId) {
          console.error('No schoolId provided for rescue operation');
          console.groupEnd();
          return { success: false, error: 'No schoolId provided' };
        }
        
        console.log('Attempting to update organization metadata with direct API call');
        console.log('Organization ID:', organization.id);
        console.log('SchoolId to set:', schoolId);
        
        try {
          // First get current metadata to preserve other fields
          const currentPrivateMetadata = organization.privateMetadata || {};
          const currentPublicMetadata = organization.publicMetadata || {};
          
          // Make a direct edge function call to update the metadata
          const { data, error } = await supabase.functions.invoke('update-organization-metadata', {
            body: {
              organizationId: organization.id,
              privateMetadata: {
                ...currentPrivateMetadata,
                schoolId: schoolId
              },
              publicMetadata: currentPublicMetadata,
              operation: 'rescue'
            }
          });
          
          if (error) {
            console.error('Rescue operation failed:', error);
            console.groupEnd();
            return { success: false, error };
          }
          
          console.log('Rescue operation response:', data);
          
          // Reload to verify changes took effect
          console.log('Reloading organization...');
          await organization.reload();
          
          console.log('After rescue - privateMetadata:', organization.privateMetadata);
          console.log('After rescue - publicMetadata:', organization.publicMetadata);
          
          const success = !!organization.privateMetadata?.schoolId;
          if (success) {
            console.log('✅ Rescue operation successful! SchoolId is now available in privateMetadata');
          } else {
            console.error('❌ Rescue operation failed - schoolId still not available in privateMetadata');
          }
          
          console.groupEnd();
          return { success, data };
        } catch (err) {
          console.error('Rescue operation error:', err);
          console.groupEnd();
          return { success: false, error: err };
        }
      }
    };
    console.info('🛠️ Diagnostic tools available. Try window.__diagnoseClerData.inspectOrg() to inspect, window.__diagnoseClerData.testReload() to test reload, or window.__diagnoseClerData.rescueMetadata("your-school-id") to fix metadata.');
  } catch (err) {
    console.error('Failed to set up diagnostic tools:', err);
  }
};

interface TeacherInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const TeacherInviteModal: React.FC<TeacherInviteModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFixingOrganization, setIsFixingOrganization] = useState(false);
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  // Cast the organization to our extended type
  const { organization: clerkOrg, isLoaded: orgIsLoaded } = useOrganization();
  const organization = clerkOrg as unknown as ExtendedOrganizationResource;
  const { user, isLoaded: userIsLoaded } = useUser();
  const clerk = useClerk();
  const { toast } = useToast();
  
  // Use a ref to track mounting state
  const isMounted = React.useRef(false);
  
  // Run on mount to check organization status
  useEffect(() => {
    isMounted.current = true;
    
    // Log if org is loaded but still null/undefined after initial load
    if (orgIsLoaded && userIsLoaded && !organization) {
      errorLog('Organization loaded but is null/undefined', { orgIsLoaded, userIsLoaded });
      // No longer attempting automatic retries here. Let the UI handle showing an error.
    }
    
    return () => {
      isMounted.current = false;
    };
  }, [orgIsLoaded, userIsLoaded, organization]);
  
  // Helper function to safely get organization ID using multiple methods
  const getOrganizationId = () => {
    if (!organization) return null;
    
    // Try direct property access first
    if (organization.id) return organization.id;
    
    try {
      // Try bracket notation
      const idFromBracket = organization['id'];
      if (idFromBracket) return idFromBracket;
      
      // Try reflection
      const idFromReflect = Reflect.get(organization, 'id');
      if (idFromReflect) return idFromReflect;
      
      // Try accessing through Object.keys if available
      const keys = Object.keys(organization);
      if (keys.includes('id')) {
        return organization.id;
      }
      
      // Try JSON serialization as a last resort
      const serialized = JSON.parse(JSON.stringify(organization));
      if (serialized && serialized.id) {
        return serialized.id;
      }
    } catch (err) {
      console.error('Error trying to get organization ID:', err);
    }
    
    return null;
  };
  
  // Define the effective organization helper early to avoid linter errors
  const getEffectiveOrg = () => organization;
  
  // Set up global diagnostic tool for console debugging
  useEffect(() => {
    // Use the effective organization
    const effectiveOrg = getEffectiveOrg();
    
    if (effectiveOrg) {
      setupGlobalDiagnosticTool(effectiveOrg);
      
      // Set up the more comprehensive diagnostics
      setupClerkDiagnostics(effectiveOrg);
      
      // Run diagnostics and log the report
      diagnoseClerkOrganization(effectiveOrg)
        .then(result => {
          if (result.success) {
            debugLog('Organization diagnosis report:', result.report);
            
            // Check for missing schoolId in both locations
            if (!result.report.metadata.schoolIdLocation) {
              errorLog('❌ SchoolId is missing from both metadata locations!');
            }
          } else {
            errorLog('Failed to run organization diagnosis:', result.error);
          }
        })
        .catch(err => {
          errorLog('Error running organization diagnosis:', err);
        });
    }
  }, [organization]);

  // Log when the component mounts/unmounts
  useEffect(() => {
    const effectiveOrg = getEffectiveOrg();
    debugLog('Component mounted with organization:', effectiveOrg?.id);
    return () => {
      debugLog('Component unmounted');
    };
  }, [organization]);

  // Reset verification attempts when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setVerificationAttempts(0);
    }
  }, [isOpen]);

  // Check and fix organization membership when modal opens
  useEffect(() => {
    const effectiveOrg = getEffectiveOrg();
    if (isOpen && effectiveOrg?.id && verificationAttempts === 0) {
      debugLog('Modal opened with organization, triggering verification', effectiveOrg.id);
      verifyOrganizationSetup();
    }
  }, [isOpen, organization, verificationAttempts, userIsLoaded]);

  // Log organization metadata for debugging whenever organization changes
  useEffect(() => {
    // Use manually fetched org if available, otherwise use hook-provided org
    const effectiveOrg = getEffectiveOrg();
    
    if (effectiveOrg) {
      // Debug Clerk organization structure 
      debugLog('CLERK ORGANIZATION DEBUG');
      debugLog('Organization ID', effectiveOrg.id);
      debugLog('Organization Type', Object.prototype.toString.call(effectiveOrg));
      
      try {
        debugLog('Organization Keys', Object.keys(effectiveOrg));
        debugLog('Prototype Chain', Object.getPrototypeOf(effectiveOrg)?.constructor?.name);
      } catch (err) {
        errorLog('Error inspecting organization object', err);
      }
      
      // Inspect Clerk organization using different methods
      debugLog('Private Metadata', effectiveOrg.privateMetadata);
      debugLog('Public Metadata', effectiveOrg.publicMetadata);
      
      // Try to access metadata using different approaches
      try {
        // @ts-ignore - Attempt to access with different methods
        const privateMeta = effectiveOrg['privateMetadata'] || effectiveOrg._privateMetadata;
        debugLog('Alternative privateMetadata access attempt', privateMeta);
        
        // @ts-ignore - Direct property access
        for (const key in effectiveOrg) {
          if (key.toLowerCase().includes('meta')) {
            debugLog(`Found meta-like property: ${key}`, effectiveOrg[key]);
          }
        }
      } catch (err) {
        errorLog('Error accessing metadata through alternative means', err);
      }
      
      // Check if schoolId exists in either location
      const hasPrivateSchoolId = !!effectiveOrg.privateMetadata?.schoolId;
      const hasPublicSchoolId = !!effectiveOrg.publicMetadata?.schoolId;
      
      debugLog('Metadata Status', {
        hasPrivateSchoolId,
        hasPublicSchoolId,
        privateSchoolId: effectiveOrg.privateMetadata?.schoolId,
        publicSchoolId: effectiveOrg.publicMetadata?.schoolId
      });
      
      if (hasPrivateSchoolId) {
        debugLog('✅ Organization has correct metadata structure (privateMetadata.schoolId)');
      } else if (hasPublicSchoolId) {
        debugLog('⚠️ Organization has legacy metadata structure (publicMetadata.schoolId)');
      } else {
        errorLog('❌ Organization is missing schoolId in both metadata locations!');
      }
    } else {
      errorLog('Organization is not available yet', { orgIsLoaded });
    }
  }, [organization, orgIsLoaded, userIsLoaded]);

  const verifyOrganizationSetup = async () => {
    // Use the effective organization (manual or hook-provided)
    const effectiveOrg = getEffectiveOrg();
    
    if (!effectiveOrg?.id || !user?.id) {
      debugLog('Missing organization or user ID for verification', {
        organizationId: effectiveOrg?.id,
        userId: user?.id
      });
      return;
    }
    
    try {
      setIsFixingOrganization(true);
      debugLog('Starting organization verification process');
      
      // Use the retry-enabled verification function
      const verificationSucceeded = await verifyOrganizationAdminWithRetry(
        effectiveOrg.id, 
        user.id,
        3 // Max retry attempts
      );
      
      if (verificationSucceeded) {
        debugLog('Organization verification succeeded, reloading organization data');
        
        // Reload organization to refresh metadata
        const beforeReload = {
          privateMetadata: JSON.stringify(effectiveOrg.privateMetadata),
          publicMetadata: JSON.stringify(effectiveOrg.publicMetadata)
        };
        
        debugLog('Organization data before reload', beforeReload);
        
        // Log time taken for reload
        const reloadStart = performance.now();
        await effectiveOrg.reload();
        const reloadEnd = performance.now();
        
        debugLog(`Organization reload completed in ${Math.round(reloadEnd - reloadStart)}ms`);
        
        const afterReload = {
          privateMetadata: JSON.stringify(effectiveOrg.privateMetadata),
          publicMetadata: JSON.stringify(effectiveOrg.publicMetadata)
        };
        
        debugLog('Organization data after reload', afterReload);
        debugLog('Metadata changed during reload', {
          privateMetadataChanged: beforeReload.privateMetadata !== afterReload.privateMetadata,
          publicMetadataChanged: beforeReload.publicMetadata !== afterReload.publicMetadata
        });
        
        toast({
          title: 'Organization membership verified',
          description: 'Your administrator access has been confirmed.',
        });
      } else {
        errorLog('Organization verification failed after multiple attempts', { organization: effectiveOrg.id });
        setVerificationAttempts(prev => prev + 1);
        
        if (verificationAttempts >= 2) {
          toast({
            title: 'Organization setup issue',
            description: 'There was a problem verifying your organization access. Please try refreshing the page.',
            variant: 'destructive',
          });
        } else {
          // Retry once more after a delay
          debugLog('Scheduling another verification attempt after delay');
          setTimeout(() => {
            setVerificationAttempts(0); // Reset to trigger another attempt
          }, 5000);
        }
      }
    } catch (error) {
      errorLog('Exception during organization verification', error);
      setVerificationAttempts(prev => prev + 1);
      
      if (verificationAttempts >= 2) {
        toast({
          title: 'Organization setup issue',
          description: 'There was a problem verifying your organization access. Please refresh and try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsFixingOrganization(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    debugLog('Invitation form submitted', { email });
    
    if (!email) {
      debugLog('Email address is empty');
      toast({
        title: 'Please enter an email address',
        variant: 'destructive',
      });
      return;
    }

    // Use either manually fetched org or hook-provided org
    const effectiveOrg = getEffectiveOrg();

    // Enhanced organization verification
    const orgId = getOrganizationId();
    
    // Special handling for when no organization can be found
    if (!orgId) {
      errorLog('Organization not found', { 
        orgIsLoaded,
        userIsLoaded,
        organization: effectiveOrg ? {
          id: effectiveOrg.id,
          hasId: !!effectiveOrg.id,
          constructor: effectiveOrg?.constructor?.name,
          type: typeof effectiveOrg,
          privateMetadata: effectiveOrg.privateMetadata,
          publicMetadata: effectiveOrg.publicMetadata,
          keys: Object.keys(effectiveOrg)
        } : 'null'
      });
      
      // Instead of showing an error, try the emergency direct invitation approach
      if (user?.id) {
        const shouldTryEmergencyInvite = window.confirm(
          'Organization data could not be loaded. Would you like to try an emergency invitation method?'
        );
        
        if (shouldTryEmergencyInvite) {
          return handleEmergencyInvite(email);
        }
      }
      
      // If user declined emergency invite or no user id available
      toast({
        title: 'Organization not found',
        description: 'Unable to send invitation without an organization',
        variant: 'destructive',
      });
      return;
    }

    // Get the schoolId from the appropriate location
    // Priority: 1. privateMetadata (correct location) 2. publicMetadata (legacy/incorrect location)
    const schoolId = effectiveOrg.privateMetadata?.schoolId || effectiveOrg.publicMetadata?.schoolId;
    
    // Detailed diagnostic logging of metadata state
    debugLog('Invitation metadata diagnosis', {
      organizationId: effectiveOrg.id,
      privateMetadata: effectiveOrg.privateMetadata,
      publicMetadata: effectiveOrg.publicMetadata,
      resolvedSchoolId: schoolId
    });
    
    // Verify that schoolId exists somewhere
    if (!schoolId) {
      errorLog('Missing schoolId in both metadata locations', {
        privateMetadata: effectiveOrg.privateMetadata,
        publicMetadata: effectiveOrg.publicMetadata
      });
      toast({
        title: 'Missing school information',
        description: 'Your organization is missing required school information. Please contact support.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    debugLog('Starting invitation process', { email, schoolId });

    try {
      // First check if we have available teacher seats
      debugLog('Checking for available teacher seats', { schoolId });
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('total_teacher_seats, used_teacher_seats')
        .eq('school_id', schoolId as string)
        .maybeSingle();
      
      if (subscriptionError) {
        errorLog('Subscription check failed', { subscriptionError, schoolId });
        throw new Error(`Subscription check failed: ${subscriptionError.message}`);
      }

      if (!subscriptionData) {
        errorLog('No subscription found for school ID', { schoolId });
        throw new Error('No subscription found for this school');
      }

      debugLog('Subscription found', {
        totalSeats: subscriptionData.total_teacher_seats,
        usedSeats: subscriptionData.used_teacher_seats,
        availableSeats: subscriptionData.total_teacher_seats - subscriptionData.used_teacher_seats
      });

      if (subscriptionData.used_teacher_seats >= subscriptionData.total_teacher_seats) {
        errorLog('Teacher seat limit reached', {
          totalSeats: subscriptionData.total_teacher_seats,
          usedSeats: subscriptionData.used_teacher_seats
        });
        throw new Error('You have reached your teacher seat limit. Please upgrade your subscription to add more teachers.');
      }

      // Verify organization membership one more time just to be sure
      debugLog('Verifying admin access before sending invitation');
      setIsFixingOrganization(true);
      
      // Try to fix if we're not an admin yet or if we're not a member
      const verifyResult = await verifyOrganizationAdminWithRetry(effectiveOrg.id, user?.id);
      debugLog('Admin verification result', { verifyResult });
      
      setIsFixingOrganization(false);
      
      // Double-check the organization and membership status after verification
      debugLog('Reloading organization data before sending invitation');
      const reloadStart = performance.now();
      await effectiveOrg.reload();
      const reloadEnd = performance.now();
      debugLog(`Organization reload completed in ${Math.round(reloadEnd - reloadStart)}ms`);
      
      // Re-get the schoolId after reload in case it changed
      const updatedSchoolId = effectiveOrg.privateMetadata?.schoolId || effectiveOrg.publicMetadata?.schoolId;
      debugLog('SchoolId after organization reload', { 
        beforeReload: schoolId,
        afterReload: updatedSchoolId,
        changed: schoolId !== updatedSchoolId
      });
      
      // Get the current memberships to verify admin access
      debugLog('Fetching organization memberships');
      const members = await effectiveOrg.getMemberships();
      debugLog('Current organization memberships', members.data);
      
      const currentUserIsMember = members.data.some(
        member => member.publicUserData.userId === user?.id
      );
      
      if (!currentUserIsMember) {
        errorLog('User is not a member of the organization after verification', {
          userId: user?.id,
          organizationId: effectiveOrg.id,
          membersCount: members.data.length
        });
        throw new Error("You do not have access to this organization. Please contact support.");
      }
      
      const isAdmin = members.data.some(
        member => member.publicUserData.userId === user?.id && member.role === "admin"
      );
      
      if (!isAdmin) {
        errorLog('User is a member but not admin after verification', {
          userId: user?.id,
          organizationId: effectiveOrg.id,
          userRole: members.data.find(m => m.publicUserData.userId === user?.id)?.role
        });
        throw new Error("You do not have admin permissions for this organization. Please contact support.");
      }

      debugLog('User confirmed as organization admin', {
        userId: user?.id,
        organizationId: effectiveOrg.id
      });
      
      // Send invitation via server-side function instead of direct Clerk API
      try {
        // First try using the Edge Function
        let invitationSuccess = false;
        let invitationError = null;
        
        try {
          // Use an updated schoolId in case it changed after reload
          const finalSchoolId = updatedSchoolId || schoolId;
          
          debugLog('Invoking invite-teacher edge function', {
            organizationId: effectiveOrg.id,
            emailAddress: email,
            schoolId: finalSchoolId
          });
          
          const inviteStartTime = performance.now();
          const { data: inviteData, error: inviteError } = await supabase.functions.invoke('invite-teacher', {
            body: { 
              organizationId: effectiveOrg.id,
              emailAddress: email,
              schoolId: finalSchoolId as string
            },
          });
          const inviteEndTime = performance.now();
          
          debugLog(`Edge function completed in ${Math.round(inviteEndTime - inviteStartTime)}ms`);
          debugLog('Response data from edge function', inviteData);
          
          if (inviteError) {
            errorLog('Error from invite-teacher function', inviteError);
            throw new Error(`Failed to send invitation via edge function: ${inviteError.message}`);
          }
          
          if (!inviteData?.success) {
            errorLog('Invitation not successful via edge function', {
              response: inviteData,
              details: inviteData?.details
            });
            throw new Error(inviteData?.message || "Failed to send invitation via edge function");
          }
          
          debugLog('Invitation sent successfully via edge function', inviteData);
          invitationSuccess = true;
        } catch (edgeFunctionError) {
          errorLog('Edge function failed, will try direct Clerk API', edgeFunctionError);
          invitationError = edgeFunctionError;
          
          // If edge function fails, try direct API as fallback
          debugLog('Attempting direct Clerk API invitations as fallback');
          
          // Try each role that might work
          const rolesToTry = ["member", "basic_member", "org:member", "admin", "org:admin"];
          let clerkSuccess = false;
          
          for (const role of rolesToTry) {
            try {
              debugLog(`Trying direct Clerk inviteMember with role: ${role}`);
              const clerkStartTime = performance.now();
              const invitation = await effectiveOrg.inviteMember({
                emailAddress: email,
                role: role,
              });
              const clerkEndTime = performance.now();
              
              debugLog(`Direct invitation with role ${role} succeeded in ${Math.round(clerkEndTime - clerkStartTime)}ms`);
              debugLog('Invitation details', invitation);
              clerkSuccess = true;
              invitationSuccess = true;
              break;
            } catch (clerkError) {
              errorLog(`Failed with role ${role}`, clerkError);
            }
          }
          
          if (!clerkSuccess) {
            errorLog('All direct invitation attempts failed', {
              attemptedRoles: rolesToTry,
              originalError: invitationError
            });
            throw invitationError || new Error("Failed to send invitation through all methods");
          }
        }
        
        if (!invitationSuccess) {
          errorLog('Invitation failed through all methods');
          throw new Error("Failed to send invitation through any method");
        }
      } catch (error: any) {
        errorLog('Exception during invitation process', error);
        throw error;
      }

      // Update used_teacher_seats in Supabase
      debugLog('Updating teacher seat count in Supabase');
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({ 
          used_teacher_seats: subscriptionData.used_teacher_seats + 1 
        })
        .eq('school_id', schoolId as string);

      if (updateError) {
        errorLog('Failed to update seat count', updateError);
        // Continue anyway as the webhook should eventually reconcile
      } else {
        debugLog('Teacher seat count updated successfully');
      }

      debugLog('Invitation process completed successfully');
      toast({
        title: 'Invitation sent',
        description: `${email} has been invited to join as a teacher`,
      });

      setEmail('');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      errorLog('Teacher invitation error', error);
      toast({
        title: 'Invitation failed',
        description: error.message || 'Failed to send invitation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Emergency invitation handler that bypasses the normal organization flow
  const handleEmergencyInvite = async (emailAddress: string) => {
    setIsLoading(true);
    
    try {
      debugLog('Using emergency invitation method');
      
      // Try to extract organization ID from URL path
      const pathSegments = window.location.pathname.split('/');
      const orgIdFromPath = pathSegments.find(segment => segment.startsWith('org_'));
      
      // Get the user's own organization data from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user?.id)
        .maybeSingle();
      
      if (!profile?.school_id) {
        throw new Error('Could not determine school ID from your profile');
      }
      
      debugLog('Found school ID from profile', profile.school_id);
      
      // Call emergency-invite function directly
      const { data, error } = await supabase.functions.invoke('emergency-invite-teacher', {
        body: {
          emailAddress,
          schoolId: profile.school_id,
          userId: user?.id,
          orgIdHint: orgIdFromPath // This is optional and might help the backend
        }
      });
      
      if (error) {
        throw new Error(`Emergency invitation failed: ${error.message}`);
      }
      
      if (!data?.success) {
        throw new Error(data?.message || 'Emergency invitation was not successful');
      }
      
      debugLog('Emergency invitation sent successfully');
      toast({
        title: 'Invitation sent',
        description: `${emailAddress} has been invited to join as a teacher`,
      });
      
      setEmail('');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      errorLog('Emergency invitation error', error);
      toast({
        title: 'Invitation failed',
        description: error.message || 'Failed to send invitation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If organization isn't loaded yet, show a loading indicator
  if (!orgIsLoaded || !userIsLoaded) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Teacher</DialogTitle>
            <DialogDescription>
              Loading organization information...
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }
  
  // Get the effective organization
  const effectiveOrg = getEffectiveOrg();
  
  // If organization is loaded but null, show a different message
  if ((orgIsLoaded && userIsLoaded) && !effectiveOrg) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Organization Unavailable</DialogTitle>
            <DialogDescription>
              Unable to load your organization data. This might be a temporary issue. Please try refreshing the page.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <Button 
              onClick={() => window.location.reload()}
              className="mt-2"
            >
              Refresh Page
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Teacher</DialogTitle>
          <DialogDescription>
            Send an invitation email to a teacher to join your school.
          </DialogDescription>
        </DialogHeader>
        
        {/* Show a warning if organization has metadata issues */}
        {effectiveOrg && !effectiveOrg.privateMetadata?.schoolId && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                {/* Warning icon */}
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  {effectiveOrg.publicMetadata?.schoolId ? 
                    "Organization is using legacy metadata structure. This will work, but should be updated." :
                    "Organization is missing required metadata. Teacher invitations might fail."
                  }
                </p>
              </div>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email"
                type="email" 
                placeholder="teacher@school.edu" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading || isFixingOrganization}
                required
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isLoading || isFixingOrganization}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || isFixingOrganization}
            >
              {isFixingOrganization 
                ? 'Verifying access...' 
                : isLoading 
                  ? 'Sending...' 
                  : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TeacherInviteModal;
