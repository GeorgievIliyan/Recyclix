"use client"
import { createClient } from "@supabase/supabase-js"
import { useState, useEffect, type ReactNode } from "react"
import {
  CheckCircle,
  XCircle,
  Edit2,
  MapPin,
  User,
  Eye,
  EyeOff,
  Search,
  Loader2,
  HardDrive,
  Package,
  RefreshCw,
  Shield,
  Sun,
  Moon,
  Calendar,
  Hash,
  Navigation,
  Building,
  AlertTriangle,
  Trash2,
  Globe,
  CircleCheck,
  Recycle,
  List,
  PenLine,
  Trash,
  Flag,
  MessageCircle,
  AlertCircle,
  Check,
  X,
} from "lucide-react"
import LeafletMap from "./LeafletMap"

export interface Bin {
  id: string
  code?: string
  lat?: number
  lon?: number
  created_at?: string
  operator?: string
  count?: number

  // Информация за потребителя
  user_username?: string
  user_email?: string

  // Информация за рециклиране
  amenity?: "recycling" | "trash"
  recycling_type?: string
  recycling_clothes?: boolean
  recycling_shoes?: boolean

  // Таговете могат да бъдат всякакъв обект
  tags?: Record<string, any>

  // Допълнителни полета от API-то
  [key: string]: any
}

export type RecyclingBin = {
  code: string
  lat?: number
  lon?: number
  tags?: Record<string, any>
  stats_today?: Record<string, any>
  created_at: string
  updated_at?: string
  last_emptied?: string
  osm_id?: string
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface EditSuggestion {
  id: string
  bin_id: string
  name?: string
  opening_hours?: string
  materials?: string
  notes?: string
  status: string
  user_id: string
  user_email?: string
  created_at: string
  updated_at?: string
  reviewed_by?: string
  reviewed_at?: string
  review_notes?: string
  bin?: Bin
  field_name?: string // Added for edit suggestions display
  old_value?: any // Added for edit suggestions display
  new_value?: any // Added for edit suggestions display
  reason?: string // Added for edit suggestions display
}

// Интерфейс за отчети за проблеми
interface Report {
  id: string
  bin_id: string
  user_id: string
  type: string
  title: string
  description?: string
  resolved: boolean
  created_at: string
  user_email?: string
  user_username?: string
  bin_code?: string
  bin_lat?: number
  bin_lon?: number
  bin?: Bin
}

export async function checkAdminStatus(userId: string): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user?.role === "service_role") return true

    const { data, error } = await supabase.from("profiles").select("is_admin").eq("id", userId).single()

    return data?.is_admin === true
  } catch (error) {
    return false
  }
}

function parseTagsObject(tags: any): {
  amenity: string
  recycling_type: string
  operator: string
  recycling_clothes: boolean
  recycling_shoes: boolean
  count: number
} {
  if (!tags || typeof tags !== "object") {
    return {
      amenity: "recycling",
      recycling_type: "",
      operator: "",
      recycling_clothes: false,
      recycling_shoes: false,
      count: 1,
    }
  }

  return {
    amenity: tags.amenity || "recycling",
    recycling_type: tags.recycling_type || "",
    operator: tags.operator || "",
    recycling_clothes: tags["recycling:clothes"] === "yes",
    recycling_shoes: tags["recycling:shoes"] === "yes",
    count: Number.parseInt(tags.count) || 1,
  }
}

function parseArray(value: any): any {
  if (Array.isArray(value)) {
    return value.map((item) => item.toString())
  }
  return value
}

export async function getPendingBins(): Promise<Bin[]> {
  try {
    const { data, error } = await supabase
      .from("pending_bins")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    if (error) throw error

    const binsWithEmail = await Promise.all(
      (data || []).map(async (bin) => {
        let userEmail = "Анонимен"
        let userUsername = "Анонимен"
        if (bin.user_id) {
          const { data: userData } = await supabase
            .from("profiles")
            .select("email, username")
            .eq("id", bin.user_id)
            .single()
          userEmail = userData?.email || "Анонимен"
          userUsername = userData?.username || userData?.email || "Анонимен"
        }

        return {
          ...bin,
          user_email: userEmail,
          user_username: userUsername,
        }
      }),
    )

    return binsWithEmail
  } catch (error) {
    console.error("Грешка при зареждане:", error)
    return []
  }
}

