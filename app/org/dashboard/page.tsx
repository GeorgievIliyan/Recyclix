"use client";

import { useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/lib/supabase-browser";
import {
  CheckCircle,
  MapPin,
  User,
  Search,
  Loader2,
  Package,
  RefreshCw,
  Building,
  Sun,
  Moon,
  Calendar,
  Trash2,
  CircleCheck,
  Recycle,
  Flag,
  Info,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap,
  BarChart2,
  Layers,
  Weight,
  Cpu,
  X,
  Home,
  Settings2
} from "lucide-react";
import LeafletMap from "@/app/components/map-ui/LeafletMap";
import { isDev } from "@/lib/isDev";
import LogoutButtonAlt from "@/app/components/ui/LogoutButtonAlt";

//типове
export type OrgStatus = "pending" | "active" | "suspended" | "archived";
export type OrgPlan = "pilot" | string;

export interface Organization {
  id: string;
  name: string;
  description: string;
  status: OrgStatus;
  plan: OrgPlan;
  bins_limit: number;
  owner_user_id: string | null;
  created_at: string;
}

export interface RecyclingBin {
  id: string;
  created_at: string;
  updated_at: string | null;
  osm_id: string | null;
  lat: number | null;
  lon: number | null;
  tags: Record<string, any> | null;
  capacity: number | null;
  current_load: number | null;
  total_weight: number | null;
  organization_id: string | null;
  last_emptied: string | null;
  stats_today: Record<string, any> | null;
  code: string;
  image_url: string | null;
  is_smart: boolean | null;
}

export interface Report {
  id: string;
  bin_id: string;
  user_id: string;
  type: string;
  title: string;
  description?: string;
  resolved: boolean;
  created_at: string;
  user_username?: string;
  bin_code?: string;
  bin_lat?: number;
  bin_lon?: number;
}

export interface OrgStats {
  totalBins: number;
  activeBins: number;
  smartBins: number;
  openReports: number;
  resolvedReports: number;
  totalWeight: number;
}

//извличане на организацията на текущия потребител
async function fetchOrganization(): Promise<Organization> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User is not authenticated");

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("owner_user_id", user.id)
    .single();

  if (error) throw error;
  return data;
}

//извличане на контейнерите на организацията
async function fetchOrganizationBins(orgId: string): Promise<RecyclingBin[]> {
  const { data, error } = await supabase
    .from("recycling_bins")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

//извличане на докладите за контейнерите на организацията
async function fetchOrganizationReports(orgId: string): Promise<Report[]> {
  const { data, error } = await supabase
    .from("reports")
    .select(`
      *,
      recycling_bins!inner (
        code,
        lat,
        lon
      )
    `)
    .eq("recycling_bins.organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((r) => ({
    ...r,
    bin_code: r.recycling_bins?.code,
    bin_lat: r.recycling_bins?.lat,
    bin_lon: r.recycling_bins?.lon,
  }));
}

//изчисляване на обобщена статистика за организацията
async function fetchOrganizationStats(orgId: string): Promise<OrgStats> {
  const [bins, reports] = await Promise.all([
    fetchOrganizationBins(orgId),
    fetchOrganizationReports(orgId),
  ]);

  return {
    totalBins: bins.length,
    activeBins: bins.filter((b) => (b.current_load ?? 0) < (b.capacity ?? Infinity)).length,
    smartBins: bins.filter((b) => b.is_smart === true).length,
    openReports: reports.filter((r) => !r.resolved).length,
    resolvedReports: reports.filter((r) => r.resolved).length,
    totalWeight: bins.reduce((s: number, b: RecyclingBin) => s + Number(b.total_weight ?? 0), 0),
  };
}

//маркиране на доклад като разрешен
async function resolveReport(reportId: string): Promise<boolean> {
  const { error } = await supabase
    .from("reports")
    .update({ resolved: true, updated_at: new Date().toISOString() })
    .eq("id", reportId);

  if (error) {
    if (isDev) console.error("resolveReport error:", error);
    return false;
  }
  return true;
}

