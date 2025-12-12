import { useStore } from "@nanostores/react"
import { useMemo, useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
	ArrowDownIcon,
	ArrowUpDownIcon,
	ArrowUpIcon,
	CheckIcon,
	ExternalLinkIcon,
	Loader2Icon,
	MoreHorizontalIcon,
	PencilIcon,
	TrashIcon,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
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

interface PaymentsTableProps {
	onEditPayment: (payment: PaymentEntry) => void
}

type SortKey = "amount" | "date" | "days"
type SortOrder = "asc" | "desc"

export function PaymentsTable({ onEditPayment }: PaymentsTableProps) {
	const { t } = useLingui()
	const payments = useStore($payments)
	const providers = useStore($providers)
	const rates = useStore($rates)
	const systems = useStore($systems)

	const [sortBy, setSortBy] = useState<SortKey>("date")
	const [sortOrder, setSortOrder] = useState<SortOrder>("asc")
	const [serverFilter, setServerFilter] = useState("")
	const [providerFilter, setProviderFilter] = useState("")
	const [loadingId, setLoadingId] = useState<string | null>(null)

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

	const filteredAndSortedPayments = useMemo(() => {
		let arr = [...payments]

		// Apply filters
		if (serverFilter) {
			const filter = serverFilter.toLowerCase()
			arr = arr.filter((p) => {
				const serverName = getServerName(p.serverId).toLowerCase()
				return serverName.includes(filter)
			})
		}
		if (providerFilter) {
			const filter = providerFilter.toLowerCase()
			arr = arr.filter((p) => {
				const provider = getProvider(p.providerId)
				const providerName = (provider?.name || p.providerId).toLowerCase()
				return providerName.includes(filter)
			})
		}

		// Apply sorting
		arr.sort((a, b) => {
			let cmp = 0
			switch (sortBy) {
				case "amount":
					cmp = monthlyRub(a.amount, a.currency, a.period, rates) - monthlyRub(b.amount, b.currency, b.period, rates)
					break
				case "date":
					cmp = new Date(a.nextPayment).getTime() - new Date(b.nextPayment).getTime()
					break
				case "days":
					cmp = daysUntilPayment(a.nextPayment) - daysUntilPayment(b.nextPayment)
					break
			}
			return sortOrder === "asc" ? cmp : -cmp
		})

		return arr
	}, [payments, sortBy, sortOrder, serverFilter, providerFilter, rates, systems, providers])

	const handleSort = (key: SortKey) => {
		if (sortBy === key) {
			setSortOrder(sortOrder === "asc" ? "desc" : "asc")
		} else {
			setSortBy(key)
			setSortOrder("asc")
		}
	}

	const SortIcon = ({ column }: { column: SortKey }) => {
		if (sortBy !== column) {
			return <ArrowUpDownIcon className="h-4 w-4 opacity-50" />
		}
		return sortOrder === "asc" ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />
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

	const getStatusClasses = (status: "ok" | "warn" | "crit") => {
		switch (status) {
			case "crit":
				return "bg-red-500/10"
			case "warn":
				return "bg-yellow-500/10"
			default:
				return "bg-green-500/10"
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
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>
							<Input
								placeholder={t`Server`}
								value={serverFilter}
								onChange={(e) => setServerFilter(e.target.value)}
								className="h-8 text-xs min-w-[120px]"
							/>
						</TableHead>
						<TableHead>
							<Input
								placeholder={t`Provider`}
								value={providerFilter}
								onChange={(e) => setProviderFilter(e.target.value)}
								className="h-8 text-xs min-w-[120px]"
							/>
						</TableHead>
						<TableHead>
							<Button
								variant="ghost"
								size="sm"
								className="h-8 px-2 -ml-2 font-medium"
								onClick={() => handleSort("amount")}
							>
								<Trans>Amount</Trans>
								<SortIcon column="amount" />
							</Button>
						</TableHead>
						<TableHead>
							<Button
								variant="ghost"
								size="sm"
								className="h-8 px-2 -ml-2 font-medium"
								onClick={() => handleSort("date")}
							>
								<Trans>Due Date</Trans>
								<SortIcon column="date" />
							</Button>
						</TableHead>
						<TableHead>
							<Button
								variant="ghost"
								size="sm"
								className="h-8 px-2 -ml-2 font-medium"
								onClick={() => handleSort("days")}
							>
								<Trans>Days Left</Trans>
								<SortIcon column="days" />
							</Button>
						</TableHead>
						<TableHead className="w-[50px]" />
					</TableRow>
				</TableHeader>
				<TableBody>
					{filteredAndSortedPayments.map((payment) => {
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
											<span className="text-xs text-muted-foreground truncate max-w-[120px]">({payment.notes})</span>
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
												onClick={() => paymentUrl && window.open(paymentUrl, "_blank")}
											>
												{favicon && (
													<img
														src={favicon}
														alt=""
														className="h-4 w-4 rounded-sm"
														onError={(e) => {
															e.currentTarget.style.display = "none"
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
											payment.currency === "RUB"
												? `≈ $${formatRub(rubToUsd(payment.amount, rates))} | €${formatRub(rubToEur(payment.amount, rates))}`
												: `≈ ${formatRub(monthlyRub(payment.amount, payment.currency, payment.period, rates))} ₽/mo`
										}
									>
										{formatRub(payment.amount)} {CURRENCY_SYMBOLS[payment.currency]}/{PERIOD_SHORT[payment.period]}
									</span>
								</TableCell>
								<TableCell>{formatDateRu(payment.nextPayment)}</TableCell>
								<TableCell>
									<Badge variant={status === "crit" ? "destructive" : status === "warn" ? "secondary" : "outline"}>
										{Number.isFinite(days) ? `${days} d` : "—"}
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
