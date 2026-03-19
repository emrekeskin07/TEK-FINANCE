import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import { NumericFormat } from 'react-number-format';
import Input from './common/Input';
import { fetchSymbolSuggestions } from '../services/api';
import {
  getAllowedUnitTypes,
  inferDefaultUnitType,
  normalizeUnitType,
  unitTypeToLabel,
} from '../utils/assetPricing';
import { resolveAssetName } from '../utils/helpers';

const CATEGORY_OPTIONS = ['Hisse Senedi', 'Yatırım Fonu', 'Döviz', 'Değerli Madenler', 'Kripto', 'Nakit/Banka'];
const HESAP_TURU_OPTIONS = ['Vadesiz', 'Vadeli (Mevduat)', 'Faizsiz Katılım'];
const SAKLAMA_TURU_OPTIONS = ['Banka', 'Fiziksel/Evde'];
const MIN_SYMBOL_QUERY_LENGTH = 2;
const MANUAL_INSTITUTION_LABEL = 'Diğer (Manuel)';
const INSTITUTION_STORAGE_KEY = 'tek-finance:custom-institutions';
const PORTFOLIO_NAME_STORAGE_KEY = 'tek-finance:portfolio-name-options';
const DEFAULT_PORTFOLIO_NAME_OPTIONS = ['Genel Portföy', 'Uzun Vadeli', 'Hisse Senedi Portföyüm'];

const INSTITUTION_OPTIONS = [
  'Akbank',
  'Albaraka Türk',
  'Alternatif Bank',
  'Anadolubank',
  'Burgan Bank',
  'Denizbank',
  'Dünya Katılım',
  'Emlak Katılım',
  'Enpara',
  'Fibabanka',
  'Garanti BBVA',
  'Halkbank',
  'HSBC',
  'ICBC Turkey',
  'ING',
  'İş Bankası',
  'Kuveyt Türk',
  'Midas',
  'Odeabank',
  'Papara',
  'QNB Finansbank',
  'Şekerbank',
  'TEB',
  'Türkiye Finans',
  'Vakıf Katılım',
  'Vakıfbank',
  'Yapı Kredi',
  'Ziraat Katılım',
  'Ziraat Bankası',
  MANUAL_INSTITUTION_LABEL,
];

const INSTITUTION_RULES = {
  'Garanti BBVA': {
    saklamaTurleri: ['Altın Hesabı', 'Fiziksel/Evde', 'Banka'],
    hesapTurleri: ['Vadesiz', 'Vadeli (Mevduat)', 'Altın Hesabı', 'Döviz Hesabı'],
  },
  Akbank: {
    saklamaTurleri: ['Altın Hesabı', 'Banka', 'Fiziksel/Evde'],
    hesapTurleri: ['Vadesiz', 'Vadeli (Mevduat)', 'Altın Hesabı'],
  },
  Enpara: {
    saklamaTurleri: ['Banka', 'Fiziksel/Evde'],
    hesapTurleri: ['Vadesiz', 'Vadeli (Mevduat)', 'Döviz Hesabı'],
  },
  'İş Bankası': {
    saklamaTurleri: ['Altın Hesabı', 'Banka', 'Fiziksel/Evde'],
    hesapTurleri: ['Vadesiz', 'Vadeli (Mevduat)', 'Altın Hesabı', 'Gümüş Hesabı'],
  },
  'Ziraat Bankası': {
    saklamaTurleri: ['Banka', 'Altın Hesabı', 'Fiziksel/Evde'],
    hesapTurleri: ['Vadesiz', 'Vadeli (Mevduat)', 'Altın Hesabı'],
  },
  TEB: {
    saklamaTurleri: ['Banka', 'Fiziksel/Evde'],
    hesapTurleri: ['Vadesiz', 'Vadeli (Mevduat)', 'Döviz Hesabı'],
  },
};

const COMMODITY_OPTIONS = [
  { symbol: 'GRAM_ALTIN', name: 'Gram Altın', defaultUnitType: 'gram' },
  { symbol: 'GC=F', name: 'Ons Altın', defaultUnitType: 'ons' },
  { symbol: 'SI=F', name: 'Gümüş', defaultUnitType: 'ons' },
  { symbol: 'PL=F', name: 'Platin', defaultUnitType: 'ons' },
  { symbol: 'PA=F', name: 'Paladyum', defaultUnitType: 'ons' },
  { symbol: 'CEYREK_ALTIN', name: 'Çeyrek Altın', defaultUnitType: 'adet' },
];

