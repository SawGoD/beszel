import { useStore } from "@nanostores/react"
import { useMemo, useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { toast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { CheckIcon, ExternalLinkIcon, Loader2Icon, MoreVerticalIcon, PencilIcon, TrashIcon } from "lucide-react"
import { $payments, $providers, $rates, deletePayment, markPaymentPaid } from "@/lib/payments/paymentsStore"
import { $systems } from "@/lib/stores"
import {
	daysUntilPayment,
	extractDomain,
	formatDateRu,
	formatRub,
	getFaviconUrl,
	getPaymentStatus,
	monthlyRub,
	rubToUsd,
	rubToEur,
} from "@/lib/payments/currency"
import { CURRENCY_SYMBOLS, PERIOD_SHORT, type PaymentEntry } from "@/lib/payments/paymentsTypes"
import { CountryFlag } from "./CountryFlag"
import { cn } from "@/lib/utils"

interface PaymentsMobileCardsProps {
	onEditPayment: (payment: PaymentEntry) => void
	sortBy: "date" | "price"
}

export function PaymentsMobileCards({ onEditPayment, sortBy }: PaymentsMobileCardsProps) {
	const { t } = useLingui()
	const payments = useStore($payments)
	const providers = useStore($providers)
	const rates = useStore($rates)
	const systems = useStore($systems)
	const [loadingId, setLoadingId] = useState<string | null>(null)

	const sortedPayments = useMemo(() => {
		const arr = [...payments]
		if (sortBy === "date") {
			arr.sort((a, b) => new Date(a.nextPayment).getTime() - new Date(b.nextPayment).getTime())
		} else if (sortBy === "price") {
			arr.sort(
				(a, b) => monthlyRub(a.amount, a.currency, a.period, rates) - monthlyRub(b.amount, b.currency, b.period, rates)
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
		return provider?.url || ""
	}

	const handleDelete = async (id: string) => {
		if (confirm(t`Are you sure you want to delete this payment?`)) {
			setLoadingId(id)
			try {
				await deletePayment(id)
				toast({ title: t`Payment deleted` })
			} catch (error) {
				console.error("Failed to delete payment:", error)
				toast({
					title: t`Failed to delete payment`,
					description: String(error),
					variant: "destructive",
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
			console.error("Failed to mark payment as paid:", error)
			toast({
				title: t`Failed to update payment`,
				description: String(error),
				variant: "destructive",
			})
		} finally {
			setLoadingId(null)
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
		<div className="space-y-3">
			{sortedPayments.map((payment) => {
				const days = daysUntilPayment(payment.nextPayment)
				const status = getPaymentStatus(days)
				const paymentUrl = getPaymentUrl(payment)
				const provider = getProvider(payment.providerId)
				const favicon = getProviderFavicon(payment.providerId)

				return (
					<div
						key={payment.id}
						className={cn(
							"rounded-xl p-4 border transition-all",
							status === "crit" && "bg-red-500/10",
							status === "warn" && "bg-yellow-500/10",
							status === "ok" && "bg-green-500/10"
						)}
					>
						{/* Header: Server name + Actions */}
						<div className="flex items-start justify-between gap-2 mb-3">
							<div className="flex items-center gap-2 min-w-0 flex-1">
								{payment.country && <CountryFlag code={payment.country} className="h-4 w-5 shrink-0" />}
								{favicon && (
									<img
										src={favicon}
										alt=""
										className="h-4 w-4 rounded-sm shrink-0"
										onError={(e) => {
											e.currentTarget.style.display = "none"
										}}
									/>
								)}
								<span className="font-semibold truncate">{getServerName(payment.serverId)}</span>
								{payment.notes && <span className="text-xs text-muted-foreground truncate">({payment.notes})</span>}
							</div>

							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={loadingId === payment.id}>
										{loadingId === payment.id ? (
											<Loader2Icon className="h-4 w-4 animate-spin" />
										) : (
											<MoreVerticalIcon className="h-4 w-4" />
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
						</div>

						{/* Provider */}
						<div className="flex items-center gap-2 mb-3">
							<Badge
								variant="outline"
								className="gap-1.5 py-1 px-2 font-normal cursor-pointer hover:bg-muted"
								onClick={() => paymentUrl && window.open(paymentUrl, "_blank")}
							>
								{favicon && (
									<img
										src={favicon}
										alt=""
										className="h-3 w-3 rounded-sm"
										onError={(e) => {
											e.currentTarget.style.display = "none"
										}}
									/>
								)}
								{provider?.name || payment.providerId}
								{paymentUrl && <ExternalLinkIcon className="h-3 w-3 opacity-50" />}
							</Badge>
						</div>

						{/* Footer: Price + Date + Days */}
						<div className="flex items-center justify-between gap-2 text-sm">
							<div className="flex items-center gap-3">
								<span
									className="font-mono font-semibold"
									title={
										payment.currency === "RUB"
											? `≈ $${formatRub(rubToUsd(payment.amount, rates))} | €${formatRub(rubToEur(payment.amount, rates))}`
											: `≈ ${formatRub(monthlyRub(payment.amount, payment.currency, payment.period, rates))} ₽/mo`
									}
								>
									{formatRub(payment.amount)} {CURRENCY_SYMBOLS[payment.currency]}/{PERIOD_SHORT[payment.period]}
								</span>
								<span className="text-muted-foreground">{formatDateRu(payment.nextPayment)}</span>
							</div>
							<Badge variant={status === "crit" ? "destructive" : status === "warn" ? "secondary" : "outline"}>
								{Number.isFinite(days) ? `${days} d` : "—"}
							</Badge>
						</div>
					</div>
				)
			})}
		</div>
	)
}