//изтриване на доклад заедно със снимките му
async function deleteReport(reportId: string): Promise<boolean> {
  await supabase
    .from("report_photos")
    .delete()
    .eq("report_id", reportId);

  const { error } = await supabase
    .from("reports")
    .delete()
    .eq("id", reportId);

  if (error) {
    if (isDev) console.error("deleteReport error:", error);
    return false;
  }
  return true;
}

//изчисляване на процент на запълване на контейнер
function getFillLevel(bin: RecyclingBin): number | null {
  if (bin.capacity == null || bin.capacity === 0) return null;
  return Math.min(100, Math.round(((bin.current_load ?? 0) / bin.capacity) * 100));
}

//определяне на статус на контейнер спрямо запълването
function getBinStatus(bin: RecyclingBin): "full" | "high" | "ok" | "empty" {
  const pct = getFillLevel(bin);
  if (pct == null || pct == 0) return "empty";
  if (pct >= 90) return "full";
  if (pct >= 65) return "high";
  return "ok";
}

const BIN_STATUS_LABELS: Record<string, string> = {
  full: "Пълен",
  high: "Високо",
  ok: "Ок",
  empty: "Празен",
};

const REPORT_TYPE_LABELS: Record<string, string> = {
  incorrect_location: "Грешна локация",
  bin_missing: "Липсващ кош",
  bin_damaged: "Повреден кош",
  wrong_materials: "Грешни материали",
  overflowing: "Препълнен",
  duplicate: "Дубликат",
  other: "Друго",
};

const ORG_STATUS_LABELS: Record<string, string> = {
  pending: "Изчакваща",
  active: "Активна",
  suspended: "Замръзена",
  archived: "Архивирана",
};

//обща карта контейнер
function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 rounded-xl shadow-sm ${className ?? ""}`}>
      {children}
    </div>
  );
}

//значка за статус с цветово кодиране
function StatusBadge({ status, labels }: { status: string; labels?: Record<string, string> }) {
  const colors: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800",
    ok: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800",
    resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800",
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-800",
    high: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-800",
    full: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800",
    open: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800",
    suspended: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800",
    empty: "bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400 ring-1 ring-neutral-200 dark:ring-neutral-600",
    archived: "bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400 ring-1 ring-neutral-200 dark:ring-neutral-600",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${colors[status] ?? colors.pending}`}>
      {labels?.[status] ?? status}
    </span>
  );
}

//бутон за действие с различни стилове спрямо вариант
function ActionButton({
  onClick, disabled, variant, icon: Icon, label,
}: {
  onClick: () => void;
  disabled: boolean;
  variant: "approve" | "reject" | "email" | "resolve" | "neutral";
  icon: React.ElementType;
  label: string;
}) {
  const styles: Record<string, string> = {
    approve: "bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white shadow-emerald-500/20",
    resolve: "bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white shadow-emerald-500/20",
    reject: "bg-white hover:bg-red-50 dark:bg-neutral-700 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800",
    email: "bg-white hover:bg-blue-50 dark:bg-neutral-700 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800",
    neutral: "bg-white hover:bg-neutral-100 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-600 dark:text-neutral-300 ring-1 ring-neutral-200 dark:ring-neutral-600",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed ${styles[variant]}`}
    >
      {disabled ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
      <span>{label}</span>
    </button>
  );
}

//ред с икона, надпис и стойност
function MetaRow({ icon: Icon, label, value, onClick }: { icon: React.ElementType; label: string; value: ReactNode; onClick?: () => void }) {
  return (
    <div className="flex items-start gap-2.5" onClick={onClick} style={onClick ? { cursor: "pointer" } : undefined}>
      <Icon className="w-3.5 h-3.5 text-neutral-400 mt-0.5 shrink-0" />
      <div>
        <span className="text-xs text-neutral-500 dark:text-neutral-400 block">{label}</span>
        <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{value}</span>
      </div>
    </div>
  );
}

//лента за визуализация на запълването
function FillBar({ level }: { level: number }) {
  const color =
    level >= 90 ? "bg-red-500" :
      level >= 65 ? "bg-amber-400" :
        "bg-emerald-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-700 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${level}%` }} />
      </div>
      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 w-8 text-right">{level}%</span>
    </div>
  );
}

