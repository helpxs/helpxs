import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Svg,
  Rect,
  Path,
} from "@react-pdf/renderer"
import type { ReportData, LabelCount } from "@/lib/types"
import { HX, type ExportContext } from "./colors"

// Tailwind-y default fonts get rendered server-side by react-pdf, which only
// embeds Helvetica/Times/Courier without explicit registration. That's fine
// for a cream/cardinal report — Helvetica is close enough to DM Sans for body
// text. We deliberately avoid an external font fetch to keep this bundle
// small and offline-friendly.

const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 56,
    backgroundColor: HX.bg,
    color: HX.ink,
    fontFamily: "Helvetica",
    fontSize: 11,
    lineHeight: 1.45,
  },
  eyebrow: {
    fontSize: 9,
    color: HX.accent,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  h1: {
    fontSize: 32,
    fontFamily: "Helvetica-Bold",
    color: HX.ink,
    letterSpacing: -0.8,
    lineHeight: 1.1,
    marginBottom: 14,
  },
  h2: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: HX.ink,
    marginBottom: 10,
    marginTop: 18,
  },
  meta: {
    fontSize: 10,
    color: HX.inkSoft,
    marginBottom: 4,
  },
  body: {
    fontSize: 11,
    color: HX.inkSoft,
    lineHeight: 1.6,
    marginBottom: 8,
  },
  card: {
    backgroundColor: HX.surface,
    borderRadius: 12,
    padding: 14,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 10,
    marginVertical: 10,
  },
  kpi: {
    flex: 1,
    backgroundColor: HX.surface,
    borderRadius: 12,
    padding: 14,
  },
  kpiHero: {
    backgroundColor: HX.accentSoft,
  },
  kpiLabel: {
    fontSize: 9,
    color: HX.inkSoft,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  kpiLabelHero: {
    color: HX.accent,
  },
  kpiValue: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: HX.ink,
    letterSpacing: -0.6,
  },
  kpiValueHero: {
    color: HX.accent,
  },
  kpiDelta: {
    fontSize: 9,
    color: HX.inkSoft,
    marginTop: 4,
  },
  kpiDeltaHero: {
    color: HX.accent,
  },
  divider: {
    height: 1,
    backgroundColor: HX.line,
    marginVertical: 14,
  },
  twoCol: {
    flexDirection: "row",
    gap: 14,
    marginTop: 6,
  },
  col: { flex: 1 },
  barRow: {
    marginBottom: 7,
  },
  barRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  barRowLabel: { fontSize: 10, color: HX.ink },
  barRowCount: { fontSize: 10, color: HX.inkMute },
  barTrack: { height: 5, backgroundColor: HX.surfaceAlt, borderRadius: 3 },
  barFill: { height: 5, backgroundColor: HX.accent, borderRadius: 3 },
  legendRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 8,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendSwatch: { width: 8, height: 8, borderRadius: 2 },
  legendLabel: { fontSize: 9, color: HX.ink },
  legendValue: { fontSize: 9, color: HX.inkMute },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 56,
    right: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: HX.inkMute,
  },
  pageNumber: {
    fontSize: 8,
    color: HX.inkMute,
  },
})

function Footer({ orgName }: { orgName: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>{orgName} · privacy-safe by design · no student identifiers</Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `${pageNumber} / ${totalPages}`
        }
        style={styles.pageNumber}
      />
    </View>
  )
}

function Logo() {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 24,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: HX.accent,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: HX.white, fontSize: 12, fontFamily: "Helvetica-Bold" }}>
          h
        </Text>
      </View>
      <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: HX.ink }}>
        HelpXs
      </Text>
    </View>
  )
}

function Bar({ label, count, max }: LabelCount & { max: number }) {
  const pct = max > 0 ? Math.max(2, (count / max) * 100) : 0
  return (
    <View style={styles.barRow}>
      <View style={styles.barRowHeader}>
        <Text style={styles.barRowLabel}>{label}</Text>
        <Text style={styles.barRowCount}>{count}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>
    </View>
  )
}

function TopList({ items, max = 8 }: { items: LabelCount[]; max?: number }) {
  if (items.length === 0) {
    return <Text style={{ fontSize: 10, color: HX.inkMute }}>No data.</Text>
  }
  const top = items.slice(0, max)
  const peak = Math.max(...top.map((i) => i.count), 1)
  return (
    <View>
      {top.map((i) => (
        <Bar key={i.label} {...i} max={peak} />
      ))}
    </View>
  )
}

function BucketList({ data }: { data: Record<string, number> }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0)
  if (total === 0) {
    return <Text style={{ fontSize: 10, color: HX.inkMute }}>No data.</Text>
  }
  const items = Object.entries(data)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
  return (
    <View>
      {items.map(({ label, count }) => {
        const pct = Math.round((count / total) * 100)
        return (
          <View
            key={label}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingVertical: 4,
              borderBottomWidth: 0.5,
              borderBottomColor: HX.line,
            }}
          >
            <Text style={{ fontSize: 10, color: HX.ink }}>{label}</Text>
            <Text style={{ fontSize: 10, color: HX.inkSoft }}>
              {count} · {pct}%
            </Text>
          </View>
        )
      })}
    </View>
  )
}

