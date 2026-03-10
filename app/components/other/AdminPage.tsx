"use client";

import { useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/lib/supabase-browser";
import {
  CheckCircle,
  XCircle,
  MapPin,
  User,
  Eye,
  Search,
  Loader2,
  Package,
  RefreshCw,
  Shield,
  Sun,
  Moon,
  Calendar,
  Hash,
  Building,
  Trash2,
  CircleCheck,
  Recycle,
  List,
  PenLine,
  Trash,
  Flag,
  X,
  Mail,
} from "lucide-react";
import LeafletMap from "../map-ui/LeafletMap";
import { SimpleSpinningRecycling } from "../ui/RecyclingLoader";
import LogoutButtonAlt from "../ui/LogoutButtonAlt";
import { isDev } from "@/lib/isDev";

// типизация
export interface Bin {
  id: string;
  code?: string;
  lat?: number;
  lon?: number;
  created_at?: string;
  operator?: string;
  count?: number;
  user_username?: string;
  user_email?: string;
  amenity?: "recycling" | "trash";
  recycling_type?: string;
  recycling_clothes?: boolean;
  recycling_shoes?: boolean;
  tags?: Record<string, any>;
  image_url?: string;
  image_urls?: string[];
  [key: string]: any;
}

export type RecyclingBin = {
  code: string;
  lat?: number;
  lon?: number;
  tags?: Record<string, any>;
  stats_today?: Record<string, any>;
  created_at: string;
  updated_at?: string;
  last_emptied?: string;
  osm_id?: string | null;
  image_url?: string | null;
};

interface EditSuggestion {
  id: string;
  bin_id: string;
  name?: string;
  opening_hours?: string;
  materials?: string;
  notes?: string;
  status: string;
  user_id: string;
  user_email?: string;
  created_at: string;
  updated_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  bin?: Bin;
  field_name?: string;
  old_value?: any;
  new_value?: any;
  reason?: string;
}

interface ReportImage {
  id: string;
  report_id: string;
  photo_url: string;
  created_at: string;
  user_id: string;
}

interface Report {
  id: string;
  bin_id: string;
  user_id: string;
  type: string;
  title: string;
  description?: string;
  resolved: boolean;
  created_at: string;
  user_email?: string;
  user_username?: string;
  bin_code?: string;
  bin_lat?: number;
  bin_lon?: number;
  bin?: Bin;
  photo_url?: string;
  images?: ReportImage[];
}

interface OrganizationRequest {
  id: string;
  organization_name: string;
  organization_type: "municipality" | "school" | "company" | "ngo" | "other";
  contact_name: string;
  contact_email: string;
  intended_bin_count: number;
  city?: string;
  country?: string;
  message: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

// функции за извличане на допълнителна информация
async function getUserInfo(
  username: string,
): Promise<{ email: string; username: string }> {
  const { data } = await supabase
    .from("user_profiles")
    .select("username")
    .eq("username", username)
    .maybeSingle();

  return {
    email: "Анонимен", // email is ignored now
    username: data?.username || "Анонимен",
  };
}

// проверка дали потребителят е администратор
export async function checkAdminStatus(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", userId)
      .single();
    return data?.is_admin === true;
  } catch {
    return false;
  }
}

function parseTagsObject(tags: any) {
  if (!tags || typeof tags !== "object")
    return {
      amenity: "recycling",
      recycling_type: "",
      operator: "",
      recycling_clothes: false,
      recycling_shoes: false,
      count: 1,
    };
  return {
    amenity: tags.amenity || "recycling",
    recycling_type: tags.recycling_type || "",
    operator: tags.operator || "",
    recycling_clothes: tags["recycling:clothes"] === "yes",
    recycling_shoes: tags["recycling:shoes"] === "yes",
    count: Number.parseInt(tags.count) || 1,
  };
}

// взимане на данни за различните секции на админ панела
export async function getOrganizationRequests(): Promise<
  OrganizationRequest[]
> {
  try {
    const { data, error } = await supabase
      .from("organization_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}

export async function getPendingBins(): Promise<Bin[]> {
  try {
    const { data, error } = await supabase
      .from("pending_bins")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const binsWithEmail = await Promise.all(
      (data || []).map(async (bin) => {
        let userEmail = "Анонимен",
          userUsername = "Анонимен";
        if (bin.user_id) {
          const info = await getUserInfo(bin.user_id);
          userEmail = info.email;
          userUsername = info.username;
        }
        const imageUrls: string[] = [];
        if (bin.image_url) {
          imageUrls.push(
            bin.image_url.startsWith("http")
              ? bin.image_url
              : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/bins/${bin.image_url}`,
          );
        }
        return {
          ...bin,
          user_email: userEmail,
          user_username: userUsername,
          image_urls: imageUrls,
          image_url: bin.image_url || null,
        };
      }),
    );
    return binsWithEmail;
  } catch {
    return [];
  }
}

export async function getEditSuggestions(): Promise<EditSuggestion[]> {
  try {
    const { data, error } = await supabase
      .from("edit_suggestions")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const suggestionsWithDetails = await Promise.all(
      (data || []).map(async (suggestion) => {
        let userEmail = "Анонимен";
        if (suggestion.user_id) {
          const info = await getUserInfo(suggestion.user_id);
          userEmail = info.email;
        }
        let binData: Bin | undefined;
        if (suggestion.bin_id) {
          const { data: binFromRecycling } = await supabase
            .from("recycling_bins")
            .select("*")
            .eq("code", suggestion.bin_id)
            .single();
          if (binFromRecycling)
            binData = {
              id: binFromRecycling.code,
              code: binFromRecycling.code,
              lat: binFromRecycling.lat,
              lon: binFromRecycling.lon,
              tags: binFromRecycling.tags,
              created_at: binFromRecycling.created_at,
            };
        }
        return { ...suggestion, user_email: userEmail, bin: binData };
      }),
    );
    return suggestionsWithDetails;
  } catch {
    return [];
  }
}

export async function getReports(): Promise<Report[]> {
  try {
    const { data: reportsData, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const reportsWithDetails = await Promise.all(
      (reportsData || []).map(async (report) => {
        let userUsername = "Анонимен";
        if (report.user_username) {
          userUsername = report.user_username;
        }
        let binCode = "",
          binLat = 0,
          binLon = 0;
        if (report.bin_id) {
          const { data: binFromRecycling } = await supabase
            .from("recycling_bins")
            .select("code, lat, lon")
            .eq("id", report.bin_id)
            .single();
          if (binFromRecycling) {
            binCode = binFromRecycling.code;
            binLat = binFromRecycling.lat || 0;
            binLon = binFromRecycling.lon || 0;
          }
        }

        let images: ReportImage[] = [];
        try {
          const { data: imagesData } = await supabase
            .from("report_photos")
            .select("*")
            .eq("report_id", report.id)
            .order("created_at", { ascending: true });
          if (imagesData) images = imagesData;
        } catch {}

        return {
          ...report,
          user_email: "Анонимен",
          user_username: userUsername,
          bin_code: binCode,
          bin_lat: binLat,
          bin_lon: binLon,
          images,
        };
      }),
    );

    return reportsWithDetails;
  } catch {
    return [];
  }
}

export async function getStats() {
  try {
    const [
      { count: pending },
      { count: approved },
      { count: suggestions },
      { count: reports },
      { count: orgRequests },
    ] = await Promise.all([
      supabase
        .from("pending_bins")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("recycling_bins")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("edit_suggestions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("resolved", false),
      supabase
        .from("organization_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
    ]);
    return {
      pending: pending || 0,
      approved: approved || 0,
      total: (pending || 0) + (approved || 0),
      suggestions: suggestions || 0,
      reports: reports || 0,
      orgRequests: orgRequests || 0,
    };
  } catch {
    return {
      pending: 0,
      approved: 0,
      total: 0,
      suggestions: 0,
      reports: 0,
      orgRequests: 0,
    };
  }
}

export async function approveBin(
  binId: string,
  binData: Bin,
): Promise<boolean> {
  try {
    const nowISO = new Date().toISOString();

    let tags = binData.tags ?? {};
    if (typeof tags === "string") {
      try {
        tags = JSON.parse(tags);
      } catch {
        tags = {};
      }
    }

    const recyclingBinData: RecyclingBin = {
      code: binData.code || binId,
      lat: binData.lat,
      lon: binData.lon,
      tags,
      stats_today: {},
      created_at: binData.created_at || nowISO,
      updated_at: nowISO,
      last_emptied: undefined,
      osm_id: binData.osm_id || null,
      image_url: binData.image_url || null,
    };

    if (isDev) {
      console.log("Approving bin with image_url:", recyclingBinData.image_url);
    }

    const { error: insertError } = await supabase
      .from("recycling_bins")
      .insert([recyclingBinData]);

    if (insertError) {
      console.error("Insert error:", insertError);
      return false;
    }

    const { error: updateError } = await supabase
      .from("pending_bins")
      .update({ status: "approved", updated_at: nowISO })
      .eq("id", binId);

    if (updateError) {
      console.error("Update error:", updateError);
      return false;
    }

    return true;
  } catch (e) {
    console.error("approveBin exception:", e);
    return false;
  }
}

export async function rejectBin(binId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("pending_bins")
      .delete()
      .eq("id", binId);
    return !error;
  } catch {
    return false;
  }
}

export async function approveOrganizationRequest(
  requestId: string,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("organization_requests")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", requestId);
    return !error;
  } catch {
    return false;
  }
}

export async function rejectOrganizationRequest(
  requestId: string,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("organization_requests")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", requestId);
    return !error;
  } catch {
    return false;
  }
}

export async function resolveReport(reportId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("reports")
      .update({ resolved: true, updated_at: new Date().toISOString() })
      .eq("id", reportId);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteReport(reportId: string): Promise<boolean> {
  try {
    await supabase.from("report_photos").delete().eq("report_id", reportId);
    const { error } = await supabase
      .from("reports")
      .delete()
      .eq("id", reportId);
    return !error;
  } catch {
    return false;
  }
}

async function approveSuggestion(
  suggestionId: string,
  suggestionData: EditSuggestion,
): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    let { data: binData, error: binFetchError } = await supabase
      .from("recycling_bins")
      .select("*")
      .eq("id", suggestionData.bin_id)
      .single();
    if (binFetchError) {
      const { data: binByCode, error: codeError } = await supabase
        .from("recycling_bins")
        .select("*")
        .eq("code", suggestionData.bin_id)
        .single();
      if (codeError || !binByCode) return false;
      binData = binByCode;
    }
    if (!binData) return false;
    const updatedTags = { ...(binData.tags || {}) };
    if (suggestionData.name) updatedTags.name = suggestionData.name;
    if (suggestionData.opening_hours)
      updatedTags.opening_hours = suggestionData.opening_hours;
    if (suggestionData.materials)
      updatedTags.recycling_type = suggestionData.materials;
    if (suggestionData.field_name && suggestionData.new_value !== undefined)
      updatedTags[suggestionData.field_name] = suggestionData.new_value;
    const { error: binUpdateError } = await supabase
      .from("recycling_bins")
      .update({ tags: updatedTags, updated_at: new Date().toISOString() })
      .eq("id", binData.id);
    if (binUpdateError) return false;
    const { error: suggestionUpdateError } = await supabase
      .from("edit_suggestions")
      .update({
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", suggestionId);
    return !suggestionUpdateError;
  } catch {
    return false;
  }
}

async function rejectSuggestion(
  suggestionId: string,
  reviewNotes?: string,
): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("edit_suggestions")
      .update({
        status: "rejected",
        reviewed_by: user?.id || null,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        review_notes: reviewNotes || null,
      })
      .eq("id", suggestionId);
    return !error;
  } catch {
    return false;
  }
}

// ui компоненти
function StatusBadge({
  status,
  labels,
}: {
  status: string;
  labels: Record<string, string>;
}) {
  const colors: Record<string, string> = {
    pending:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-800",
    approved:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800",
    rejected:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800",
    active:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800",
    resolved:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${colors[status] || colors.pending}`}
    >
      {labels[status] || status}
    </span>
  );
}

function ActionButton({
  onClick,
  disabled,
  variant,
  icon: Icon,
  label,
}: {
  onClick: () => void;
  disabled: boolean;
  variant: "approve" | "reject" | "email" | "resolve" | "neutral";
  icon: any;
  label: string;
}) {
  const styles = {
    approve:
      "bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white shadow-emerald-500/20",
    resolve:
      "bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white shadow-emerald-500/20",
    reject:
      "bg-white hover:bg-red-50 dark:bg-neutral-700 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800",
    email:
      "bg-white hover:bg-blue-50 dark:bg-neutral-700 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800",
    neutral:
      "bg-white hover:bg-neutral-100 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-600 dark:text-neutral-300 ring-1 ring-neutral-200 dark:ring-neutral-600",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed ${styles[variant]}`}
    >
      {disabled ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Icon className="w-3.5 h-3.5" />
      )}
      <span>{label}</span>
    </button>
  );
}

function MetaRow({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: any;
  label: string;
  value: string | ReactNode;
  className?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-3.5 h-3.5 text-neutral-400 mt-0.5 shrink-0" />
      <div>
        <span className="text-xs text-neutral-500 dark:text-neutral-400 block">
          {label}
        </span>
        <span
          className={`text-sm font-medium text-neutral-800 dark:text-neutral-200 ${className || ""}`}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

function ImageGallery({
  images,
  onSelect,
}: {
  images: string[];
  onSelect: (url: string) => void;
}) {
  if (images.length === 0)
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-dashed border-neutral-200 dark:border-neutral-700">
        <Eye className="w-4 h-4 text-neutral-400" />
        <span className="text-xs text-neutral-400">Няма прикачени снимки</span>
      </div>
    );
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {images.map((url, i) => (
        <button
          key={i}
          onClick={() => onSelect(url)}
          className="relative group aspect-square overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700"
        >
          <img
            src={url}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            onError={(e) => {
              e.currentTarget.src = "/placeholder.svg";
            }}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>
      ))}
    </div>
  );
}

function LightboxModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 p-1.5 bg-white dark:bg-neutral-800 rounded-full shadow-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        >
          <X className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
        </button>
        <img
          src={url}
          alt=""
          className="max-w-full max-h-[90vh] rounded-xl object-contain shadow-2xl"
          onError={(e) => {
            e.currentTarget.src = "/placeholder.svg";
          }}
        />
      </div>
    </div>
  );
}

function MapModal({
  lat,
  lon,
  onClose,
}: {
  lat: number;
  lon: number;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-neutral-200 dark:border-neutral-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold text-neutral-900 dark:text-white text-sm">
              Местоположение
            </span>
            <span className="text-xs text-neutral-400 font-mono">
              {lat.toFixed(5)}, {lon.toFixed(5)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-neutral-500" />
          </button>
        </div>
        <div className="p-4">
          <LeafletMap lat={lat} lon={lon} zoom={16} height={400} />
        </div>
      </div>
    </div>
  );
}

function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 rounded-xl shadow-sm ${className || ""}`}
    >
      {children}
    </div>
  );
}

// детайли за контейнери чакащи одобрение
function BinDetails({
  bin,
  onApprove,
  onReject,
}: {
  bin: Bin;
  onApprove: (binId: string, binData: Bin) => Promise<void>;
  onReject: (binId: string) => Promise<void>;
}) {
  const [processing, setProcessing] = useState<"approve" | "reject" | null>(
    null,
  );
  const [showMap, setShowMap] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const formData = parseTagsObject(bin.tags);

  const handle = async (action: "approve" | "reject") => {
    setProcessing(action);
    if (action === "approve") await onApprove(bin.id, bin);
    else await onReject(bin.id);
    setProcessing(null);
  };

  return (
    <Card>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${formData.amenity === "recycling" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"}`}
              >
                <Recycle className="w-3 h-3" />
                {formData.amenity}
              </span>
              {bin.code && (
                <span className="text-xs font-mono text-neutral-400 bg-neutral-100 dark:bg-neutral-700 px-2 py-0.5 rounded">
                  {bin.code}
                </span>
              )}
            </div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
              {formData.amenity === "recycling"
                ? "Контейнер за рециклиране"
                : "Кошче за отпадъци"}
              {formData.operator && (
                <span className="text-neutral-400 font-normal">
                  {" "}
                  — {formData.operator}
                </span>
              )}
            </h3>
          </div>
          <StatusBadge status="pending" labels={{ pending: "Чакащ" }} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
          <div className="space-y-3">
            <MetaRow
              icon={User}
              label="Добавен от"
              value={
                <>
                  {bin.user_username || "Анонимен"}
                  {bin.user_email && bin.user_email !== "Анонимен" && (
                    <span className="block text-xs text-neutral-400 font-normal">
                      {bin.user_email}
                    </span>
                  )}
                </>
              }
            />
            <MetaRow
              icon={Calendar}
              label="Дата"
              value={
                bin.created_at
                  ? new Date(bin.created_at).toLocaleDateString("bg-BG", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "—"
              }
            />
            {formData.operator && (
              <MetaRow
                icon={Building}
                label="Оператор"
                value={formData.operator}
              />
            )}
          </div>
          <div className="space-y-3">
            {formData.recycling_type && (
              <MetaRow
                icon={Package}
                label="Тип рециклиране"
                value={formData.recycling_type}
              />
            )}
            <MetaRow
              icon={Hash}
              label="Брой контейнери"
              value={String(formData.count)}
            />
            {bin.lat && bin.lon && (
              <div className="flex items-start gap-2.5">
                <MapPin className="w-3.5 h-3.5 text-neutral-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 block">
                    Координати
                  </span>
                  <button
                    onClick={() => setShowMap(true)}
                    className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline font-mono"
                  >
                    {bin.lat.toFixed(5)}, {bin.lon.toFixed(5)}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {(formData.recycling_clothes ||
          formData.recycling_shoes ||
          formData.recycling_type) && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {formData.recycling_type && (
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-full text-xs font-medium">
                {formData.recycling_type}
              </span>
            )}
            {formData.recycling_clothes && (
              <span className="px-2.5 py-1 bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400 rounded-full text-xs font-medium">
                Дрехи
              </span>
            )}
            {formData.recycling_shoes && (
              <span className="px-2.5 py-1 bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400 rounded-full text-xs font-medium">
                Обувки
              </span>
            )}
          </div>
        )}

        <ImageGallery images={bin.image_urls || []} onSelect={setLightbox} />
      </div>

      <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-neutral-100 dark:border-neutral-700/60 bg-neutral-50/50 dark:bg-neutral-800/30 rounded-b-xl">
        <ActionButton
          onClick={() => handle("reject")}
          disabled={!!processing}
          variant="neutral"
          icon={XCircle}
          label="Откажи"
        />
        <ActionButton
          onClick={() => handle("approve")}
          disabled={!!processing}
          variant="approve"
          icon={CheckCircle}
          label="Одобри"
        />
      </div>

      {showMap && bin.lat && bin.lon && (
        <MapModal
          lat={bin.lat}
          lon={bin.lon}
          onClose={() => setShowMap(false)}
        />
      )}
      {lightbox && (
        <LightboxModal url={lightbox} onClose={() => setLightbox(null)} />
      )}
    </Card>
  );
}

// за предложени промени по съществуващи контейнери
function SuggestionDetails({
  suggestion,
  onApprove,
  onReject,
}: {
  suggestion: EditSuggestion;
  onApprove: (id: string, data: EditSuggestion) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}) {
  const [processing, setProcessing] = useState<"approve" | "reject" | null>(
    null,
  );
  const [reviewNotes, setReviewNotes] = useState("");

  const handle = async (action: "approve" | "reject") => {
    setProcessing(action);
    if (action === "approve") await onApprove(suggestion.id, suggestion);
    else await onReject(suggestion.id);
    setProcessing(null);
  };

  const changedFields = [
    suggestion.field_name && { label: "Поле", value: suggestion.field_name },
    suggestion.name && { label: "Име", value: suggestion.name },
    suggestion.opening_hours && {
      label: "Работно време",
      value: suggestion.opening_hours,
    },
    suggestion.materials && { label: "Материали", value: suggestion.materials },
    suggestion.notes && { label: "Бележки", value: suggestion.notes },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <Card>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PenLine className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                Предложение за промяна
              </span>
              <span className="text-xs font-mono text-neutral-400 bg-neutral-100 dark:bg-neutral-700 px-2 py-0.5 rounded">
                {suggestion.bin_id}
              </span>
            </div>
          </div>
          <StatusBadge
            status={suggestion.status}
            labels={{
              pending: "Чакащо",
              approved: "Одобрено",
              rejected: "Отхвърлено",
            }}
          />
        </div>

        {changedFields.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {changedFields.map((field) => (
              <div
                key={field.label}
                className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-700/40 border border-neutral-200 dark:border-neutral-700"
              >
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
                  {field.label}
                </p>
                <p className="text-sm text-neutral-800 dark:text-neutral-200 font-medium">
                  {field.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {(suggestion.old_value !== undefined ||
          suggestion.new_value !== undefined) && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
              <p className="text-xs font-medium text-red-400 uppercase tracking-wider mb-1">
                Преди
              </p>
              <p className="text-sm font-mono text-red-700 dark:text-red-400">
                {suggestion.old_value !== undefined
                  ? String(suggestion.old_value)
                  : "—"}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
              <p className="text-xs font-medium text-emerald-500 uppercase tracking-wider mb-1">
                След
              </p>
              <p className="text-sm font-mono text-emerald-700 dark:text-emerald-400">
                {suggestion.new_value !== undefined
                  ? String(suggestion.new_value)
                  : "—"}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3" />
            {suggestion.user_email || "Неизвестен"}
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            {new Date(suggestion.created_at).toLocaleDateString("bg-BG")}
          </div>
        </div>
      </div>

      {suggestion.status === "pending" && (
        <div className="flex flex-col sm:flex-row items-center gap-2 px-5 py-3 border-t border-neutral-100 dark:border-neutral-700/60 bg-neutral-50/50 dark:bg-neutral-800/30 rounded-b-xl">
          <input
            type="text"
            placeholder="Бележки при отхвърляне (по избор)"
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            className="flex-1 text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <div className="flex gap-2">
            <ActionButton
              onClick={() => handle("reject")}
              disabled={!!processing}
              variant="reject"
              icon={XCircle}
              label="Отхвърли"
            />
            <ActionButton
              onClick={() => handle("approve")}
              disabled={!!processing}
              variant="approve"
              icon={CheckCircle}
              label="Одобри"
            />
          </div>
        </div>
      )}
    </Card>
  );
}

// при доклади за проблем с контейнери
function ReportDetails({
  report,
  onResolve,
  onDelete,
}: {
  report: Report;
  onResolve: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [processing, setProcessing] = useState<"resolve" | "delete" | null>(
    null,
  );
  const [showMap, setShowMap] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const handle = async (action: "resolve" | "delete") => {
    setProcessing(action);
    if (action === "resolve") await onResolve(report.id);
    else await onDelete(report.id);
    setProcessing(null);
  };

  const getReportTypeLabel = (type: string) =>
    ({
      incorrect_location: "Грешна локация",
      bin_missing: "Липсващ кош",
      bin_damaged: "Повреден кош",
      wrong_materials: "Грешни материали",
      overflowing: "Препълнен",
      duplicate: "Дубликат",
      other: "Друг проблем",
    })[type] || type;

  const getImageUrl = (photoUrl: string) => {
    if (!photoUrl) return "/placeholder.svg";
    if (photoUrl.startsWith("http")) return photoUrl;
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const fileName = photoUrl.includes("/")
      ? photoUrl.split("/").pop()
      : photoUrl;
    return `${base}/storage/v1/object/public/report-photos/${fileName}`;
  };

  const allImages = [
    ...(report.photo_url ? [getImageUrl(report.photo_url)] : []),
    ...(report.images || []).map((img) => getImageUrl(img.photo_url)),
  ];

  return (
    <Card>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flag className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                {getReportTypeLabel(report.type)}
              </span>
              {report.bin_code && (
                <span className="text-xs font-mono text-neutral-400 bg-neutral-100 dark:bg-neutral-700 px-2 py-0.5 rounded">
                  {report.bin_code}
                </span>
              )}
            </div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
              {report.title}
            </h3>
          </div>
          <StatusBadge
            status={report.resolved ? "resolved" : "active"}
            labels={{ resolved: "Разрешен", active: "Активен" }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
          <div className="space-y-3">
            <MetaRow
              icon={User}
              label="Докладван от"
              value={report.user_username || "Анонимен"}
            />
            <MetaRow
              icon={Calendar}
              label="Дата"
              value={
                report.created_at
                  ? new Date(report.created_at).toLocaleDateString("bg-BG", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "—"
              }
            />
          </div>
          <div className="space-y-3">
            {report.bin_lat && report.bin_lon && (
              <div className="flex items-start gap-2.5">
                <MapPin className="w-3.5 h-3.5 text-neutral-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 block">
                    Локация
                  </span>
                  <button
                    onClick={() => setShowMap(true)}
                    className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline font-mono"
                  >
                    {report.bin_lat.toFixed(4)}, {report.bin_lon.toFixed(4)}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {report.description && (
          <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-700/40 border border-neutral-200 dark:border-neutral-700 mb-4">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1.5">
              Описание
            </p>
            <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
              {report.description}
            </p>
          </div>
        )}

        <ImageGallery images={allImages} onSelect={setLightbox} />
      </div>

      <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-neutral-100 dark:border-neutral-700/60 bg-neutral-50/50 dark:bg-neutral-800/30 rounded-b-xl">
        <ActionButton
          onClick={() => handle("delete")}
          disabled={!!processing}
          variant="reject"
          icon={Trash2}
          label="Изтрий"
        />
        {!report.resolved && (
          <ActionButton
            onClick={() => handle("resolve")}
            disabled={!!processing}
            variant="resolve"
            icon={CheckCircle}
            label="Разреши"
          />
        )}
      </div>

      {showMap && report.bin_lat && report.bin_lon && (
        <MapModal
          lat={report.bin_lat}
          lon={report.bin_lon}
          onClose={() => setShowMap(false)}
        />
      )}
      {lightbox && (
        <LightboxModal url={lightbox} onClose={() => setLightbox(null)} />
      )}
    </Card>
  );
}

// при заявки от организации за получаване на кошове за рециклиране
function OrganizationRequestDetails({
  request,
  onApprove,
  onReject,
}: {
  request: OrganizationRequest;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}) {
  const [processing, setProcessing] = useState<
    "approve" | "reject" | "email" | null
  >(null);

  const openEmail = (subject: string, body: string) => {
    const link = `https://mail.google.com/mail/u/0/?view=cm&fs=1&to=${encodeURIComponent(request.contact_email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(link, "_blank");
  };

  const handle = async (action: "approve" | "reject") => {
    if (
      !window.confirm(
        `Сигурни ли сте, че искате да ${action === "approve" ? "одобрите" : "отхвърлите"} заявката от "${request.organization_name}"?`,
      )
    )
      return;
    setProcessing(action);
    const subject = `Заявка за кошове от ${request.organization_name} - ${action === "approve" ? "ОДОБРЕНО" : "ОТХВЪРЛЕНА"}`;
    const body = `Уважаеми/а ${request.contact_name},\n\nВашата заявка за получаване на ${request.intended_bin_count} кош${request.intended_bin_count > 1 ? "а" : ""} е ${action === "approve" ? "одобрена" : "отхвърлена"}.\n\nС уважение,\nЕкипът на Recyclix`;
    openEmail(subject, body);
    await new Promise((r) => setTimeout(r, 500));
    if (action === "approve") await onApprove(request.id);
    else await onReject(request.id);
    setProcessing(null);
  };

  return (
    <Card>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-xs text-purple-600 dark:text-purple-400 font-medium capitalize">
                {request.organization_type}
              </span>
            </div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
              {request.organization_name}
            </h3>
          </div>
          <StatusBadge
            status={request.status}
            labels={{
              pending: "Чакаща",
              approved: "Одобрена",
              rejected: "Отхвърлена",
            }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
          <div className="space-y-3">
            <MetaRow
              icon={User}
              label="Контактно лице"
              value={
                <>
                  {request.contact_name}
                  <span className="block text-xs font-normal">
                    <a
                      href={`mailto:${request.contact_email}`}
                      className="text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      {request.contact_email}
                    </a>
                  </span>
                </>
              }
            />
            <MetaRow
              icon={Package}
              label="Брой кошове"
              value={String(request.intended_bin_count)}
            />
          </div>
          <div className="space-y-3">
            {(request.city || request.country) && (
              <MetaRow
                icon={MapPin}
                label="Локация"
                value={[request.city, request.country]
                  .filter(Boolean)
                  .join(", ")}
              />
            )}
            <MetaRow
              icon={Calendar}
              label="Дата на заявка"
              value={new Date(request.created_at).toLocaleDateString("bg-BG")}
            />
          </div>
        </div>

        {request.message && (
          <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-700/40 border border-neutral-200 dark:border-neutral-700">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1.5">
              Съобщение
            </p>
            <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
              {request.message}
            </p>
          </div>
        )}
      </div>

      {request.status === "pending" && (
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-neutral-100 dark:border-neutral-700/60 bg-neutral-50/50 dark:bg-neutral-800/30 rounded-b-xl">
          <ActionButton
            onClick={() =>
              openEmail(
                `Заявка за кошове от ${request.organization_name}`,
                `Уважаеми/а ${request.contact_name},\n\nОтносно Вашата заявка...\n\nС уважение,\nЕкипът на Recyclix`,
              )
            }
            disabled={!!processing}
            variant="email"
            icon={Mail}
            label="Имейл"
          />
          <ActionButton
            onClick={() => handle("reject")}
            disabled={!!processing}
            variant="neutral"
            icon={XCircle}
            label="Откажи"
          />
          <ActionButton
            onClick={() => handle("approve")}
            disabled={!!processing}
            variant="approve"
            icon={CheckCircle}
            label="Одобри"
          />
        </div>
      )}
    </Card>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: any;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20",
    green: "text-green-500 bg-green-50 dark:bg-green-900/20",
    amber: "text-amber-500 bg-amber-50 dark:bg-amber-900/20",
    blue: "text-blue-500 bg-blue-50 dark:bg-blue-900/20",
    red: "text-red-500 bg-red-50 dark:bg-red-900/20",
    purple: "text-purple-500 bg-purple-50 dark:bg-purple-900/20",
  };
  return (
    <div className="bg-white dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 rounded-xl p-4 shadow-sm flex items-center gap-3">
      <div className={`p-2.5 rounded-lg ${colorMap[color]}`}>
        <Icon className={`w-5 h-5 ${colorMap[color].split(" ")[0]}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-neutral-900 dark:text-white leading-none">
          {value}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          {label}
        </p>
      </div>
    </div>
  );
}

// административно табло
export function AdminPanel() {
  const [bins, setBins] = useState<Bin[]>([]);
  const [suggestions, setSuggestions] = useState<EditSuggestion[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [orgRequests, setOrgRequests] = useState<OrganizationRequest[]>([]);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    total: 0,
    suggestions: 0,
    reports: 0,
    orgRequests: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "bins" | "suggestions" | "reports" | "orgRequests"
  >("bins");
  const [searchQuery, setSearchQuery] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    loadData();
    const isDark =
      localStorage.getItem("darkMode") === "true" ||
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDarkMode(isDark);
    if (isDark) document.documentElement.classList.add("dark");
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("darkMode", String(next));
    document.documentElement.classList.toggle("dark", next);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        binsData,
        suggestionsData,
        reportsData,
        orgRequestsData,
        statsData,
      ] = await Promise.all([
        getPendingBins(),
        getEditSuggestions(),
        getReports(),
        getOrganizationRequests(),
        getStats(),
      ]);
      setBins(binsData);
      setSuggestions(suggestionsData);
      setReports(reportsData);
      setOrgRequests(orgRequestsData);
      setStats(statsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveBin = async (id: string, data: Bin) => {
    if (await approveBin(id, data)) loadData();
  };
  const handleRejectBin = async (id: string) => {
    if (await rejectBin(id)) loadData();
  };
  const handleApproveSuggestion = async (id: string, data: EditSuggestion) => {
    if (await approveSuggestion(id, data)) loadData();
  };
  const handleRejectSuggestion = async (id: string) => {
    if (await rejectSuggestion(id)) loadData();
  };
  const handleResolveReport = async (id: string) => {
    if (await resolveReport(id)) loadData();
  };
  const handleDeleteReport = async (id: string) => {
    if (await deleteReport(id)) loadData();
  };
  const handleApproveOrgRequest = async (id: string) => {
    if (await approveOrganizationRequest(id)) loadData();
  };
  const handleRejectOrgRequest = async (id: string) => {
    if (await rejectOrganizationRequest(id)) loadData();
  };

  const q = searchQuery.toLowerCase();
  const filteredBins = bins.filter((b) =>
    [
      b.user_username,
      b.user_email,
      b.code,
      ...Object.values(parseTagsObject(b.tags ?? {})).map(String),
    ].some((f) => String(f).toLowerCase().includes(q)),
  );
  const filteredSuggestions = suggestions.filter((s) =>
    [s.user_email, s.bin_id, s.name, s.materials].some((f) =>
      String(f ?? "")
        .toLowerCase()
        .includes(q),
    ),
  );
  const filteredReports = reports.filter((r) =>
    [
      r.user_email,
      r.user_username,
      r.title,
      r.type,
      r.description,
      r.bin_code,
    ].some((f) =>
      String(f ?? "")
        .toLowerCase()
        .includes(q),
    ),
  );
  const filteredOrgRequests = orgRequests.filter((r) =>
    [
      r.organization_name,
      r.contact_name,
      r.contact_email,
      r.city,
      r.country,
    ].some((f) =>
      String(f ?? "")
        .toLowerCase()
        .includes(q),
    ),
  );

  const tabs: {
    key: typeof activeTab;
    label: string;
    count: number;
    icon: any;
    emptyIcon: any;
    emptyMsg: string;
  }[] = [
    {
      key: "bins",
      label: "Кошове",
      count: bins.length,
      icon: Recycle,
      emptyIcon: Trash,
      emptyMsg: "Няма чакащи кошове",
    },
    {
      key: "suggestions",
      label: "Предложения",
      count: suggestions.length,
      icon: PenLine,
      emptyIcon: PenLine,
      emptyMsg: "Няма чакащи предложения",
    },
    {
      key: "reports",
      label: "Отчети",
      count: reports.length,
      icon: Flag,
      emptyIcon: Flag,
      emptyMsg: "Няма активни отчети",
    },
    {
      key: "orgRequests",
      label: "Заявки",
      count: orgRequests.length,
      icon: Building,
      emptyIcon: Building,
      emptyMsg: "Няма чакащи заявки",
    },
  ];

  const activeConfig = tabs.find((t) => t.key === activeTab)!;
  const filtered = {
    bins: filteredBins,
    suggestions: filteredSuggestions,
    reports: filteredReports,
    orgRequests: filteredOrgRequests,
  }[activeTab];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <header className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-sm shadow-emerald-500/30">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-neutral-900 dark:text-white text-lg ml-1">
                Табло
              </span>
            </div>
            <span className="hidden sm:block text-neutral-300 dark:text-neutral-600">
              |
            </span>
            <span className="hidden sm:block text-xs text-neutral-400">
              Recyclix
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-neutral-500" />
              )}
            </button>
            <button
              onClick={loadData}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            </button>
            <LogoutButtonAlt />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            label="Общо кошове"
            value={stats.total}
            icon={Recycle}
            color="emerald"
          />
          <StatCard
            label="Одобрени"
            value={stats.approved}
            icon={CircleCheck}
            color="green"
          />
          <StatCard
            label="Чакащи"
            value={stats.pending}
            icon={List}
            color="amber"
          />
          <StatCard
            label="Предложения"
            value={stats.suggestions}
            icon={PenLine}
            color="blue"
          />
          <StatCard
            label="Активни отчети"
            value={stats.reports}
            icon={Flag}
            color="red"
          />
          <StatCard
            label="Заявки"
            value={stats.orgRequests}
            icon={Building}
            color="purple"
          />
        </div>

        <div className="bg-white dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/60 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 sm:px-5 pt-4 pb-0 border-b border-neutral-200 dark:border-neutral-700/60">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pb-4">
              <div className="flex gap-1 overflow-x-auto">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                        isActive
                          ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30"
                          : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-700 dark:hover:text-neutral-200"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                      <span
                        className={`ml-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold ${isActive ? "bg-white/20 text-white" : "bg-neutral-200 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-300"}`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="sm:ml-auto relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Търси..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 dark:border-neutral-600 rounded-lg bg-neutral-50 dark:bg-neutral-700/50 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {loading ? (
              <div className="flex justify-center py-16">
                <SimpleSpinningRecycling />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                {(() => {
                  const EmptyIcon = activeConfig.emptyIcon;
                  return (
                    <EmptyIcon className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                  );
                })()}
                <p className="text-sm text-neutral-400">
                  {searchQuery
                    ? "Няма намерени резултати"
                    : activeConfig.emptyMsg}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeTab === "bins" &&
                  filteredBins.map((bin) => (
                    <BinDetails
                      key={bin.id}
                      bin={bin}
                      onApprove={handleApproveBin}
                      onReject={handleRejectBin}
                    />
                  ))}
                {activeTab === "suggestions" &&
                  filteredSuggestions.map((s) => (
                    <SuggestionDetails
                      key={s.id}
                      suggestion={s}
                      onApprove={handleApproveSuggestion}
                      onReject={handleRejectSuggestion}
                    />
                  ))}
                {activeTab === "reports" &&
                  filteredReports.map((r) => (
                    <ReportDetails
                      key={r.id}
                      report={r}
                      onResolve={handleResolveReport}
                      onDelete={handleDeleteReport}
                    />
                  ))}
                {activeTab === "orgRequests" &&
                  filteredOrgRequests.map((r) => (
                    <OrganizationRequestDetails
                      key={r.id}
                      request={r}
                      onApprove={handleApproveOrgRequest}
                      onReject={handleRejectOrgRequest}
                    />
                  ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<
    "loading" | "authorized" | "unauthorized" | "error"
  >("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [debugInfo, setDebugInfo] = useState<Record<string, any>>({});

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        const hasLocalStorage =
          typeof window !== "undefined" && window.localStorage !== null;
        const debug: Record<string, any> = { hasLocalStorage };

        if (hasLocalStorage) {
          const allKeys: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) allKeys.push(key);
          }
          const supabaseKeys = allKeys.filter(
            (key) =>
              key.includes("supabase") ||
              key.includes("sb-") ||
              key.includes("auth"),
          );
          const storedToken = localStorage.getItem("supabase.auth.token");
          debug.allLocalStorageKeys = allKeys;
          debug.supabaseKeys = supabaseKeys;
          debug.hasToken = !!storedToken;
        }

        debug.cookies = document.cookie;
        debug.hasSessionCookie =
          document.cookie.includes("sb-") ||
          document.cookie.includes("supabase") ||
          document.cookie.includes("auth");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          if (isDev) {
            console.error("getUser error", userError);
          }
          debug.userError = userError.message;
          throw userError;
        }

        debug.hasUser = !!user;
        debug.userEmail = user?.email;
        debug.userId = user?.id;

        if (!user) {
          if (isDev) {
            console.log("No user found");
          }
          if (mounted) {
            setDebugInfo(debug);
            setStatus("unauthorized");
            setDebugInfo((prev) => ({ ...prev, reason: "no_session" }));
          }
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("user_profiles")
          .select("app_role")
          .eq("id", user.id)
          .single();

        debug.profileCheck = {
          exists: !profileError,
          app_role: profileData?.app_role,
          error: profileError?.message,
        };

        let isAdmin = false;

        if (!profileError && profileData?.app_role === "platform_admin") {
          isAdmin = true;
        }

        if (!isAdmin) {
          try {
            const { data: rpcData, error: rpcError } = await supabase.rpc(
              "is_platform_admin",
              { user_id: user.id },
            );

            debug.rpcCheck = {
              success: !rpcError,
              result: rpcData,
              error: rpcError?.message,
            };

            if (!rpcError && rpcData === true) {
              isAdmin = true;
            }
          } catch (rpcErr: any) {
            debug.rpcCheck = { error: rpcErr.message };
          }
        }

        debug.isAdmin = isAdmin;

        if (!isAdmin) {
          if (mounted) {
            setDebugInfo(debug);
            setStatus("unauthorized");
            setDebugInfo((prev) => ({ ...prev, reason: "not_admin" }));
          }
          return;
        }
        setDebugInfo(debug);
        if (mounted) setStatus("authorized");
      } catch (err: any) {
        if (isDev) {
          console.error("Unexpected error", err);
        }
        if (mounted) {
          setStatus("error");
          setErrorMessage(err.message || "Неизвестна грешка");
          setDebugInfo((prev) => ({ ...prev, error: err.message }));
        }
      }
    };

    check();
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-pulse">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm text-neutral-400">Проверка на права...</p>
        </div>
      </div>
    );
  }

  // при грешка
  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 p-4">
        <div className="text-center max-w-md mx-auto p-8 bg-white dark:bg-neutral-800 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4 border border-red-100 dark:border-red-900/30">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
            Възникна грешка
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
            {errorMessage}
          </p>

          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-mono text-left overflow-auto max-h-60">
            <p className="font-bold mb-2">Debug Info:</p>
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors shadow-sm shadow-emerald-500/30 mt-4"
          >
            <RefreshCw className="w-4 h-4" />
            Опитай отново
          </button>
        </div>
      </div>
    );
  }

  // при неавторизиран достъп
  if (status === "unauthorized") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <div className="text-center max-w-sm mx-auto p-8">
          <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4 border border-red-100 dark:border-red-900/30">
            <Shield className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
            Достъп отказан
          </h2>
          <p className="text-sm text-neutral-500 mb-5">
            {debugInfo.reason === "no_session"
              ? "Няма активна сесия. Моля, влезте в профила си."
              : "Нямате администраторски права за тази страница."}
          </p>

          {debugInfo.reason === "no_session" && (
            <a
              href="/auth/login"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm shadow-emerald-500/30"
            >
              Отиди на вход
            </a>
          )}
          {debugInfo.reason === "not_admin" && (
            <a
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm shadow-emerald-500/30"
            >
              Върни се начало
            </a>
          )}
        </div>
      </div>
    );
  }

  // при успешна автентикация
  return <>{children}</>;
}

export default function AdminPage() {
  return (
    <AdminRoute>
      <AdminPanel />
    </AdminRoute>
  );
}
