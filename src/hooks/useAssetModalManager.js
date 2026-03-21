import { useState, useCallback } from 'react';

export function useAssetModalManager(activePage) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState(null);
  const [editingAssetData, setEditingAssetData] = useState(null);
  const [initialPortfolioName, setInitialPortfolioName] = useState('');
  const [assetModalMode, setAssetModalMode] = useState('buy');

  const resolvePortfolioNameFromUrl = useCallback(() => {
    if (typeof window === 'undefined') {
      return '';
    }

    const params = new URLSearchParams(window.location.search);
    return (params.get('portfolioName') || params.get('portfolio') || '').trim();
  }, []);

  const openAddModal = useCallback((context = {}) => {
    const explicitPortfolioName = typeof context === 'string'
      ? context
      : (context?.portfolioName || '');
    const forcePrefill = typeof context === 'object' && context !== null
      ? Boolean(context.forcePrefill)
      : false;
    const prefillData = typeof context === 'object' && context !== null
      ? (context.prefillData || null)
      : null;
    const requestedMode = typeof context === 'object' && context !== null
      ? context.mode
      : 'buy';
    const resolvedMode = requestedMode === 'sell'
      ? 'sell'
      : (requestedMode === 'edit' ? 'edit' : 'buy');

    // Dashboard acilisinda alan bos gelsin; detay sayfasi veya URL'den acilis senaryosunda prefill kullan.
    const resolvedPrefill = String(
      explicitPortfolioName
      || (activePage === 'dashboard' ? '' : resolvePortfolioNameFromUrl())
    ).trim();
    const shouldUsePrefill = Boolean(resolvedPrefill) && (activePage !== 'dashboard' || forcePrefill);

    setAssetModalMode(resolvedMode);
    setInitialPortfolioName(shouldUsePrefill ? resolvedPrefill : '');
    setEditingAssetData(prefillData);
    setEditingAssetId(null);
    setIsModalOpen(true);
  }, [activePage, resolvePortfolioNameFromUrl]);

  const openEditModal = useCallback((item) => {
    setAssetModalMode('edit');
    setEditingAssetData(item);
    setEditingAssetId(item.id);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingAssetData(null);
    setEditingAssetId(null);
    setInitialPortfolioName('');
    setAssetModalMode('buy');
  }, []);

  return {
    isModalOpen,
    editingAssetId,
    editingAssetData,
    initialPortfolioName,
    assetModalMode,
    openAddModal,
    openEditModal,
    closeModal,
  };
}