function FormatMixSegment({
  formatMix,
}: {
  formatMix: ReportData["formatMix"]
}) {
  const total =
    formatMix.individual + formatMix.group + formatMix.workshop || 1
  const pct = {
    individual: Math.round((formatMix.individual / total) * 100),
    group: Math.round((formatMix.group / total) * 100),
    workshop: Math.round((formatMix.workshop / total) * 100),
  }
  const W = 460
  const H = 14
  const indW = (pct.individual / 100) * W
  const grpW = (pct.group / 100) * W
  return (
    <View>
      <Svg width={W} height={H}>
        <Rect x={0} y={0} width={indW} height={H} fill={HX.accent} rx={3} />
        <Rect
          x={indW}
          y={0}
          width={grpW}
          height={H}
          fill={HX.accentMid}
          rx={3}
        />
        <Rect
          x={indW + grpW}
          y={0}
          width={Math.max(0, W - indW - grpW)}
          height={H}
          fill={HX.line}
          rx={3}
        />
      </Svg>
      <View style={styles.legendRow}>
        <View style={styles.legend}>
          <View style={[styles.legendSwatch, { backgroundColor: HX.accent }]} />
          <Text style={styles.legendLabel}>Individual</Text>
          <Text style={styles.legendValue}>{pct.individual}%</Text>
        </View>
        <View style={styles.legend}>
          <View
            style={[styles.legendSwatch, { backgroundColor: HX.accentMid }]}
          />
          <Text style={styles.legendLabel}>Group</Text>
          <Text style={styles.legendValue}>{pct.group}%</Text>
        </View>
        <View style={styles.legend}>
          <View style={[styles.legendSwatch, { backgroundColor: HX.line }]} />
          <Text style={styles.legendLabel}>Workshop</Text>
          <Text style={styles.legendValue}>{pct.workshop}%</Text>
        </View>
      </View>
    </View>
  )
}

function WeeklyTrendChart({
  weeks,
  width = 460,
  height = 110,
}: {
  weeks: number[]
  width?: number
  height?: number
}) {
  const max = Math.max(...weeks, 1)
  const padding = 18
  const chartW = width - padding * 2
  const chartH = height - padding
  const stepX = chartW / Math.max(weeks.length - 1, 1)
  const points = weeks.map((v, i) => {
    const x = padding + i * stepX
    const y = padding + chartH - (v / max) * chartH
    return { x, y, v }
  })
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ")
  const fill =
    `${path} L ${points[points.length - 1].x.toFixed(1)} ${(padding + chartH).toFixed(1)} ` +
    `L ${points[0].x.toFixed(1)} ${(padding + chartH).toFixed(1)} Z`
  return (
    <Svg width={width} height={height}>
      <Path d={fill} fill={HX.accentSoft} />
      <Path d={path} stroke={HX.accent} strokeWidth={1.6} fill="none" />
      {points.map((p, i) => (
        <Rect
          key={i}
          x={p.x - 1.4}
          y={p.y - 1.4}
          width={2.8}
          height={2.8}
          fill={HX.accent}
        />
      ))}
    </Svg>
  )
}

