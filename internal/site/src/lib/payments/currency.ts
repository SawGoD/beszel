import type { Currency, ExchangeRates, PaymentPeriod } from "./paymentsTypes"
import { FALLBACK_RATES } from "./paymentsTypes"
import { $ratesLoading, setRates } from "./paymentsStore"

const CBR_URL = "https://www.cbr-xml-daily.ru/daily_json.js"
const MARKUP = 1.05 // 5% markup

/** Fetch currency rates from CBR with timeout */
async function fetchWithTimeout(url: string, timeout = 6000): Promise<Response> {
	const controller = new AbortController()
	const id = setTimeout(() => controller.abort(), timeout)
	try {
		return await fetch(url, { signal: controller.signal })
	} finally {
		clearTimeout(id)
	}
}

/** Load exchange rates from CBR API */
export async function loadRates(): Promise<ExchangeRates> {
	$ratesLoading.set(true)

	try {
		// biome-ignore lint/suspicious/noExplicitAny: CBR API response type is dynamic
		let data: any

		// First attempt
		try {
			const res = await fetchWithTimeout(CBR_URL, 6000)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			data = await res.json()
		} catch (e) {
			// Retry after 2 seconds
			await new Promise((r) => setTimeout(r, 2000))
			const res2 = await fetchWithTimeout(CBR_URL, 6000)
			if (!res2.ok) throw new Error(`HTTP ${res2.status}`)
			data = await res2.json()
		}

		const usd = Number(data?.Valute?.USD?.Value)
		const eur = Number(data?.Valute?.EUR?.Value)

		if (Number.isFinite(usd) && Number.isFinite(eur)) {
			const rates: ExchangeRates = {
				USD: usd * MARKUP,
				EUR: eur * MARKUP,
				updated: data?.Date || new Date().toISOString(),
				source: "cbr",
			}
			setRates(rates)
			return rates
		}
		throw new Error("Invalid API data")
	} catch (e) {
		console.warn("Failed to fetch CBR rates, using fallback:", e)
		setRates(FALLBACK_RATES)
		return FALLBACK_RATES
	} finally {
		$ratesLoading.set(false)
	}
}

/** Convert amount to RUB */
export function toRub(amount: number, currency: Currency, rates: ExchangeRates): number {
	if (currency === "RUB") return amount
	if (currency === "USD") return amount * rates.USD
	if (currency === "EUR") return amount * rates.EUR
	return amount
}
/** Convert RUB to USD */ export function rubToUsd(amount: number, rates: ExchangeRates): number {
	return amount / rates.USD
} /** Convert RUB to EUR */
export function rubToEur(amount: number, rates: ExchangeRates): number {
	return amount / rates.EUR
}

/** Get monthly factor for period */
export function getMonthlyFactor(period: PaymentPeriod): number {
	switch (period) {
		case "daily":
			return 30
		case "weekly":
			return 365 / 12 / 7
		case "monthly":
			return 1
		case "quarterly":
			return 1 / 3
		case "semiannual":
			return 1 / 6
		case "annual":
			return 1 / 12
		default:
			return 1
	}
}

/** Calculate monthly cost in RUB */
export function monthlyRub(amount: number, currency: Currency, period: PaymentPeriod, rates: ExchangeRates): number {
	return toRub(amount, currency, rates) * getMonthlyFactor(period)
}

/** Calculate days until payment date */
export function daysUntilPayment(dateStr: string): number {
	const now = new Date()
	const due = new Date(dateStr)
	if (Number.isNaN(due.getTime())) return Infinity

	const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
	const dueNorm = new Date(due.getFullYear(), due.getMonth(), due.getDate())
	return Math.floor((dueNorm.getTime() - start.getTime()) / 86400000)
}

/** Get payment status based on days remaining */
export function getPaymentStatus(days: number): "ok" | "warn" | "crit" {
	if (days <= 1) return "crit"
	if (days <= 5) return "warn"
	return "ok"
}

/** Format number as RUB currency */
export function formatRub(n: number): string {
	return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(n)
}

/** Format date in Russian format DD.MM.YYYY */
export function formatDateRu(dateStr: string): string {
	if (!dateStr) return ""
	const d = new Date(dateStr)
	if (Number.isNaN(d.getTime())) return ""
	const pad = (n: number) => String(n).padStart(2, "0")
	return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
}

/** Extract domain from URL (removes subdomains) */
export function extractDomain(url: string): string | null {
	if (!url) return null
	try {
		const urlObj = new URL(url)
		const hostname = urlObj.hostname.toLowerCase()
		const parts = hostname.split(".")
		if (parts.length >= 2) {
			return parts.slice(-2).join(".")
		}
		return hostname
	} catch {
		return null
	}
}

/** Get favicon URL from Google's favicon service */
export function getFaviconUrl(domain: string): string | null {
	if (!domain) return null
	const fullUrl = `https://${domain}`
	return `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(fullUrl)}&size=32`
}
