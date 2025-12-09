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

/** Payment entry linked to a server */
export interface PaymentEntry {
	id: string
	serverId: string
	providerId: string
	period: PaymentPeriod
	nextPayment: string // ISO date
	amount: number
	currency: Currency
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
