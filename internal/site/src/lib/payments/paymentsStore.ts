import { atom } from 'nanostores'
import { pb } from '@/lib/api'
import type {
	Provider,
	PaymentEntry,
	ExchangeRates,
	ProviderRecord,
	PaymentRecord,
	CountryCode,
} from './paymentsTypes'
import { FALLBACK_RATES } from './paymentsTypes'

// ============= STORES =============

/** Providers store */
export const $providers = atom<Provider[]>([])

/** Payments store */
export const $payments = atom<PaymentEntry[]>([])

/** Exchange rates store (remains in-memory, not persisted to PB) */
export const $rates = atom<ExchangeRates>(FALLBACK_RATES)

/** Loading state for rates */
export const $ratesLoading = atom<boolean>(false)

/** Loading state for initial data fetch */
export const $paymentsLoading = atom<boolean>(true)

/** Error state */
export const $paymentsError = atom<string | null>(null)

// ============= PROVIDER MANAGER =============

export const providerManager = (() => {
	let unsub: (() => void) | undefined

	/** Convert PB record to Provider type */
	function toProvider(record: ProviderRecord): Provider {
		return {
			id: record.id,
			name: record.name,
			url: record.url,
			currencyDefault: record.currencyDefault || undefined,
			notes: record.notes || undefined,
		}
	}

	/** Fetch all providers */
	async function fetchAll(): Promise<Provider[]> {
		const records = await pb.collection<ProviderRecord>('providers').getFullList({ sort: '+name' })
		return records.map(toProvider)
	}

	/** Add/update providers in store */
	function add(providers: Provider[]) {
		const current = $providers.get()
		const map = new Map(current.map((p) => [p.id, p]))
		for (const provider of providers) {
			map.set(provider.id, provider)
		}
		$providers.set(Array.from(map.values()))
	}

	/** Remove providers from store */
	function remove(ids: string[]) {
		const idSet = new Set(ids)
		$providers.set($providers.get().filter((p) => !idSet.has(p.id)))
	}

	/** Subscribe to realtime updates */
	async function subscribe() {
		unsub = await pb.collection<ProviderRecord>('providers').subscribe('*', ({ action, record }) => {
			if (action === 'create' || action === 'update') {
				add([toProvider(record)])
			} else if (action === 'delete') {
				remove([record.id])
			}
		})
	}

	/** Unsubscribe from realtime */
	function unsubscribe() {
		unsub?.()
		unsub = undefined
	}

	/** Refresh all data from server */
	async function refresh() {
		const providers = await fetchAll()
		$providers.set(providers)
	}

	return { add, remove, subscribe, unsubscribe, refresh, toProvider }
})()

// ============= PAYMENT MANAGER =============

export const paymentManager = (() => {
	let unsub: (() => void) | undefined

	/** Convert PB record to PaymentEntry type */
	function toPayment(record: PaymentRecord): PaymentEntry {
		return {
			id: record.id,
			serverId: record.system,
			providerId: record.provider,
			period: record.period,
			nextPayment: record.nextPayment.split(' ')[0], // PB date "2024-01-01 00:00:00" -> "2024-01-01"
			amount: record.amount,
			currency: record.currency,
			country: (record.country as CountryCode) || undefined,
			providerUrlOverride: record.providerUrlOverride || undefined,
			notes: record.notes || undefined,
		}
	}

	/** Fetch all payments */
	async function fetchAll(): Promise<PaymentEntry[]> {
		const records = await pb.collection<PaymentRecord>('payments').getFullList()
		return records.map(toPayment)
	}

	/** Add/update payments in store */
	function add(payments: PaymentEntry[]) {
		const current = $payments.get()
		const map = new Map(current.map((p) => [p.id, p]))
		for (const payment of payments) {
			map.set(payment.id, payment)
		}
		$payments.set(Array.from(map.values()))
	}

	/** Remove payments from store */
	function remove(ids: string[]) {
		const idSet = new Set(ids)
		$payments.set($payments.get().filter((p) => !idSet.has(p.id)))
	}

	/** Subscribe to realtime updates */
	async function subscribe() {
		unsub = await pb.collection<PaymentRecord>('payments').subscribe('*', ({ action, record }) => {
			if (action === 'create' || action === 'update') {
				add([toPayment(record)])
			} else if (action === 'delete') {
				remove([record.id])
			}
		})
	}

	/** Unsubscribe from realtime */
	function unsubscribe() {
		unsub?.()
		unsub = undefined
	}

	/** Refresh all data from server */
	async function refresh() {
		const payments = await fetchAll()
		$payments.set(payments)
	}

	return { add, remove, subscribe, unsubscribe, refresh, toPayment }
})()

// ============= INITIALIZATION =============

/** Initialize payments module - call on app/page start */
export async function initPayments() {
	$paymentsLoading.set(true)
	$paymentsError.set(null)

	try {
		await Promise.all([providerManager.refresh(), paymentManager.refresh()])
		await Promise.all([providerManager.subscribe(), paymentManager.subscribe()])
	} catch (e) {
		console.error('Failed to init payments:', e)
		$paymentsError.set('Failed to load payments data')
	} finally {
		$paymentsLoading.set(false)
	}
}