//картичка за статистика с икона и стойност
function StatCard({
  label, value, icon: Icon, color, subtext,
}: {
  label: string; value: number | string; icon: React.ElementType; color: string; subtext?: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-600 bg-emerald-600/10 dark:bg-emerald-900/20",
    green: "text-green-500 bg-green-500/10 dark:bg-green-900/20",
    amber: "text-amber-500 bg-amber-50 dark:bg-amber-900/20",
    blue: "text-sky-500 bg-sky-500/10 dark:bg-sky-800/20",
    red: "text-red-500 bg-red-50 dark:bg-red-900/20",
    purple: "text-purple-500 bg-purple-50 dark:bg-purple-900/20",
    neutral: "text-neutral-500 bg-neutral-100 dark:bg-neutral-700",
    teal: "text-teal-500 bg-teal-50 dark:bg-teal-900/20",
  };
  return (
    <div className="bg-white dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 rounded-xl p-4 shadow-sm flex items-center gap-3">
      <div className={`p-2.5 rounded-lg shrink-0 ${colorMap[color]}`}>
        <Icon className={`w-6 h-6 ${colorMap[color].split(" ")[0]}`} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-neutral-900 dark:text-white leading-none truncate">{value}</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">{label}</p>
        {subtext && <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate">{subtext}</p>}
      </div>
    </div>
  );
}

//модал с карта за показване на местоположение
function MapModal({ lat, lon, onClose }: { lat: number; lon: number; onClose: () => void }) {
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

//карта за един контейнер с детайли и тагове
function BinCard({ bin }: { bin: RecyclingBin }) {
  const [expanded, setExpanded] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const fillLevel = getFillLevel(bin);
  const binStatus = getBinStatus(bin);
  const recyclingType = bin.tags?.recycling_type as string | undefined;

  return (
    <Card>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Recycle className="w-5 h-5 text-emerald-500 shrink-0" />
              <span className="text-xs font-mono text-neutral-600 bg-neutral-100 dark:bg-neutral-700 dark:text-neutral-400 px-2 py-0.5 rounded">
                {bin.code}
              </span>
              {bin.is_smart && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                  <Zap className="w-3 h-3" /> Smart
                </span>
              )}
              {recyclingType && (
                <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 capitalize">
                  {recyclingType}
                </span>
              )}
            </div>
          </div>
          <StatusBadge status={binStatus} labels={BIN_STATUS_LABELS} />
        </div>

        {fillLevel != null && (
          <div className="mb-4">
            <p className="text-xs text-neutral-400 mb-1.5">Ниво на запълване</p>
            <FillBar level={fillLevel} />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <MetaRow
            icon={Calendar}
            label="Добавен на"
            value={new Date(bin.created_at).toLocaleDateString("bg-BG", { year: "numeric", month: "short", day: "numeric" })}
          />
          <MetaRow
            icon={Clock}
            label="Последно изпразнен"
            value={bin.last_emptied ? new Date(bin.last_emptied).toLocaleDateString("bg-BG") : "Никога"}
          />
          {bin.capacity != null && (
            <MetaRow
              icon={Layers}
              label="Запълненост / Обем"
              value={`${bin.current_load ?? 0} / ${bin.capacity} L`}
            />
          )}
          {(bin.total_weight ?? 0) > 0 && (
            <MetaRow
              icon={Weight}
              label="Общо събрана маса"
              value={`${Number(bin.total_weight).toLocaleString()} kg`}
            />
          )}
          {bin.lat != null && bin.lon != null && (
            <MetaRow
              icon={MapPin}
              label="Координати"
              value={
                <span className="text-emerald-600 dark:text-emerald-400 hover:underline font-mono cursor-pointer">
                  {bin.lat.toFixed(5)}, {bin.lon.toFixed(5)}
                </span>
              }
              onClick={() => setShowMap(true)}
            />
          )}
        </div>

        {bin.tags && Object.keys(bin.tags).length > 0 && (
          <>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-3 flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              <Info className="w-3 h-3" />
              Тагове
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {expanded && (
              <div className="mt-2 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-700/40 border border-neutral-200 dark:border-neutral-700">
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(bin.tags).map(([k, v]) => (
                    <span key={k} className="text-xs font-mono bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded px-1.5 py-0.5 text-neutral-600 dark:text-neutral-300">
                      <span className="text-neutral-400">{k}=</span>{String(v)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showMap && bin.lat != null && bin.lon != null && (
        <MapModal lat={bin.lat} lon={bin.lon} onClose={() => setShowMap(false)} />
      )}
    </Card>
  );
}

//карта за един доклад с действия за разрешаване и изтриване
function ReportCard({
  report, onResolve, onDelete,
}: {
  report: Report;
  onResolve: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [processing, setProcessing] = useState<"resolve" | "delete" | null>(null);

  const handle = async (action: "resolve" | "delete") => {
    setProcessing(action);
    if (action === "resolve") await onResolve(report.id);
    else await onDelete(report.id);
    setProcessing(null);
  };

  return (
    <Card>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Flag className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                {REPORT_TYPE_LABELS[report.type] ?? report.type}
              </span>
              {report.bin_code && (
                <span className="text-xs font-mono text-neutral-400 bg-neutral-100 dark:bg-neutral-700 px-2 py-0.5 rounded">
                  {report.bin_code}
                </span>
              )}
            </div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">{report.title}</h3>
          </div>
          <StatusBadge
            status={report.resolved ? "resolved" : "open"}
            labels={{ resolved: "Разрешен", open: "Отворен" }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <MetaRow icon={User} label="Докладван от" value={report.user_username ?? "Анонимен"} />
          <MetaRow
            icon={Calendar}
            label="Дата"
            value={new Date(report.created_at).toLocaleDateString("bg-BG", { year: "numeric", month: "long", day: "numeric" })}
          />
          {report.bin_lat != null && report.bin_lon != null && (
            <MetaRow
              icon={MapPin}
              label="Локация на кош"
              value={<span className="font-mono">{report.bin_lat.toFixed(4)}, {report.bin_lon.toFixed(4)}</span>}
            />
          )}
        </div>

        {report.description && (
          <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-700/40 border border-neutral-200 dark:border-neutral-700">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1.5">Описание</p>
            <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">{report.description}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-neutral-100 dark:border-neutral-700/60 bg-neutral-50/50 dark:bg-neutral-800/30 rounded-b-xl">
        <ActionButton onClick={() => handle("delete")} disabled={!!processing} variant="reject" icon={Trash2} label="Изтрий" />
        {!report.resolved && (
          <ActionButton onClick={() => handle("resolve")} disabled={!!processing} variant="resolve" icon={CheckCircle} label="Разреши" />
        )}
      </div>
    </Card>
  );
}

//банер с информация за организацията
function OrgProfileBanner({ org }: { org: Organization }) {
  const planColors: Record<string, string> = {
    pilot: "bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400",
    pro: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
    enterprise: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  };

  return (
    <Card className="p-5">
      <div className="flex flex-row sm:items-center gap-4">
        <div className="w-18 h-18 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-sm shadow-emerald-500/20 shrink-0">
          <Building className="w-9 h-9 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white truncate">{org.name}</h2>
            <StatusBadge status={org.status} labels={ORG_STATUS_LABELS} />
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${planColors[org.plan] ?? planColors.pilot}`}>
              {org.plan} план
            </span>
          </div>
          {org.description && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed line-clamp-2">{org.description}</p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
            <span className="flex items-center gap-1 text-xs text-neutral-400">
              <Package className="w-3 h-3" />
              Лимит: <span className="font-medium text-neutral-600 dark:text-neutral-300 ml-0.5">{org.bins_limit}</span>
            </span>
            <span className="flex items-center gap-1 text-xs text-neutral-400">
              <Calendar className="w-3 h-3" />
              От {new Date(org.created_at).toLocaleDateString("bg-BG", { year: "numeric", month: "short" })}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// главен компонент на таблото на организацията
export function OrganizationDashboard() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [bins, setBins] = useState<RecyclingBin[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<OrgStats>({
    totalBins: 0, activeBins: 0, smartBins: 0,
    openReports: 0, resolvedReports: 0, totalWeight: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"bins" | "reports">("bins");
  const [searchQuery, setSearchQuery] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    loadData();
    try {
      const isDark =
        localStorage.getItem("darkMode") === "true" ||
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      setDarkMode(isDark);
      if (isDark) document.documentElement.classList.add("dark");
    } catch {}
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    try { localStorage.setItem("darkMode", String(next)); } catch { }
    document.documentElement.classList.toggle("dark", next);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const orgData = await fetchOrganization();
      setOrg(orgData);

      const [binsData, reportsData, statsData] = await Promise.all([
        fetchOrganizationBins(orgData.id),
        fetchOrganizationReports(orgData.id),
        fetchOrganizationStats(orgData.id),
      ]);

      setBins(binsData);
      setReports(reportsData);
      setStats(statsData);
    } catch (e) {
      console.error("OrganizationDashboard loadData error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveReport = async (id: string) => {
    if (await resolveReport(id)) loadData();
  };
  const handleDeleteReport = async (id: string) => {
    if (await deleteReport(id)) loadData();
  };

  const q = searchQuery.toLowerCase();
  const filteredBins = bins.filter((b) =>
    [b.code, b.tags?.recycling_type, b.tags?.operator, b.osm_id].some(
      (f) => String(f ?? "").toLowerCase().includes(q)
    )
  );
  const filteredReports = reports.filter((r) =>
    [r.title, r.type, r.description, r.bin_code, r.user_username].some(
      (f) => String(f ?? "").toLowerCase().includes(q)
    )
  );

  const tabs: { key: "bins" | "reports"; label: string; count: number; icon: React.ElementType; emptyMsg: string }[] = [
    { key: "bins", label: "Контейнери", count: bins.length, icon: Recycle, emptyMsg: "Все още нямате контейнери." },
    { key: "reports", label: "Доклади", count: reports.length, icon: Flag, emptyMsg: "Засега нямата доклади относно ваши контейнери." },
  ];

  const filtered = activeTab === "bins" ? filteredBins : filteredReports;
  const activeConfig = tabs.find((t) => t.key === activeTab)!;
  const ActiveEmptyIcon = activeConfig.icon;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <header className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Settings2 className="text-green-500 h-6 w-6"/>
              <span className="font-semibold text-neutral-900 dark:text-white text-lg ml-1">
                Контролен панел
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="смяна на тема"
            >
              {darkMode
                ? <Sun className="w-4 h-4 text-amber-400" />
                : <Moon className="w-4 h-4 text-neutral-500" />}
            </button>
            <button
              onClick={loadData}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="опресни"
            >
              <RefreshCw className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            </button>
            <a
              onClick={loadData}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="начало"
              href="/app/dashboard"
            >
              <Home className="w-4.5 h-4.5 text-neutral-500 dark:text-neutral-400" />
            </a>
            <LogoutButtonAlt />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

        {!loading && org && <OrgProfileBanner org={org} />}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="общо контейнери" value={stats.totalBins} icon={Recycle} color="emerald" />
          <StatCard label="активни" value={stats.activeBins} icon={CircleCheck} color="green" />
          <StatCard label="Smart" value={stats.smartBins} icon={Cpu} color="blue" />
          <StatCard label="открити" value={stats.openReports} icon={Flag} color="red" />
          <StatCard label="разрешени" value={stats.resolvedReports} icon={CheckCircle} color="teal" />
          <StatCard
            label="събран боклук"
            value={`${(stats.totalWeight / 1000).toFixed(1)} т`}
            icon={BarChart2}
            color="amber"
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
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${isActive
                          ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30"
                          : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-700 dark:hover:text-neutral-200"
                        }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                      <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold ${isActive
                          ? "bg-white/20 text-white"
                          : "bg-neutral-200 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-300"
                        }`}>
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
                  placeholder="Търси по код/тип"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 dark:border-neutral-600 rounded-lg bg-neutral-50 dark:bg-neutral-700/50 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                <p className="text-sm text-neutral-400">Зареждане...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <ActiveEmptyIcon className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                <p className="text-sm text-neutral-400">
                  {searchQuery ? "Няма намерени резултати." : activeConfig.emptyMsg}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeTab === "bins" && filteredBins.map((bin) => (
                  <BinCard key={bin.id} bin={bin} />
                ))}
                {activeTab === "reports" && filteredReports.map((r) => (
                  <ReportCard
                    key={r.id}
                    report={r}
                    onResolve={handleResolveReport}
                    onDelete={handleDeleteReport}
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

export default OrganizationDashboard;