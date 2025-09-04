import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Coins, User } from 'lucide-react';

const AdminCreditManager = () => {
  const [targetUserId, setTargetUserId] = useState('');
  const [creditAmount, setCreditAmount] = useState('30');
  const [description, setDescription] = useState('Admin testing credits');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAddCredits = async () => {
    if (!targetUserId || !creditAmount) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_add_credits', {
        p_target_user_id: targetUserId,
        p_credits_amount: parseInt(creditAmount),
        p_description: description || 'Admin credit allocation'
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Successfully added ${creditAmount} credits to user`,
      });

      // Reset form
      setTargetUserId('');
      setCreditAmount('30');
      setDescription('Admin testing credits');
    } catch (error: any) {
      console.error('Error adding credits:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add credits",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToSelf = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('admin_add_credits', {
        p_target_user_id: user.id,
        p_credits_amount: 30,
        p_description: 'Admin testing and trial credits'
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Successfully added 30 testing credits to your account",
      });
    } catch (error: any) {
      console.error('Error adding credits to self:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add credits",
        variant: "destructive"
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
            <User className="h-5 w-5" />
            Admin Credit Manager
          </CardTitle>
          <CardDescription>
            Add credits to any user account for testing and trial purposes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full gap-1.5">
            <Label htmlFor="userId">User ID</Label>
            <Input
              id="userId"
              placeholder="Enter user UUID"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
            />
          </div>
          
          <div className="grid w-full gap-1.5">
            <Label htmlFor="credits">Credit Amount</Label>
            <Input
              id="credits"
              type="number"
              placeholder="30"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
            />
          </div>
          
          <div className="grid w-full gap-1.5">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Admin testing credits"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          
          <Button 
            onClick={handleAddCredits} 
            disabled={loading || !targetUserId || !creditAmount}
            className="w-full"
          >
            <Coins className="h-4 w-4 mr-2" />
            {loading ? 'Adding Credits...' : 'Add Credits to User'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Quick Self Credit
          </CardTitle>
          <CardDescription>
            Add 30 testing credits to your own admin account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleAddToSelf} 
            disabled={loading}
            variant="secondary"
            className="w-full"
          >
            <Coins className="h-4 w-4 mr-2" />
            {loading ? 'Adding Credits...' : 'Add 30 Credits to My Account'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCreditManager;