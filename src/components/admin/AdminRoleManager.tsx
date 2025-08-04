import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Shield } from 'lucide-react';

const AdminRoleManager = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const assignAdminRole = async () => {
    if (!email) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      // Get user by email from profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('full_name', email) // This is a temporary workaround
        .single();

      if (profileError) {
        toast({
          title: 'Error',
          description: 'User not found. Make sure the user has created an account.',
          variant: 'destructive',
        });
        return;
      }

      // Insert admin role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: profile.user_id,
          role: 'admin'
        });

      if (roleError) {
        if (roleError.code === '23505') { // Unique constraint violation
          toast({
            title: 'Info',
            description: 'User already has admin role',
          });
        } else {
          throw roleError;
        }
      } else {
        toast({
          title: 'Success',
          description: 'Admin role assigned successfully',
        });
      }

      setEmail('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const assignCurrentUserAdmin = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Error',
          description: 'Not authenticated',
          variant: 'destructive',
        });
        return;
      }

      // Insert admin role for current user
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'admin'
        });

      if (roleError) {
        if (roleError.code === '23505') { // Unique constraint violation
          toast({
            title: 'Info',
            description: 'You already have admin role',
          });
        } else {
          throw roleError;
        }
      } else {
        toast({
          title: 'Success',
          description: 'Admin role assigned to your account! Please refresh the page.',
        });
        
        // Refresh the page after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role Management
          </CardTitle>
          <CardDescription>
            Assign admin roles to users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick self-assign for first admin */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <h4 className="font-medium mb-2">First Time Setup</h4>
            <p className="text-sm text-muted-foreground mb-3">
              If you're setting up the admin system for the first time, click below to give yourself admin privileges.
            </p>
            <Button 
              onClick={assignCurrentUserAdmin}
              disabled={loading}
              className="w-full"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Give Me Admin Access
            </Button>
          </div>

          {/* Assign admin to other users */}
          <div className="space-y-3">
            <h4 className="font-medium">Assign Admin Role</h4>
            <div className="flex gap-2">
              <Input
                placeholder="Enter user email or name"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={assignAdminRole}
                disabled={loading || !email}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Admin
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRoleManager;