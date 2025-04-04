
import React, { useState } from 'react';
import { useOrganization } from '@clerk/clerk-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

interface TeacherInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const TeacherInviteModal: React.FC<TeacherInviteModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { organization, isLoaded } = useOrganization();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: 'Please enter an email address',
        variant: 'destructive',
      });
      return;
    }

    if (!isLoaded || !organization) {
      toast({
        title: 'Organization not ready',
        description: 'Unable to send invitation without an organization',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log("Organization ID for invitations:", organization.id);
      
      // Check for metadata to get school ID
      const schoolId = organization.publicMetadata?.schoolId as string || null;
      console.log("School ID from organization metadata:", schoolId);
      
      // If no school ID in metadata, try to find it from database
      let dbSchoolId = schoolId;
      if (!dbSchoolId) {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('school_id')
          .eq('clerk_org_id', organization.id)
          .maybeSingle();
          
        if (orgData?.school_id) {
          dbSchoolId = orgData.school_id as string;
          console.log("School ID found from database:", dbSchoolId);
        }
      }
      
      if (!dbSchoolId) {
        throw new Error('Could not determine school ID for this invitation');
      }

      // First check if we have available teacher seats
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('total_teacher_seats, used_teacher_seats')
        .eq('school_id', dbSchoolId)
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

      // Send invitation via Clerk
      console.log("Sending invitation to:", email);
      const invitation = await organization.inviteMember({
        emailAddress: email,
        role: "org:teacher",
        // Clerk no longer supports publicMetadata in inviteMember params
        // We'll need to set this when the user accepts the invitation
      });
      
      console.log("Invitation sent:", invitation);

      // Update used_teacher_seats in Supabase
      // Note: Optimistically increment the count; Clerk webhook will validate later
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({ 
          used_teacher_seats: subscriptionData.used_teacher_seats + 1 
        })
        .eq('school_id', dbSchoolId);

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
        variant: 'destructive',
        title: 'Invitation failed',
        description: error.message || 'Failed to send invitation. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

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
                disabled={isLoading}
                required
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TeacherInviteModal;