export async function getEditSuggestions(): Promise<EditSuggestion[]> {
  try {
    // Вземане на всички pending предложения за редакция
    const { data, error } = await supabase
      .from("edit_suggestions")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    if (error) throw error

    // Обогатяване на всяко предложение със детайли за потребителя
    const suggestionsWithDetails = await Promise.all(
      (data || []).map(async (suggestion) => {
        let userEmail = "Анонимен"
        if (suggestion.user_id) {
          const { data: userData } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", suggestion.user_id)
            .single()
          userEmail = userData?.email || "Анонимен"
        }

        // Вземане на информация за коша
        let binData: Bin | undefined = undefined
        if (suggestion.bin_id) {
          const { data: binFromRecycling } = await supabase
            .from("recycling_bins")
            .select("*")
            .eq("code", suggestion.bin_id)
            .single()

          if (binFromRecycling) {
            binData = {
              id: binFromRecycling.code,
              code: binFromRecycling.code,
              lat: binFromRecycling.lat,
              lon: binFromRecycling.lon,
              tags: binFromRecycling.tags,
              created_at: binFromRecycling.created_at,
            }
          }
        }

        return {
          ...suggestion,
          user_email: userEmail,
          bin: binData,
        }
      }),
    )

    return suggestionsWithDetails
  } catch (error) {
    // Грешка при зареждане на предложения
    console.error("Грешка при зареждане на предложения:", error)
    return []
  }
}

// Функция за зареждане на отчети за проблеми
export async function getReports(): Promise<Report[]> {
  try {
    // Вземане на всички отчети (неразрешени по подразбиране)
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error

    // Обогатяване на всяко предложение със детайли за потребителя и коша
    const reportsWithDetails = await Promise.all(
      (data || []).map(async (report) => {
        // Детайли за потребителя
        let userEmail = "Анонимен"
        let userUsername = "Анонимен"
        if (report.user_id) {
          const { data: userData } = await supabase
            .from("profiles")
            .select("email, username")
            .eq("id", report.user_id)
            .single()
          userEmail = userData?.email || "Анонимен"
          userUsername = userData?.username || userData?.email || "Анонимен"
        }

        // Детайли за коша
        let binData: Bin | undefined = undefined
        let binCode = ""
        let binLat = 0
        let binLon = 0
        
        if (report.bin_id) {
          const { data: binFromRecycling } = await supabase
            .from("recycling_bins")
            .select("*")
            .eq("id", report.bin_id)
            .single()

          if (binFromRecycling) {
            binData = {
              id: binFromRecycling.id,
              code: binFromRecycling.code,
              lat: binFromRecycling.lat,
              lon: binFromRecycling.lon,
              tags: binFromRecycling.tags,
              created_at: binFromRecycling.created_at,
            }
            binCode = binFromRecycling.code
            binLat = binFromRecycling.lat
            binLon = binFromRecycling.lon
          }
        }

        return {
          ...report,
          user_email: userEmail,
          user_username: userUsername,
          bin_code: binCode,
          bin_lat: binLat,
          bin_lon: binLon,
          bin: binData,
        }
      }),
    )

    return reportsWithDetails
  } catch (error) {
    console.error("Грешка при зареждане на отчети:", error)
    return []
  }
}

export async function getStats() {
  try {
    const [
      { count: pending }, 
      { count: approved }, 
      { count: suggestions },
      { count: reports }
    ] = await Promise.all([
      supabase.from("pending_bins").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("recycling_bins").select("*", { count: "exact", head: true }),
      supabase.from("edit_suggestions").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("reports").select("*", { count: "exact", head: true }).eq("resolved", false),
    ])

    return {
      pending: pending || 0,
      approved: approved || 0,
      total: (pending || 0) + (approved || 0),
      suggestions: suggestions || 0,
      reports: reports || 0,
    }
  } catch (error) {
    return { pending: 0, approved: 0, total: 0, suggestions: 0, reports: 0 }
  }
}

