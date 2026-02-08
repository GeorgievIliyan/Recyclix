"use client"

import { useRouter } from 'next/navigation'
import { useState } from 'react'
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

// Данни за държави с изображения на знамена
const countries = [
  { code: 'BG', name: 'България', phoneCode: '+359' },
  { code: 'US', name: 'Съединени щати', phoneCode: '+1' },
  { code: 'GB', name: 'Обединено кралство', phoneCode: '+44' },
  { code: 'DE', name: 'Германия', phoneCode: '+49' },
  { code: 'FR', name: 'Франция', phoneCode: '+33' },
  { code: 'IT', name: 'Италия', phoneCode: '+39' },
  { code: 'ES', name: 'Испания', phoneCode: '+34' },
  { code: 'RO', name: 'Румъния', phoneCode: '+40' },
  { code: 'GR', name: 'Гърция', phoneCode: '+30' },
  { code: 'TR', name: 'Турция', phoneCode: '+90' },
  { code: 'NL', name: 'Нидерландия', phoneCode: '+31' },
  { code: 'BE', name: 'Белгия', phoneCode: '+32' },
  { code: 'AT', name: 'Австрия', phoneCode: '+43' },
  { code: 'CH', name: 'Швейцария', phoneCode: '+41' },
  { code: 'SE', name: 'Швеция', phoneCode: '+46' },
  { code: 'NO', name: 'Норвегия', phoneCode: '+47' },
  { code: 'DK', name: 'Дания', phoneCode: '+45' },
  { code: 'FI', name: 'Финландия', phoneCode: '+358' },
  { code: 'PL', name: 'Полша', phoneCode: '+48' },
  { code: 'CZ', name: 'Чехия', phoneCode: '+420' },
  { code: 'HU', name: 'Унгария', phoneCode: '+36' },
  { code: 'RS', name: 'Сърбия', phoneCode: '+381' },
  { code: 'HR', name: 'Хърватия', phoneCode: '+385' },
  { code: 'SI', name: 'Словения', phoneCode: '+386' },
  { code: 'SK', name: 'Словакия', phoneCode: '+421' },
]

// Типове организации - ТРЯБВА да съвпадат точно с базата данни
const organizationTypes = [
  { value: 'municipality', label: 'Община' },
  { value: 'school', label: 'Училище' },
  { value: 'company', label: 'Компания' },
  { value: 'other', label: 'Друго' },
]

// Кодове на държави за валидация
const countryCodes = countries.map(c => c.code)

