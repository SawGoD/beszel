import { atom } from 'nanostores'
import type { PaymentsState, Provider, PaymentEntry, ExchangeRates } from './paymentsTypes'
import { FALLBACK_RATES } from './paymentsTypes'

const LS_KEY = 'beszel-payments-v1'

/** Default empty state */
const defaultState: PaymentsState = {
	providers: [],
	payments: [],
	rates: FALLBACK_RATES,
}

/** Load state from localStorage */
function loadState(): PaymentsState {
	try {
		const raw = localStorage.getItem(LS_KEY)
		if (raw) {
			const parsed = JSON.parse(raw)
			return {
				...defaultState,
				...parsed,
				rates: parsed.rates || defaultState.rates,
			}
		}
	} catch (e) {
		console.warn('Failed to load payments state from localStorage:', e)
	}
	return defaultState
}

/** Save state to localStorage */
function saveState(state: PaymentsState) {
	try {
		localStorage.setItem(LS_KEY, JSON.stringify(state))
	} catch (e) {
		console.warn('Failed to save payments state to localStorage:', e)
	}
}

// Initialize stores with loaded state
const initialState = loadState()

/** Providers store */
export const $providers = atom<Provider[]>(initialState.providers)

/** Payments store */
export const $payments = atom<PaymentEntry[]>(initialState.payments)

/** Exchange rates store */
export const $rates = atom<ExchangeRates>(initialState.rates)

/** Loading state for rates */
export const $ratesLoading = atom<boolean>(false)

/** Generate unique ID */
function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/** Persist current state */
function persist() {
	saveState({
		providers: $providers.get(),
		payments: $payments.get(),
		rates: $rates.get(),
	})
}

// Provider actions
export function addProvider(provider: Omit<Provider, 'id'>): Provider {
	const newProvider: Provider = {
		...provider,
		id: generateId(),
	}
	$providers.set([...$providers.get(), newProvider])
	persist()
	return newProvider
}

export function updateProvider(id: string, updates: Partial<Omit<Provider, 'id'>>) {
	$providers.set(
		$providers.get().map((p) => (p.id === id ? { ...p, ...updates } : p))
	)
	persist()
}

export function deleteProvider(id: string) {
	$providers.set($providers.get().filter((p) => p.id !== id))
	// Also delete payments linked to this provider
	$payments.set($payments.get().filter((p) => p.providerId !== id))
	persist()
}

// Payment actions
export function addPayment(payment: Omit<PaymentEntry, 'id'>): PaymentEntry {
	const newPayment: PaymentEntry = {
		...payment,
		id: generateId(),
	}
	$payments.set([...$payments.get(), newPayment])
	persist()
	return newPayment
}

export function updatePayment(id: string, updates: Partial<Omit<PaymentEntry, 'id'>>) {
	$payments.set(
		$payments.get().map((p) => (p.id === id ? { ...p, ...updates } : p))
	)
	persist()
}

export function deletePayment(id: string) {
	$payments.set($payments.get().filter((p) => p.id !== id))
	persist()
}

/** Mark payment as paid - advances nextPayment date by period */
export function markPaymentPaid(id: string) {
	const payment = $payments.get().find((p) => p.id === id)
	if (!payment) return

	const nextDate = new Date(payment.nextPayment)

	switch (payment.period) {
		case 'daily':
			nextDate.setDate(nextDate.getDate() + 1)
			break
		case 'weekly':
			nextDate.setDate(nextDate.getDate() + 7)
			break
		case 'monthly':
			nextDate.setMonth(nextDate.getMonth() + 1)
			break
		case 'quarterly':
			nextDate.setMonth(nextDate.getMonth() + 3)
			break
		case 'semiannual':
			nextDate.setMonth(nextDate.getMonth() + 6)
			break
		case 'annual':
			nextDate.setFullYear(nextDate.getFullYear() + 1)
			break
	}

	updatePayment(id, { nextPayment: nextDate.toISOString().split('T')[0] })
}

// Rates actions
export function setRates(rates: ExchangeRates) {
	$rates.set(rates)
	persist()
}

/** Export payments data as JSON */
export function exportPaymentsData(): string {
	return JSON.stringify({
		providers: $providers.get(),
		payments: $payments.get(),
		exportedAt: new Date().toISOString(),
	}, null, 2)
}

/** Import payments data from JSON */
export function importPaymentsData(jsonString: string): boolean {
	try {
		const data = JSON.parse(jsonString)
		if (data.providers && Array.isArray(data.providers)) {
			$providers.set(data.providers)
		}
		if (data.payments && Array.isArray(data.payments)) {
			$payments.set(data.payments)
		}
		persist()
		return true
	} catch (e) {
		console.error('Failed to import payments data:', e)
		return false
	}
}