export async function approveBin(binId: string, binData: Bin): Promise<boolean> {
  try {
    console.log("одобряване на кош:", binId, binData)

    // Парсваме таговете за материали
    const parsedTags = parseTagsObject(binData.tags)

    // 1. Обновяваме статуса на pending_bins
    const { error: updateError } = await supabase
      .from("pending_bins")
      .update({
        status: "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", binId)

    if (updateError) {
      console.error("грешка при обновяване:", updateError)
      return false
    }

    // 2. Подготвяме данните за insert в recycling_bins
    const nowISO = new Date().toISOString()

    const recyclingBinData: RecyclingBin = {
      code: binData.code || binId,
      lat: binData.lat,
      lon: binData.lon,
      tags: binData.tags ?? {},
      stats_today: {},
      created_at: binData.created_at || nowISO,
      updated_at: nowISO,
      last_emptied: undefined,
      osm_id: "",
    }

    console.log("данни за добавяне:", recyclingBinData)

    // 3. Insert в recycling_bins
    const { error: insertError } = await supabase.from("recycling_bins").insert([recyclingBinData])

    if (insertError) {
      console.error("грешка при добавяне:", insertError)
      return false
    }

    console.log("успешно одобрен!")
    return true
  } catch (error) {
    console.error("грешка:", error)
    return false
  }
}

export async function rejectBin(binId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("pending_bins").delete().eq("id", binId)

    if (error) {
      console.error("Грешка при изтриване на кош:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Грешка:", error)
    return false
  }
}

// Функция за разрешаване на отчет
export async function resolveReport(reportId: string): Promise<boolean> {
  try {
    console.log("Разрешаване на отчет:", reportId)

    const { error } = await supabase
      .from("reports")
      .update({
        resolved: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reportId)

    if (error) {
      console.error("Грешка при разрешаване на отчет:", error)
      return false
    }

    console.log("Отчетът е разрешен успешно!")
    return true
  } catch (error) {
    console.error("Грешка:", error)
    return false
  }
}

// Функция за изтриване на отчет
export async function deleteReport(reportId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("reports").delete().eq("id", reportId)

    if (error) {
      console.error("Грешка при изтриване на отчет:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Грешка:", error)
    return false
  }
}

async function approveSuggestion(suggestionId: string, suggestionData: EditSuggestion): Promise<boolean> {
  try {
    console.log("[v0] Одобряване на предложение:", suggestionId, suggestionData)

    // Вземане на текущия потребител
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      console.error("[v0] Няма автентикиран потребител")
      return false
    }

    // Вземане на текущите данни на коша - използвайте suggestion.bin_id
    const { data: binData, error: binFetchError } = await supabase
      .from("recycling_bins")
      .select("*")
      .eq("id", suggestionData.bin_id) // Променено от .eq("code", suggestionData.bin_id)
      .single()

    if (binFetchError) {
      // Ако не намерим кош, проверяваме по код
      console.log("[v0] Опитваме се да намерим кош по код:", suggestionData.bin_id)
      
      const { data: binByCode, error: codeError } = await supabase
        .from("recycling_bins")
        .select("*")
        .eq("code", suggestionData.bin_id)
        .single()

      if (codeError || !binByCode) {
        console.error("[v0] Грешка при четене на кош:", codeError || "Кошът не е намерен")
        return false
      }
      
      // Използваме намерения кош
      var currentBinData = binByCode
    } else {
      var currentBinData = binData
    }

    // Проверка дали имаме валидни данни за коша
    if (!currentBinData) {
      console.error("[v0] Няма намерен кош с ID:", suggestionData.bin_id)
      return false
    }

    // Подготовка на обновените тагове
    const currentTags = currentBinData?.tags || {}
    const updatedTags = { ...currentTags }

    // Актуализация на таговете с предложените промени
    if (suggestionData.name) {
      updatedTags.name = suggestionData.name
    }
    if (suggestionData.opening_hours) {
      updatedTags.opening_hours = suggestionData.opening_hours
    }
    if (suggestionData.materials) {
      updatedTags.recycling_type = suggestionData.materials
    }

    // Актуализирайте и останалите полета, ако съществуват
    if (suggestionData.field_name && suggestionData.new_value !== undefined) {
      updatedTags[suggestionData.field_name] = suggestionData.new_value
    }

    console.log("[v0] Обновени тагове:", updatedTags)

    // Обновяване на коша с новите данни
    const { error: binUpdateError } = await supabase
      .from("recycling_bins")
      .update({
        tags: updatedTags,
        updated_at: new Date().toISOString(),
      })
      .eq("id", currentBinData.id) // Използвайте ID вместо code

    if (binUpdateError) {
      console.error("[v0] Грешка при обновяване на кош:", binUpdateError)
      return false
    }

    // Обновяване на статуса на предложението
    const { error: suggestionUpdateError } = await supabase
      .from("edit_suggestions")
      .update({
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", suggestionId)

    if (suggestionUpdateError) {
      console.error("[v0] Грешка при обновяване на предложение:", suggestionUpdateError)
      return false
    }

    console.log("[v0] Предложението е успешно одобрено")
    return true
  } catch (error) {
    console.error("[v0] Грешка при одобряване на предложение:", error)
    return false
  }
}

async function rejectSuggestion(suggestionId: string, reviewNotes?: string): Promise<boolean> {
  try {
    console.log("[v0] Отхвърляне на предложение:", suggestionId)

    // Вземане на текущия потребител за проследяване
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const reviewerId = user?.id || null

    // Обновяване на статуса на предложението
    const { error: updateError } = await supabase
      .from("edit_suggestions")
      .update({
        status: "rejected",
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        review_notes: reviewNotes || null,
      })
      .eq("id", suggestionId)

    if (updateError) {
      console.error("[v0] Грешка при отхвърляне на предложение:", updateError)
      return false
    }

    console.log("[v0] Предложението е отхвърлено успешно")
    return true
  } catch (error) {
    console.error("[v0] Грешка:", error)
    return false
  }
}

function BinDetails({
  bin,
  onApprove,
  onReject,
}: {
  bin: Bin
  onApprove: (binId: string, binData: Bin) => Promise<void>
  onReject: (binId: string) => Promise<void>
}) {
  const [showDetails, setShowDetails] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showMapModal, setShowMapModal] = useState(false)

  const formData = parseTagsObject(bin.tags)

  const handleApprove = async () => {
    setIsProcessing(true)
    await onApprove(bin.id, bin)
    setIsProcessing(false)
  }

  const handleReject = async () => {
    setIsProcessing(true)
    await onReject(bin.id)
    setIsProcessing(false)
  }

  const LeafletMapModal = () => {
    if (!bin.lat || !bin.lon || !showMapModal) return null

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={() => setShowMapModal(false)}
      >
        <div
          className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Интерактивна карта</h3>
            <button
              onClick={() => setShowMapModal(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <XCircle className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-4">
            <LeafletMap lat={bin.lat} lon={bin.lon} />

            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-2">
              <Navigation className="w-4 h-4" />
              <span>
                Координати: {bin.lat.toFixed(6)}, {bin.lon.toFixed(6)}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const MapPreview = () => {
    if (!bin.lat || !bin.lon) return null

    return (
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-blue-500 dark:text-gray-300" />
          <span className="font-medium text-gray-700 dark:text-gray-300">Местоположение:</span>
        </div>

        <div className="p-3 bg-blue-50 dark:bg-gray-700/50 rounded-lg mb-3 border border-blue-200 dark:border-gray-600">
          <div className="flex items-start gap-3">
            <Navigation className="w-5 h-5 text-blue-600 dark:text-gray-300 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">GPS Координати:</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Географска ширина:</span>
                  <code className="block font-mono text-blue-700 dark:text-gray-200 font-semibold mt-1">
                    {bin.lat.toFixed(6)}°
                  </code>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Географска дължина:</span>
                  <code className="block font-mono text-blue-700 dark:text-gray-200 font-semibold mt-1">
                    {bin.lon.toFixed(6)}°
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="p-3 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">Интерактивна карта</div>
            <button
              onClick={() => setShowMapModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium"
            >
              <Globe className="w-4 h-4" />
              Отвори карта
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                {formData.amenity === "recycling" ? "Контейнер за рециклиране" : "Кошче за отпадъци"}
                {formData.operator && ` - ${formData.operator}`}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">
                  {bin.lat != null && bin.lon != null ? `${bin.lat.toFixed(6)}, ${bin.lon.toFixed(6)}` : "—"}
                </span>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                formData.amenity === "recycling"
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  : "bg-blue-100 text-blue-800 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              {formData.amenity}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Добавен от:</span>
                  <p className="text-gray-700 dark:text-gray-300 font-medium">{bin.user_username || "Анонимен"}</p>
                  {bin.user_email && bin.user_email !== "Анонимен" && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{bin.user_email}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Дата на добавяне:</span>
                  <p className="text-gray-700 dark:text-gray-300">
                    {bin.created_at
                      ? new Date(bin.created_at).toLocaleDateString("bg-BG", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </p>
                </div>
              </div>

              {formData.operator && (
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Оператор:</span>
                    <p className="text-gray-700 dark:text-gray-300">{formData.operator}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {formData.recycling_type && (
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Тип рециклиране:</span>
                    <p className="text-gray-700 dark:text-gray-300">{formData.recycling_type}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-gray-400" />
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Брой контейнери:</span>
                  <p className="text-gray-700 dark:text-gray-300">{formData.count}</p>
                </div>
              </div>

              {bin.code && (
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Код:</span>
                    <p className="text-gray-700 dark:text-gray-300 font-mono text-sm">{bin.code}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {(formData.recycling_clothes || formData.recycling_shoes || formData.recycling_type) && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Trash2 className="w-4 h-4 text-green-500" />
                <span className="font-medium text-gray-700 dark:text-gray-300">Приема:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.recycling_type && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full text-sm">
                    {formData.recycling_type}
                  </span>
                )}
                {formData.recycling_clothes && (
                  <span className="px-3 py-1 bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300 rounded-full text-sm">
                    Дрехи
                  </span>
                )}
                {formData.recycling_shoes && (
                  <span className="px-3 py-1 bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300 rounded-full text-sm">
                    Обувки
                  </span>
                )}
              </div>
            </div>
          )}

          {typeof window !== "undefined" && <MapPreview />}

          {/* Детайли */}
          {showDetails && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Технически детайли:</h4>
              <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto">
                {JSON.stringify(bin, null, 2)}
              </pre>
            </div>
          )}

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="mt-3 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showDetails ? "Скрий детайли" : "Покажи детайли"}
          </button>
        </div>

        <div className="flex lg:flex-col gap-2">
          <button
            onClick={handleApprove}
            disabled={isProcessing}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Одобри
          </button>
          <button
            onClick={handleReject}
            disabled={isProcessing}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Откажи
          </button>
        </div>
      </div>
    </div>
  )
}

function SuggestionDetails({
  suggestion,
  onApprove,
  onReject,
}: {
  suggestion: EditSuggestion
  onApprove: (id: string, data: EditSuggestion) => Promise<void>
  onReject: (id: string) => Promise<void>
}) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [reviewNotes, setReviewNotes] = useState("")

  const handleApprove = async () => {
    setIsProcessing(true)
    await onApprove(suggestion.id, suggestion)
    setIsProcessing(false)
  }

  const handleReject = async () => {
    setIsProcessing(true)
    await onReject(suggestion.id)
    setIsProcessing(false)
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          {/* Заглавие на предложението за промяна */}
          <h3 className="font-semibold text-gray-900 dark:text-gray-50 mb-2">Предложение за промяна</h3>

          {/* Информационен панел с идентификатор на коша */}
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Идентификатор на кош:</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{suggestion.bin_id}</p>
              </div>
              <Shield className="w-8 h-8 text-gray-500 dark:text-gray-400" />
            </div>
          </div>

          {/* Предложени промени */}
          <div className="space-y-3">
            {/* Displaying specific fields that were changed */}
            {suggestion.field_name && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Поле
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-50">{suggestion.field_name}</p>
              </div>
            )}

            {suggestion.name && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Име</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-50">{suggestion.name}</p>
              </div>
            )}

            {suggestion.opening_hours && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Работно време
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-50">{suggestion.opening_hours}</p>
              </div>
            )}

            {suggestion.materials && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Материали
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-50">{suggestion.materials}</p>
              </div>
            )}

            {suggestion.notes && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Бележки
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{suggestion.notes}</p>
              </div>
            )}
          </div>

          {/* Showing original and new values for clarity */}
          {(suggestion.old_value !== undefined || suggestion.new_value !== undefined) && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Сравнение на стойности
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 mb-1">Стара стойност</p>
                  <p className="text-gray-900 dark:text-gray-50 font-mono">
                    {suggestion.old_value !== undefined ? String(suggestion.old_value) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 mb-1">Нова стойност</p>
                  <p className="text-gray-900 dark:text-gray-50 font-mono">
                    {suggestion.new_value !== undefined ? String(suggestion.new_value) : "—"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Метаданни */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <User className="w-4 h-4" />
              <span>{suggestion.user_email || "Неизвестен потребител"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-2">
              <Calendar className="w-4 h-4" />
              <span>{new Date(suggestion.created_at).toLocaleString("bg-BG")}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`px-2 py-1 text-xs font-medium rounded ${
                  suggestion.status === "pending"
                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    : suggestion.status === "approved"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                }`}
              >
                {suggestion.status === "pending"
                  ? "Чакащо"
                  : suggestion.status === "approved"
                    ? "Одобрено"
                    : "Отхвърлено"}
              </span>
            </div>
          </div>

          {/* Информация за преглед (ако има) */}
          {suggestion.reviewed_by && (
            <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
                Информация за преглед
              </p>
              <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <p>Прегледано от: {suggestion.reviewed_by}</p>
                {suggestion.reviewed_at && <p>Дата: {new Date(suggestion.reviewed_at).toLocaleString("bg-BG")}</p>}
                {suggestion.review_notes && <p>Бележки: {suggestion.review_notes}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Бутони за действие */}
        {suggestion.status === "pending" && (
          <div className="flex lg:flex-col gap-2 lg:w-32">
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              <span>Одобри</span>
            </button>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Бележки за отхвърляне (опционално)..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                onClick={handleReject}
                disabled={isProcessing}
                className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                <span>Отхвърли</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Компонент за показване на детайли за отчет
function ReportDetails({
  report,
  onResolve,
  onDelete,
}: {
  report: Report
  onResolve: (reportId: string) => Promise<void>
  onDelete: (reportId: string) => Promise<void>
}) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showMapModal, setShowMapModal] = useState(false)

  const handleResolve = async () => {
    setIsProcessing(true)
    await onResolve(report.id)
    setIsProcessing(false)
  }

  const handleDelete = async () => {
    setIsProcessing(true)
    await onDelete(report.id)
    setIsProcessing(false)
  }

  const getReportTypeLabel = (type: string): string => {
    const typeMap: Record<string, string> = {
      "incorrect_location": "Грешна локация",
      "bin_missing": "Липсващ кош",
      "bin_damaged": "Повреден кош",
      "wrong_materials": "Грешни материали",
      "overflowing": "Препълнен",
      "duplicate": "Дубликат",
      "other": "Друг проблем"
    }
    return typeMap[type] || type
  }

  const LeafletMapModal = () => {
    if (!report.bin_lat || !report.bin_lon || !showMapModal) return null

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={() => setShowMapModal(false)}
      >
        <div
          className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Местоположение на коша</h3>
            <button
              onClick={() => setShowMapModal(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <XCircle className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-4">
            <LeafletMap lat={report.bin_lat} lon={report.bin_lon} />

            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-2">
              <Navigation className="w-4 h-4" />
              <span>
                Координати: {report.bin_lat?.toFixed(6)}, {report.bin_lon?.toFixed(6)}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{report.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Flag className="w-4 h-4 text-red-500" />
                <span className="text-gray-600 dark:text-gray-400">
                  {getReportTypeLabel(report.type)}
                </span>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                report.resolved
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
              }`}
            >
              {report.resolved ? "Разрешен" : "Активен"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Докладван от:</span>
                  <p className="text-gray-700 dark:text-gray-300 font-medium">{report.user_username || "Анонимен"}</p>
                  {report.user_email && report.user_email !== "Анонимен" && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{report.user_email}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Дата на докладване:</span>
                  <p className="text-gray-700 dark:text-gray-300">
                    {report.created_at
                      ? new Date(report.created_at).toLocaleDateString("bg-BG", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {report.bin_code && (
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Код на кош:</span>
                    <p className="text-gray-700 dark:text-gray-300 font-mono text-sm">{report.bin_code}</p>
                  </div>
                </div>
              )}

              {report.bin_lat && report.bin_lon && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Локация:</span>
                    <button
                      onClick={() => setShowMapModal(true)}
                      className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                    >
                      {report.bin_lat.toFixed(4)}, {report.bin_lon.toFixed(4)}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {report.description && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-700 dark:text-gray-300">Описание на проблема:</span>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300">{report.description}</p>
              </div>
            </div>
          )}

          {/* Детайли */}
          {showDetails && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Технически детайли:</h4>
              <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto">
                {JSON.stringify(report, null, 2)}
              </pre>
            </div>
          )}

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="mt-3 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showDetails ? "Скрий детайли" : "Покажи детайли"}
          </button>
        </div>

        <div className="flex lg:flex-col gap-2">
          {!report.resolved && (
            <button
              onClick={handleResolve}
              disabled={isProcessing}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Разреши
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={isProcessing}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Изтрий
          </button>
        </div>
      </div>
      
      {showMapModal && <LeafletMapModal />}
    </div>
  )
}

export function AdminPanel() {
  const [bins, setBins] = useState<Bin[]>([])
  const [suggestions, setSuggestions] = useState<EditSuggestion[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [stats, setStats] = useState({ pending: 0, approved: 0, total: 0, suggestions: 0, reports: 0 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"bins" | "suggestions" | "reports">("bins")
  const [searchQuery, setSearchQuery] = useState("")
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    loadData()
    const isDark =
      localStorage.getItem("darkMode") === "true" || window.matchMedia("(prefers-color-scheme: dark)").matches
    setDarkMode(isDark)
    if (isDark) document.documentElement.classList.add("dark")
  }, [])

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    localStorage.setItem("darkMode", newDarkMode.toString())
    if (newDarkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [binsData, suggestionsData, reportsData, statsData] = await Promise.all([
        getPendingBins(),
        getEditSuggestions(),
        getReports(),
        getStats(),
      ])
      setBins(binsData)
      setSuggestions(suggestionsData)
      setReports(reportsData)
      setStats(statsData)
    } catch (error) {
      console.error("Грешка при зареждане:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveBin = async (binId: string, binData: Bin) => {
    const success = await approveBin(binId, binData)
    if (success) loadData()
  }

  const handleRejectBin = async (binId: string) => {
    const success = await rejectBin(binId)
    if (success) loadData()
  }

  // Handler for approving suggestions
  const handleApproveSuggestion = async (suggestionId: string, suggestionData: EditSuggestion) => {
    const success = await approveSuggestion(suggestionId, suggestionData)
    if (success) loadData() // Reload data after successful approval
  }

  // Handler for rejecting suggestions
  const handleRejectSuggestion = async (suggestionId: string) => {
    const success = await rejectSuggestion(suggestionId)
    if (success) loadData() // Reload data after successful rejection
  }

  // Handler for resolving reports
  const handleResolveReport = async (reportId: string) => {
    const success = await resolveReport(reportId)
    if (success) loadData()
  }

  // Handler for deleting reports
  const handleDeleteReport = async (reportId: string) => {
    const success = await deleteReport(reportId)
    if (success) loadData()
  }

  const filteredBins = bins.filter((bin) => {
    const searchLower = searchQuery.toLowerCase()
    const fields = [
      bin.user_username ?? "",
      bin.user_email ?? "",
      bin.code ?? "",
      ...Object.values(parseTagsObject(bin.tags ?? {})).map(String),
    ]
    return fields.some((field) => field.toLowerCase().includes(searchLower))
  })

  const filteredSuggestions = suggestions.filter((suggestion) => {
    const searchLower = searchQuery.toLowerCase()
    const fields = [
      suggestion.user_email ?? "",
      suggestion.bin_id ?? "",
      suggestion.name ?? "",
      suggestion.materials ?? "",
    ]
    return fields.some((field) => field.toLowerCase().includes(searchLower))
  })

  const filteredReports = reports.filter((report) => {
    const searchLower = searchQuery.toLowerCase()
    const fields = [
      report.user_email ?? "",
      report.user_username ?? "",
      report.title ?? "",
      report.type ?? "",
      report.description ?? "",
      report.bin_code ?? "",
    ]
    return fields.some((field) => field.toLowerCase().includes(searchLower))
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                <Shield className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Администраторско табло</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Управление</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={toggleDarkMode} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                {darkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-600" />}
              </button>
              <button onClick={loadData} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Общо кошове</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                </div>
                <Recycle className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Одобрени</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.approved}</p>
                </div>
                <CircleCheck className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Чакащи одобрение</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
                </div>
                <List className="w-8 h-8 text-orange-500" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Предложения</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.suggestions}</p>
                </div>
                <PenLine className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Активни отчети</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.reports}</p>
                </div>
                <Flag className="w-8 h-8 text-red-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setActiveTab("bins")}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === "bins"
                        ? "bg-gray-600 dark:bg-gray-600 text-white"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    Кошове ({bins.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("suggestions")}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === "suggestions"
                        ? "bg-gray-600 dark:bg-gray-600 text-white"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    Предложения ({suggestions.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("reports")}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === "reports"
                        ? "bg-gray-600 dark:bg-gray-600 text-white"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    Отчети ({reports.length})
                  </button>
                </div>
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Търси..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-gray-500" />
              </div>
            ) : activeTab === "bins" ? (
              filteredBins.length === 0 ? (
                <div className="text-center py-12">
                  <Trash className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchQuery ? "Няма намерени резултати" : "Няма чакащи кошове"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredBins.map((bin) => (
                    <BinDetails key={bin.id} bin={bin} onApprove={handleApproveBin} onReject={handleRejectBin} />
                  ))}
                </div>
              )
            ) : activeTab === "suggestions" ? (
              suggestions.length === 0 ? (
                <div className="text-center py-12">
                  <PenLine className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Няма чакащи предложения</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSuggestions.map((suggestion) => (
                    <SuggestionDetails
                      key={suggestion.id}
                      suggestion={suggestion}
                      onApprove={handleApproveSuggestion}
                      onReject={handleRejectSuggestion}
                    />
                  ))}
                </div>
              )
            ) : activeTab === "reports" ? (
              filteredReports.length === 0 ? (
                <div className="text-center py-12">
                  <Flag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchQuery ? "Няма намерени резултати" : "Няма активни отчети"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReports.map((report) => (
                    <ReportDetails
                      key={report.id}
                      report={report}
                      onResolve={handleResolveReport}
                      onDelete={handleDeleteReport}
                    />
                  ))}
                </div>
              )
            ) : null}
          </div>
        </div>
      </main>
    </div>
  )
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function verifyAdmin() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          window.location.href = "/login"
          return
        }

        const adminStatus = await checkAdminStatus(user.id)
        if (!adminStatus) {
          window.location.href = "/"
          return
        }

        setIsAdmin(true)
      } catch (error) {
        window.location.href = "/login"
      } finally {
        setIsLoading(false)
      }
    }

    verifyAdmin()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Достъп отказан</h2>
          <p className="text-gray-600 mb-4">Нямате администраторски права</p>
          <a href="/" className="text-blue-500 hover:underline">
            Върни се в началото
          </a>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default function AdminPage() {
  return (
    <AdminRoute>
      <AdminPanel />
    </AdminRoute>
  )
}