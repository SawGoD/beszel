/** Payment periods */
export type PaymentPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual'

/** Supported currencies */
export type Currency = 'RUB' | 'USD' | 'EUR'

/** Provider/hoster entity */
export interface Provider {
	id: string
	name: string
	url: string
	currencyDefault?: Currency
	notes?: string
}

/** Country codes for server location */
export type CountryCode = 'RU' | 'DE' | 'NL' | 'US' | 'FI' | 'FR' | 'GB' | 'PL' | 'UA' | 'KZ' | 'BY' | 'LT' | 'LV' | 'EE' | 'CZ' | 'AT' | 'CH' | 'SE' | 'NO' | 'DK' | 'IT' | 'ES' | 'PT' | 'JP' | 'SG' | 'HK' | 'AU' | 'CA' | 'BR'

/** Payment entry linked to a server */
export interface PaymentEntry {
	id: string
	serverId: string
	providerId: string
	period: PaymentPeriod
	nextPayment: string // ISO date
	amount: number
	currency: Currency
	country?: CountryCode
	providerUrlOverride?: string
	notes?: string
}

/** Currency exchange rates */
export interface ExchangeRates {
	USD: number
	EUR: number
	updated: string
	source: 'cbr' | 'fallback'
}

/** Full payments state */
export interface PaymentsState {
	providers: Provider[]
	payments: PaymentEntry[]
	rates: ExchangeRates
}

/** Period labels for display */
export const PERIOD_LABELS: Record<PaymentPeriod, string> = {
	daily: 'Daily',
	weekly: 'Weekly',
	monthly: 'Monthly',
	quarterly: 'Quarterly (3 mo)',
	semiannual: 'Semi-annual (6 mo)',
	annual: 'Annual (12 mo)',
}

/** Period short labels */
export const PERIOD_SHORT: Record<PaymentPeriod, string> = {
	daily: 'day',
	weekly: 'wk',
	monthly: 'mo',
	quarterly: 'qtr',
	semiannual: '6mo',
	annual: 'yr',
}

/** Currency symbols */
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
	RUB: '₽',
	USD: '$',
	EUR: '€',
}

/** Fallback exchange rates (CBR average + 5% markup) */
export const FALLBACK_RATES: ExchangeRates = {
	USD: 95.0 * 1.05,
	EUR: 105.0 * 1.05,
	updated: 'fallback',
	source: 'fallback',
}

/** Country flag emoji mapping */
export const COUNTRY_FLAGS: Record<CountryCode, string> = {
	RU: '🇷🇺',
	DE: '🇩🇪',
	NL: '🇳🇱',
	US: '🇺🇸',
	FI: '🇫🇮',
	FR: '🇫🇷',
	GB: '🇬🇧',
	PL: '🇵🇱',
	UA: '🇺🇦',
	KZ: '🇰🇿',
	BY: '🇧🇾',
	LT: '🇱🇹',
	LV: '🇱🇻',
	EE: '🇪🇪',
	CZ: '🇨🇿',
	AT: '🇦🇹',
	CH: '🇨🇭',
	SE: '🇸🇪',
	NO: '🇳🇴',
	DK: '🇩🇰',
	IT: '🇮🇹',
	ES: '🇪🇸',
	PT: '🇵🇹',
	JP: '🇯🇵',
	SG: '🇸🇬',
	HK: '🇭🇰',
	AU: '🇦🇺',
	CA: '🇨🇦',
	BR: '🇧🇷',
}

/** Country names for display */
export const COUNTRY_NAMES: Record<CountryCode, string> = {
	RU: 'Russia',
	DE: 'Germany',
	NL: 'Netherlands',
	US: 'USA',
	FI: 'Finland',
	FR: 'France',
	GB: 'UK',
	PL: 'Poland',
	UA: 'Ukraine',
	KZ: 'Kazakhstan',
	BY: 'Belarus',
	LT: 'Lithuania',
	LV: 'Latvia',
	EE: 'Estonia',
	CZ: 'Czechia',
	AT: 'Austria',
	CH: 'Switzerland',
	SE: 'Sweden',
	NO: 'Norway',
	DK: 'Denmark',
	IT: 'Italy',
	ES: 'Spain',
	PT: 'Portugal',
	JP: 'Japan',
	SG: 'Singapore',
	HK: 'Hong Kong',
	AU: 'Australia',
	CA: 'Canada',
	BR: 'Brazil',
}

// ============= PocketBase Record Types =============

import type { RecordModel } from 'pocketbase'

/** PocketBase Provider record */
export interface ProviderRecord extends RecordModel {
	user: string
	name: string
	url: string
	currencyDefault: Currency | ''
	notes: string
}

/** PocketBase Payment record */
export interface PaymentRecord extends RecordModel {
	user: string
	system: string
	provider: string
	period: PaymentPeriod
	nextPayment: string
	amount: number
	currency: Currency
	country: CountryCode | ''
	providerUrlOverride: string
	notes: string
}