const INITIAL_FORM = {
  bank: '',
  category: 'Hisse Senedi',
  saklamaTuru: 'Banka',
  hesapTuru: 'Vadesiz',
  portfolioName: '',
  vadeSonuTarihi: '',
  faizOrani: '',
  symbol: '',
  name: '',
  unitType: 'lot',
  amount: '',
  avgPrice: '',
};

const getInstitutionRule = (institutionName) => {
  return INSTITUTION_RULES[institutionName] || {
    saklamaTurleri: SAKLAMA_TURU_OPTIONS,
    hesapTurleri: HESAP_TURU_OPTIONS,
  };
};

const getCommodityOption = (symbol) => {
  const normalized = String(symbol || '').trim().toUpperCase();
  return COMMODITY_OPTIONS.find((option) => option.symbol === normalized) || null;
};

const getAmountUnit = (unitType) => unitTypeToLabel(unitType);
const normalizeInstitutionForSearch = (value) => String(value || '').toLocaleLowerCase('tr-TR');
const normalizePortfolioForSearch = (value) => String(value || '').toLocaleLowerCase('tr-TR');

const dedupeInstitutionNames = (institutions) => {
  const uniqueMap = new Map();

  institutions.forEach((institution) => {
    const trimmed = String(institution || '').trim();
    if (!trimmed) {
      return;
    }

    const normalized = normalizeInstitutionForSearch(trimmed);
    if (!uniqueMap.has(normalized)) {
      uniqueMap.set(normalized, trimmed);
    }
  });

  return Array.from(uniqueMap.values());
};

const isKnownInstitution = (institutionName, options = []) => {
  const normalized = normalizeInstitutionForSearch(String(institutionName || '').trim());
  if (!normalized) {
    return false;
  }

  return options.some((option) => normalizeInstitutionForSearch(option) === normalized);
};

const dedupePortfolioNames = (names) => {
  const unique = new Set();

  names.forEach((name) => {
    const trimmed = String(name || '').trim();
    if (trimmed) {
      unique.add(trimmed);
    }
  });

  return Array.from(unique);
};

const readStoredPortfolioNames = () => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(PORTFOLIO_NAME_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return dedupePortfolioNames(parsed);
  } catch {
    return [];
  }
};

const readStoredInstitutions = () => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(INSTITUTION_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return dedupeInstitutionNames(parsed);
  } catch {
    return [];
  }
};

