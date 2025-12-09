import { useStore } from '@nanostores/react'
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
import { $payments, $providers, addPayment, updatePayment } from '@/lib/payments/paymentsStore'
import { extractDomain, getFaviconUrl } from '@/lib/payments/currency'
import { $systems } from '@/lib/stores'
import type { Currency, PaymentEntry, PaymentPeriod } from '@/lib/payments/paymentsTypes'
import { CURRENCY_SYMBOLS, PERIOD_LABELS } from '@/lib/payments/paymentsTypes'

interface PaymentFormProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	editPayment?: PaymentEntry | null
}

export function PaymentForm({ open, onOpenChange, editPayment }: PaymentFormProps) {
	const { t } = useLingui()
	const providers = useStore($providers)
	const payments = useStore($payments)
	const systems = useStore($systems)

	// Get set of server IDs that already have payments (excluding current edit)
	const usedServerIds = new Set(
		payments
			.filter((p) => !editPayment || p.id !== editPayment.id)
			.map((p) => p.serverId)
	)

	const [serverId, setServerId] = useState('')
	const [providerId, setProviderId] = useState('')
	const [amount, setAmount] = useState('')
	const [currency, setCurrency] = useState<Currency>('RUB')
	const [period, setPeriod] = useState<PaymentPeriod>('monthly')
	const [nextPayment, setNextPayment] = useState('')
	const [providerUrlOverride, setProviderUrlOverride] = useState('')
	const [notes, setNotes] = useState('')

	useEffect(() => {
		if (editPayment) {
			setServerId(editPayment.serverId)
			setProviderId(editPayment.providerId)
			setAmount(String(editPayment.amount))
			setCurrency(editPayment.currency)
			setPeriod(editPayment.period)
			setNextPayment(editPayment.nextPayment)
			setProviderUrlOverride(editPayment.providerUrlOverride || '')
			setNotes(editPayment.notes || '')
		} else {
			// Reset form
			setServerId('')
			setProviderId('')
			setAmount('')
			setCurrency('RUB')
			setPeriod('monthly')
			setNextPayment('')
			setProviderUrlOverride('')
			setNotes('')
		}
	}, [editPayment, open])

	// Auto-set currency from provider default
	useEffect(() => {
		if (providerId && !editPayment) {
			const provider = providers.find((p) => p.id === providerId)
			if (provider?.currencyDefault) {
				setCurrency(provider.currencyDefault)
			}
		}
	}, [providerId, providers, editPayment])

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		const paymentData = {
			serverId,
			providerId,
			amount: parseFloat(amount),
			currency,
			period,
			nextPayment,
			providerUrlOverride: providerUrlOverride || undefined,
			notes: notes || undefined,
		}

		if (editPayment) {
			updatePayment(editPayment.id, paymentData)
		} else {
			addPayment(paymentData)
		}

		onOpenChange(false)
	}

	const isValid = serverId && providerId && amount && parseFloat(amount) > 0 && nextPayment

	const getProviderFavicon = (url: string | undefined) => {
		if (!url) return null
		const domain = extractDomain(url)
		if (!domain) return null
		return getFaviconUrl(domain)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>
						{editPayment ? <Trans>Edit Payment</Trans> : <Trans>Add Payment</Trans>}
					</DialogTitle>
					<DialogDescription>
						<Trans>Link a payment to a server and provider.</Trans>
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="server">
								<Trans>Server</Trans> *
							</Label>
							<Select value={serverId} onValueChange={setServerId}>
								<SelectTrigger>
									<SelectValue placeholder={t`Select server`} />
								</SelectTrigger>
								<SelectContent>
									{systems.map((system) => {
										const isUsed = usedServerIds.has(system.id)
										return (
											<SelectItem
												key={system.id}
												value={system.id}
												disabled={isUsed}
												className={isUsed ? 'opacity-50' : ''}
											>
												{system.name}
												{isUsed && <span className="ml-2 text-xs text-muted-foreground">(<Trans>already added</Trans>)</span>}
											</SelectItem>
										)
									})}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="provider">
								<Trans>Provider</Trans> *
							</Label>
							<Select value={providerId} onValueChange={setProviderId}>
								<SelectTrigger>
									<SelectValue placeholder={t`Select provider`} />
								</SelectTrigger>
								<SelectContent>
									{providers.map((provider) => {
										const favicon = getProviderFavicon(provider.url)
										return (
											<SelectItem key={provider.id} value={provider.id}>
												<span className="flex items-center gap-2">
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
													{provider.name}
												</span>
											</SelectItem>
										)
									})}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="space-y-2 col-span-2">
							<Label htmlFor="amount">
								<Trans>Amount</Trans> *
							</Label>
							<Input
								id="amount"
								type="number"
								step="0.01"
								min="0"
								value={amount}
								onChange={(e) => setAmount(e.target.value)}
								placeholder="99.99"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="currency">
								<Trans>Currency</Trans>
							</Label>
							<Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{(Object.keys(CURRENCY_SYMBOLS) as Currency[]).map((cur) => (
										<SelectItem key={cur} value={cur}>
											{CURRENCY_SYMBOLS[cur]} {cur}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="period">
								<Trans>Period</Trans>
							</Label>
							<Select value={period} onValueChange={(v) => setPeriod(v as PaymentPeriod)}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{(Object.keys(PERIOD_LABELS) as PaymentPeriod[]).map((p) => (
										<SelectItem key={p} value={p}>
											{PERIOD_LABELS[p]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="nextPayment">
								<Trans>Next Payment Date</Trans> *
							</Label>
							<Input
								id="nextPayment"
								type="date"
								value={nextPayment}
								onChange={(e) => setNextPayment(e.target.value)}
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="urlOverride">
							<Trans>Payment URL Override</Trans>
						</Label>
						<Input
							id="urlOverride"
							type="url"
							value={providerUrlOverride}
							onChange={(e) => setProviderUrlOverride(e.target.value)}
							placeholder="https://billing.example.com/invoice/123"
						/>
						<p className="text-xs text-muted-foreground">
							<Trans>Optional. Override the provider URL for this specific payment.</Trans>
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
							{editPayment ? <Trans>Save Changes</Trans> : <Trans>Add Payment</Trans>}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
