import { useEffect, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { Loader2Icon } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
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
	const [isSubmitting, setIsSubmitting] = useState(false)

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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsSubmitting(true)

		const providerData = {
			name,
			url,
			currencyDefault: currencyDefault || undefined,
			notes: notes || undefined,
		}

		try {
			if (editProvider) {
				await updateProvider(editProvider.id, providerData)
				toast({ title: t`Provider updated successfully` })
			} else {
				await addProvider(providerData)
				toast({ title: t`Provider added successfully` })
			}
			onOpenChange(false)
		} catch (error) {
			console.error('Failed to save provider:', error)
			toast({
				title: t`Failed to save provider`,
				description: String(error),
				variant: 'destructive',
			})
		} finally {
			setIsSubmitting(false)
		}
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
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
							<Trans>Cancel</Trans>
						</Button>
						<Button type="submit" disabled={!isValid || isSubmitting}>
							{isSubmitting && <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />}
							{editProvider ? <Trans>Save Changes</Trans> : <Trans>Add Provider</Trans>}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
