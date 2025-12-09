import { useStore } from '@nanostores/react'
import { memo, useEffect, useRef, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CalendarIcon, DownloadIcon, PlusIcon, UploadIcon } from 'lucide-react'
import { FooterRepoLink } from '@/components/footer-repo-link'
import {
	PaymentsStats,
	PaymentsTable,
	PaymentsCalendar,
	PaymentsMobileCards,
	PaymentForm,
	ProviderForm,
	ProvidersList,
} from '@/components/payments'
import {
	$rates,
	$ratesLoading,
	exportPaymentsData,
	importPaymentsData,
} from '@/lib/payments/paymentsStore'
import { loadRates, formatRub } from '@/lib/payments/currency'
import type { PaymentEntry, Provider } from '@/lib/payments/paymentsTypes'

export default memo(() => {
	const { t } = useLingui()
	const rates = useStore($rates)
	const ratesLoading = useStore($ratesLoading)

	const [paymentFormOpen, setPaymentFormOpen] = useState(false)
	const [providerFormOpen, setProviderFormOpen] = useState(false)
	const [editingPayment, setEditingPayment] = useState<PaymentEntry | null>(null)
	const [editingProvider, setEditingProvider] = useState<Provider | null>(null)

	const fileInputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		document.title = `${t`Payments`} / Beszel`
		// Load exchange rates on mount
		loadRates()
	}, [t])

	const handleEditPayment = (payment: PaymentEntry) => {
		setEditingPayment(payment)
		setPaymentFormOpen(true)
	}

	const handleEditProvider = (provider: Provider) => {
		setEditingProvider(provider)
		setProviderFormOpen(true)
	}

	const handlePaymentFormClose = (open: boolean) => {
		setPaymentFormOpen(open)
		if (!open) setEditingPayment(null)
	}

	const handleProviderFormClose = (open: boolean) => {
		setProviderFormOpen(open)
		if (!open) setEditingProvider(null)
	}

	const handleExport = () => {
		const data = exportPaymentsData()
		const blob = new Blob([data], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `beszel-payments-${new Date().toISOString().split('T')[0]}.json`
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
		URL.revokeObjectURL(url)
	}

	const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return

		const reader = new FileReader()
		reader.onload = (event) => {
			const content = event.target?.result as string
			if (importPaymentsData(content)) {
				alert(t`Import successful!`)
			} else {
				alert(t`Import failed. Please check the file format.`)
			}
		}
		reader.readAsText(file)

		// Reset input
		if (fileInputRef.current) {
			fileInputRef.current.value = ''
		}
	}

	return (
		<>
			<div className="flex flex-col gap-4">
				{/* Header */}
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<div>
						<h1 className="text-2xl font-bold">
							<Trans>Payments</Trans>
						</h1>
						<p className="text-muted-foreground">
							<Trans>Track server payments and billing schedules</Trans>
						</p>
					</div>

					<div className="flex items-center gap-2">
						<Badge variant="outline" className="text-xs">
							{ratesLoading ? (
								<Trans>Loading rates...</Trans>
							) : rates.source === 'cbr' ? (
								<>
									$ {formatRub(rates.USD)} ₽ | € {formatRub(rates.EUR)} ₽
								</>
							) : (
								<Trans>Fallback rates</Trans>
							)}
						</Badge>

						<Button variant="outline" size="sm" onClick={handleExport}>
							<DownloadIcon className="h-4 w-4 me-1" />
							<Trans>Export</Trans>
						</Button>

						<Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
							<UploadIcon className="h-4 w-4 me-1" />
							<Trans>Import</Trans>
						</Button>
						<input
							ref={fileInputRef}
							type="file"
							accept="application/json"
							className="hidden"
							onChange={handleImport}
						/>
					</div>
				</div>

				{/* Stats */}
				<PaymentsStats />

				{/* Main content */}
				<Tabs defaultValue="payments" className="space-y-4">
					<TabsList>
						<TabsTrigger value="payments">
							<Trans>Payments</Trans>
						</TabsTrigger>
						<TabsTrigger value="calendar">
							<CalendarIcon className="h-4 w-4 me-1" />
							<Trans>Calendar</Trans>
						</TabsTrigger>
						<TabsTrigger value="providers">
							<Trans>Providers</Trans>
						</TabsTrigger>
					</TabsList>

					<TabsContent value="payments">
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
								<div>
									<CardTitle className="text-lg">
										<Trans>Payment Schedule</Trans>
									</CardTitle>
									<CardDescription className="hidden sm:block">
										<Trans>All scheduled payments sorted by due date</Trans>
									</CardDescription>
								</div>
								<Button onClick={() => setPaymentFormOpen(true)}>
									<PlusIcon className="h-4 w-4 me-1" />
									<span className="hidden sm:inline"><Trans>Add Payment</Trans></span>
									<span className="sm:hidden"><Trans>Add</Trans></span>
								</Button>
							</CardHeader>
							<CardContent>
								{/* Desktop: Table view */}
								<div className="hidden md:block">
									<PaymentsTable onEditPayment={handleEditPayment} />
								</div>
								{/* Mobile: Card view */}
								<div className="md:hidden">
									<PaymentsMobileCards onEditPayment={handleEditPayment} sortBy="date" />
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="calendar">
						<Card>
							<CardHeader>
								<CardTitle className="text-lg">
									<Trans>Payment Calendar</Trans>
								</CardTitle>
								<CardDescription>
									<Trans>View all scheduled payments on a calendar</Trans>
								</CardDescription>
							</CardHeader>
							<CardContent>
								<PaymentsCalendar onEditPayment={handleEditPayment} />
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="providers">
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
								<div>
									<CardTitle className="text-lg">
										<Trans>Providers</Trans>
									</CardTitle>
									<CardDescription>
										<Trans>Manage your hosting providers</Trans>
									</CardDescription>
								</div>
								<Button onClick={() => setProviderFormOpen(true)}>
									<PlusIcon className="h-4 w-4 me-1" />
									<Trans>Add Provider</Trans>
								</Button>
							</CardHeader>
							<CardContent>
								<ProvidersList onEditProvider={handleEditProvider} />
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>

			{/* Dialogs */}
			<PaymentForm
				open={paymentFormOpen}
				onOpenChange={handlePaymentFormClose}
				editPayment={editingPayment}
			/>

			<ProviderForm
				open={providerFormOpen}
				onOpenChange={handleProviderFormClose}
				editProvider={editingProvider}
			/>

			<FooterRepoLink />
		</>
	)
})