export default function AssetModal({
  isOpen,
  closeModal,
  editingAssetId,
  initialData,
  mode = 'buy',
  onAdd,
  onUpdate,
  portfolioNameOptions = [],
  initialPortfolioName = '',
  prefilledPortfolioName = '',
}) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [symbolSuggestions, setSymbolSuggestions] = useState([]);
  const [isSearchingSymbol, setIsSearchingSymbol] = useState(false);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [symbolValidationError, setSymbolValidationError] = useState('');
  const [institutionQuery, setInstitutionQuery] = useState('');
  const [isInstitutionOpen, setIsInstitutionOpen] = useState(false);
  const [activeInstitutionIndex, setActiveInstitutionIndex] = useState(-1);
  const [isManualInstitutionSelected, setIsManualInstitutionSelected] = useState(false);
  const [savedInstitutions, setSavedInstitutions] = useState(readStoredInstitutions);
  const [savedPortfolioNames, setSavedPortfolioNames] = useState(readStoredPortfolioNames);
  const [portfolioQuery, setPortfolioQuery] = useState(INITIAL_FORM.portfolioName);
  const [isPortfolioOpen, setIsPortfolioOpen] = useState(false);
  const [activePortfolioIndex, setActivePortfolioIndex] = useState(-1);

  const isStockCategory = formData.category === 'Hisse Senedi';
  const isFundCategory = formData.category === 'Yatırım Fonu';
  const isStockLikeCategory = isStockCategory || isFundCategory;
  const isCashCategory = formData.category === 'Nakit/Banka' || formData.category === 'Nakit';
  const isCommodityCategory = formData.category === 'Değerli Madenler' || formData.category === 'Emtia/Altın' || formData.category === 'Emtia';
  const availableInstitutionOptions = useMemo(
    () => dedupeInstitutionNames([...savedInstitutions, ...INSTITUTION_OPTIONS]),
    [savedInstitutions]
  );
  const isManualInstitution = isManualInstitutionSelected || (Boolean(formData.bank) && !isKnownInstitution(formData.bank, availableInstitutionOptions));

  const filteredSavedInstitutionOptions = useMemo(() => {
    const normalizedQuery = normalizeInstitutionForSearch(institutionQuery.trim());

    if (!normalizedQuery) {
      return savedInstitutions;
    }

    const startsWith = [];
    const contains = [];

    savedInstitutions.forEach((option) => {
      const normalizedOption = normalizeInstitutionForSearch(option);
      if (normalizedOption.startsWith(normalizedQuery)) {
        startsWith.push(option);
      } else if (normalizedOption.includes(normalizedQuery)) {
        contains.push(option);
      }
    });

    return [...startsWith, ...contains];
  }, [institutionQuery, savedInstitutions]);

  const filteredBaseInstitutionOptions = useMemo(() => {
    const normalizedQuery = normalizeInstitutionForSearch(institutionQuery.trim());
    const savedSet = new Set(savedInstitutions.map((option) => normalizeInstitutionForSearch(option)));
    const baseOptions = INSTITUTION_OPTIONS.filter((option) => !savedSet.has(normalizeInstitutionForSearch(option)));

    if (!normalizedQuery) {
      return baseOptions;
    }

    const startsWith = [];
    const contains = [];

    baseOptions.forEach((option) => {
      const normalizedOption = normalizeInstitutionForSearch(option);
      if (normalizedOption.startsWith(normalizedQuery)) {
        startsWith.push(option);
      } else if (normalizedOption.includes(normalizedQuery)) {
        contains.push(option);
      }
    });

    return [...startsWith, ...contains];
  }, [institutionQuery, savedInstitutions]);

  const institutionRule = getInstitutionRule(formData.bank);
  const filteredInstitutionOptions = useMemo(
    () => [...filteredSavedInstitutionOptions, ...filteredBaseInstitutionOptions],
    [filteredSavedInstitutionOptions, filteredBaseInstitutionOptions]
  );
  const availablePortfolioNames = useMemo(() => (
    dedupePortfolioNames([
      ...DEFAULT_PORTFOLIO_NAME_OPTIONS,
      ...portfolioNameOptions,
      ...savedPortfolioNames,
    ])
  ), [portfolioNameOptions, savedPortfolioNames]);
  const filteredPortfolioNames = useMemo(() => {
    const normalizedQuery = normalizePortfolioForSearch(portfolioQuery.trim());

    if (!normalizedQuery) {
      return availablePortfolioNames;
    }

    const startsWith = [];
    const contains = [];

    availablePortfolioNames.forEach((option) => {
      const normalizedOption = normalizePortfolioForSearch(option);
      if (normalizedOption.startsWith(normalizedQuery)) {
        startsWith.push(option);
      } else if (normalizedOption.includes(normalizedQuery)) {
        contains.push(option);
      }
    });

    return [...startsWith, ...contains];
  }, [availablePortfolioNames, portfolioQuery]);
  const unitTypeOptions = getAllowedUnitTypes({ category: formData.category, symbol: formData.symbol });
  const normalizedUnitType = normalizeUnitType(
    formData.unitType,
    inferDefaultUnitType({ category: formData.category, symbol: formData.symbol })
  );
  const amountUnit = getAmountUnit(normalizedUnitType);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(INSTITUTION_STORAGE_KEY, JSON.stringify(savedInstitutions));
  }, [savedInstitutions]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(PORTFOLIO_NAME_STORAGE_KEY, JSON.stringify(savedPortfolioNames));
  }, [savedPortfolioNames]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (initialData) {
      const initialCategory = initialData.category || 'Hisse Senedi';
      const initialIsCommodity = initialCategory === 'Değerli Madenler' || initialCategory === 'Emtia/Altın' || initialCategory === 'Emtia';
      const initialCommodity = initialIsCommodity
        ? (getCommodityOption(initialData.symbol) || COMMODITY_OPTIONS[0])
        : null;

      setFormData({
        bank: initialData.bank || '',
        category: initialCategory,
        saklamaTuru: initialData.saklamaTuru || 'Banka',
        hesapTuru: initialData.hesapTuru || 'Vadesiz',
        portfolioName: initialData.portfolioName || initialData.portfolio_name || 'Genel Portföy',
        vadeSonuTarihi: initialData.vadeSonuTarihi || '',
        faizOrani: initialData.faizOrani ?? '',
        symbol: initialIsCommodity ? initialCommodity.symbol : (initialData.symbol || ''),
        name: initialIsCommodity ? (initialData.name || initialCommodity.name) : (initialData.name || ''),
        unitType: normalizeUnitType(
          initialData.unitType || initialData.unit_type || initialCommodity?.defaultUnitType,
          inferDefaultUnitType({
            category: initialCategory,
            symbol: initialIsCommodity ? initialCommodity.symbol : initialData.symbol,
          })
        ),
        amount: initialData.amount || '',
        avgPrice: initialData.avgPrice || '',
      });

      setSelectedSuggestion(
        initialData.symbol
          ? {
              symbol: initialData.symbol,
              name: initialData.name || initialData.symbol,
              assetType: initialCategory === 'Yatırım Fonu' ? 'fund' : 'market',
            }
          : null
      );
      setInstitutionQuery(initialData.bank || '');
      setIsManualInstitutionSelected(Boolean(initialData.bank) && !isKnownInstitution(initialData.bank, availableInstitutionOptions));
      setPortfolioQuery(initialData.portfolioName || initialData.portfolio_name || 'Genel Portföy');
    } else {
      const resolvedPrefill = String(initialPortfolioName || prefilledPortfolioName || '').trim();
      setFormData({
        ...INITIAL_FORM,
        portfolioName: resolvedPrefill,
      });
      setSelectedSuggestion(null);
      setInstitutionQuery('');
      setIsManualInstitutionSelected(false);
      setPortfolioQuery(resolvedPrefill);
    }

    setSymbolSuggestions([]);
    setIsSuggestionOpen(false);
    setActiveSuggestionIndex(-1);
    setSymbolValidationError('');
    setIsSearchingSymbol(false);
    setIsInstitutionOpen(false);
    setActiveInstitutionIndex(-1);
    setIsPortfolioOpen(false);
    setActivePortfolioIndex(-1);
  }, [isOpen, initialData, initialPortfolioName, prefilledPortfolioName, availableInstitutionOptions]);

  useEffect(() => {
    if (!isOpen || !isStockLikeCategory) {
      setSymbolSuggestions([]);
      setIsSuggestionOpen(false);
      setActiveSuggestionIndex(-1);
      setIsSearchingSymbol(false);
      return;
    }

    const query = formData.symbol.trim();
    if (query.length < MIN_SYMBOL_QUERY_LENGTH) {
      setSymbolSuggestions([]);
      setIsSuggestionOpen(false);
      setActiveSuggestionIndex(-1);
      setIsSearchingSymbol(false);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setIsSearchingSymbol(true);
      const results = await fetchSymbolSuggestions(query);

      if (!cancelled) {
        setSymbolSuggestions(results);
        setIsSuggestionOpen(true);
        setActiveSuggestionIndex(results.length ? 0 : -1);
        setIsSearchingSymbol(false);
      }
    }, 240);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [formData.symbol, isOpen, isStockLikeCategory]);

  if (!isOpen) return null;

  const handleCategoryChange = (nextCategory) => {
    const nextIsCommodity = nextCategory === 'Değerli Madenler' || nextCategory === 'Emtia/Altın' || nextCategory === 'Emtia';
    const nextIsCash = nextCategory === 'Nakit/Banka' || nextCategory === 'Nakit';
    const nextRule = getInstitutionRule(formData.bank);
    const preferredCommodity = getCommodityOption(formData.symbol) || COMMODITY_OPTIONS[0];
    const nextSymbol = nextIsCommodity ? preferredCommodity.symbol : formData.symbol;
    const nextUnitOptions = getAllowedUnitTypes({ category: nextCategory, symbol: nextSymbol });

    setFormData((prev) => ({
      ...prev,
      category: nextCategory,
      symbol: nextSymbol,
      name: nextIsCommodity ? preferredCommodity.name : prev.name,
      unitType: normalizeUnitType(prev.unitType, nextUnitOptions[0]),
      saklamaTuru: nextIsCommodity
        ? (nextRule.saklamaTurleri.includes(prev.saklamaTuru) ? prev.saklamaTuru : nextRule.saklamaTurleri[0])
        : prev.saklamaTuru,
      hesapTuru: (nextIsCommodity || nextIsCash)
        ? (nextRule.hesapTurleri.includes(prev.hesapTuru) ? prev.hesapTuru : nextRule.hesapTurleri[0])
        : prev.hesapTuru,
      vadeSonuTarihi: nextIsCash ? prev.vadeSonuTarihi : '',
      faizOrani: nextIsCash ? prev.faizOrani : '',
    }));

    setSymbolValidationError('');

    if (nextCategory !== 'Hisse Senedi' && nextCategory !== 'Yatırım Fonu') {
      setSymbolSuggestions([]);
      setIsSuggestionOpen(false);
      setActiveSuggestionIndex(-1);
      setSelectedSuggestion(null);
    }
  };

  const handleInstitutionChange = (nextInstitution) => {
    if (nextInstitution === MANUAL_INSTITUTION_LABEL) {
      setIsManualInstitutionSelected(true);
      setFormData((prev) => ({ ...prev, bank: '' }));
      return;
    }

    const nextRule = getInstitutionRule(nextInstitution);
    setIsManualInstitutionSelected(false);
    setFormData((prev) => ({
      ...prev,
      bank: nextInstitution,
      saklamaTuru: nextRule.saklamaTurleri.includes(prev.saklamaTuru)
        ? prev.saklamaTuru
        : nextRule.saklamaTurleri[0],
      hesapTuru: nextRule.hesapTurleri.includes(prev.hesapTuru)
        ? prev.hesapTuru
        : nextRule.hesapTurleri[0],
    }));
  };

  const applyInstitutionSelection = (institutionName) => {
    handleInstitutionChange(institutionName);
    setInstitutionQuery(institutionName === MANUAL_INSTITUTION_LABEL ? '' : institutionName);
    setIsInstitutionOpen(false);
    setActiveInstitutionIndex(-1);
  };

  const handleInstitutionKeyDown = (event) => {
    if (!isInstitutionOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      setIsInstitutionOpen(true);
      setActiveInstitutionIndex(0);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveInstitutionIndex((prev) => Math.min(prev + 1, filteredInstitutionOptions.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveInstitutionIndex((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (event.key === 'Enter' && isInstitutionOpen && activeInstitutionIndex >= 0 && filteredInstitutionOptions[activeInstitutionIndex]) {
      event.preventDefault();
      applyInstitutionSelection(filteredInstitutionOptions[activeInstitutionIndex]);
      return;
    }

    if (event.key === 'Escape') {
      setIsInstitutionOpen(false);
      setActiveInstitutionIndex(-1);
    }
  };

  const applyPortfolioSelection = (portfolioName) => {
    const resolved = String(portfolioName || '').trim() || 'Genel Portföy';

    setFormData((prev) => ({
      ...prev,
      portfolioName: resolved,
    }));
    setPortfolioQuery(resolved);
    setIsPortfolioOpen(false);
    setActivePortfolioIndex(-1);

    setSavedPortfolioNames((prev) => (
      prev.includes(resolved) ? prev : dedupePortfolioNames([...prev, resolved])
    ));
  };

  const handlePortfolioInputBlur = () => {
    window.setTimeout(() => {
      const resolved = String(portfolioQuery || '').trim() || 'Genel Portföy';
      setPortfolioQuery(resolved);
      setFormData((prev) => ({ ...prev, portfolioName: resolved }));
      setSavedPortfolioNames((prev) => (
        prev.includes(resolved) ? prev : dedupePortfolioNames([...prev, resolved])
      ));
      setIsPortfolioOpen(false);
      setActivePortfolioIndex(-1);
    }, 120);
  };

  const handlePortfolioKeyDown = (event) => {
    if (!isPortfolioOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      setIsPortfolioOpen(true);
      setActivePortfolioIndex(0);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActivePortfolioIndex((prev) => Math.min(prev + 1, filteredPortfolioNames.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActivePortfolioIndex((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();

      if (isPortfolioOpen && activePortfolioIndex >= 0 && filteredPortfolioNames[activePortfolioIndex]) {
        applyPortfolioSelection(filteredPortfolioNames[activePortfolioIndex]);
        return;
      }

      const resolved = String(portfolioQuery || '').trim() || 'Genel Portföy';
      applyPortfolioSelection(resolved);
      return;
    }

    if (event.key === 'Escape') {
      setIsPortfolioOpen(false);
      setActivePortfolioIndex(-1);
    }
  };

  const applySuggestion = (suggestion) => {
    const isFundSuggestion = suggestion?.assetType === 'fund';
    setFormData((prev) => ({
      ...prev,
      symbol: suggestion.symbol,
      name: suggestion.name || prev.name,
      category: isFundSuggestion ? 'Yatırım Fonu' : prev.category,
      saklamaTuru: isFundSuggestion ? 'Banka' : prev.saklamaTuru,
      hesapTuru: isFundSuggestion ? 'Vadesiz' : prev.hesapTuru,
      vadeSonuTarihi: isFundSuggestion ? '' : prev.vadeSonuTarihi,
      faizOrani: isFundSuggestion ? '' : prev.faizOrani,
    }));
    setSelectedSuggestion(suggestion);
    setSymbolValidationError('');
    setIsSuggestionOpen(false);
    setActiveSuggestionIndex(-1);
  };

  const handleSymbolKeyDown = (event) => {
    if (!isStockLikeCategory) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsSuggestionOpen(true);
      setActiveSuggestionIndex((prev) => Math.min(prev + 1, symbolSuggestions.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveSuggestionIndex((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (event.key === 'Enter' && isSuggestionOpen && activeSuggestionIndex >= 0 && symbolSuggestions[activeSuggestionIndex]) {
      event.preventDefault();
      applySuggestion(symbolSuggestions[activeSuggestionIndex]);
      return;
    }

    if (event.key === 'Escape') {
      setIsSuggestionOpen(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const normalizedSymbol = formData.symbol.trim().toUpperCase();
    if (!normalizedSymbol || !formData.amount || !formData.avgPrice) {
      return;
    }

    if (isStockCategory) {
      const hasExactMatch =
        selectedSuggestion?.symbol?.toUpperCase() === normalizedSymbol
        || symbolSuggestions.some((item) => item.symbol.toUpperCase() === normalizedSymbol);

      if (!hasExactMatch) {
        setSymbolValidationError('Hisse senedi için listeden geçerli bir sembol seçin.');
        return;
      }
    }

    if (isCommodityCategory) {
      const isKnownCommodity = COMMODITY_OPTIONS.some((option) => option.symbol === normalizedSymbol);
      if (!isKnownCommodity) {
        setSymbolValidationError('Değerli madenler için listeden bir seçenek seçin.');
        return;
      }
    }

    const availableUnitTypes = getAllowedUnitTypes({
      category: formData.category,
      symbol: normalizedSymbol,
    });
    const normalizedPayloadUnitType = normalizeUnitType(formData.unitType, availableUnitTypes[0]);
    const resolvedInstitutionName = String(formData.bank || institutionQuery || '').trim();
    const resolvedPortfolioName = String(formData.portfolioName || portfolioQuery || 'Genel Portföy').trim() || 'Genel Portföy';
    const resolvedAssetName = resolveAssetName({ symbol: normalizedSymbol, name: formData.name });

    const payload = {
      ...formData,
      bank: resolvedInstitutionName,
      symbol: normalizedSymbol,
      name: resolvedAssetName,
      unitType: normalizedPayloadUnitType,
      portfolioName: resolvedPortfolioName,
    };

    if (resolvedInstitutionName && !isKnownInstitution(resolvedInstitutionName, INSTITUTION_OPTIONS)) {
      setSavedInstitutions((prev) => dedupeInstitutionNames([resolvedInstitutionName, ...prev]));
    }

    setSavedPortfolioNames((prev) => (
      prev.includes(resolvedPortfolioName)
        ? prev
        : dedupePortfolioNames([...prev, resolvedPortfolioName])
    ));

    if (editingAssetId) {
      onUpdate(editingAssetId, payload);
    } else {
      onAdd(payload);
    }

    closeModal();
  };

  const isStep2Active = Boolean(formData.bank || formData.category);
  const isStep3Active = Boolean(formData.symbol || isCommodityCategory);
  const isEditMode = Boolean(editingAssetId);
  const isSellMode = !isEditMode && mode === 'sell';
  const modalTitle = isEditMode ? 'Düzenleme Modu' : (isSellMode ? 'Satış Modu' : 'Alış Modu');
  const modalSubtitle = isEditMode
    ? 'Mevcut varlığı güncelle'
    : (isSellMode ? 'Varlık satışı için düzenleme' : 'Yeni varlık alımı için ekleme');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-y-auto hide-scrollbar animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <div>
            <h3 className="text-xl font-semibold text-slate-100">{modalTitle}</h3>
            <p className="mt-0.5 text-xs text-slate-400">{modalSubtitle}</p>
          </div>
          <button onClick={closeModal} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded-lg border px-2 py-1.5 text-[11px] font-semibold text-center uppercase tracking-[0.08em] bg-blue-500/15 border-blue-500/40 text-blue-200">
              Adım 1 • Kurum
            </div>
            <div className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold text-center uppercase tracking-[0.08em] ${isStep2Active ? 'bg-blue-500/10 border-blue-500/30 text-blue-100' : 'bg-white/5 border-white/10 text-slate-400'}`}>
              Adım 2 • Hesap/Saklama
            </div>
            <div className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold text-center uppercase tracking-[0.08em] ${isStep3Active ? 'bg-blue-500/10 border-blue-500/30 text-blue-100' : 'bg-white/5 border-white/10 text-slate-400'}`}>
              Adım 3 • Varlık
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/15 p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <div className="absolute z-20 mt-1 w-full rounded-lg border border-white/10 bg-[#0b1220] shadow-2xl overflow-hidden">
                      <ul role="listbox" className="max-h-56 overflow-y-auto py-1">
                        {filteredInstitutionOptions.length === 0 ? (
                          <li className="px-3 py-2 text-sm text-slate-400">Eşleşen kurum bulunamadı</li>
                        ) : (
                          <>
                            {filteredSavedInstitutionOptions.length > 0 ? (
                              <li className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-sky-200/80">
                                Kayıtlı Kurumlarım
                              </li>
                            ) : null}

                            {filteredSavedInstitutionOptions.map((institution, index) => (
                              <li
                                key={`saved-${institution}`}
                                role="option"
                                aria-selected={activeInstitutionIndex === index}
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  applyInstitutionSelection(institution);
                                }}
                                className={`px-3 py-2 text-sm cursor-pointer transition-colors ${activeInstitutionIndex === index ? 'bg-blue-500/20 text-blue-200' : 'text-slate-200 hover:bg-white/10'}`}
                              >
                                {institution}
                              </li>
                            ))}

                            {filteredBaseInstitutionOptions.length > 0 ? (
                              <li className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                                Tüm Kurumlar
                              </li>
                            ) : null}

                            {filteredBaseInstitutionOptions.map((institution, index) => {
                              const flatIndex = filteredSavedInstitutionOptions.length + index;

                              return (
                                <li
                                  key={`base-${institution}`}
                                  role="option"
                                  aria-selected={activeInstitutionIndex === flatIndex}
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    applyInstitutionSelection(institution);
                                  }}
                                  className={`px-3 py-2 text-sm cursor-pointer transition-colors ${activeInstitutionIndex === flatIndex ? 'bg-blue-500/20 text-blue-200' : 'text-slate-200 hover:bg-white/10'}`}
                                >
                                  {institution}
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
                <label className="block text-sm font-medium text-slate-400 mb-1">Varlık Türü</label>
                <select
                  value={formData.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category} className="bg-slate-900 text-slate-100">
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isManualInstitution ? (
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Banka veya Kurum Adı</label>
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
                  className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-white/10 bg-black/15 p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-xs font-bold uppercase tracking-[0.1em] text-slate-300">Dinamik Kurum Akışı</h4>
              <span className="text-[11px] text-blue-200 font-medium">{formData.bank || 'Genel Kural Seti'}</span>
            </div>

            {isCommodityCategory ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-2">Saklama Türü</p>
                  <div className="flex flex-wrap gap-2">
                    {institutionRule.saklamaTurleri.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, saklamaTuru: option }))}
                        className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold border transition-colors ${formData.saklamaTuru === option ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200' : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'}`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-2">Hesap Türü</p>
                  <div className="flex flex-wrap gap-2">
                    {institutionRule.hesapTurleri.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, hesapTuru: option }))}
                        className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold border transition-colors ${formData.hesapTuru === option ? 'border-blue-400/50 bg-blue-500/15 text-blue-200' : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'}`}
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
                <p className="text-xs font-semibold text-slate-400 mb-2">Hesap Türü</p>
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
                      className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold border transition-colors ${formData.hesapTuru === hesapTuru ? 'border-blue-400/50 bg-blue-500/15 text-blue-200' : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'}`}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Vade Sonu Tarihi (Opsiyonel)</label>
                <input
                  type="date"
                  value={formData.vadeSonuTarihi}
                  onChange={(e) => setFormData((prev) => ({ ...prev, vadeSonuTarihi: e.target.value }))}
                  className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Yıllık Brüt Faiz/Kar Payı (%)</label>
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
                  className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-white/10 bg-black/15 p-4 space-y-4">
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
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-white/10 bg-[#0b1220] shadow-2xl overflow-hidden">
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
                          className={`px-3 py-2 text-sm cursor-pointer transition-colors ${activePortfolioIndex === index ? 'bg-blue-500/20 text-blue-200' : 'text-slate-200 hover:bg-white/10'}`}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  {isCommodityCategory ? 'Değerli Maden Seçimi' : (isStockLikeCategory ? 'Hisse/Fon Sembolü' : 'Sembol')}
                </label>

                {isCommodityCategory ? (
                  <select
                    required
                    value={formData.symbol || COMMODITY_OPTIONS[0].symbol}
                    onChange={(e) => {
                      const selectedCommodity = COMMODITY_OPTIONS.find((option) => option.symbol === e.target.value);
                      const resolvedSymbol = selectedCommodity?.symbol || '';
                      const nextUnitOptions = getAllowedUnitTypes({ category: formData.category, symbol: resolvedSymbol });
                      setFormData((prev) => ({
                        ...prev,
                        symbol: resolvedSymbol,
                        name: selectedCommodity?.name || prev.name,
                        unitType: normalizeUnitType(
                          selectedCommodity?.defaultUnitType,
                          nextUnitOptions[0]
                        ),
                      }));
                    }}
                    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    {COMMODITY_OPTIONS.map((option) => (
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
                        if (!isStockLikeCategory || value.trim().length < MIN_SYMBOL_QUERY_LENGTH) {
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
                      className="w-full uppercase bg-black/20 border border-white/10 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                    />

                    {isStockLikeCategory && isSuggestionOpen && (isSearchingSymbol || symbolSuggestions.length > 0) ? (
                      <div className="absolute z-20 mt-1 w-full rounded-lg border border-white/10 bg-[#0b1220] shadow-2xl overflow-hidden">
                        <ul role="listbox" className="max-h-56 overflow-y-auto py-1">
                          {isSearchingSymbol ? (
                            <li className="px-3 py-2 text-sm text-slate-400">Aranıyor...</li>
                          ) : symbolSuggestions.map((suggestion, index) => (
                            <li
                              key={`${suggestion.symbol}-${index}`}
                              role="option"
                              aria-selected={activeSuggestionIndex === index}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                applySuggestion(suggestion);
                              }}
                              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${activeSuggestionIndex === index ? 'bg-blue-500/20 text-blue-200' : 'text-slate-200 hover:bg-white/10'}`}
                            >
                              <span className="font-medium">{suggestion.symbol}</span>
                              <span className="text-slate-400"> - {suggestion.name}</span>
                              {suggestion.assetType === 'fund' ? (
                                <span className="ml-2 inline-flex text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300">Fon</span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                )}

                {symbolValidationError ? (
                  <p className="text-xs text-rose-400 mt-1">{symbolValidationError}</p>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">İsim</label>
                <input
                  type="text"
                  placeholder="Örn: Türk Hava Yolları"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Miktar</label>
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
                    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 pr-14 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    {amountUnit}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Birim Tipi</label>
                <select
                  value={normalizedUnitType}
                  onChange={(e) => setFormData((prev) => ({ ...prev, unitType: e.target.value }))}
                  className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {unitTypeOptions.map((unitTypeOption) => (
                    <option key={unitTypeOption} value={unitTypeOption} className="bg-slate-900 text-slate-100">
                      {unitTypeToLabel(unitTypeOption)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Ort. Maliyet (TL)</label>
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
                  className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-colors font-medium"
            >
              İptal
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium shadow-lg shadow-blue-500/20"
            >
              {editingAssetId ? 'Güncelle' : 'Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

AssetModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  closeModal: PropTypes.func.isRequired,
  editingAssetId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  initialData: PropTypes.object,
  mode: PropTypes.oneOf(['buy', 'sell', 'edit']),
  onAdd: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
  portfolioNameOptions: PropTypes.arrayOf(PropTypes.string),
  initialPortfolioName: PropTypes.string,
  prefilledPortfolioName: PropTypes.string,
};
