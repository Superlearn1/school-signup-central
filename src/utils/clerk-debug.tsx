import React, { useState } from 'react';
import { useOrganization, useUser } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

/**
 * ClerkDebugger - A component to help diagnose and fix issues with Clerk organizations
 * This is intended for admin/developer use only
 */
export const ClerkDebugger: React.FC = () => {
  const { organization, isLoaded: orgIsLoaded } = useOrganization();
  const { user, isLoaded: userIsLoaded } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [schoolId, setSchoolId] = useState('');
  const [results, setResults] = useState<{
    success?: boolean;
    message?: string;
    details?: any;
  }>({});

  const inspectClerkOrganization = () => {
    if (!organization) {
      setResults({
        success: false,
        message: 'Organization is not available',
        details: { orgIsLoaded }
      });
      return;
    }

    try {
      // Get all keys and methods on the organization object
      const keys = Object.keys(organization);
      const methods = keys.filter(key => typeof (organization as any)[key] === 'function');
      const properties = keys.filter(key => typeof (organization as any)[key] !== 'function');
      
      // Try to access common properties
      const id = organization.id;
      const privateMetadata = (organization as any).privateMetadata;
      const publicMetadata = (organization as any).publicMetadata;
      
      setResults({
        success: true,
        message: 'Organization inspected successfully',
        details: {
          id,
          properties,
          methods,
          privateMetadata,
          publicMetadata,
          type: organization.constructor?.name,
          hasId: !!id
        }
      });
    } catch (err) {
      setResults({
        success: false,
        message: 'Error inspecting organization',
        details: { error: err }
      });
    }
  };

  const fixOrganizationMetadata = async () => {
    if (!organization?.id) {
      setResults({
        success: false,
        message: 'Organization ID is not available',
        details: { organization }
      });
      return;
    }

    try {
      setIsFixing(true);
      
      // Validate schoolId
      if (!schoolId) {
        setResults({
          success: false,
          message: 'Please enter a school ID',
        });
        return;
      }
      
      // Get current metadata
      const currentPrivateMetadata = (organization as any).privateMetadata || {};
      const currentPublicMetadata = (organization as any).publicMetadata || {};
      
      console.log('Current metadata:', {
        private: currentPrivateMetadata,
        public: currentPublicMetadata
      });
      
      // Call our edge function to update the organization metadata
      const { data, error } = await supabase.functions.invoke('fix-organization-metadata', {
        body: {
          organizationId: organization.id,
          schoolId,
          operation: 'full-update',
          privateMetadata: {
            ...currentPrivateMetadata,
            schoolId: schoolId
          },
          publicMetadata: {
            ...currentPublicMetadata,
            schoolId: schoolId
          }
        }
      });
      
      if (error) {
        throw new Error(`Edge function error: ${error.message}`);
      }
      
      // Reload the organization
      if (typeof organization.reload === 'function') {
        await organization.reload();
      }
      
      setResults({
        success: true,
        message: 'Organization metadata updated successfully',
        details: data
      });
    } catch (err) {
      setResults({
        success: false,
        message: `Error fixing organization: ${err instanceof Error ? err.message : String(err)}`,
        details: { error: err }
      });
    } finally {
      setIsFixing(false);
    }
  };

  const reloadOrganizationData = async () => {
    try {
      setIsFixing(true);
      
      if (!organization) {
        setResults({
          success: false,
          message: 'Organization is not available',
          details: { orgIsLoaded }
        });
        return;
      }
      
      if (typeof organization.reload !== 'function') {
        setResults({
          success: false,
          message: 'Organization reload method is not available',
          details: { organization }
        });
        return;
      }
      
      await organization.reload();
      
      // Refetch the organization's metadata after reload
      const reloadedPrivateMetadata = (organization as any).privateMetadata;
      const reloadedPublicMetadata = (organization as any).publicMetadata;
      
      setResults({
        success: true,
        message: 'Organization reloaded successfully',
        details: {
          privateMetadata: reloadedPrivateMetadata,
          publicMetadata: reloadedPublicMetadata
        }
      });
    } catch (err) {
      setResults({
        success: false,
        message: `Error reloading organization: ${err instanceof Error ? err.message : String(err)}`,
        details: { error: err }
      });
    } finally {
      setIsFixing(false);
    }
  };

  if (!userIsLoaded || !orgIsLoaded) {
    return null; // Hide until loaded
  }

  // Only show for administrators
  if (!user?.publicMetadata?.isAdmin) {
    return null;
  }

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className="fixed bottom-4 right-4 z-50 bg-yellow-100 hover:bg-yellow-200 text-yellow-900 border-yellow-300"
        onClick={() => setIsOpen(true)}
      >
        🛠️ Debug Tools
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clerk Organization Debug Tools</DialogTitle>
            <DialogDescription>
              Tools for diagnosing and fixing Clerk organization issues
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Button 
                onClick={inspectClerkOrganization} 
                className="w-full"
                variant="outline"
                disabled={isFixing || !organization}
              >
                Inspect Organization
              </Button>
            </div>
            
            <div className="space-y-2">
              <Button 
                onClick={reloadOrganizationData} 
                className="w-full"
                variant="outline"
                disabled={isFixing || !organization}
              >
                Reload Organization Data
              </Button>
            </div>
            
            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="school-id">School ID</Label>
              <Input 
                id="school-id"
                placeholder="Enter the school ID" 
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                disabled={isFixing}
              />
              <Button 
                onClick={fixOrganizationMetadata} 
                className="w-full"
                disabled={isFixing || !organization || !schoolId}
              >
                {isFixing ? 'Fixing...' : 'Fix Organization Metadata'}
              </Button>
            </div>
            
            {Object.keys(results).length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <Label>Results</Label>
                <div className={`p-3 rounded-md text-sm ${results.success ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'}`}>
                  <p className="font-medium">{results.message}</p>
                  {results.details && (
                    <pre className="mt-2 overflow-auto text-xs">
                      {JSON.stringify(results.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={isFixing}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ClerkDebugger; 