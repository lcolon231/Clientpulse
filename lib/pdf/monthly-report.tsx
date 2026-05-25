import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { HealthResult } from "@/lib/health/score";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DeviceRow {
  hostname: string;
  type: string;
  osVersion: string;
  patchAgeDays: number;
  band: HealthResult["band"];
}

export interface AuditRow {
  action: string;
  createdAt: string;
  userEmail: string | null;
}

export interface MonthlyReportData {
  orgName: string;
  clientName: string;
  clientId: string;
  reportMonth: string; // "May 2026"
  generatedDate: string; // "May 23, 2026"
  health: HealthResult;
  devices: DeviceRow[];
  auditLogs: AuditRow[];
}

// ---------------------------------------------------------------------------
// Colors — mirror the dashboard badge palette
// ---------------------------------------------------------------------------

const BAND_COLOR: Record<HealthResult["band"], string> = {
  HEALTHY: "#22c55e",
  FAIR: "#3b82f6",
  AT_RISK: "#f59e0b",
  CRITICAL: "#ef4444",
};

const BAND_LABEL: Record<HealthResult["band"], string> = {
  HEALTHY: "Healthy",
  FAIR: "Fair",
  AT_RISK: "At Risk",
  CRITICAL: "Critical",
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 40,
    color: "#1e293b",
  },

  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  logoText: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#6366f1" },
  reportTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#1e293b" },
  headerMeta: { fontSize: 8, color: "#64748b", marginTop: 3, lineHeight: 1.5 },

  // Section
  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#64748b",
    marginBottom: 8,
  },

  // Health score card
  healthCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  healthScore: {
    fontSize: 36,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1,
  },
  healthBandPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  healthBandText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  healthComponentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  healthComponentLabel: { fontSize: 8, color: "#475569" },
  healthComponentScore: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
  },

  // Stats row
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
  },
  statBox: {
    flex: 1,
    padding: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
  },
  statLabel: { fontSize: 7, color: "#64748b", marginTop: 2 },

  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 3,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  tableRowAlt: { backgroundColor: "#fafafa" },
  tableCell: { fontSize: 8, color: "#334155" },
  tableHeaderCell: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    textTransform: "uppercase",
  },

  // Band pill (inline)
  bandPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    alignSelf: "flex-start",
  },
  bandPillText: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#fff" },

  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
  },
  footerText: { fontSize: 7, color: "#94a3b8" },
});

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function BandPill({ band }: { band: HealthResult["band"] }) {
  return (
    <View style={[s.bandPill, { backgroundColor: BAND_COLOR[band] }]}>
      <Text style={s.bandPillText}>{BAND_LABEL[band]}</Text>
    </View>
  );
}

function DevicesTable({ devices }: { devices: DeviceRow[] }) {
  const colWidths = ["28%", "14%", "22%", "13%", "14%"];

  return (
    <View>
      <View style={s.tableHeader}>
        {["Hostname", "Type", "OS Version", "Patch Age", "Health"].map(
          (h, i) => (
            <Text
              key={h}
              style={[s.tableHeaderCell, { width: colWidths[i] }]}
            >
              {h}
            </Text>
          ),
        )}
      </View>
      {devices.map((d, i) => (
        <View
          key={`${d.hostname}-${i}`}
          style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
        >
          <Text style={[s.tableCell, { width: colWidths[0] }]}>
            {d.hostname}
          </Text>
          <Text style={[s.tableCell, { width: colWidths[1] }]}>{d.type}</Text>
          <Text style={[s.tableCell, { width: colWidths[2] }]}>
            {d.osVersion || "—"}
          </Text>
          <Text style={[s.tableCell, { width: colWidths[3] }]}>
            {d.patchAgeDays}d
          </Text>
          <View style={{ width: colWidths[4] }}>
            <BandPill band={d.band} />
          </View>
        </View>
      ))}
      {devices.length === 0 && (
        <Text style={[s.tableCell, { paddingVertical: 8, color: "#94a3b8" }]}>
          No devices registered.
        </Text>
      )}
    </View>
  );
}