const formSchema = z.object({
  organization_name: z.string()
    .min(2, 'Името на организацията трябва да е поне 2 символа')
    .max(100, 'Името на организацията не може да бъде повече от 100 символа'),
  
  organization_type: z.enum(['municipality', 'school', 'company', 'ngo', 'other'], {
    errorMap: () => ({ message: 'Моля, изберете валиден тип организация' })
  } as any),
  
  contact_name: z.string()
    .min(2, 'Името трябва да е поне 2 символа')
    .max(100, 'Името не може да бъде повече от 100 символа'),
  
  contact_email: z.string()
    .email('Моля, въведете валиден имейл адрес')
    .max(100, 'Имейлът не може да бъде повече от 100 символа'),
  
  intended_bin_count: z.coerce.number()
    .int('Броят кошове трябва да е цяло число')
    .min(1, 'Минималният брой кошове е 1')
    .max(10000, 'Максималният брой кошове е 10,000')
    .default(1),
  
  city: z.string()
    .max(50, 'Градът не може да бъде повече от 50 символа')
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
  
  country: z.string()
    .max(2, 'Невалиден код на държава')
    .refine(code => countryCodes.includes(code), 'Моля, изберете валидна държава')
    .optional()
    .nullable()
    .default('BG'),
  
  message: z.string()
    .max(1000, 'Съобщението не може да бъде повече от 1000 символа')
    .default('')
})

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
        className={`w-full h-12 text-[15px] bg-neutral-100 dark:bg-neutral-800 border rounded-md hover:border-muted-foreground/50 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all px-3 flex items-center justify-between ${
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
          <div className="absolute z-50 w-full mt-1 bg-neutral-100 dark:bg-neutral-800 border border-border rounded-md shadow-lg max-h-60 overflow-auto">
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
  className?: string
  error?: string
}

function CountryDropdown({ value, onValueChange, type = 'country', className = "", error }: CountryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const selectedCountry = countries.find(c => c.code === value)
  
  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-12 text-[15px] bg-neutral-100 dark:bg-neutral-800 border rounded-md hover:border-muted-foreground/50 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all px-3 flex items-center justify-between ${
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
          <span className="text-foreground">
            {type === 'phone' 
              ? selectedCountry?.phoneCode 
              : selectedCountry?.name || 'Изберете държава'}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
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
                  <span>{type === 'phone' ? country.phoneCode : country.name}</span>
                </div>
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

export default function RequestAccessPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

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
        setServerError(`Грешка при изпращане: ${supabaseError.message}`)
        setLoading(false)
        return
      }

      setLoading(false)
      setSubmitted(true)
      
    } catch (err) {
      console.error('Неочаквана грешка:', err)
      setServerError('Възникна неочаквана грешка. Моля, опитайте отново.')
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full shadow-lg border-border">
          <CardHeader className="text-center pb-4 pt-8 space-y-3">
            <div className="mx-auto w-18 h-18 bg-green-500/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-semibold text-foreground">
              Заявката е изпратена
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground leading-relaxed px-2">
              Ще прегледаме вашата заявка и ще се свържем с вас по имейл в най-кратък срок.
            </CardDescription>
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/app/dashboard')}
                className="bg-primary text-primary-foreground px-6 py-3 hover:bg-neutral-400 transition duration-250 rounded-lg font-medium w-full"
              >
                Начално табло
              </button>
              <button
                onClick={() => router.back()}
                className="bg-primary text-primary-foreground hover:text-white hover:bg-red-500 transition duration-250 px-6 py-3 rounded-lg font-medium w-full"
              >
                Назад
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/10 ring-4 ring-green-500/5 mb-1">
            <Building2 className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight text-balance">
            Поискайте достъп до <span className="text-green-500">Recyclix</span>
          </h1>
          <p className="text-base text-muted-foreground max-w-xl mx-auto text-balance">
            Попълнете формуляра по-долу и нашият екип ще се <span className="text-green-500 font-medium">свърже с вас скоро</span>
          </p>
        </div>

        {/* Карта с форма */}
        <Card className="shadow-lg border-border border-t-4 border-t-green-500">
          <CardContent className="p-5 sm:p-7">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Име на организацията */}
              <div className="space-y-2">
                <Label
                  htmlFor="organization_name"
                  className="text-[15px] font-medium text-foreground flex items-center gap-2"
                >
                  <Building2 className="w-[18px] h-[18px] text-green-500" />
                  Име на организацията *
                </Label>
                <Input
                  id="organization_name"
                  {...register('organization_name')}
                  required
                  placeholder="Въведете името на организацията"
                  className={`h-12 text-[15px] bg-background border hover:border-muted-foreground/50 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all ${
                    errors.organization_name ? 'border-red-500' : 'border-border'
                  }`}
                />
                {errors.organization_name && (
                  <p className="text-red-500 text-sm">{errors.organization_name.message}</p>
                )}
              </div>

              {/* Тип организация */}
              <div className="space-y-2">
                <Label
                  htmlFor="organization_type"
                  className="text-[15px] font-medium text-foreground flex items-center gap-2"
                >
                  <Building2 className="w-[18px] h-[18px] text-green-500" />
                  Тип организация *
                </Label>
                <Dropdown
                  value={organizationType || ''}
                  onValueChange={(value) => setValue('organization_type', value as FormData['organization_type'])}
                  options={organizationTypes}
                  placeholder="Изберете тип организация"
                  error={errors.organization_type?.message}
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
                    Лице за контакт *
                  </Label>
                  <Input
                    id="contact_name"
                    {...register('contact_name')}
                    required
                    placeholder="Вашето име"
                    className={`h-12 text-[15px] bg-background border hover:border-muted-foreground/50 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all ${
                      errors.contact_name ? 'border-red-500' : 'border-border'
                    }`}
                  />
                  {errors.contact_name && (
                    <p className="text-red-500 text-sm">{errors.contact_name.message}</p>
                  )}
                </div>

                {/* Имейл */}
                <div className="space-y-2">
                  <Label
                    htmlFor="contact_email"
                    className="text-[15px] font-medium text-foreground flex items-center gap-2"
                  >
                    <Mail className="w-[18px] h-[18px] text-green-500" />
                    Имейл *
                  </Label>
                  <Input
                    id="contact_email"
                    {...register('contact_email')}
                    type="email"
                    required
                    placeholder="your@email.com"
                    className={`h-12 text-[15px] bg-background border hover:border-muted-foreground/50 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all ${
                      errors.contact_email ? 'border-red-500' : 'border-border'
                    }`}
                  />
                  {errors.contact_email && (
                    <p className="text-red-500 text-sm">{errors.contact_email.message}</p>
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
                    Град
                  </Label>
                  <Input
                    id="city"
                    {...register('city')}
                    placeholder="София"
                    className={`h-12 text-[15px] bg-background border hover:border-muted-foreground/50 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all ${
                      errors.city ? 'border-red-500' : 'border-border'
                    }`}
                  />
                  {errors.city && (
                    <p className="text-red-500 text-sm">{errors.city.message}</p>
                  )}
                </div>

                {/* Избор на държава със знамена */}
                <div className="space-y-2">
                  <Label
                    htmlFor="country"
                    className="text-[15px] font-medium text-foreground flex items-center gap-2"
                  >
                    <Globe className="w-[18px] h-[18px] text-green-500" />
                    Държава
                  </Label>
                  <CountryDropdown
                    value={country}
                    onValueChange={(value) => setValue('country', value)}
                    type="country"
                    error={errors.country?.message}
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
                  Желан брой кошове *
                </Label>
                <Input
                  id="intended_bin_count"
                  {...register('intended_bin_count', { valueAsNumber: true })}
                  type="number"
                  min={1}
                  required
                  placeholder="10"
                  className={`h-12 text-[15px] bg-background border hover:border-muted-foreground/50 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all ${
                    errors.intended_bin_count ? 'border-red-500' : 'border-border'
                  }`}
                />
                {errors.intended_bin_count && (
                  <p className="text-red-500 text-sm">{errors.intended_bin_count.message}</p>
                )}
              </div>

              {/* Съобщение */}
              <div className="space-y-2">
                <Label
                  htmlFor="message"
                  className="text-[15px] font-medium text-foreground flex items-center gap-2"
                >
                  <MessageSquare className="w-[18px] h-[18px] text-green-500" />
                  Съобщение
                </Label>
                <Textarea
                  id="message"
                  {...register('message')}
                  placeholder="Споделете допълнителна информация за вашата организация и нуждите ви..."
                  rows={4}
                  className={`text-[15px] bg-background border hover:border-muted-foreground/50 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all resize-none py-3 ${
                    errors.message ? 'border-red-500' : 'border-border'
                  }`}
                />
                {errors.message && (
                  <p className="text-red-500 text-sm">{errors.message.message}</p>
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
                    Изпращане...
                  </span>
                ) : (
                  'Изпрати заявка'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Бележка в долната част */}
        <p className="text-center text-[13px] text-muted-foreground mt-5">
          Всички полета, маркирани с <span className="text-green-500 font-semibold">*</span>, са задължителни
        </p>
      </div>
    </div>
  )
}