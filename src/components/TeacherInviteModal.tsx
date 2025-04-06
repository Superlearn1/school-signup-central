
import React, { useState, useEffect } from 'react';
import { useOrganization, useUser } from '@clerk/clerk-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { checkAndFixOrganizationAdmin } from '@/services/organization';

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
  const { organization, isLoaded: orgIsLoaded } = useOrganization();
  const { user } = useUser();
  const { toast } = useToast();

  // Check and fix organization membership when modal opens
  useEffect(() => {
    if (isOpen && organization?.id && verificationAttempts < 3) {
      verifyOrganizationSetup();
    }
  }, [isOpen, organization?.id, verificationAttempts]);

  const verifyOrganizationSetup = async () => {
    if (!organization?.id || !user) return;
    
    try {
      setIsFixingOrganization(true);
      console.log('Verifying organization setup...');
      
      // Check if current user is a member of the organization
      const members = await organization.getMemberships();
      console.log('Current organization members:', members);
      
      const currentUserIsMember = members.data.some(
        member => member.publicUserData.userId === user.id
      );
      
      if (!currentUserIsMember) {
        // Try to fix the membership via our edge function
        console.log("Current user is not a member of the organization. Attempting to fix...");
        const fixed = await checkAndFixOrganizationAdmin(organization.id);
        
        if (fixed) {
          console.log("Successfully fixed organization membership");
          
          // Refresh the organization data
          await organization.reload();
          
          toast({
            title: 'Organization membership verified',
            description: 'Your administrator access has been confirmed.',
          });
        } else {
          console.error("Failed to fix organization membership");
          setVerificationAttempts(prev => prev + 1);
          
          if (verificationAttempts >= 2) {
            toast({
              title: 'Organization setup issue',
              description: 'There was a problem verifying your organization access. Please try refreshing the page.',
              variant: 'destructive',
            });
          } else {
            // Retry after a short delay
            setTimeout(() => {
              verifyOrganizationSetup();
            }, 2000);
          }
        }
      } else {
        console.log("User is already a member of the organization");
        // Even if they're a member, verify they have admin role
        const memberInfo = members.data.find(member => member.publicUserData.userId === user.id);
        if (memberInfo && memberInfo.role !== 'admin') {
          console.log("User is a member but not an admin. Attempting to fix...");
          await checkAndFixOrganizationAdmin(organization.id);
          await organization.reload();
        }
      }
    } catch (error) {
      console.error("Failed to verify organization membership:", error);
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
    
    if (!email) {
      toast({
        title: 'Please enter an email address',
        variant: 'destructive',
      });
      return;
    }

    if (!organization) {
      toast({
        title: 'Organization not found',
        description: 'Unable to send invitation without an organization',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // First check if we have available teacher seats
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('total_teacher_seats, used_teacher_seats')
        .eq('school_id', organization.publicMetadata.schoolId as string)
        .maybeSingle();
      
      if (subscriptionError) {
        throw new Error(`Subscription check failed: ${subscriptionError.message}`);
      }

      if (!subscriptionData) {
        throw new Error('No subscription found for this school');
      }

      if (subscriptionData.used_teacher_seats >= subscriptionData.total_teacher_seats) {
        throw new Error('You have reached your teacher seat limit. Please upgrade your subscription to add more teachers.');
      }

      // Verify organization membership again just to be sure
      await verifyOrganizationSetup();

      // Double-check that we have the membership info and current user is an admin
      const members = await organization.getMemberships();
      const currentUserIsMember = members.data.some(
        member => member.publicUserData.userId === user?.id && member.role === 'admin'
      );
      
      if (!currentUserIsMember) {
        console.error("User is still not an admin of the organization after verification");
        toast({
          title: 'Organization access issue',
          description: 'You do not have admin permissions for this organization. Please refresh and try again.',
          variant: 'destructive',
        });
        return;
      }

      console.log("Sending invitation to:", email);
      // Send invitation via Clerk - using the correct API method
      const invitation = await organization.inviteMember({
        emailAddress: email,
        role: 'org:teacher',
      });
      
      console.log("Invitation sent successfully:", invitation);

      // Update used_teacher_seats in Supabase
      // Note: Optimistically increment the count; Clerk webhook will validate later
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({ 
          used_teacher_seats: subscriptionData.used_teacher_seats + 1 
        })
        .eq('school_id', organization.publicMetadata.schoolId as string);

      if (updateError) {
        console.error('Failed to update seat count:', updateError);
        // Continue anyway as the webhook should eventually reconcile
      }

      toast({
        title: 'Invitation sent',
        description: `${email} has been invited to join as a teacher`,
      });

      setEmail('');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Teacher invitation error:', error);
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
  if (!orgIsLoaded) {
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Teacher</DialogTitle>
          <DialogDescription>
            Send an invitation email to a teacher to join your school.
          </DialogDescription>
        </DialogHeader>
        
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