/** Cleanup subscriptions - call on unmount/logout */
export function cleanupPayments() {
	providerManager.unsubscribe()
	paymentManager.unsubscribe()
	$providers.set([])
	$payments.set([])
	$paymentsLoading.set(true)
	$paymentsError.set(null)
}

// ============= PROVIDER CRUD (async) =============

/** Add a new provider */
export async function addProvider(provider: Omit<Provider, 'id'>): Promise<Provider> {
	const record = await pb.collection<ProviderRecord>('providers').create({
		user: pb.authStore.record?.id,
		name: provider.name,
		url: provider.url,
		currencyDefault: provider.currencyDefault || '',
		notes: provider.notes || '',
	})
	return providerManager.toProvider(record)
}

/** Update an existing provider */
export async function updateProvider(id: string, updates: Partial<Omit<Provider, 'id'>>) {
	const pbUpdates: Record<string, unknown> = {}
	if (updates.name !== undefined) pbUpdates.name = updates.name
	if (updates.url !== undefined) pbUpdates.url = updates.url
	if (updates.currencyDefault !== undefined) pbUpdates.currencyDefault = updates.currencyDefault || ''
	if (updates.notes !== undefined) pbUpdates.notes = updates.notes || ''

	await pb.collection('providers').update(id, pbUpdates)
}

/** Delete a provider (cascade deletes related payments) */
export async function deleteProvider(id: string) {
	await pb.collection('providers').delete(id)
}

// ============= PAYMENT CRUD (async) =============

/** Add a new payment */
export async function addPayment(payment: Omit<PaymentEntry, 'id'>): Promise<PaymentEntry> {
	const record = await pb.collection<PaymentRecord>('payments').create({
		user: pb.authStore.record?.id,
		system: payment.serverId,
		provider: payment.providerId,
		period: payment.period,
		nextPayment: payment.nextPayment,
		amount: payment.amount,
		currency: payment.currency,
		country: payment.country || '',
		providerUrlOverride: payment.providerUrlOverride || '',
		notes: payment.notes || '',
	})
	return paymentManager.toPayment(record)
}

/** Update an existing payment */
export async function updatePayment(id: string, updates: Partial<Omit<PaymentEntry, 'id'>>) {
	const pbUpdates: Record<string, unknown> = {}
	if (updates.serverId !== undefined) pbUpdates.system = updates.serverId
	if (updates.providerId !== undefined) pbUpdates.provider = updates.providerId
	if (updates.period !== undefined) pbUpdates.period = updates.period
	if (updates.nextPayment !== undefined) pbUpdates.nextPayment = updates.nextPayment
	if (updates.amount !== undefined) pbUpdates.amount = updates.amount
	if (updates.currency !== undefined) pbUpdates.currency = updates.currency
	if (updates.country !== undefined) pbUpdates.country = updates.country || ''
	if (updates.providerUrlOverride !== undefined) pbUpdates.providerUrlOverride = updates.providerUrlOverride || ''
	if (updates.notes !== undefined) pbUpdates.notes = updates.notes || ''

	await pb.collection('payments').update(id, pbUpdates)
}

/** Delete a payment */
export async function deletePayment(id: string) {
	await pb.collection('payments').delete(id)
}

/** Mark payment as paid - advances nextPayment date by period */
export async function markPaymentPaid(id: string) {
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

	await updatePayment(id, { nextPayment: nextDate.toISOString().split('T')[0] })
}

// ============= RATES (in-memory only) =============

/** Set exchange rates */
export function setRates(rates: ExchangeRates) {
	$rates.set(rates)
}

// ============= EXPORT / IMPORT =============

/** Export payments data as JSON (for backup) */
export function exportPaymentsData(): string {
	return JSON.stringify(
		{
			providers: $providers.get(),
			payments: $payments.get(),
			exportedAt: new Date().toISOString(),
		},
		null,
		2
	)
}

/** Import payments data from JSON */
export async function importPaymentsData(jsonString: string): Promise<{ success: boolean; errors: string[] }> {
	const errors: string[] = []

	try {
		const data = JSON.parse(jsonString)
		const providerIdMap = new Map<string, string>()

		// Import providers first
		if (data.providers && Array.isArray(data.providers)) {
			for (const provider of data.providers) {
				try {
					const newProvider = await addProvider({
						name: provider.name,
						url: provider.url,
						currencyDefault: provider.currencyDefault,
						notes: provider.notes,
					})
					providerIdMap.set(provider.id, newProvider.id)
				} catch (e) {
					errors.push(`Provider "${provider.name}": ${e}`)
				}
			}
		}

		// Import payments
		if (data.payments && Array.isArray(data.payments)) {
			for (const payment of data.payments) {
				try {
					const newProviderId = providerIdMap.get(payment.providerId)
					if (!newProviderId) {
						errors.push(`Payment: provider not found for ${payment.providerId}`)
						continue
					}

					await addPayment({
						serverId: payment.serverId,
						providerId: newProviderId,
						period: payment.period,
						nextPayment: payment.nextPayment,
						amount: payment.amount,
						currency: payment.currency,
						country: payment.country,
						providerUrlOverride: payment.providerUrlOverride,
						notes: payment.notes,
					})
				} catch (e) {
					errors.push(`Payment: ${e}`)
				}
			}
		}

		return { success: errors.length === 0, errors }
	} catch (e) {
		console.error('Failed to import payments data:', e)
		return { success: false, errors: [`Parse error: ${e}`] }
	}
}
