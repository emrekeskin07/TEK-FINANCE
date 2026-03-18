import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../supabaseClient';

const toSafeTimestamp = (value) => {
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const sortManualAssets = (rows = []) => rows.slice().sort((left, right) => {
  const leftCreatedAt = toSafeTimestamp(left?.created_at);
  const rightCreatedAt = toSafeTimestamp(right?.created_at);

  if (Number.isFinite(leftCreatedAt) && Number.isFinite(rightCreatedAt) && leftCreatedAt !== rightCreatedAt) {
    return leftCreatedAt - rightCreatedAt;
  }

  const leftId = Number(left?.id);
  const rightId = Number(right?.id);

  if (Number.isFinite(leftId) && Number.isFinite(rightId) && leftId !== rightId) {
    return leftId - rightId;
  }

  return 0;
});

export function useManualAssets(userId) {
  const [manualAssets, setManualAssets] = useState([]);
  const [manualAssetsLoading, setManualAssetsLoading] = useState(true);

  useEffect(() => {
    const fetchManualAssets = async () => {
      setManualAssetsLoading(true);

      if (!supabase || !userId) {
        setManualAssets([]);
        setManualAssetsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('manual_assets')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Supabase manual_assets select hatasi:', error);
        toast.error('Manuel mal varligi kayitlari yuklenemedi.');
        setManualAssets([]);
        setManualAssetsLoading(false);
        return;
      }

      const normalized = sortManualAssets(data || [])
        .map((item) => {
          const numericValue = Number(item?.value);
          if (!Number.isFinite(numericValue) || !item?.type || item.type === 'Nakit') {
            return null;
          }

          return {
            ...item,
            value: numericValue,
            details: item?.details || null,
          };
        })
        .filter(Boolean);

      setManualAssets(normalized);
      setManualAssetsLoading(false);
    };

    fetchManualAssets();
  }, [userId]);

  return {
    manualAssets,
    manualAssetsLoading,
    setManualAssets,
  };
}
