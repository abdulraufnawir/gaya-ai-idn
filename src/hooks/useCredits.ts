import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CreditBalance {
  credits_balance: number;
  total_purchased: number;
  total_used: number;
  free_credits: number;
}

interface CreditTransaction {
  id: string;
  transaction_type: string;
  credits_amount: number;
  description: string;
  created_at: string;
  expires_at: string | null;
}

export function useCredits() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const checkBalance = useCallback(async (): Promise<CreditBalance | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('credit-manager', {
        body: { action: 'check_balance' }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return {
        credits_balance: data.credits_balance,
        total_purchased: data.total_purchased,
        total_used: data.total_used,
        free_credits: data.free_credits
      };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengecek saldo kredit',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const useCredits = useCallback(async (
    credits: number, 
    description?: string, 
    referenceId?: string
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('credit-manager', {
        body: { 
          action: 'use_credits',
          credits,
          description,
          reference_id: referenceId
        }
      });

      if (error) throw error;
      if (!data.success) {
        toast({
          title: 'Kredit Tidak Cukup',
          description: 'Saldo kredit Anda tidak mencukupi untuk operasi ini',
          variant: 'destructive',
        });
        return false;
      }

      toast({
        title: 'Kredit Digunakan',
        description: `${credits} kredit telah digunakan`,
      });
      
      return true;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menggunakan kredit',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const addCredits = useCallback(async (
    credits: number,
    transactionType: 'purchase' | 'bonus' | 'free' = 'purchase',
    description?: string,
    referenceId?: string
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('credit-manager', {
        body: { 
          action: 'add_credits',
          credits,
          transaction_type: transactionType,
          description,
          reference_id: referenceId
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({
        title: 'Kredit Ditambahkan',
        description: `${credits} kredit telah ditambahkan ke akun Anda`,
      });
      
      return true;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menambah kredit',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getTransactions = useCallback(async (): Promise<CreditTransaction[] | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('credit-manager', {
        body: { action: 'get_transactions' }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data.transactions;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengambil riwayat transaksi',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const initializeCredits = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('initialize-credits');

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({
        title: 'Kredit Diaktifkan!',
        description: 'Akun Anda telah diaktifkan dengan 5 kredit gratis',
      });
      
      return true;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengaktifkan kredit',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    loading,
    checkBalance,
    useCredits,
    addCredits,
    getTransactions,
    initializeCredits
  };
}