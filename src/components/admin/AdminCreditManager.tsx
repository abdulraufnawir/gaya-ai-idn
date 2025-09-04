import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Coins, Gift } from 'lucide-react';

const AdminCreditManager = () => {
  const [targetUserId, setTargetUserId] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAddCredits = async () => {
    if (!targetUserId || !creditAmount) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const amount = parseInt(creditAmount);
    if (amount <= 0) {
      toast({
        title: "Error",
        description: "Credit amount must be positive",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc('admin_add_credits', {
        p_target_user_id: targetUserId,
        p_credits_amount: amount,
        p_description: description || `Admin credit allocation - ${amount} credits`
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Successfully added ${amount} credits to user`,
      });

      // Clear form
      setTargetUserId('');
      setCreditAmount('');
      setDescription('');
    } catch (error: any) {
      console.error('Error adding credits:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add credits",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGiveMyself30Credits = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.rpc('admin_add_credits', {
        p_target_user_id: user.id,
        p_credits_amount: 30,
        p_description: 'Admin testing and trial credits'
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Added 30 testing credits to your account!",
      });
    } catch (error: any) {
      console.error('Error adding credits:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add credits",
        variant: "destructive",
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
            <Gift className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Quick credit management for admin testing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleGiveMyself30Credits}
            disabled={loading}
            className="w-full"
          >
            <Coins className="h-4 w-4 mr-2" />
            Give Myself 30 Testing Credits
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Credit Management
          </CardTitle>
          <CardDescription>
            Add credits to any user account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userId">User ID *</Label>
            <Input
              id="userId"
              placeholder="Enter user UUID"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="amount">Credit Amount *</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter credit amount"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              placeholder="Credit allocation reason"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          
          <Button 
            onClick={handleAddCredits}
            disabled={loading}
            className="w-full"
          >
            Add Credits
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCreditManager;