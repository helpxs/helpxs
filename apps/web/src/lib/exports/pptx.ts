import PptxGenJS from "pptxgenjs"
import type { ReportData, LabelCount } from "@/lib/types"
import { HX, type ExportContext } from "./colors"

// pptxgenjs colors are hex without leading "#"
const C = {
  bg: HX.bg.slice(1),
  surface: HX.surface.slice(1),
  ink: HX.ink.slice(1),
  inkSoft: HX.inkSoft.slice(1),
  inkMute: HX.inkMute.slice(1),
  line: HX.line.slice(1),
  accent: HX.accent.slice(1),
  accentSoft: HX.accentSoft.slice(1),
  accentMid: HX.accentMid.slice(1),
  white: "FFFFFF",
}

// 16:9 widescreen, 13.333 × 7.5 in
const W = 13.333
const H = 7.5
const MARGIN_X = 0.7
const SAFE_W = W - MARGIN_X * 2

function addLogo(slide: PptxGenJS.Slide) {
  slide.addShape("ellipse", {
    x: 0.7,
    y: 0.45,
    w: 0.4,
    h: 0.4,
    fill: { color: C.accent },
    line: { type: "none" },
  })
  slide.addText("h", {
    x: 0.7,
    y: 0.45,
    w: 0.4,
    h: 0.4,
    align: "center",
    valign: "middle",
    color: C.white,
    fontSize: 18,
    bold: true,
    fontFace: "Helvetica",
  })
  slide.addText("HelpXs", {
    x: 1.18,
    y: 0.45,
    w: 1.5,
    h: 0.4,
    color: C.ink,
    fontSize: 14,
    bold: true,
    valign: "middle",
    fontFace: "Helvetica",
  })
}

function addFooter(slide: PptxGenJS.Slide, orgName: string) {
  slide.addText(`${orgName} · privacy-safe by design`, {
    x: MARGIN_X,
    y: H - 0.45,
    w: SAFE_W,
    h: 0.3,
    color: C.inkMute,
    fontSize: 8.5,
    valign: "middle",
    fontFace: "Helvetica",
  })
}

function topListData(items: LabelCount[], max = 6) {
  const top = items.slice(0, max).reverse() // bar charts render bottom-up
  return [
    {
      name: "Sessions",
      labels: top.map((i) => i.label),
      values: top.map((i) => i.count),
    },
  ]
}