function AuditTable({ logs }: { logs: AuditRow[] }) {
  const colWidths = ["38%", "32%", "30%"];

  return (
    <View>
      <View style={s.tableHeader}>
        {["Action", "Date", "User"].map((h, i) => (
          <Text
            key={h}
            style={[s.tableHeaderCell, { width: colWidths[i] }]}
          >
            {h}
          </Text>
        ))}
      </View>
      {logs.map((log, i) => (
        <View
          key={i}
          style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
        >
          <Text style={[s.tableCell, { width: colWidths[0] }]}>
            {log.action}
          </Text>
          <Text style={[s.tableCell, { width: colWidths[1] }]}>
            {log.createdAt}
          </Text>
          <Text style={[s.tableCell, { width: colWidths[2] }]}>
            {log.userEmail ?? "System"}
          </Text>
        </View>
      ))}
      {logs.length === 0 && (
        <Text style={[s.tableCell, { paddingVertical: 8, color: "#94a3b8" }]}>
          No activity in the last 30 days.
        </Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

function MonthlyReportDocument({ data }: { data: MonthlyReportData }) {
  const { health, devices } = data;

  const healthyCount = devices.filter((d) => d.band === "HEALTHY").length;
  const atRiskCount = devices.filter((d) => d.band === "AT_RISK").length;
  const criticalCount = devices.filter((d) => d.band === "CRITICAL").length;

  return (
    <Document
      title={`Monthly Health Report — ${data.clientName} — ${data.reportMonth}`}
      author="ClientPulse"
    >
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.logoText}>ClientPulse</Text>
            <Text style={s.reportTitle}>Monthly Health Report</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[s.reportTitle, { fontSize: 10 }]}>
              {data.clientName}
            </Text>
            <Text style={s.headerMeta}>
              Period: {data.reportMonth}
              {"\n"}Generated: {data.generatedDate}
            </Text>
          </View>
        </View>

        {/* Health Score */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Health Score</Text>
          <View style={s.healthCard}>
            <Text
              style={[s.healthScore, { color: BAND_COLOR[health.band] }]}
            >
              {health.score}
            </Text>
            <View>
              <View
                style={[
                  s.healthBandPill,
                  { backgroundColor: BAND_COLOR[health.band] },
                ]}
              >
                <Text style={s.healthBandText}>
                  {BAND_LABEL[health.band]}
                </Text>
              </View>
              {health.components.map((c) => (
                <View key={c.name} style={s.healthComponentRow}>
                  <Text style={s.healthComponentLabel}>{c.name}</Text>
                  <Text style={s.healthComponentScore}>
                    {" "}
                    {c.score}/100
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Device Stats */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Devices Summary</Text>
          <View style={s.statsRow}>
            <View style={s.statBox}>
              <Text style={s.statValue}>{devices.length}</Text>
              <Text style={s.statLabel}>Total</Text>
            </View>
            <View style={[s.statBox, { borderColor: BAND_COLOR.HEALTHY }]}>
              <Text style={[s.statValue, { color: BAND_COLOR.HEALTHY }]}>
                {healthyCount}
              </Text>
              <Text style={s.statLabel}>Healthy</Text>
            </View>
            <View style={[s.statBox, { borderColor: BAND_COLOR.AT_RISK }]}>
              <Text style={[s.statValue, { color: BAND_COLOR.AT_RISK }]}>
                {atRiskCount}
              </Text>
              <Text style={s.statLabel}>At Risk</Text>
            </View>
            <View style={[s.statBox, { borderColor: BAND_COLOR.CRITICAL }]}>
              <Text style={[s.statValue, { color: BAND_COLOR.CRITICAL }]}>
                {criticalCount}
              </Text>
              <Text style={s.statLabel}>Critical</Text>
            </View>
          </View>
          <DevicesTable devices={devices} />
        </View>

        {/* Audit Activity */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>
            Audit Activity — Last 30 Days (max 20)
          </Text>
          <AuditTable logs={data.auditLogs} />
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Generated by ClientPulse</Text>
          <Text style={s.footerText}>{data.orgName}</Text>
        </View>
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function generateMonthlyReportPDF(
  data: MonthlyReportData,
): Promise<Buffer> {
  const element = <MonthlyReportDocument data={data} />;
  return renderToBuffer(element) as Promise<Buffer>;
}
