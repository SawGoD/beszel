import { useStore } from '@nanostores/react'
import { Trans, useLingui } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ExternalLinkIcon, MoreHorizontalIcon, PencilIcon, TrashIcon } from 'lucide-react'
import { $providers, $payments, deleteProvider } from '@/lib/payments/paymentsStore'
import { extractDomain, getFaviconUrl } from '@/lib/payments/currency'
import type { Provider } from '@/lib/payments/paymentsTypes'
import { CURRENCY_SYMBOLS } from '@/lib/payments/paymentsTypes'

interface ProvidersListProps {
	onEditProvider: (provider: Provider) => void
}

export function ProvidersList({ onEditProvider }: ProvidersListProps) {
	const { t } = useLingui()
	const providers = useStore($providers)
	const payments = useStore($payments)

	const getPaymentCount = (providerId: string) => {
		return payments.filter((p) => p.providerId === providerId).length
	}

	const handleDelete = (provider: Provider) => {
		const count = getPaymentCount(provider.id)
		const message =
			count > 0
				? t`This will also delete ${count} payment(s) linked to this provider. Are you sure?`
				: t`Are you sure you want to delete this provider?`

		if (confirm(message)) {
			deleteProvider(provider.id)
		}
	}

	if (providers.length === 0) {
		return (
			<div className="text-center py-8 text-muted-foreground">
				<Trans>No providers added yet. Add your first hosting provider.</Trans>
			</div>
		)
	}

	const getProviderFavicon = (url: string | undefined) => {
		if (!url) return null
		const domain = extractDomain(url)
		if (!domain) return null
		return getFaviconUrl(domain)
	}

	return (
		<div className="space-y-2">
			{providers.map((provider) => {
				const paymentCount = getPaymentCount(provider.id)
				const favicon = getProviderFavicon(provider.url)

				return (
					<div
						key={provider.id}
						className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
					>
						<div className="flex items-center gap-3">
							{favicon && (
								<img
									src={favicon}
									alt=""
									className="h-6 w-6 rounded"
									onError={(e) => {
										e.currentTarget.style.display = 'none'
									}}
								/>
							)}
							<div>
								<div className="font-medium flex items-center gap-2">
									{provider.name}
									{provider.url && (
										<a
											href={provider.url}
											target="_blank"
											rel="noopener noreferrer"
											className="text-muted-foreground hover:text-foreground"
										>
											<ExternalLinkIcon className="h-3.5 w-3.5" />
										</a>
									)}
								</div>
								<div className="text-sm text-muted-foreground flex items-center gap-2">
									{paymentCount > 0 && (
										<Badge variant="secondary" className="text-xs">
											{paymentCount} <Trans>payments</Trans>
										</Badge>
									)}
									{provider.currencyDefault && (
										<Badge variant="outline" className="text-xs">
											{CURRENCY_SYMBOLS[provider.currencyDefault]} {provider.currencyDefault}
										</Badge>
									)}
								</div>
							</div>
						</div>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon" className="h-8 w-8">
									<MoreHorizontalIcon className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								{provider.url && (
									<DropdownMenuItem asChild>
										<a href={provider.url} target="_blank" rel="noopener noreferrer">
											<ExternalLinkIcon className="me-2 h-4 w-4 text-blue-500" />
											<Trans>Open Billing</Trans>
										</a>
									</DropdownMenuItem>
								)}
								<DropdownMenuItem onClick={() => onEditProvider(provider)}>
									<PencilIcon className="me-2 h-4 w-4 text-yellow-500" />
									<Trans>Edit</Trans>
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => handleDelete(provider)} className="text-destructive">
									<TrashIcon className="me-2 h-4 w-4" />
									<Trans>Delete</Trans>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				)
			})}
		</div>
	)
}
