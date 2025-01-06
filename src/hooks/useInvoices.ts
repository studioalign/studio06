import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useData } from '../contexts/DataContext';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  number: string;
  status: InvoiceStatus;
  due_date: string;
  subtotal: number;
  tax: number;
  total: number;
  parent: {
    name: string;
    email: string;
  };
  created_at: string;
}

interface UseInvoicesOptions {
  status?: InvoiceStatus;
  search?: string;
}

export function useInvoices({ status, search }: UseInvoicesOptions = {}) {
  const { studioInfo } = useData();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<InvoiceStatus, number>>({
    draft: 0,
    sent: 0,
    paid: 0,
    overdue: 0,
    cancelled: 0,
  });

  useEffect(() => {
    if (!studioInfo?.id) return;
    fetchInvoices();
  }, [studioInfo?.id, status, search]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('invoices')
        .select(`
          id,
          number,
          status,
          due_date,
          subtotal,
          tax,
          total,
          created_at,
          parent:parents (
            name,
            email
          )
        `)
        .eq('studio_id', studioInfo?.id)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      if (search) {
        query = query.or(`
          number.ilike.%${search}%,
          parent.name.ilike.%${search}%,
          parent.email.ilike.%${search}%
        `);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setInvoices(data || []);

      // Fetch counts for each status
      const { data: countData, error: countError } = await supabase
        .from('invoices')
        .select('status, count')
        .eq('studio_id', studioInfo?.id)
        .group('status');

      if (countError) throw countError;

      const newCounts = {
        draft: 0,
        sent: 0,
        paid: 0,
        overdue: 0,
        cancelled: 0,
      };

      countData?.forEach(({ status, count }) => {
        newCounts[status as InvoiceStatus] = count;
      });

      setCounts(newCounts);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  return {
    invoices,
    loading,
    error,
    counts,
    refresh: fetchInvoices,
  };
}