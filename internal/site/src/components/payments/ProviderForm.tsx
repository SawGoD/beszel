import { useEffect, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { addProvider, updateProvider } from '@/lib/payments/paymentsStore'
import type { Currency, Provider } from '@/lib/payments/paymentsTypes'
import { CURRENCY_SYMBOLS } from '@/lib/payments/paymentsTypes'

interface ProviderFormProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	editProvider?: Provider | null
}

export function ProviderForm({ open, onOpenChange, editProvider }: ProviderFormProps) {
	const { t } = useLingui()

	const [name, setName] = useState('')
	const [url, setUrl] = useState('')
	const [currencyDefault, setCurrencyDefault] = useState<Currency | ''>('')
	const [notes, setNotes] = useState('')

	useEffect(() => {
		if (editProvider) {
			setName(editProvider.name)
			setUrl(editProvider.url)
			setCurrencyDefault(editProvider.currencyDefault || '')
			setNotes(editProvider.notes || '')
		} else {
			// Reset form
			setName('')
			setUrl('')
			setCurrencyDefault('')
			setNotes('')
		}
	}, [editProvider, open])

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		const providerData = {
			name,
			url,
			currencyDefault: currencyDefault || undefined,
			notes: notes || undefined,
		}

		if (editProvider) {
			updateProvider(editProvider.id, providerData)
		} else {
			addProvider(providerData)
		}

		onOpenChange(false)
	}

	const isValid = name && url

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[450px]">
				<DialogHeader>
					<DialogTitle>
						{editProvider ? <Trans>Edit Provider</Trans> : <Trans>Add Provider</Trans>}
					</DialogTitle>
					<DialogDescription>
						<Trans>Add a hosting provider or service for your servers.</Trans>
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="name">
							<Trans>Provider Name</Trans> *
						</Label>
						<Input
							id="name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder={t`e.g., Hetzner, DigitalOcean, AWS`}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="url">
							<Trans>Billing URL</Trans> *
						</Label>
						<Input
							id="url"
							type="url"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							placeholder="https://billing.example.com"
						/>
						<p className="text-xs text-muted-foreground">
							<Trans>URL to access billing/payment page for this provider.</Trans>
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="currency">
							<Trans>Default Currency</Trans>
						</Label>
						<Select
							value={currencyDefault || 'none'}
							onValueChange={(v) => setCurrencyDefault(v === 'none' ? '' : v as Currency)}
						>
							<SelectTrigger>
								<SelectValue placeholder={t`Select currency`} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">
									<Trans>None</Trans>
								</SelectItem>
								{(Object.keys(CURRENCY_SYMBOLS) as Currency[]).map((cur) => (
									<SelectItem key={cur} value={cur}>
										{CURRENCY_SYMBOLS[cur]} {cur}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<p className="text-xs text-muted-foreground">
							<Trans>Auto-select this currency when adding payments for this provider.</Trans>
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="notes">
							<Trans>Notes</Trans>
						</Label>
						<Input
							id="notes"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder={t`Optional notes`}
						/>
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							<Trans>Cancel</Trans>
						</Button>
						<Button type="submit" disabled={!isValid}>
							{editProvider ? <Trans>Save Changes</Trans> : <Trans>Add Provider</Trans>}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
