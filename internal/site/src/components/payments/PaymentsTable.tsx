import { useStore } from '@nanostores/react'
import { useMemo, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
	CheckIcon,
	ExternalLinkIcon,
	Loader2Icon,
	MoreHorizontalIcon,
	PencilIcon,
	TrashIcon,
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { $payments, $providers, $rates, deletePayment, markPaymentPaid } from '@/lib/payments/paymentsStore'
import { $systems } from '@/lib/stores'
import {
	daysUntilPayment,
	extractDomain,
	formatDateRu,
	formatRub,
	getFaviconUrl,
	getPaymentStatus,
	monthlyRub,
} from '@/lib/payments/currency'
import {
	CURRENCY_SYMBOLS,
	PERIOD_SHORT,
	type PaymentEntry,
} from '@/lib/payments/paymentsTypes'
import { CountryFlag } from './CountryFlag'

interface PaymentsTableProps {
	onEditPayment: (payment: PaymentEntry) => void
}

type SortKey = 'date' | 'price'

export function PaymentsTable({ onEditPayment }: PaymentsTableProps) {
	const { t } = useLingui()
	const payments = useStore($payments)
	const providers = useStore($providers)
	const rates = useStore($rates)
	const systems = useStore($systems)

	const [sortBy, setSortBy] = useState<SortKey>('date')
	const [loadingId, setLoadingId] = useState<string | null>(null)

	const sortedPayments = useMemo(() => {
		const arr = [...payments]
		if (sortBy === 'date') {
			arr.sort((a, b) => new Date(a.nextPayment).getTime() - new Date(b.nextPayment).getTime())
		} else if (sortBy === 'price') {
			arr.sort(
				(a, b) =>
					monthlyRub(a.amount, a.currency, a.period, rates) -
					monthlyRub(b.amount, b.currency, b.period, rates)
			)
		}
		return arr
	}, [payments, sortBy, rates])

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

	const getPaymentUrl = (payment: PaymentEntry) => {
		if (payment.providerUrlOverride) return payment.providerUrlOverride
		const provider = providers.find((p) => p.id === payment.providerId)
		return provider?.url || ''
	}

	const handleDelete = async (id: string) => {
		if (confirm(t`Are you sure you want to delete this payment?`)) {
			setLoadingId(id)
			try {
				await deletePayment(id)
				toast({ title: t`Payment deleted` })
			} catch (error) {
				console.error('Failed to delete payment:', error)
				toast({
					title: t`Failed to delete payment`,
					description: String(error),
					variant: 'destructive',
				})
			} finally {
				setLoadingId(null)
			}
		}
	}

	const handleMarkPaid = async (id: string) => {
		setLoadingId(id)
		try {
			await markPaymentPaid(id)
			toast({ title: t`Payment marked as paid` })
		} catch (error) {
			console.error('Failed to mark payment as paid:', error)
			toast({
				title: t`Failed to update payment`,
				description: String(error),
				variant: 'destructive',
			})
		} finally {
			setLoadingId(null)
		}
	}

	const getStatusClasses = (status: 'ok' | 'warn' | 'crit') => {
		switch (status) {
			case 'crit':
				return 'bg-red-500/10 border-l-4 border-l-red-500'
			case 'warn':
				return 'bg-yellow-500/10 border-l-4 border-l-yellow-500'
			default:
				return 'bg-green-500/10 border-l-4 border-l-green-500'
		}
	}

	if (payments.length === 0) {
		return (
			<div className="text-center py-8 text-muted-foreground">
				<Trans>No payments added yet. Add a provider first, then add payments.</Trans>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2">
				<span className="text-sm text-muted-foreground">
					<Trans>Sort by</Trans>:
				</span>
				<div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
					<Button
						size="sm"
						variant={sortBy === 'date' ? 'default' : 'ghost'}
						onClick={() => setSortBy('date')}
						className="h-7 px-3"
					>
						<Trans>Date</Trans>
					</Button>
					<Button
						size="sm"
						variant={sortBy === 'price' ? 'default' : 'ghost'}
						onClick={() => setSortBy('price')}
						className="h-7 px-3"
					>
						<Trans>Price</Trans>
					</Button>
				</div>
			</div>

			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>
							<Trans>Server</Trans>
						</TableHead>
						<TableHead>
							<Trans>Provider</Trans>
						</TableHead>
						<TableHead>
							<Trans>Amount</Trans>
						</TableHead>
						<TableHead>
							<Trans>Due Date</Trans>
						</TableHead>
						<TableHead>
							<Trans>Days Left</Trans>
						</TableHead>
						<TableHead className="w-[100px]">
							<Trans>Actions</Trans>
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{sortedPayments.map((payment) => {
						const days = daysUntilPayment(payment.nextPayment)
						const status = getPaymentStatus(days)
						const paymentUrl = getPaymentUrl(payment)

						return (
							<TableRow key={payment.id} className={getStatusClasses(status)}>
								<TableCell className="font-medium">
									<span className="flex items-center gap-1.5" title={payment.notes || undefined}>
										{payment.country && <CountryFlag code={payment.country} />}
										{getServerName(payment.serverId)}
										{payment.notes && (
											<span className="text-xs text-muted-foreground truncate max-w-[120px]">
												({payment.notes})
											</span>
										)}
									</span>
								</TableCell>
								<TableCell>
									{(() => {
										const provider = getProvider(payment.providerId)
										const favicon = getProviderFavicon(payment.providerId)
										const providerName = provider?.name || payment.providerId
										return (
											<Badge
												variant="outline"
												className="gap-1.5 py-1 px-2 font-normal cursor-pointer hover:bg-muted"
												onClick={() => paymentUrl && window.open(paymentUrl, '_blank')}
											>
												{favicon && (
													<img
														src={favicon}
														alt=""
														className="h-4 w-4 rounded-sm"
														onError={(e) => {
															e.currentTarget.style.display = 'none'
														}}
													/>
												)}
												{providerName}
												{paymentUrl && <ExternalLinkIcon className="h-3 w-3 opacity-50" />}
											</Badge>
										)
									})()}
								</TableCell>
								<TableCell>
									<span
										className="font-mono"
										title={
											payment.currency !== 'RUB'
												? `≈ ${formatRub(monthlyRub(payment.amount, payment.currency, payment.period, rates))} ₽/mo`
												: undefined
										}
									>
										{formatRub(payment.amount)} {CURRENCY_SYMBOLS[payment.currency]}/
										{PERIOD_SHORT[payment.period]}
									</span>
								</TableCell>
								<TableCell>{formatDateRu(payment.nextPayment)}</TableCell>
								<TableCell>
									<Badge
										variant={status === 'crit' ? 'destructive' : status === 'warn' ? 'secondary' : 'outline'}
									>
										{Number.isFinite(days) ? `${days} d` : '—'}
									</Badge>
								</TableCell>
								<TableCell>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button variant="ghost" size="icon" className="h-8 w-8" disabled={loadingId === payment.id}>
												{loadingId === payment.id ? (
													<Loader2Icon className="h-4 w-4 animate-spin" />
												) : (
													<MoreHorizontalIcon className="h-4 w-4" />
												)}
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem onClick={() => handleMarkPaid(payment.id)} disabled={loadingId === payment.id}>
												<CheckIcon className="me-2 h-4 w-4 text-green-500" />
												<Trans>Mark Paid</Trans>
											</DropdownMenuItem>
											{paymentUrl && (
												<DropdownMenuItem asChild>
													<a href={paymentUrl} target="_blank" rel="noopener noreferrer">
														<ExternalLinkIcon className="me-2 h-4 w-4 text-blue-500" />
														<Trans>Go to Payment</Trans>
													</a>
												</DropdownMenuItem>
											)}
											<DropdownMenuItem onClick={() => onEditPayment(payment)} disabled={loadingId === payment.id}>
												<PencilIcon className="me-2 h-4 w-4 text-yellow-500" />
												<Trans>Edit</Trans>
											</DropdownMenuItem>
											<DropdownMenuItem
												onClick={() => handleDelete(payment.id)}
												className="text-destructive"
												disabled={loadingId === payment.id}
											>
												<TrashIcon className="me-2 h-4 w-4" />
												<Trans>Delete</Trans>
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</TableCell>
							</TableRow>
						)
					})}
				</TableBody>
			</Table>
		</div>
	)
}
