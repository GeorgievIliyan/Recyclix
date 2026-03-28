"use client"

import { useRouter } from 'next/navigation'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase-browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Mail, User, MapPin, Globe, MessageSquare, Hash, Phone, CheckCircle2, Loader2, ChevronDown } from 'lucide-react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, SubmitHandler } from 'react-hook-form'
import { getPreferredLanguage } from '@/lib/utils'

// Данни за държави с изображения на знамена
const countries = [
  { code: 'BG', nameKey: 'countries.BG', phoneCode: '+359' },
  { code: 'US', nameKey: 'countries.US', phoneCode: '+1' },
  { code: 'GB', nameKey: 'countries.GB', phoneCode: '+44' },
  { code: 'DE', nameKey: 'countries.DE', phoneCode: '+49' },
  { code: 'FR', nameKey: 'countries.FR', phoneCode: '+33' },
  { code: 'IT', nameKey: 'countries.IT', phoneCode: '+39' },
  { code: 'ES', nameKey: 'countries.ES', phoneCode: '+34' },
  { code: 'RO', nameKey: 'countries.RO', phoneCode: '+40' },
  { code: 'GR', nameKey: 'countries.GR', phoneCode: '+30' },
  { code: 'TR', nameKey: 'countries.TR', phoneCode: '+90' },
  { code: 'NL', nameKey: 'countries.NL', phoneCode: '+31' },
  { code: 'BE', nameKey: 'countries.BE', phoneCode: '+32' },
  { code: 'AT', nameKey: 'countries.AT', phoneCode: '+43' },
  { code: 'CH', nameKey: 'countries.CH', phoneCode: '+41' },
  { code: 'SE', nameKey: 'countries.SE', phoneCode: '+46' },
  { code: 'NO', nameKey: 'countries.NO', phoneCode: '+47' },
  { code: 'DK', nameKey: 'countries.DK', phoneCode: '+45' },
  { code: 'FI', nameKey: 'countries.FI', phoneCode: '+358' },
  { code: 'PL', nameKey: 'countries.PL', phoneCode: '+48' },
  { code: 'CZ', nameKey: 'countries.CZ', phoneCode: '+420' },
  { code: 'HU', nameKey: 'countries.HU', phoneCode: '+36' },
  { code: 'RS', nameKey: 'countries.RS', phoneCode: '+381' },
  { code: 'HR', nameKey: 'countries.HR', phoneCode: '+385' },
  { code: 'SI', nameKey: 'countries.SI', phoneCode: '+386' },
  { code: 'SK', nameKey: 'countries.SK', phoneCode: '+421' },
]

// Типове организации - ТРЯБВА да съвпадат точно с базата данни
const organizationTypes = [
  { value: 'municipality', labelKey: 'requestAccess.form.organizationTypeOptions.municipality' },
  { value: 'school', labelKey: 'requestAccess.form.organizationTypeOptions.school' },
  { value: 'company', labelKey: 'requestAccess.form.organizationTypeOptions.company' },
  { value: 'ngo', labelKey: 'requestAccess.form.organizationTypeOptions.ngo' },
  { value: 'other', labelKey: 'requestAccess.form.organizationTypeOptions.other' },
]

// Кодове на държави за валидация
const countryCodes = countries.map(c => c.code)

// Дефиниране на типа за формата
type FormData = {
  organization_name: string
  organization_type: 'municipality' | 'school' | 'company' | 'ngo' | 'other'
  contact_name: string
  contact_email: string
  intended_bin_count: number
  city: string | null | undefined
  country: string | null | undefined
  message: string
}

// Схемата е дефинирана извън компонента, без преводи, за да се избегне hydration грешка
const formSchema = z.object({
  organization_name: z.string().min(2).max(100),
  organization_type: z.enum(['municipality', 'school', 'company', 'ngo', 'other']),
  contact_name: z.string().min(2).max(100),
  contact_email: z.string().email().max(100),
  intended_bin_count: z.coerce.number().int().min(1).max(10000).default(1),
  city: z.string()
    .max(50)
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
  country: z.string()
    .max(2)
    .refine(code => countryCodes.includes(code))
    .optional()
    .nullable()
    .default('BG'),
  message: z.string().max(1000).default(''),
})

// Персонализиран компонент за падащо меню
interface DropdownProps {
  value: string
  onValueChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  placeholder: string
  className?: string
  error?: string
}

