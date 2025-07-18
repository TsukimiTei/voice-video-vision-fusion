import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useTranslation = () => {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translateToEnglish = async (text: string): Promise<string> => {
    setIsTranslating(true);
    setError(null);

    try {
      const { data, error: translateError } = await supabase.functions.invoke('translate-to-english', {
        body: { text }
      });

      if (translateError) {
        throw new Error(`Translation failed: ${translateError.message}`);
      }

      if (!data.translatedText) {
        throw new Error('No translation received');
      }

      return data.translatedText;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Translation failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsTranslating(false);
    }
  };

  return {
    translateToEnglish,
    isTranslating,
    error
  };
};