export async function generateReportPptx({
  report,
  ctx,
  includes,
}: {
  report: ReportData
  ctx: ExportContext
  includes: Record<string, boolean>
}) {
  const pptx = new PptxGenJS()
  pptx.layout = "LAYOUT_WIDE" // 13.333 × 7.5 in
  pptx.title = `${ctx.orgName} · ${capitalize(report.windowLabel)}`
  pptx.company = ctx.orgName

  // Default theme
  pptx.theme = { headFontFace: "Helvetica", bodyFontFace: "Helvetica" }
  pptx.defineSlideMaster({
    title: "MAIN",
    background: { color: C.bg },
  })

  // === Slide 1: Cover ===
  const cover = pptx.addSlide({ masterName: "MAIN" })
  addLogo(cover)
  cover.addText(`${ctx.audienceLabel} · ${capitalize(report.windowLabel)}`, {
    x: MARGIN_X,
    y: 1.6,
    w: SAFE_W,
    h: 0.4,
    color: C.accent,
    fontSize: 14,
    bold: true,
    charSpacing: 2,
    fontFace: "Helvetica",
  })
  cover.addText(ctx.orgName, {
    x: MARGIN_X,
    y: 2.1,
    w: SAFE_W,
    h: 1.6,
    color: C.ink,
    fontSize: 56,
    bold: true,
    fontFace: "Helvetica",
  })
  cover.addText(
    `${report.kpis.sessions} sessions · ${report.kpis.coachesActive} active coaches · ${report.kpis.referrals} referrals`,
    {
      x: MARGIN_X,
      y: 4.2,
      w: SAFE_W,
      h: 0.5,
      color: C.inkSoft,
      fontSize: 18,
      fontFace: "Helvetica",
    },
  )
  cover.addText(
    ctx.generatedAt.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    {
      x: MARGIN_X,
      y: H - 1.2,
      w: SAFE_W,
      h: 0.4,
      color: C.inkMute,
      fontSize: 11,
      fontFace: "Helvetica",
    },
  )

  // === Slide 2: Headline number ===
  const hero = pptx.addSlide({ masterName: "MAIN" })
  addLogo(hero)
  hero.addText("Sessions logged", {
    x: MARGIN_X,
    y: 1.6,
    w: SAFE_W,
    h: 0.5,
    color: C.inkSoft,
    fontSize: 18,
    fontFace: "Helvetica",
  })
  hero.addText(String(report.kpis.sessions), {
    x: MARGIN_X,
    y: 2.0,
    w: SAFE_W,
    h: 3.6,
    color: C.accent,
    fontSize: 220,
    bold: true,
    fontFace: "Helvetica",
  })
  hero.addText(
    `${report.kpis.sessionsDelta} vs ${report.prevLabel}`,
    {
      x: MARGIN_X,
      y: 5.6,
      w: SAFE_W,
      h: 0.5,
      color: C.inkSoft,
      fontSize: 16,
      fontFace: "Helvetica",
    },
  )
  addFooter(hero, ctx.orgName)

  // === Slide 3: Narrative ===
  if (report.kpis.sessions > 0) {
    const narrative = pptx.addSlide({ masterName: "MAIN" })
    addLogo(narrative)
    narrative.addText("Summary", {
      x: MARGIN_X,
      y: 1.6,
      w: SAFE_W,
      h: 0.5,
      color: C.accent,
      fontSize: 12,
      bold: true,
      charSpacing: 2,
      fontFace: "Helvetica",
    })
    narrative.addText(report.narrative, {
      x: MARGIN_X,
      y: 2.2,
      w: SAFE_W,
      h: H - 3.2,
      color: C.ink,
      fontSize: 22,
      lineSpacing: 32,
      fontFace: "Helvetica",
    })
    addFooter(narrative, ctx.orgName)
  }

  // === Slide 4: Top topics ===
  if (includes.topics && report.topTopics.length > 0) {
    const topics = pptx.addSlide({ masterName: "MAIN" })
    addLogo(topics)
    topics.addText("What students worked on", {
      x: MARGIN_X,
      y: 1.6,
      w: SAFE_W,
      h: 0.6,
      color: C.ink,
      fontSize: 32,
      bold: true,
      fontFace: "Helvetica",
    })
    topics.addText(`Top topics · ${capitalize(report.windowLabel)}`, {
      x: MARGIN_X,
      y: 2.25,
      w: SAFE_W,
      h: 0.4,
      color: C.inkSoft,
      fontSize: 13,
      fontFace: "Helvetica",
    })
    topics.addChart(pptx.ChartType.bar, topListData(report.topTopics, 6), {
      x: MARGIN_X,
      y: 2.9,
      w: SAFE_W,
      h: 3.8,
      barDir: "bar",
      chartColors: [C.accent],
      showLegend: false,
      catAxisLabelFontFace: "Helvetica",
      catAxisLabelFontSize: 12,
      catAxisLabelColor: C.ink,
      valAxisLabelFontFace: "Helvetica",
      valAxisLabelFontSize: 10,
      valAxisLabelColor: C.inkMute,
      showValue: true,
      dataLabelColor: C.inkSoft,
      dataLabelFontSize: 10,
      catGridLine: { style: "none" },
      valGridLine: { color: C.line, style: "solid", size: 0.5 },
    })
    addFooter(topics, ctx.orgName)
  }

  // === Slide 5: Format mix ===
  if (includes.topics) {
    const fmt = pptx.addSlide({ masterName: "MAIN" })
    addLogo(fmt)
    fmt.addText("How students were seen", {
      x: MARGIN_X,
      y: 1.6,
      w: SAFE_W,
      h: 0.6,
      color: C.ink,
      fontSize: 32,
      bold: true,
      fontFace: "Helvetica",
    })
    const total =
      report.formatMix.individual +
        report.formatMix.group +
        report.formatMix.workshop || 1
    fmt.addChart(
      pptx.ChartType.doughnut,
      [
        {
          name: "Format mix",
          labels: ["Individual", "Group", "Workshop"],
          values: [
            report.formatMix.individual,
            report.formatMix.group,
            report.formatMix.workshop,
          ],
        },
      ],
      {
        x: MARGIN_X,
        y: 2.6,
        w: 4.5,
        h: 4.0,
        chartColors: [C.accent, C.accentMid, C.line],
        showLegend: false,
        showPercent: true,
        dataLabelFontFace: "Helvetica",
        dataLabelFontSize: 12,
        dataLabelColor: C.white,
        holeSize: 55,
      },
    )
    // Manual legend column on the right
    const legendX = 5.6
    let lY = 2.9
    const items: [string, number, string][] = [
      ["Individual", report.formatMix.individual, C.accent],
      ["Group", report.formatMix.group, C.accentMid],
      ["Workshop", report.formatMix.workshop, C.line],
    ]
    for (const [label, val, color] of items) {
      fmt.addShape("rect", {
        x: legendX,
        y: lY + 0.07,
        w: 0.18,
        h: 0.18,
        fill: { color },
        line: { type: "none" },
      })
      fmt.addText(label, {
        x: legendX + 0.3,
        y: lY,
        w: 2.2,
        h: 0.3,
        color: C.ink,
        fontSize: 16,
        bold: true,
        fontFace: "Helvetica",
      })
      fmt.addText(`${Math.round((val / total) * 100)}% · ${val}`, {
        x: legendX + 0.3,
        y: lY + 0.32,
        w: 4,
        h: 0.3,
        color: C.inkSoft,
        fontSize: 13,
        fontFace: "Helvetica",
      })
      lY += 1.1
    }
    addFooter(fmt, ctx.orgName)
  }

  // === Slide 6: Demographics ===
  if (includes.demographics) {
    const dem = pptx.addSlide({ masterName: "MAIN" })
    addLogo(dem)
    dem.addText("Anonymized demographics", {
      x: MARGIN_X,
      y: 1.6,
      w: SAFE_W,
      h: 0.6,
      color: C.ink,
      fontSize: 32,
      bold: true,
      fontFace: "Helvetica",
    })
    dem.addText("HelpXs never collects names, IDs, or contact info.", {
      x: MARGIN_X,
      y: 2.25,
      w: SAFE_W,
      h: 0.4,
      color: C.inkSoft,
      fontSize: 13,
      fontFace: "Helvetica",
    })

    const colW = SAFE_W / 3 - 0.2
    const groups: [string, Record<string, number>][] = [
      ["Gender", report.demographics.gender],
      ["Age range", report.demographics.ageRange],
      ["Degree level", report.demographics.degreeLevel],
    ]
    groups.forEach(([title, data], idx) => {
      const x = MARGIN_X + idx * (colW + 0.3)
      dem.addText(title.toUpperCase(), {
        x,
        y: 3.0,
        w: colW,
        h: 0.4,
        color: C.accent,
        fontSize: 11,
        bold: true,
        charSpacing: 1.5,
        fontFace: "Helvetica",
      })
      const total = Object.values(data).reduce((a, b) => a + b, 0)
      const items = Object.entries(data).sort((a, b) => b[1] - a[1])
      items.forEach(([label, count], i) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        dem.addText(`${label}`, {
          x,
          y: 3.45 + i * 0.4,
          w: colW * 0.6,
          h: 0.35,
          color: C.ink,
          fontSize: 13,
          fontFace: "Helvetica",
        })
        dem.addText(`${pct}%`, {
          x: x + colW * 0.6,
          y: 3.45 + i * 0.4,
          w: colW * 0.4,
          h: 0.35,
          color: C.inkSoft,
          fontSize: 13,
          align: "right",
          fontFace: "Helvetica",
        })
      })
    })
    addFooter(dem, ctx.orgName)
  }

  // === Slide 7: Referrals ===
  if (includes.referrals) {
    const ref = pptx.addSlide({ masterName: "MAIN" })
    addLogo(ref)
    ref.addText("Referrals", {
      x: MARGIN_X,
      y: 1.6,
      w: SAFE_W,
      h: 0.6,
      color: C.ink,
      fontSize: 32,
      bold: true,
      fontFace: "Helvetica",
    })
    const refRate =
      report.kpis.sessions > 0
        ? Math.round((report.kpis.referrals / report.kpis.sessions) * 100)
        : 0
    ref.addText(
      `${report.kpis.referrals} of ${report.kpis.sessions} sessions resulted in a referral (${refRate}%).`,
      {
        x: MARGIN_X,
        y: 2.25,
        w: SAFE_W,
        h: 0.5,
        color: C.inkSoft,
        fontSize: 16,
        fontFace: "Helvetica",
      },
    )
    if (report.referralDestinations.length > 0) {
      ref.addChart(
        pptx.ChartType.bar,
        topListData(report.referralDestinations, 6),
        {
          x: MARGIN_X,
          y: 3.0,
          w: SAFE_W,
          h: 3.7,
          barDir: "bar",
          chartColors: [C.accent],
          showLegend: false,
          catAxisLabelFontFace: "Helvetica",
          catAxisLabelFontSize: 12,
          catAxisLabelColor: C.ink,
          valAxisLabelFontFace: "Helvetica",
          valAxisLabelFontSize: 10,
          valAxisLabelColor: C.inkMute,
          showValue: true,
          dataLabelColor: C.inkSoft,
          dataLabelFontSize: 10,
        },
      )
    } else {
      ref.addText("No referrals recorded this period.", {
        x: MARGIN_X,
        y: 3.5,
        w: SAFE_W,
        h: 0.5,
        color: C.inkMute,
        fontSize: 14,
        italic: true,
        fontFace: "Helvetica",
      })
    }
    addFooter(ref, ctx.orgName)
  }

  // === Slide 8: Coach load ===
  if (includes["coach-load"] && report.coachLoad.length > 0) {
    const coach = pptx.addSlide({ masterName: "MAIN" })
    addLogo(coach)
    coach.addText("Sessions per coach", {
      x: MARGIN_X,
      y: 1.6,
      w: SAFE_W,
      h: 0.6,
      color: C.ink,
      fontSize: 32,
      bold: true,
      fontFace: "Helvetica",
    })
    coach.addChart(
      pptx.ChartType.bar,
      [
        {
          name: "Sessions",
          labels: report.coachLoad.slice(0, 10).reverse().map((c) => c.name),
          values: report.coachLoad.slice(0, 10).reverse().map((c) => c.count),
        },
      ],
      {
        x: MARGIN_X,
        y: 2.5,
        w: SAFE_W,
        h: 4.2,
        barDir: "bar",
        chartColors: [C.accent],
        showLegend: false,
        catAxisLabelFontFace: "Helvetica",
        catAxisLabelFontSize: 12,
        catAxisLabelColor: C.ink,
        valAxisLabelFontFace: "Helvetica",
        valAxisLabelFontSize: 10,
        valAxisLabelColor: C.inkMute,
        showValue: true,
        dataLabelColor: C.inkSoft,
        dataLabelFontSize: 10,
      },
    )
    addFooter(coach, ctx.orgName)
  }

  // === Final: Method ===
  const method = pptx.addSlide({ masterName: "MAIN" })
  addLogo(method)
  method.addText("Method", {
    x: MARGIN_X,
    y: 1.6,
    w: SAFE_W,
    h: 0.5,
    color: C.accent,
    fontSize: 12,
    bold: true,
    charSpacing: 2,
    fontFace: "Helvetica",
  })
  method.addText("Privacy-safe by design", {
    x: MARGIN_X,
    y: 2.1,
    w: SAFE_W,
    h: 0.8,
    color: C.ink,
    fontSize: 36,
    bold: true,
    fontFace: "Helvetica",
  })
  method.addText(
    `Built from ${report.kpis.sessions} anonymized session records logged by coaches over ${report.windowLabel}. HelpXs collects only structured fields needed for program reporting — no student names, IDs, emails, phone numbers, or open-ended notes. Form changes are versioned so historical reporting stays comparable.`,
    {
      x: MARGIN_X,
      y: 3.1,
      w: SAFE_W,
      h: 2.5,
      color: C.inkSoft,
      fontSize: 16,
      lineSpacing: 24,
      fontFace: "Helvetica",
    },
  )
  addFooter(method, ctx.orgName)

  const blob = (await pptx.write({ outputType: "blob" })) as Blob
  return blob
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
