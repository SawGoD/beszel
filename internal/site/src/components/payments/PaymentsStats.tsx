import { useStore } from '@nanostores/react'
import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { $payments, $rates, $ratesLoading } from '@/lib/payments/paymentsStore'
import { daysUntilPayment, formatRub, monthlyRub } from '@/lib/payments/currency'
import { Trans } from '@lingui/react/macro'

export function PaymentsStats() {
	const payments = useStore($payments)
	const rates = useStore($rates)
	const ratesLoading = useStore($ratesLoading)

	const stats = useMemo(() => {
		let totalMonthlyRub = 0
		let soonCount = 0

		for (const payment of payments) {
			totalMonthlyRub += monthlyRub(payment.amount, payment.currency, payment.period, rates)
			const days = daysUntilPayment(payment.nextPayment)
			if (days <= 5) soonCount++
		}

		return {
			totalMonthlyRub,
			totalCount: payments.length,
			soonCount,
		}
	}, [payments, rates])

	return (
		<>
			{/* Desktop: 3 columns */}
			<div className="hidden sm:grid gap-4 grid-cols-3">
				<Card>
					<CardContent className="p-4">
						<div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
							<Trans>Monthly Total</Trans>
						</div>
						<div className="text-2xl font-bold mt-1">
							{ratesLoading ? '...' : `${formatRub(stats.totalMonthlyRub)} ₽`}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-4">
						<div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
							<Trans>Total Servers</Trans>
						</div>
						<div className="text-2xl font-bold mt-1">{stats.totalCount}</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-4">
						<div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
							<Trans>Due Soon</Trans> (≤5 <Trans>days</Trans>)
						</div>
						<div className={`text-2xl font-bold mt-1 ${stats.soonCount > 0 ? 'text-yellow-500' : ''}`}>
							{stats.soonCount}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Mobile: compact layout */}
			<div className="sm:hidden space-y-2">
				<Card>
					<CardContent className="p-3">
						<div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
							<Trans>Monthly Total</Trans>
						</div>
						<div className="text-xl font-bold">
							{ratesLoading ? '...' : `${formatRub(stats.totalMonthlyRub)} ₽`}
						</div>
					</CardContent>
				</Card>

				<div className="grid grid-cols-2 gap-2">
					<Card>
						<CardContent className="p-3">
							<div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
								<Trans>Total Servers</Trans>
							</div>
							<div className="text-xl font-bold">{stats.totalCount}</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="p-3">
							<div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
								<Trans>Due Soon</Trans>
							</div>
							<div className={`text-xl font-bold ${stats.soonCount > 0 ? 'text-yellow-500' : ''}`}>
								{stats.soonCount}
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</>
	)
}
