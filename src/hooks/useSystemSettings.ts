import { useState, useEffect } from 'react';
import { api } from '@/lib/axios';

interface SystemSettings {
  whatsappContactNumber: string;
}

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      // Try to fetch from super admin endpoint (will fail if not super admin)
      const response = await api.get('/super-admin/settings');
      setSettings(response.data.data);
      setError(null);
    } catch (err: any) {
      // Silently use default if can't fetch (expected for non-super-admin users)
      setSettings({ whatsappContactNumber: '+1234567890' });
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    
    // Listen for WhatsApp number updates
    const handleWhatsAppUpdate = (event: CustomEvent) => {
      if (event.detail?.whatsappContactNumber) {
        setSettings({ whatsappContactNumber: event.detail.whatsappContactNumber });
      }
    };
    
    window.addEventListener('whatsapp-number-updated', handleWhatsAppUpdate as EventListener);
    
    return () => {
      window.removeEventListener('whatsapp-number-updated', handleWhatsAppUpdate as EventListener);
    };
  }, []);

  return {
    settings,
    loading,
    error,
    whatsappNumber: settings?.whatsappContactNumber || '+1234567890',
    refetch: fetchSettings
  };
}
