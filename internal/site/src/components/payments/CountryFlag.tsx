interface CountryFlagProps {
	code: string
	className?: string
}

export function CountryFlag({ code, className = 'h-4 w-5' }: CountryFlagProps) {
	if (!code) return null

	return (
		<img
			src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
			srcSet={`https://flagcdn.com/w80/${code.toLowerCase()}.png 2x`}
			alt={code}
			className={`${className} rounded-sm object-cover`}
			onError={(e) => {
				e.currentTarget.style.display = 'none'
			}}
		/>
	)
}