function ReportDocument({
  report,
  ctx,
  includes,
}: {
  report: ReportData
  ctx: ExportContext
  includes: Record<string, boolean>
}) {
  const periodLabel = capitalize(report.windowLabel)
  return (
    <Document
      title={`${ctx.orgName} · ${periodLabel}`}
      author={ctx.orgName}
      creator="HelpXs"
      producer="HelpXs"
    >
      {/* === COVER === */}
      <Page size="A4" style={styles.page}>
        <Logo />
        <Text style={styles.eyebrow}>
          {ctx.audienceLabel} · {periodLabel}
        </Text>
        <Text style={styles.h1}>{ctx.orgName}</Text>
        <Text style={styles.body}>
          {report.kpis.sessions === 0
            ? "No sessions logged yet for this period."
            : report.narrative}
        </Text>

        <View style={styles.kpiRow}>
          <View style={[styles.kpi, styles.kpiHero]}>
            <Text style={[styles.kpiLabel, styles.kpiLabelHero]}>Sessions</Text>
            <Text style={[styles.kpiValue, styles.kpiValueHero]}>
              {report.kpis.sessions}
            </Text>
            <Text style={[styles.kpiDelta, styles.kpiDeltaHero]}>
              {report.kpis.sessionsDelta} vs {report.prevLabel}
            </Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Coaches</Text>
            <Text style={styles.kpiValue}>{report.kpis.coachesActive}</Text>
            <Text style={styles.kpiDelta}>active this period</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Avg entry</Text>
            <Text style={styles.kpiValue}>{report.kpis.avgEntryTime}</Text>
            <Text style={styles.kpiDelta}>per session</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Referrals</Text>
            <Text style={styles.kpiValue}>{report.kpis.referrals}</Text>
            <Text style={styles.kpiDelta}>
              {report.kpis.referralsDelta} vs {report.prevLabel}
            </Text>
          </View>
        </View>

        {includes.trends && (
          <>
            <Text style={styles.h2}>Session volume — last 12 weeks</Text>
            <WeeklyTrendChart weeks={report.weeklySessions} />
          </>
        )}

        <Footer orgName={ctx.orgName} />
      </Page>

      {/* === BREAKDOWNS === */}
      {(includes.topics || includes.demographics) && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.eyebrow}>Breakdown · {periodLabel}</Text>
          <Text style={styles.h1}>What students worked on</Text>

          {includes.topics && (
            <>
              <View style={styles.twoCol}>
                <View style={styles.col}>
                  <Text style={styles.h2}>Topics</Text>
                  <TopList items={report.topTopics} />
                </View>
                <View style={styles.col}>
                  <Text style={styles.h2}>Interventions used</Text>
                  <TopList items={report.interventions} />
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.h2}>Format mix</Text>
              <FormatMixSegment formatMix={report.formatMix} />
            </>
          )}

          {includes.demographics && (
            <>
              <View style={styles.divider} />
              <Text style={styles.h2}>Anonymized demographics</Text>
              <View style={styles.twoCol}>
                <View style={styles.col}>
                  <Text style={[styles.kpiLabel, { marginBottom: 6 }]}>
                    Gender
                  </Text>
                  <BucketList data={report.demographics.gender} />
                </View>
                <View style={styles.col}>
                  <Text style={[styles.kpiLabel, { marginBottom: 6 }]}>
                    Age range
                  </Text>
                  <BucketList data={report.demographics.ageRange} />
                </View>
                <View style={styles.col}>
                  <Text style={[styles.kpiLabel, { marginBottom: 6 }]}>
                    Degree level
                  </Text>
                  <BucketList data={report.demographics.degreeLevel} />
                </View>
              </View>
            </>
          )}

          <Footer orgName={ctx.orgName} />
        </Page>
      )}

      {/* === REFERRALS + COACH LOAD === */}
      {(includes.referrals || includes["coach-load"]) && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.eyebrow}>Operations · {periodLabel}</Text>
          <Text style={styles.h1}>Referrals & coach load</Text>

          {includes.referrals && (
            <>
              <Text style={styles.body}>
                {report.kpis.referrals} of {report.kpis.sessions} sessions
                resulted in a referral
                {report.kpis.sessions > 0
                  ? ` (${Math.round(
                      (report.kpis.referrals / report.kpis.sessions) * 100,
                    )}%)`
                  : ""}
                .
              </Text>
              <Text style={styles.h2}>Where students were referred</Text>
              <TopList items={report.referralDestinations} />
            </>
          )}

          {includes["coach-load"] && (
            <>
              {includes.referrals && <View style={styles.divider} />}
              <Text style={styles.h2}>Sessions per coach</Text>
              <TopList
                items={report.coachLoad.map((c) => ({
                  label: c.name,
                  count: c.count,
                }))}
                max={20}
              />
            </>
          )}

          <Footer orgName={ctx.orgName} />
        </Page>
      )}

      {/* === METHOD === */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrow}>Method</Text>
        <Text style={styles.h1}>How this report was made</Text>
        <Text style={styles.body}>
          Generated automatically from {report.kpis.sessions} anonymized
          session records logged by coaches in HelpXs over {report.windowLabel}.
        </Text>
        <Text style={styles.body}>
          HelpXs collects only structured fields needed for program reporting
          (topics, interventions, anonymized demographics, referrals). It does
          not store student names, IDs, emails, phone numbers, or open-ended
          notes. Form changes are versioned, so historical reporting stays
          comparable across iterations of the session form.
        </Text>
        <Text style={styles.body}>
          Numbers reflect the period {report.windowLabel}; deltas compare to{" "}
          {report.prevLabel} (
          {report.comparison.sessions === 0
            ? "no prior data"
            : `${report.comparison.sessions} sessions`}
          ).
          {report.narrativeSource === "llm"
            ? " The cover narrative was drafted by a language model from the same anonymized aggregates and reviewed before export."
            : ""}
        </Text>

        <View style={styles.divider} />
        <Text style={[styles.body, { fontSize: 9, color: HX.inkMute }]}>
          Generated{" "}
          {ctx.generatedAt.toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}{" "}
          · HelpXs · {ctx.audienceLabel}
        </Text>

        <Footer orgName={ctx.orgName} />
      </Page>
    </Document>
  )
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export async function generateReportPdf({
  report,
  ctx,
  includes,
}: {
  report: ReportData
  ctx: ExportContext
  includes: Record<string, boolean>
}): Promise<Blob> {
  const doc = (
    <ReportDocument report={report} ctx={ctx} includes={includes} />
  )
  return pdf(doc).toBlob()
}
