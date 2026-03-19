import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { NumericFormat } from 'react-number-format';
import Input from './common/Input';
import { getAllowedUnitTypes, normalizeUnitType, unitTypeToLabel } from '../utils/assetPricing';
import AssetStatusMessage from './AssetStatusMessage';

export default function AssetFormFields({
  categoryOptions,
  commodityOptions,
  minSymbolQueryLength,
  formData,
  setFormData,
  institution,
  portfolio,
  symbol,
  uiState,
  institutionRule,
  unitTypeOptions,
  normalizedUnitType,
  amountUnit,
  handleCategoryChange,
}) {
  const {
    institutionQuery,
    setInstitutionQuery,
    isInstitutionOpen,
    setIsInstitutionOpen,
    activeInstitutionIndex,
    setActiveInstitutionIndex,
    filteredInstitutionOptions,
    filteredSavedInstitutionOptions,
    filteredBaseInstitutionOptions,
    isManualInstitution,
    setIsManualInstitutionSelected,
    handleInstitutionKeyDown,
    applyInstitutionSelection,
  } = institution;

  const {
    portfolioQuery,
    setPortfolioQuery,
    isPortfolioOpen,
    setIsPortfolioOpen,
    activePortfolioIndex,
    setActivePortfolioIndex,
    filteredPortfolioNames,
    handlePortfolioInputBlur,
    handlePortfolioKeyDown,
    applyPortfolioSelection,
  } = portfolio;

  const {
    symbolSuggestions,
    setSymbolSuggestions,
    isSearchingSymbol,
    isSuggestionOpen,
    setIsSuggestionOpen,
    activeSuggestionIndex,
    setActiveSuggestionIndex,
    selectedSuggestion,
    setSelectedSuggestion,
    symbolValidationError,
    setSymbolValidationError,
    handleSymbolKeyDown,
    applySuggestion,
  } = symbol;

  const {
    isStep2Active,
    isStep3Active,
    isStockLikeCategory,
    isCommodityCategory,
    isCashCategory,
  } = uiState;

  const symbolSuccessMessage = useMemo(() => {
    if (!isStockLikeCategory || !selectedSuggestion?.symbol) {
      return '';
    }

    const normalizedInput = String(formData.symbol || '').trim().toUpperCase();
    const normalizedSelected = String(selectedSuggestion.symbol || '').trim().toUpperCase();

    if (!normalizedInput || normalizedInput !== normalizedSelected) {
      return '';
    }

    return `${selectedSuggestion.symbol} doğrulandı.`;
  }, [formData.symbol, isStockLikeCategory, selectedSuggestion]);

  return (
    <>
      <div className="grid grid-cols-3 gap-1.5">
        <div className="rounded-lg border border-blue-500/40 bg-blue-500/15 px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-blue-200">
          Adım 1 • Kurum
        </div>
        <div className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold text-center uppercase tracking-[0.08em] ${isStep2Active ? 'bg-blue-500/10 border-blue-500/30 text-blue-100' : 'bg-white/5 border-white/10 text-slate-400'}`}>
          Adım 2 • Hesap/Saklama
        </div>
        <div className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold text-center uppercase tracking-[0.08em] ${isStep3Active ? 'bg-blue-500/10 border-blue-500/30 text-blue-100' : 'bg-white/5 border-white/10 text-slate-400'}`}>
          Adım 3 • Varlık
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-white/10 bg-black/15 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="relative">
              <Input
                id="institution-search"
                label="Kurum Seçimi"
                type="text"
                value={institutionQuery}
                placeholder="Kurum ara veya seç"
                onFocus={() => {
                  setIsInstitutionOpen(true);
                  setActiveInstitutionIndex(filteredInstitutionOptions.length ? 0 : -1);
                }}
                onBlur={() => {
                  window.setTimeout(() => {
                    setIsInstitutionOpen(false);
                    setActiveInstitutionIndex(-1);
                  }, 120);
                }}
                onChange={(e) => {
                  setInstitutionQuery(e.target.value);
                  setIsInstitutionOpen(true);
                  setActiveInstitutionIndex(0);
                }}
                onKeyDown={handleInstitutionKeyDown}
                inputClassName="w-full"
              />

              {isInstitutionOpen ? (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-white/10 bg-[#0b1220] shadow-2xl">
                  <ul role="listbox" className="max-h-56 overflow-y-auto py-1">
                    {filteredInstitutionOptions.length === 0 ? (
                      <li className="px-3 py-2 text-sm text-slate-400">Eşleşen kurum bulunamadı</li>
                    ) : (
                      <>
                        {filteredSavedInstitutionOptions.length > 0 ? (
                          <li className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-sky-200/80">
                            Kayıtlı Kurumlarım
                          </li>
                        ) : null}

                        {filteredSavedInstitutionOptions.map((option, index) => (
                          <li
                            key={`saved-${option}`}
                            role="option"
                            aria-selected={activeInstitutionIndex === index}
                            onMouseDown={(event) => {
                              event.preventDefault();
                              applyInstitutionSelection(option);
                            }}
                            className={`cursor-pointer px-3 py-2 text-sm transition-colors ${activeInstitutionIndex === index ? 'bg-blue-500/20 text-blue-200' : 'text-slate-200 hover:bg-white/10'}`}
                          >
                            {option}
                          </li>
                        ))}

                        {filteredBaseInstitutionOptions.length > 0 ? (
                          <li className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                            Tüm Kurumlar
                          </li>
                        ) : null}

                        {filteredBaseInstitutionOptions.map((option, index) => {
                          const flatIndex = filteredSavedInstitutionOptions.length + index;

                          return (
                            <li
                              key={`base-${option}`}
                              role="option"
                              aria-selected={activeInstitutionIndex === flatIndex}
                              onMouseDown={(event) => {
                                event.preventDefault();
                                applyInstitutionSelection(option);
                              }}
                              className={`cursor-pointer px-3 py-2 text-sm transition-colors ${activeInstitutionIndex === flatIndex ? 'bg-blue-500/20 text-blue-200' : 'text-slate-200 hover:bg-white/10'}`}
                            >
                              {option}
                            </li>
                          );
                        })}
                      </>
                    )}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Varlık Türü</label>
            <select
              value={formData.category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/20 p-3 text-slate-200 transition-colors focus:border-blue-500 focus:outline-none"
            >
              {categoryOptions.map((category) => (
                <option key={category} value={category} className="bg-slate-900 text-slate-100">
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isManualInstitution ? (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Banka veya Kurum Adı</label>
            <input
              type="text"
              placeholder="Örn: Garanti BBVA, Akbank"
              value={formData.bank}
              onChange={(e) => {
                const value = e.target.value;
                setFormData((prev) => ({ ...prev, bank: value }));
                setInstitutionQuery(value);
                setIsManualInstitutionSelected(true);
              }}
              required
              className="w-full rounded-lg border border-white/10 bg-black/20 p-3 text-slate-200 transition-colors focus:border-blue-500 focus:outline-none"
            />
          </div>
        ) : null}
      </div>

      <div className="space-y-4 rounded-xl border border-white/10 bg-black/15 p-4">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-xs font-bold uppercase tracking-[0.1em] text-slate-300">Dinamik Kurum Akışı</h4>
          <span className="text-[11px] font-medium text-blue-200">{formData.bank || 'Genel Kural Seti'}</span>
        </div>

        {isCommodityCategory ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-400">Saklama Türü</p>
              <div className="flex flex-wrap gap-2">
                {institutionRule.saklamaTurleri.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, saklamaTuru: option }))}
                    className={`rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${formData.saklamaTuru === option ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200' : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-slate-400">Hesap Türü</p>
              <div className="flex flex-wrap gap-2">
                {institutionRule.hesapTurleri.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, hesapTuru: option }))}
                    className={`rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${formData.hesapTuru === option ? 'border-blue-400/50 bg-blue-500/15 text-blue-200' : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {isCashCategory ? (
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-400">Hesap Türü</p>
            <div className="flex flex-wrap gap-2">
              {institutionRule.hesapTurleri.map((hesapTuru) => (
                <button
                  key={hesapTuru}
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      hesapTuru,
                      vadeSonuTarihi: hesapTuru === 'Vadeli (Mevduat)' ? prev.vadeSonuTarihi : '',
                      faizOrani: hesapTuru === 'Vadeli (Mevduat)' ? prev.faizOrani : '',
                    }));
                  }}
                  className={`rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${formData.hesapTuru === hesapTuru ? 'border-blue-400/50 bg-blue-500/15 text-blue-200' : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'}`}
                >
                  {hesapTuru}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {!isCommodityCategory && !isCashCategory ? (
          <p className="text-xs text-slate-500">Bu varlık türünde ek hesap/saklama adımı uygulanmaz.</p>
        ) : null}
      </div>

      {isCashCategory && formData.hesapTuru === 'Vadeli (Mevduat)' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Vade Sonu Tarihi (Opsiyonel)</label>
            <input
              type="date"
              value={formData.vadeSonuTarihi}
              onChange={(e) => setFormData((prev) => ({ ...prev, vadeSonuTarihi: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-black/20 p-3 text-slate-200 transition-colors focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Yıllık Brüt Faiz/Kar Payı (%)</label>
            <NumericFormat
              valueIsNumericString
              decimalScale={2}
              fixedDecimalScale={false}
              allowNegative={false}
              thousandSeparator="."
              decimalSeparator=","
              value={formData.faizOrani}
              onValueChange={({ value }) => setFormData((prev) => ({ ...prev, faizOrani: value }))}
              placeholder="Örn: 45"
              className="w-full rounded-lg border border-white/10 bg-black/20 p-3 text-slate-200 transition-colors focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-4 rounded-xl border border-white/10 bg-black/15 p-4">
        <h4 className="text-xs font-bold uppercase tracking-[0.1em] text-slate-300">Varlık Detayı</h4>

        <div>
          <div className="relative">
            <Input
              id="portfolio-name"
              label="Portföy Adı"
              type="text"
              value={portfolioQuery}
              placeholder="Portföy adı ara veya yeni ad yaz"
              onFocus={() => {
                setIsPortfolioOpen(true);
                setActivePortfolioIndex(filteredPortfolioNames.length ? 0 : -1);
              }}
              onBlur={handlePortfolioInputBlur}
              onChange={(e) => {
                const value = e.target.value;
                setPortfolioQuery(value);
                setFormData((prev) => ({ ...prev, portfolioName: value }));
                setIsPortfolioOpen(true);
                setActivePortfolioIndex(0);
              }}
              onKeyDown={handlePortfolioKeyDown}
              inputClassName="w-full"
            />

            {isPortfolioOpen ? (
              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-white/10 bg-[#0b1220] shadow-2xl">
                <ul role="listbox" className="max-h-48 overflow-y-auto py-1">
                  {filteredPortfolioNames.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-slate-400">Eşleşen portföy bulunamadı. Enter ile yeni isim ekleyebilirsin.</li>
                  ) : filteredPortfolioNames.map((portfolioName, index) => (
                    <li
                      key={`${portfolioName}-${index}`}
                      role="option"
                      aria-selected={activePortfolioIndex === index}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        applyPortfolioSelection(portfolioName);
                      }}
                      className={`cursor-pointer px-3 py-2 text-sm transition-colors ${activePortfolioIndex === index ? 'bg-blue-500/20 text-blue-200' : 'text-slate-200 hover:bg-white/10'}`}
                    >
                      {portfolioName}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Mevcut bir portföy seçebilir veya yeni bir isim yazarak Enter ile ekleyebilirsin.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">
              {isCommodityCategory ? 'Değerli Maden Seçimi' : (isStockLikeCategory ? 'Hisse/Fon Sembolü' : 'Sembol')}
            </label>

            {isCommodityCategory ? (
              <select
                required
                value={formData.symbol || commodityOptions[0].symbol}
                onChange={(e) => {
                  const selectedCommodity = commodityOptions.find((option) => option.symbol === e.target.value);
                  const resolvedSymbol = selectedCommodity?.symbol || '';
                  const nextUnitOptions = getAllowedUnitTypes({ category: formData.category, symbol: resolvedSymbol });
                  setFormData((prev) => ({
                    ...prev,
                    symbol: resolvedSymbol,
                    name: selectedCommodity?.name || prev.name,
                    unitType: normalizeUnitType(selectedCommodity?.defaultUnitType, nextUnitOptions[0]),
                  }));
                }}
                className="w-full rounded-lg border border-white/10 bg-black/20 p-3 text-slate-200 transition-colors focus:border-blue-500 focus:outline-none"
              >
                {commodityOptions.map((option) => (
                  <option key={option.symbol} value={option.symbol} className="bg-slate-900 text-slate-100">
                    {option.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder={isStockLikeCategory ? 'Örn: THYAO.IS veya MAC yazıp seçin' : 'Örn: BTCUSD'}
                  value={formData.symbol}
                  autoComplete="off"
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setFormData((prev) => ({ ...prev, symbol: value }));
                    setSymbolValidationError('');
                    if (selectedSuggestion?.symbol?.toUpperCase() !== value.trim()) {
                      setSelectedSuggestion(null);
                    }
                    if (!isStockLikeCategory || value.trim().length < minSymbolQueryLength) {
                      setSymbolSuggestions([]);
                      setIsSuggestionOpen(false);
                      setActiveSuggestionIndex(-1);
                    }
                  }}
                  onFocus={() => {
                    if (isStockLikeCategory && symbolSuggestions.length > 0) {
                      setIsSuggestionOpen(true);
                    }
                  }}
                  onBlur={() => {
                    window.setTimeout(() => setIsSuggestionOpen(false), 120);
                  }}
                  onKeyDown={handleSymbolKeyDown}
                  className="w-full rounded-lg border border-white/10 bg-black/20 p-3 uppercase text-slate-200 transition-colors focus:border-blue-500 focus:outline-none"
                />

                {isStockLikeCategory && isSuggestionOpen && (isSearchingSymbol || symbolSuggestions.length > 0) ? (
                  <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-white/10 bg-[#0b1220] shadow-2xl">
                    <ul role="listbox" className="max-h-56 overflow-y-auto py-1">
                      {isSearchingSymbol ? (
                        <li className="px-3 py-2 text-sm text-slate-400">Aranıyor...</li>
                      ) : symbolSuggestions.map((suggestion, index) => (
                        <li
                          key={`${suggestion.symbol}-${index}`}
                          role="option"
                          aria-selected={activeSuggestionIndex === index}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            applySuggestion(suggestion);
                          }}
                          className={`cursor-pointer px-3 py-2 text-sm transition-colors ${activeSuggestionIndex === index ? 'bg-blue-500/20 text-blue-200' : 'text-slate-200 hover:bg-white/10'}`}
                        >
                          <span className="font-medium">{suggestion.symbol}</span>
                          <span className="text-slate-400"> - {suggestion.name}</span>
                          {suggestion.assetType === 'fund' ? (
                            <span className="ml-2 inline-flex rounded border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">Fon</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}

            <AssetStatusMessage
              errorMessage={symbolValidationError}
              successMessage={symbolSuccessMessage}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">İsim</label>
            <input
              type="text"
              placeholder="Örn: Türk Hava Yolları"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-black/20 p-3 text-slate-200 transition-colors focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Miktar</label>
            <div className="relative">
              <NumericFormat
                valueIsNumericString
                required
                decimalScale={6}
                fixedDecimalScale={false}
                allowNegative={false}
                thousandSeparator="."
                decimalSeparator=","
                value={formData.amount}
                onValueChange={({ value }) => setFormData((prev) => ({ ...prev, amount: value }))}
                className="w-full rounded-lg border border-white/10 bg-black/20 p-3 pr-14 text-slate-200 transition-colors focus:border-blue-500 focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                {amountUnit}
              </span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Birim Tipi</label>
            <select
              value={normalizedUnitType}
              onChange={(e) => setFormData((prev) => ({ ...prev, unitType: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-black/20 p-3 text-slate-200 transition-colors focus:border-blue-500 focus:outline-none"
            >
              {unitTypeOptions.map((unitTypeOption) => (
                <option key={unitTypeOption} value={unitTypeOption} className="bg-slate-900 text-slate-100">
                  {unitTypeToLabel(unitTypeOption)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Ort. Maliyet (TL)</label>
            <NumericFormat
              valueIsNumericString
              required
              decimalScale={4}
              fixedDecimalScale={false}
              allowNegative={false}
              thousandSeparator="."
              decimalSeparator=","
              value={formData.avgPrice}
              onValueChange={({ value }) => setFormData((prev) => ({ ...prev, avgPrice: value }))}
              className="w-full rounded-lg border border-white/10 bg-black/20 p-3 text-slate-200 transition-colors focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>
    </>
  );
}

AssetFormFields.propTypes = {
  categoryOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  commodityOptions: PropTypes.arrayOf(
    PropTypes.shape({
      symbol: PropTypes.string,
      name: PropTypes.string,
      defaultUnitType: PropTypes.string,
    })
  ).isRequired,
  minSymbolQueryLength: PropTypes.number.isRequired,
  formData: PropTypes.object.isRequired,
  setFormData: PropTypes.func.isRequired,
  institution: PropTypes.object.isRequired,
  portfolio: PropTypes.object.isRequired,
  symbol: PropTypes.object.isRequired,
  uiState: PropTypes.object.isRequired,
  institutionRule: PropTypes.object.isRequired,
  unitTypeOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  normalizedUnitType: PropTypes.string.isRequired,
  amountUnit: PropTypes.string.isRequired,
  handleCategoryChange: PropTypes.func.isRequired,
};
