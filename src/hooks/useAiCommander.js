import { useCallback } from 'react';

export function useAiCommander({ navigateToPage, marketData, rates, openAddModal }) {
  return useCallback(async (intent) => {
    const kind = String(intent?.kind || 'unknown');
    const parsedQuantity = Number(intent?.quantity || 0);
    const parsedAmount = Number(intent?.amount || 0);
    const parsedUnit = String(intent?.unit || '').toLowerCase();
    const assetName = String(intent?.asset_name || '').trim();

    if (kind === 'portfolio_status') {
      navigateToPage('dashboard');
      window.setTimeout(() => {
        document.getElementById('dashboard-analysis-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);

      return { message: 'Portföy analizine yönlendiriyorum.' };
    }

    if (kind === 'goal_status') {
      navigateToPage('dashboard');
      window.setTimeout(() => {
        document.getElementById('dashboard-goal-summary')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);

      return { message: 'Hedef ilerleme özetini açıyorum.' };
    }

    if (kind === 'gold_price') {
      const gramGold = Number(marketData?.['GC=F__GRAM'] || marketData?.GRAM_ALTIN || 0);
      if (!Number.isFinite(gramGold) || gramGold <= 0) {
        return { message: 'Anlık Gram Altın fiyatı şu an alınamadı.' };
      }

      return { message: `Anlık Gram Altın: ${gramGold.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} TL` };
    }

    if (kind === 'market_query') {
      navigateToPage('analysis');
      return { message: 'Piyasa odaklı soru algılandı, analiz sayfasına yönlendiriyorum.' };
    }

    if (kind === 'update_asset') {
      navigateToPage('portfolio');
      return { message: 'Güncelleme isteği algılandı. Lütfen portföyden varlığı seçip güncelleyin.' };
    }

    if (kind === 'add_asset') {
      const assetType = String(intent?.assetType || 'nakit');
      const amountTL = Number.isFinite(parsedAmount) && parsedAmount > 0
        ? parsedAmount
        : (parsedUnit === 'tl' || parsedUnit === 'try' ? parsedQuantity : 0);

      if (!Number.isFinite(parsedQuantity) && !Number.isFinite(amountTL)) {
        return { message: 'Miktarı anlayamadım, örn: 70 gram gümüş ekle.' };
      }

      const openPrefilledModal = (prefillData) => {
        openAddModal({ mode: 'buy', prefillData });
      };

      navigateToPage('dashboard');

      if (assetType === 'altin') {
        const gramGold = Number(marketData?.['GC=F__GRAM'] || marketData?.GRAM_ALTIN || 0);
        const quantityGram = parsedUnit === 'gram' || parsedUnit === 'gr'
          ? parsedQuantity
          : (gramGold > 0 ? (amountTL / gramGold) : 0);

        window.setTimeout(() => {
          openPrefilledModal({
            bank: 'Banka Belirtilmedi',
            category: 'Değerli Madenler',
            symbol: 'GRAM_ALTIN',
            name: 'Gram Altın',
            amount: quantityGram > 0 ? Number(quantityGram.toFixed(4)) : '',
            avgPrice: gramGold > 0 ? Number(gramGold.toFixed(2)) : '',
            unitType: 'gram',
          });
        }, 120);

        return { message: parsedUnit === 'gram' || parsedUnit === 'gr'
          ? `${quantityGram.toLocaleString('tr-TR', { maximumFractionDigits: 4 })} gram altın için form hazırlandı.`
          : `Altın alımı için yaklaşık ${amountTL.toLocaleString('tr-TR')} TL prefill hazırlandı.` };
      }

      if (assetType === 'gumus') {
        const silverGram = Number(marketData?.['SI=F__GRAM'] || 0);
        const quantityGram = parsedUnit === 'gram' || parsedUnit === 'gr'
          ? parsedQuantity
          : (silverGram > 0 ? (amountTL / silverGram) : 0);

        window.setTimeout(() => {
          openPrefilledModal({
            bank: 'Banka Belirtilmedi',
            category: 'Değerli Madenler',
            symbol: 'SI=F',
            name: 'Gümüş',
            amount: quantityGram > 0 ? Number(quantityGram.toFixed(4)) : '',
            avgPrice: silverGram > 0 ? Number(silverGram.toFixed(2)) : '',
            unitType: 'gram',
          });
        }, 120);

        return { message: parsedUnit === 'gram' || parsedUnit === 'gr'
          ? `${quantityGram.toLocaleString('tr-TR', { maximumFractionDigits: 4 })} gram gümüş için form hazırlandı.`
          : `Gümüş alımı için yaklaşık ${amountTL.toLocaleString('tr-TR')} TL prefill hazırlandı.` };
      }

      if (assetType === 'usd') {
        const usdTryRate = Number(rates?.USD || marketData?.['TRY=X'] || 0);
        const quantityUsd = parsedUnit === 'usd'
          ? parsedQuantity
          : (usdTryRate > 0 ? (amountTL / usdTryRate) : 0);

        window.setTimeout(() => {
          openPrefilledModal({
            bank: 'Banka Belirtilmedi',
            category: 'Döviz',
            symbol: 'TRY=X',
            name: 'ABD Doları',
            amount: quantityUsd > 0 ? Number(quantityUsd.toFixed(4)) : '',
            avgPrice: usdTryRate > 0 ? Number(usdTryRate.toFixed(4)) : '',
            unitType: 'adet',
          });
        }, 120);

        return { message: `USD alımı için yaklaşık ${amountTL.toLocaleString('tr-TR')} TL prefill hazırlandı.` };
      }

      if (assetType === 'stock' || assetType === 'fund') {
        const stockQuantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : '';
        const normalizedSymbol = String(assetName || '').toUpperCase().replace(/\s+/g, '_');

        window.setTimeout(() => {
          openPrefilledModal({
            bank: 'Banka Belirtilmedi',
            category: assetType === 'fund' ? 'Yatırım Fonu' : 'Hisse Senedi',
            symbol: normalizedSymbol || 'UNKNOWN',
            name: assetName || (assetType === 'fund' ? 'Yatırım Fonu' : 'Hisse Senedi'),
            amount: stockQuantity,
            avgPrice: '',
            unitType: 'lot',
          });
        }, 120);

        return { message: `${assetName || 'Varlık'} için ${stockQuantity || ''} adet prefill hazırlandı. Ortalama maliyeti girerek devam edebilirsiniz.`.trim() };
      }

      window.setTimeout(() => {
        openPrefilledModal({
          bank: 'Banka Belirtilmedi',
          category: 'Nakit/Banka',
          symbol: 'CASH_TRY',
          name: 'Vadesiz Nakit',
          amount: amountTL,
          avgPrice: 1,
          unitType: 'adet',
        });
      }, 120);

      return { message: `${amountTL.toLocaleString('tr-TR')} TL nakit ekleme formu hazır.` };
    }

    return { message: 'Bu komutu anlayamadım. Örn: 1000 TL altın ekle.' };
  }, [navigateToPage, marketData, rates, openAddModal]);
}
