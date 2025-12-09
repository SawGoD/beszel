import { useStore } from '@nanostores/react'
import { useMemo, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { $payments, $providers, $rates } from '@/lib/payments/paymentsStore'
import { $systems } from '@/lib/stores'
import {
	extractDomain,
	formatRub,
	getFaviconUrl,
	getPaymentStatus,
	monthlyRub,
} from '@/lib/payments/currency'
import { CURRENCY_SYMBOLS, type PaymentEntry } from '@/lib/payments/paymentsTypes'
import { cn } from '@/lib/utils'

interface PaymentsCalendarProps {
	onEditPayment: (payment: PaymentEntry) => void
}

const WEEKDAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const MONTHS_RU = [
	'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
	'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
]

export function PaymentsCalendar({ onEditPayment }: PaymentsCalendarProps) {
	const { t } = useLingui()
	const payments = useStore($payments)
	const providers = useStore($providers)
	const rates = useStore($rates)
	const systems = useStore($systems)

	const today = new Date()
	const [currentMonth, setCurrentMonth] = useState(today.getMonth())
	const [currentYear, setCurrentYear] = useState(today.getFullYear())

	// Group payments by date string (YYYY-MM-DD)
	const paymentsByDate = useMemo(() => {
		const map = new Map<string, PaymentEntry[]>()
		for (const payment of payments) {
			const dateKey = payment.nextPayment
			if (!map.has(dateKey)) {
				map.set(dateKey, [])
			}
			map.get(dateKey)!.push(payment)
		}
		return map
	}, [payments])

	// Generate calendar days for current month
	const calendarDays = useMemo(() => {
		const firstDay = new Date(currentYear, currentMonth, 1)
		const lastDay = new Date(currentYear, currentMonth + 1, 0)

		// Get first Monday of the calendar grid
		let startDay = new Date(firstDay)
		const dayOfWeek = firstDay.getDay()
		// Convert Sunday (0) to 7 for easier calculation with Monday-first weeks
		const adjustedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek
		startDay.setDate(startDay.getDate() - (adjustedDayOfWeek - 1))

		const days: { date: Date; isCurrentMonth: boolean; payments: PaymentEntry[] }[] = []
		const current = new Date(startDay)

		// Generate 6 weeks (42 days) for consistent calendar size
		for (let i = 0; i < 42; i++) {
			const dateStr = current.toISOString().split('T')[0]
			days.push({
				date: new Date(current),
				isCurrentMonth: current.getMonth() === currentMonth,
				payments: paymentsByDate.get(dateStr) || [],
			})
			current.setDate(current.getDate() + 1)
		}

		return days
	}, [currentMonth, currentYear, paymentsByDate])

	const goToPrevMonth = () => {
		if (currentMonth === 0) {
			setCurrentMonth(11)
			setCurrentYear(currentYear - 1)
		} else {
			setCurrentMonth(currentMonth - 1)
		}
	}

	const goToNextMonth = () => {
		if (currentMonth === 11) {
			setCurrentMonth(0)
			setCurrentYear(currentYear + 1)
		} else {
			setCurrentMonth(currentMonth + 1)
		}
	}

	const goToToday = () => {
		setCurrentMonth(today.getMonth())
		setCurrentYear(today.getFullYear())
	}

	const getServerName = (serverId: string) => {
		const system = systems.find((s) => s.id === serverId)
		return system?.name || serverId
	}

	const getProvider = (providerId: string) => {
		return providers.find((p) => p.id === providerId)
	}

	const getProviderFavicon = (providerId: string) => {
		const provider = getProvider(providerId)
		if (!provider?.url) return null
		const domain = extractDomain(provider.url)
		if (!domain) return null
		return getFaviconUrl(domain)
	}

	const isToday = (date: Date) => {
		return (
			date.getDate() === today.getDate() &&
			date.getMonth() === today.getMonth() &&
			date.getFullYear() === today.getFullYear()
		)
	}

	const getDaysUntil = (date: Date) => {
		const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate())
		const dateNorm = new Date(date.getFullYear(), date.getMonth(), date.getDate())
		return Math.floor((dateNorm.getTime() - todayNorm.getTime()) / 86400000)
	}

	return (
		<div className="space-y-4">
			{/* Header with navigation */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Button variant="outline" size="icon" onClick={goToPrevMonth}>
						<ChevronLeftIcon className="h-4 w-4" />
					</Button>
					<Button variant="outline" size="icon" onClick={goToNextMonth}>
						<ChevronRightIcon className="h-4 w-4" />
					</Button>
					<h2 className="text-lg font-semibold ml-2">
						{MONTHS_RU[currentMonth]} {currentYear}
					</h2>
				</div>
				<Button variant="outline" size="sm" onClick={goToToday}>
					<Trans>Today</Trans>
				</Button>
			</div>

			{/* Calendar grid */}
			<div className="border rounded-lg overflow-hidden">
				{/* Weekday headers */}
				<div className="grid grid-cols-7 bg-muted/50">
					{WEEKDAYS_RU.map((day) => (
						<div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground border-b">
							{day}
						</div>
					))}
				</div>

				{/* Calendar days */}
				<div className="grid grid-cols-7">
					{calendarDays.map((day, idx) => {
						const hasPayments = day.payments.length > 0
						const daysUntil = getDaysUntil(day.date)

						// Get worst status for the day
						let worstStatus: 'ok' | 'warn' | 'crit' = 'ok'
						if (hasPayments) {
							for (const p of day.payments) {
								const status = getPaymentStatus(daysUntil)
								if (status === 'crit') {
									worstStatus = 'crit'
									break
								} else if (status === 'warn') {
									worstStatus = 'warn'
								}
							}
						}

						return (
							<div
								key={idx}
								className={cn(
									'min-h-[100px] p-1 border-b border-r',
									!day.isCurrentMonth && 'bg-muted/30 text-muted-foreground',
									isToday(day.date) && 'bg-primary/5'
								)}
							>
								{/* Day number */}
								<div className={cn(
									'text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full',
									isToday(day.date) && 'bg-primary text-primary-foreground'
								)}>
									{day.date.getDate()}
								</div>

								{/* Payments for this day */}
								<div className="space-y-1">
									{day.payments.slice(0, 3).map((payment) => {
										const provider = getProvider(payment.providerId)
										const favicon = getProviderFavicon(payment.providerId)
										const status = getPaymentStatus(daysUntil)

										return (
											<div
												key={payment.id}
												onClick={() => onEditPayment(payment)}
												className={cn(
													'text-xs p-1 rounded cursor-pointer truncate flex items-center gap-1',
													status === 'crit' && 'bg-red-500/20 text-red-700 dark:text-red-400',
													status === 'warn' && 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
													status === 'ok' && 'bg-green-500/10 text-green-700 dark:text-green-400',
													'hover:opacity-80'
												)}
												title={`${getServerName(payment.serverId)} - ${formatRub(payment.amount)} ${CURRENCY_SYMBOLS[payment.currency]}`}
											>
												{favicon && (
													<img
														src={favicon}
														alt=""
														className="h-3 w-3 rounded-sm shrink-0"
														onError={(e) => {
															e.currentTarget.style.display = 'none'
														}}
													/>
												)}
												<span className="truncate">
													{getServerName(payment.serverId)}
												</span>
											</div>
										)
									})}
									{day.payments.length > 3 && (
										<div className="text-xs text-muted-foreground text-center">
											+{day.payments.length - 3} <Trans>more</Trans>
										</div>
									)}
								</div>
							</div>
						)
					})}
				</div>
			</div>

			{/* Legend */}
			<div className="flex items-center gap-4 text-xs text-muted-foreground">
				<div className="flex items-center gap-1">
					<div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/50" />
					<span><Trans>Critical (today/overdue)</Trans></span>
				</div>
				<div className="flex items-center gap-1">
					<div className="w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500/50" />
					<span><Trans>Warning (2-5 days)</Trans></span>
				</div>
				<div className="flex items-center gap-1">
					<div className="w-3 h-3 rounded bg-green-500/10 border border-green-500/50" />
					<span><Trans>OK (6+ days)</Trans></span>
				</div>
			</div>
		</div>
	)
}
