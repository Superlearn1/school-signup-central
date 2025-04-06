
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

declare global {
  interface Window {
    Clerk?: {
      organization?: any;
      load?: () => Promise<void>;
    };
  }
}

interface ExtendedOrganizationResource {
  id: string;
  name: string;
  privateMetadata?: {
    schoolId?: string;
    [key: string]: any;
  };
  publicMetadata?: {
    schoolId?: string;
    [key: string]: any;
  };
  reload: () => Promise<void>;
  getMemberships: () => Promise<any>;
  inviteMember: (params: { emailAddress: string; role: string }) => Promise<any>;
}

const debugLog = (message: string, data?: any) => {
  console.log(`[TeacherInvite] 🔍 ${message}`, data !== undefined ? data : '');
};

const errorLog = (message: string, error?: any) => {
  console.error(`[TeacherInvite] ❌ ${message}`, error !== undefined ? error : '');
  if (error?.stack) {
    console.error(`[TeacherInvite] Stack:`, error.stack);
  }
};

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
        
        const privateMetaDescriptor = Object.getOwnPropertyDescriptor(
          Object.getPrototypeOf(organization) || {}, 
          'privateMetadata'
        );
        console.log('privateMetadata property descriptor:', privateMetaDescriptor);
        
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
          const currentPrivateMetadata = organization.privateMetadata || {};
          const currentPublicMetadata = organization.publicMetadata || {};
          
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
  const [orgLoadAttempts, setOrgLoadAttempts] = useState(0);
  const { organization: clerkOrg, isLoaded: orgIsLoaded } = useOrganization();
  const organization = clerkOrg as unknown as ExtendedOrganizationResource;
  const { user, isLoaded: userIsLoaded } = useUser();
  const clerk = useClerk();
  const { toast } = useToast();
  
  const isMounted = React.useRef(false);
  
  useEffect(() => {
    isMounted.current = true;
    
    if (isOpen && orgIsLoaded && !organization && orgLoadAttempts < 3) {
      const attemptOrgReload = async () => {
        try {
          debugLog(`Attempting to reload organization (attempt ${orgLoadAttempts + 1})`);
          setIsFixingOrganization(true);
          
          // Fixed: Safely check for clerk.client and client.organization before accessing methods
          const clerkClient = clerk?.client;
          if (clerkClient && 'organization' in clerkClient && clerkClient.organization) {
            await clerkClient.organization.reload();
            debugLog('Reloaded organization via clerk.client');
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          setOrgLoadAttempts(prev => prev + 1);
        } catch (err) {
          errorLog('Error reloading organization', err);
        } finally {
          setIsFixingOrganization(false);
        }
      };
      
      attemptOrgReload();
    }
    
    if (orgIsLoaded && userIsLoaded && !organization) {
      errorLog('Organization loaded but is null/undefined', { orgIsLoaded, userIsLoaded });
    }
    
    return () => {
      isMounted.current = false;
    };
  }, [isOpen, orgIsLoaded, organization, orgLoadAttempts, clerk]);
  
  const getOrganizationId = () => {
    if (!organization) return null;
    
    if (organization.id) return organization.id;
    
    try {
      const idFromBracket = organization['id'];
      if (idFromBracket) return idFromBracket;
      
      const idFromReflect = Reflect.get(organization, 'id');
      if (idFromReflect) return idFromReflect;
      
      const keys = Object.keys(organization);
      if (keys.includes('id')) {
        return organization.id;
      }
      
      const serialized = JSON.parse(JSON.stringify(organization));
      if (serialized && serialized.id) {
        return serialized.id;
      }
    } catch (err) {
      console.error('Error trying to get organization ID:', err);
    }
    
    return null;
  };
  
  const getEffectiveOrg = () => organization;
  
  useEffect(() => {
    const effectiveOrg = getEffectiveOrg();
    
    if (effectiveOrg) {
      setupGlobalDiagnosticTool(effectiveOrg);
      
      setupClerkDiagnostics(effectiveOrg);
      
      diagnoseClerkOrganization(effectiveOrg)
        .then(result => {
          if (result.success) {
            debugLog('Organization diagnosis report:', result.report);
            
            if (!result.report.metadata.schoolIdLocation) {
              errorLog('❌ SchoolId is missing from both metadata locations!');
              
              if (result.report.organizationId) {
                tryRestoreSchoolIdMetadata(result.report.organizationId);
              }
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
  
  const tryRestoreSchoolIdMetadata = async (organizationId: string) => {
    try {
      debugLog('Attempting to restore missing schoolId metadata');
      
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('school_id')
        .eq('clerk_org_id', organizationId)
        .maybeSingle();
      
      if (orgError) {
        errorLog('Error fetching schoolId from database:', orgError);
        return;
      }
      
      if (orgData?.school_id) {
        debugLog('Found schoolId in database:', orgData.school_id);
        
        const { data, error } = await supabase.functions.invoke('fix-organization-metadata', {
          body: {
            organizationId,
            schoolId: orgData.school_id,
            operation: 'restore'
          }
        });
        
        if (error) {
          errorLog('Error restoring schoolId metadata:', error);
        } else {
          debugLog('Metadata restoration response:', data);
          
          if (data?.success) {
            if (organization?.reload) {
              await organization.reload();
              debugLog('Organization reloaded after metadata fix');
            }
          }
        }
      } else {
        debugLog('No schoolId found in database for this organization');
      }
    } catch (err) {
      errorLog('Error in tryRestoreSchoolIdMetadata:', err);
    }
  };
  
  useEffect(() => {
    const effectiveOrg = getEffectiveOrg();
    debugLog('Component mounted with organization:', effectiveOrg?.id);
    return () => {
      debugLog('Component unmounted');
    };
  }, [organization]);
  
  useEffect(() => {
    if (!isOpen) {
      setVerificationAttempts(0);
      setOrgLoadAttempts(0);
    }
  }, [isOpen]);
  
  useEffect(() => {
    const effectiveOrg = getEffectiveOrg();
    if (isOpen && effectiveOrg?.id && verificationAttempts === 0) {
      debugLog('Modal opened with organization, triggering verification', effectiveOrg.id);
      verifyOrganizationSetup();
    }
  }, [isOpen, organization, verificationAttempts, userIsLoaded]);
  
  useEffect(() => {
    const effectiveOrg = getEffectiveOrg();
    if (effectiveOrg) {
      debugLog('CLERK ORGANIZATION DEBUG');
      debugLog('Organization ID', effectiveOrg.id);
      debugLog('Organization Type', Object.prototype.toString.call(effectiveOrg));
      
      try {
        debugLog('Organization Keys', Object.keys(effectiveOrg));
        debugLog('Prototype Chain', Object.getPrototypeOf(effectiveOrg)?.constructor?.name);
      } catch (err) {
        errorLog('Error inspecting organization object', err);
      }
      
      debugLog('Private Metadata', effectiveOrg.privateMetadata);
      debugLog('Public Metadata', effectiveOrg.publicMetadata);
      
      try {
        // Fixed: Removed reference to _privateMetadata, use only privateMetadata
        const privateMeta = effectiveOrg['privateMetadata'];
        debugLog('Alternative privateMetadata access attempt', privateMeta);
        
        for (const key in effectiveOrg) {
          if (key.toLowerCase().includes('meta')) {
            debugLog(`Found meta-like property: ${key}`, effectiveOrg[key]);
          }
        }
      } catch (err) {
        errorLog('Error accessing metadata through alternative means', err);
      }
      
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
      
      const verificationSucceeded = await verifyOrganizationAdminWithRetry(
        effectiveOrg.id, 
        user.id,
        3
      );
      
      if (verificationSucceeded) {
        debugLog('Organization verification succeeded, reloading organization data');
        
        const beforeReload = {
          privateMetadata: JSON.stringify(effectiveOrg.privateMetadata),
          publicMetadata: JSON.stringify(effectiveOrg.publicMetadata)
        };
        
        debugLog('Organization data before reload', beforeReload);
        
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
          setTimeout(() => {
            setVerificationAttempts(0);
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

    const effectiveOrg = getEffectiveOrg();
    const orgId = getOrganizationId();
    
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
      
      let alternateOrgId = null;
      
      try {
        // Fixed: Safely check for clerk.client and client.organization before accessing its id
        const clerkClient = clerk?.client;
        if (clerkClient && 'organization' in clerkClient && clerkClient.organization) {
          alternateOrgId = clerkClient.organization.id;
          debugLog('Retrieved alternate organization ID from clerk.client:', alternateOrgId);
        }
      } catch (err) {
        errorLog('Error retrieving alternate organization ID:', err);
      }
      
      if (alternateOrgId) {
        debugLog('Using alternate organization ID for invitation:', alternateOrgId);
        return processInvitation(alternateOrgId);
      }
      
      toast({
        title: 'Organization not found',
        description: 'Unable to send invitation. Please refresh the page and try again.',
        variant: 'destructive',
      });
      return;
    }
    
    return processInvitation(orgId);
  };
  
  const processInvitation = async (organizationId: string) => {
    const effectiveOrg = getEffectiveOrg();
    
    let schoolId = null;
    
    if (effectiveOrg) {
      schoolId = effectiveOrg.privateMetadata?.schoolId || effectiveOrg.publicMetadata?.schoolId;
    }
    
    if (!schoolId) {
      try {
        debugLog('No schoolId found in organization metadata, checking database');
        
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('school_id')
          .eq('clerk_org_id', organizationId)
          .maybeSingle();
        
        if (orgError) {
          errorLog('Error fetching schoolId from database:', orgError);
        } else if (orgData?.school_id) {
          schoolId = orgData.school_id;
          debugLog('Found schoolId in database:', schoolId);
        }
        
        if (!schoolId && user?.id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('school_id')
            .eq('id', user.id)
            .maybeSingle();
          
          if (profileData?.school_id) {
            schoolId = profileData.school_id;
            debugLog('Found schoolId in profile:', schoolId);
          }
        }
      } catch (err) {
        errorLog('Error retrieving schoolId from database:', err);
      }
    }
    
    debugLog('Invitation metadata diagnosis', {
      organizationId,
      schoolId,
      privateMetadata: effectiveOrg?.privateMetadata,
      publicMetadata: effectiveOrg?.publicMetadata
    });
    
    if (!schoolId) {
      errorLog('Missing schoolId in both metadata locations and database');
      toast({
        title: 'Missing school information',
        description: 'Unable to determine your school. Please contact support or try refreshing the page.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    debugLog('Starting invitation process', { email, schoolId, organizationId });

    try {
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

      try {
        debugLog('Invoking invite-teacher edge function', {
          organizationId,
          emailAddress: email,
          schoolId
        });
        
        const inviteStartTime = performance.now();
        const { data: inviteData, error: inviteError } = await supabase.functions.invoke('invite-teacher', {
          body: { 
            organizationId,
            emailAddress: email,
            schoolId
          },
        });
        const inviteEndTime = performance.now();
        
        debugLog(`Edge function completed in ${Math.round(inviteEndTime - inviteStartTime)}ms`);
        debugLog('Response data from edge function', inviteData);
        
        if (inviteError) {
          errorLog('Error from invite-teacher function', inviteError);
          throw new Error(`Failed to send invitation: ${inviteError.message}`);
        }
        
        if (!inviteData?.success) {
          errorLog('Invitation not successful', {
            response: inviteData,
            details: inviteData?.details
          });
          throw new Error(inviteData?.message || "Failed to send invitation");
        }
        
        debugLog('Invitation sent successfully', inviteData);

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
        errorLog('Exception during invitation process', error);
        throw error;
      }
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
  
  const effectiveOrg = getEffectiveOrg();
  
  if ((orgIsLoaded && userIsLoaded) && !effectiveOrg) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Organization Unavailable</DialogTitle>
            <DialogDescription>
              Unable to load your organization data. This might be a temporary issue.
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
        
        {effectiveOrg && !effectiveOrg.privateMetadata?.schoolId && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
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