function Dropdown({ value, onValueChange, options, placeholder, className = "", error }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const selectedLabel = options.find(opt => opt.value === value)?.label || placeholder
  
  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-12 text-[15px] bg-background border rounded-md hover:border-muted-foreground/50 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all px-3 flex items-center justify-between ${
          error ? 'border-red-500' : 'border-border'
        }`}
      >
        <span className={`${value ? 'text-foreground' : 'text-muted-foreground'}`}>
          {selectedLabel}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
            {options.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  onValueChange(option.value)
                  setIsOpen(false)
                }}
                className={`px-3 py-2.5 cursor-pointer hover:bg-green-500/10 hover:text-green-500 transition-colors ${
                  value === option.value ? 'bg-green-500/10 text-green-500' : 'text-foreground'
                }`}
              >
                {option.label}
              </div>
            ))}
          </div>
        </>
      )}
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  )
}

// Персонализиран компонент за падащо меню за държави
interface CountryDropdownProps {
  value: string
  onValueChange: (value: string) => void
  type?: 'country' | 'phone'
  placeholder?: string
  className?: string
  error?: string
}

function CountryDropdown({ value, onValueChange, type = 'country', placeholder, className = "", error }: CountryDropdownProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const selectedCountry = countries.find(c => c.code === value)

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-12 text-[15px] bg-background border rounded-md hover:border-muted-foreground/50 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all px-3 flex items-center justify-between ${
          error ? 'border-red-500' : 'border-border'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {selectedCountry && (
            <img
              src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`}
              srcSet={`https://flagcdn.com/w80/${selectedCountry.code.toLowerCase()}.png 2x`}
              alt={`${selectedCountry.code} flag`}
              className="w-6 h-4 object-cover border border-border/50"
            />
          )}
          <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
            {type === 'phone'
              ? selectedCountry?.phoneCode
              : selectedCountry ? t(selectedCountry.nameKey) : placeholder || 'Select country'}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
            {countries.map((country) => (
              <div
                key={country.code}
                onClick={() => {
                  onValueChange(country.code)
                  setIsOpen(false)
                }}
                className={`px-3 py-2.5 cursor-pointer hover:bg-green-500/10 hover:text-green-500 transition-colors ${
                  value === country.code ? 'bg-green-500/10 text-green-500' : 'text-foreground'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`}
                    srcSet={`https://flagcdn.com/w80/${country.code.toLowerCase()}.png 2x`}
                    alt={`${country.code} flag`}
                    className="w-6 h-4 object-cover border border-border/50"
                  />
                  <span>{type === 'phone' ? country.phoneCode : t(country.nameKey)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  )
}

export default function RequestAccessPage() {
  const {t, i18n} = useTranslation()

  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const organizationTypeOptions = organizationTypes.map((item) => ({
    value: item.value,
    label: t(item.labelKey),
  }))

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      organization_name: '',
      organization_type: undefined,
      contact_name: '',
      contact_email: '',
      intended_bin_count: 1,
      city: '',
      country: 'BG',
      message: '',
    },
    mode: 'onChange'
  })

  const organizationType = watch('organization_type')
  const country = watch('country') || 'BG'

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setLoading(true)
    setServerError(null)

    try {
      const { error: supabaseError } = await supabase
        .from('organization_requests')
        .insert({
          organization_name: data.organization_name,
          organization_type: data.organization_type,
          contact_name: data.contact_name,
          contact_email: data.contact_email,
          intended_bin_count: data.intended_bin_count,
          city: data.city || null,
          country: data.country || null,
          message: data.message || '',
          status: 'pending'
        })

      if (supabaseError) {
        console.error('Supabase грешка:', supabaseError)
        setServerError(t('requestAccess.errors.submitError', { error: supabaseError.message }))
        setLoading(false)
        return
      }

      setLoading(false)
      setSubmitted(true)
      
    } catch (err) {
      console.error('Неочаквана грешка:', err)
      setServerError(t('requestAccess.errors.unexpected'))
      setLoading(false)
    }
  }

  // Превеждане на грешките от Zod на клиента
  const getFieldError = (field: keyof FormData, type?: string): string | undefined => {
    const error = errors[field]
    if (!error) return undefined

    switch (field) {
      case 'organization_name':
        return error.type === 'too_small'
          ? t('requestAccess.validation.organizationName.min')
          : t('requestAccess.validation.organizationName.max')
      case 'organization_type':
        return t('requestAccess.validation.organizationType.invalid')
      case 'contact_name':
        return error.type === 'too_small'
          ? t('requestAccess.validation.contactName.min')
          : t('requestAccess.validation.contactName.max')
      case 'contact_email':
        return error.type === 'invalid_string'
          ? t('requestAccess.validation.contactEmail.invalid')
          : t('requestAccess.validation.contactEmail.max')
      case 'intended_bin_count':
        if (error.type === 'too_small') return t('requestAccess.validation.intendedBinCount.min')
        if (error.type === 'too_big') return t('requestAccess.validation.intendedBinCount.max')
        return t('requestAccess.validation.intendedBinCount.int')
      case 'city':
        return t('requestAccess.validation.city.max')
      case 'country':
        return error.type === 'too_big'
          ? t('requestAccess.validation.country.max')
          : t('requestAccess.validation.country.invalid')
      case 'message':
        return t('requestAccess.validation.message.max')
      default:
        return error.message as string
    }
  }

  if (!mounted) return null

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full shadow-lg border-border">
          <CardHeader className="text-center pb-4 pt-8 space-y-3">
            <div className="mx-auto w-18 h-18 bg-green-500/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-semibold text-foreground">
              {t('requestAccess.success.title')}
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground leading-relaxed px-2">
              {t('requestAccess.success.subtitle')}
            </CardDescription>
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/app/dashboard')}
                className="bg-primary text-primary-foreground px-6 py-3 hover:bg-neutral-400 transition duration-200 rounded-lg font-medium w-full"
              >
                {t('requestAccess.success.dashboardButton')}
              </button>
              <button
                onClick={() => router.back()}
                className="bg-primary text-primary-foreground hover:text-white hover:bg-red-500 transition duration-250 px-6 py-3 rounded-lg font-medium w-full"
              >
                {t('requestAccess.success.backButton')}
              </button>
            </div>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-6 sm:py-10 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        {/* Секция за заглавие */}
        <div className="text-center mb-6 sm:mb-8 space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/10 mb-3">
            <Building2 className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-meduim text-foreground tracking-tight text-balance">
            {t('requestAccess.heading.title')}
          </h1>
          <p className="text-base text-muted-foreground max-w-xl mx-auto text-balance">
            {t('requestAccess.heading.subtitle')}
          </p>
        </div>

        {/* Карта с форма */}
        <Card className="shadow-lg border-border border-t-4 border-t-green-500">
          <CardContent className="p-5 sm:p-7 pt-2 sm:pt-3">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Име на организацията */}
              <div className="space-y-2">
                <Label
                  htmlFor="organization_name"
                  className="text-[15px] font-medium text-foreground flex items-center gap-2"
                >
                  <Building2 className="w-[18px] h-[18px] text-green-500" />
                  {t('requestAccess.form.organizationNameLabel')}
                </Label>
                <Input
                  id="organization_name"
                  {...register('organization_name')}
                  required
                  placeholder={t('requestAccess.form.organizationNamePlaceholder')}
                  className={`h-12 text-[15px] bg-background border hover:border-muted-foreground/50 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all ${
                    errors.organization_name ? 'border-red-500' : 'border-border'
                  }`}
                />
                {errors.organization_name && (
                  <p className="text-red-500 text-sm">{getFieldError('organization_name')}</p>
                )}
              </div>

              {/* Тип организация */}
              <div className="space-y-2">
                <Label
                  htmlFor="organization_type"
                  className="text-[15px] font-medium text-foreground flex items-center gap-2"
                >
                  <Building2 className="w-[18px] h-[18px] text-green-500" />
                  {t('requestAccess.form.organizationTypeLabel')}
                </Label>
                <Dropdown
                  value={organizationType || ''}
                  onValueChange={(value) => setValue('organization_type', value as FormData['organization_type'])}
                  options={organizationTypeOptions}
                  placeholder={t('requestAccess.form.organizationTypePlaceholder')}
                  error={getFieldError('organization_type')}
                />
              </div>

              {/* Двуколонен лейаут за контактна информация */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Име на контактно лице */}
                <div className="space-y-2">
                  <Label
                    htmlFor="contact_name"
                    className="text-[15px] font-medium text-foreground flex items-center gap-2"
                  >
                    <User className="w-[18px] h-[18px] text-green-500" />
                    {t('requestAccess.form.contactNameLabel')}
                  </Label>
                  <Input
                    id="contact_name"
                    {...register('contact_name')}
                    required
                    placeholder={t('requestAccess.form.contactNamePlaceholder')}
                    className={`h-12 text-[15px] bg-background border hover:border-muted-foreground/50 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all ${
                      errors.contact_name ? 'border-red-500' : 'border-border'
                    }`}
                  />
                  {errors.contact_name && (
                    <p className="text-red-500 text-sm">{getFieldError('contact_name')}</p>
                  )}
                </div>

                {/* Имейл */}
                <div className="space-y-2">
                  <Label
                    htmlFor="contact_email"
                    className="text-[15px] font-medium text-foreground flex items-center gap-2"
                  >
                    <Mail className="w-[18px] h-[18px] text-green-500" />
                    {t('requestAccess.form.contactEmailLabel')}
                  </Label>
                  <Input
                    id="contact_email"
                    {...register('contact_email')}
                    type="email"
                    required
                    placeholder={t('requestAccess.form.contactEmailPlaceholder')}
                    className={`h-12 text-[15px] bg-background border hover:border-muted-foreground/50 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all ${
                      errors.contact_email ? 'border-red-500' : 'border-border'
                    }`}
                  />
                  {errors.contact_email && (
                    <p className="text-red-500 text-sm">{getFieldError('contact_email')}</p>
                  )}
                </div>
              </div>

              {/* Двуколонен лейаут за информация за местоположение */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Град */}
                <div className="space-y-2">
                  <Label
                    htmlFor="city"
                    className="text-[15px] font-medium text-foreground flex items-center gap-2"
                  >
                    <MapPin className="w-[18px] h-[18px] text-green-500" />
                    {t('requestAccess.form.cityLabel')}
                  </Label>
                  <Input
                    id="city"
                    {...register('city')}
                    placeholder={t('requestAccess.form.cityPlaceholder')}
                    className={`h-12 text-[15px] bg-background border hover:border-muted-foreground/50 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all ${
                      errors.city ? 'border-red-500' : 'border-border'
                    }`}
                  />
                  {errors.city && (
                    <p className="text-red-500 text-sm">{getFieldError('city')}</p>
                  )}
                </div>

                {/* Избор на държава със знамена */}
                <div className="space-y-2">
                  <Label
                    htmlFor="country"
                    className="text-[15px] font-medium text-foreground flex items-center gap-2"
                  >
                    <Globe className="w-[18px] h-[18px] text-green-500" />
                    {t('requestAccess.form.countryLabel')}
                  </Label>
                  <CountryDropdown
                    value={country}
                    onValueChange={(value) => setValue('country', value)}
                    type="country"
                    placeholder={t('requestAccess.form.countryPlaceholder')}
                    error={getFieldError('country')}
                  />
                </div>
              </div>

              {/* Очакван брой кошове */}
              <div className="space-y-2">
                <Label
                  htmlFor="intended_bin_count"
                  className="text-[15px] font-medium text-foreground flex items-center gap-2"
                >
                  <Hash className="w-[18px] h-[18px] text-green-500" />
                  {t('requestAccess.form.intendedBinCountLabel')}
                </Label>
                <Input
                  id="intended_bin_count"
                  {...register('intended_bin_count', { valueAsNumber: true })}
                  type="number"
                  min={1}
                  required
                  placeholder={t('requestAccess.form.intendedBinCountPlaceholder')}
                  className={`h-12 text-[15px] bg-background border hover:border-muted-foreground/50 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all ${
                    errors.intended_bin_count ? 'border-red-500' : 'border-border'
                  }`}
                />
                {errors.intended_bin_count && (
                  <p className="text-red-500 text-sm">{getFieldError('intended_bin_count')}</p>
                )}
              </div>

              {/* Съобщение */}
              <div className="space-y-2">
                <Label
                  htmlFor="message"
                  className="text-[15px] font-medium text-foreground flex items-center gap-2"
                >
                  <MessageSquare className="w-[18px] h-[18px] text-green-500" />
                  {t('requestAccess.form.messageLabel')}
                </Label>
                <Textarea
                  id="message"
                  {...register('message')}
                  placeholder={t('requestAccess.form.messagePlaceholder')}
                  rows={4}
                  className={`text-[15px] bg-background border hover:border-muted-foreground/50 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all resize-none py-3 ${
                    errors.message ? 'border-red-500' : 'border-border'
                  }`}
                />
                {errors.message && (
                  <p className="text-red-500 text-sm">{getFieldError('message')}</p>
                )}
              </div>

              {/* Съобщение за грешка от сървъра */}
              {serverError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm">{serverError}</p>
                </div>
              )}

              {/* Бутон за изпращане */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold text-[15px] transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('requestAccess.form.button.sending')}
                  </span>
                ) : (
                  t('requestAccess.form.button.submit')
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Бележка в долната част */}
        <p className="text-center text-[13px] text-muted-foreground mt-5">
          {t('requestAccess.form.requiredFieldsNotice', { asterisk: '*' })}
        </p>
      </div>
    </div>
  )
}