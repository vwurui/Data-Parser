(() => {
  if (typeof state === "undefined" || typeof $ !== "function") return
  if (!$("reconcile-panel")) return

  state.reconcile = {
    reportList: [],
    docList: [],
    reportSummary: [],
    docSummary: [],
    diffs: [],
    compactView: false,
  }

  let compareInputTimer = null

  $("parseCompareBtn")?.addEventListener("click", () => {
    state.reconcile.compactView = true
    refreshCompareData({ silent: false })
  })
  $("copyCompareDiffBtn")?.addEventListener("click", copyCompareDiff)
  $("clearCompareBtn")?.addEventListener("click", clearCompare)
  $("compareReportInput")?.addEventListener("input", handleCompareInput)
  $("compareDocInput")?.addEventListener("input", handleCompareInput)

  renderCompare()

  function handleCompareInput() {
    window.clearTimeout(compareInputTimer)
    compareInputTimer = window.setTimeout(() => {
      refreshCompareData({ silent: true })
    }, 220)
  }

  function refreshCompareData({ silent }) {
    const reportParsed = parseCompareSourceInput($("compareReportInput")?.value || "")
    const docParsed = parseCompareSourceInput($("compareDocInput")?.value || "")

    state.reconcile.reportList = reportParsed.rows
    state.reconcile.docList = docParsed.rows

    const compareResult = buildCompareSummary(reportParsed.rows, docParsed.rows)
    state.reconcile.reportSummary = compareResult.reportSummary
    state.reconcile.docSummary = compareResult.docSummary
    state.reconcile.diffs = compareResult.diffs

    renderCompare()

    if (silent) {
      if (!reportParsed.rows.length && !docParsed.rows.length) $("compareMessage").innerHTML = ""
      return
    }

    const skipped = reportParsed.skipped + docParsed.skipped
    const processedAdmin = sumCompareCounts(reportParsed.rows)
    const processedDoc = sumCompareCounts(docParsed.rows)

    if (!processedAdmin && !processedDoc) {
      showMessage("compareMessage", "Masukkan data ADMIN atau DOC terlebih dahulu.", "error")
      return
    }

    const diffCount = state.reconcile.diffs.length
    const skippedText = skipped ? `, ${skipped} baris dilewati` : ""
    showMessage(
      "compareMessage",
      `ADMIN ${processedAdmin} data, DOC ${processedDoc} data, selisih ${diffCount}${skippedText}.`,
      "success"
    )
  }

  function parseCompareSourceInput(text) {
    const normalized = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    if (!normalized.trim()) return { rows: [], skipped: 0 }

    const lines = normalized.split("\n")
    const rows = []
    let skipped = 0

    lines.forEach((line) => {
      const parsed = parseCompareLine(line)
      if (parsed === "skip") return
      if (!parsed) {
        skipped += 1
        return
      }
      rows.push(parsed)
    })

    return { rows, skipped }
  }

  function parseCompareLine(line) {
    const raw = String(line || "").trim()
    if (!raw) return "skip"

    let cells = []
    if (raw.includes("\t")) {
      cells = raw.split("\t")
    } else if (raw.includes(",")) {
      cells = (parseCsv(raw)[0] || []).map((cell) => String(cell || ""))
    } else {
      const spaced = raw.split(/\s{2,}/).filter(Boolean)
      if (spaced.length >= 2) {
        cells = spaced
      } else {
        const matched = raw.match(/^(\S+)\s+([0-9][0-9.,]*)(?:\s+(\d+))?$/)
        if (matched) cells = [matched[1], matched[2], matched[3] || ""]
      }
    }

    cells = cells.map((cell) => String(cell || "").trim()).filter((cell) => cell !== "")
    if (cells.length < 2) return null

    const first = (cells[0] || "").toLowerCase()
    const second = (cells[1] || "").toLowerCase()
    const third = (cells[2] || "").toLowerCase()
    if (first === "id" && (second === "coin" || second === "amount")) return "skip"
    if (first === "list report" || first === "list doc" || first === "admin" || first === "doc" || third === "x") return "skip"

    const id = cells[0]
    const coinValue = parseAmount(cells[1])
    const count = parseCompareCount(cells[2])

    if (!id || !Number.isFinite(coinValue) || coinValue <= 0 || !Number.isFinite(count) || count <= 0) {
      return null
    }

    return {
      id,
      coinValue,
      coin: formatNumber(coinValue),
      count,
    }
  }

  function parseCompareCount(value) {
    if (value == null || String(value).trim() === "") return 1
    const numeric = Number.parseInt(String(value).replace(/[^0-9-]/g, ""), 10)
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 1
  }

  function buildCompareSummary(reportRows, docRows) {
    const reportMap = aggregateCompareRows(reportRows)
    const docMap = aggregateCompareRows(docRows)
    const keys = Array.from(new Set([...reportMap.keys(), ...docMap.keys()]))

    const reportSummary = []
    const docSummary = []
    const diffs = []

    keys.forEach((key) => {
      const reportItem = reportMap.get(key)
      const docItem = docMap.get(key)
      const reportCount = reportItem?.count || 0
      const docCount = docItem?.count || 0
      const base = reportItem || docItem
      if (!base) return

      const status = getCompareStatus(reportCount, docCount)

      if (reportItem) {
        reportSummary.push({
          id: reportItem.id,
          coin: reportItem.coin,
          coinValue: reportItem.coinValue,
          count: reportCount,
          status,
        })
      }

      if (docItem) {
        docSummary.push({
          id: docItem.id,
          coin: docItem.coin,
          coinValue: docItem.coinValue,
          count: docCount,
          status,
        })
      }

      if (reportCount !== docCount) {
        diffs.push({
          id: base.id,
          coin: base.coin,
          coinValue: base.coinValue,
          reportCount,
          docCount,
          delta: reportCount - docCount,
          status,
        })
      }
    })

    const sorter = (left, right) => {
      const statusGap = compareStatusWeight(left.status) - compareStatusWeight(right.status)
      if (statusGap !== 0) return statusGap
      const idGap = String(left.id).localeCompare(String(right.id), "id", { sensitivity: "base" })
      if (idGap !== 0) return idGap
      return left.coinValue - right.coinValue
    }

    reportSummary.sort(sorter)
    docSummary.sort(sorter)
    diffs.sort(sorter)

    return { reportSummary, docSummary, diffs }
  }

  function aggregateCompareRows(rows) {
    const map = new Map()
    rows.forEach((row) => {
      const key = `${row.id}__${row.coinValue}`
      const current = map.get(key) || {
        id: row.id,
        coin: row.coin,
        coinValue: row.coinValue,
        count: 0,
      }
      current.count += row.count
      map.set(key, current)
    })
    return map
  }

  function getCompareStatus(reportCount, docCount) {
    if (reportCount > 0 && docCount > 0 && reportCount === docCount) return "match"
    if (reportCount === 0 || docCount === 0) return "missing"
    return "mismatch"
  }

  function compareStatusWeight(status) {
    if (status === "missing") return 0
    if (status === "mismatch") return 1
    return 2
  }

  function renderCompare() {
    renderCompareList("compareReportListBody", state.reconcile.reportList)
    renderCompareList("compareDocListBody", state.reconcile.docList)
    renderCompareSummaryTable("compareReportSummaryBody", state.reconcile.reportSummary)
    renderCompareSummaryTable("compareDocSummaryBody", state.reconcile.docSummary)
    renderCompareDiffTable()
    renderCompareStats()

    const hasData =
      state.reconcile.reportList.length > 0 ||
      state.reconcile.docList.length > 0 ||
      state.reconcile.reportSummary.length > 0 ||
      state.reconcile.docSummary.length > 0

    $("compareInputGrid")?.classList.toggle("hidden", hasData && state.reconcile.compactView)
    $("compareResultCard")?.classList.toggle("hidden", !hasData)
  }

  function renderCompareList(bodyId, rows) {
    const target = $(bodyId)
    if (!target) return

    if (!rows.length) {
      target.innerHTML = `<tr><td colspan="3">${escapeHtml("Belum ada data")}</td></tr>`
      return
    }

    target.innerHTML = rows
      .map((row) => {
        return `
          <tr>
            <td>${escapeHtml(row.id)}</td>
            <td class="compare-coin">${escapeHtml(row.coin)}</td>
            <td class="compare-count">${escapeHtml(String(row.count))}</td>
          </tr>
        `
      })
      .join("")
  }

  function renderCompareSummaryTable(bodyId, rows) {
    const target = $(bodyId)
    if (!target) return

    if (!rows.length) {
      target.innerHTML = `<tr><td colspan="3">${escapeHtml("Belum ada data")}</td></tr>`
      return
    }

    target.innerHTML = rows
      .map((row) => {
        return `
          <tr class="compare-row ${escapeHtml(row.status)}">
            <td>${escapeHtml(row.id)}</td>
            <td class="compare-coin">${escapeHtml(row.coin)}</td>
            <td class="compare-count">${escapeHtml(String(row.count))}</td>
          </tr>
        `
      })
      .join("")
  }

  function renderCompareDiffTable() {
    const tbody = $("compareDiffBody")
    const empty = $("compareDiffEmpty")
    if (!tbody || !empty) return

    if (!state.reconcile.diffs.length) {
      tbody.innerHTML = ""
      empty.classList.remove("hidden")
      return
    }

    empty.classList.add("hidden")
    tbody.innerHTML = state.reconcile.diffs
      .map((row) => {
        return `
          <tr class="compare-row ${escapeHtml(row.status)}">
            <td>${renderCompareStatus(row.status, row.delta)}</td>
            <td>${escapeHtml(row.id)}</td>
            <td class="compare-coin">${escapeHtml(row.coin)}</td>
            <td class="compare-count">${escapeHtml(String(row.reportCount))}</td>
            <td class="compare-count">${escapeHtml(String(row.docCount))}</td>
            <td class="compare-delta">${escapeHtml(formatDelta(row.delta))}</td>
          </tr>
        `
      })
      .join("")
  }

  function renderCompareStatus(status, delta) {
    if (status === "match") return `<span class="compare-status-pill compare-status-match">Sama</span>`
    if (status === "missing" && delta > 0) {
      return `<span class="compare-status-pill compare-status-missing">Selisih di DOC</span>`
    }
    if (status === "missing" && delta < 0) {
      return `<span class="compare-status-pill compare-status-missing">Selisih di ADMIN</span>`
    }
    return `<span class="compare-status-pill compare-status-mismatch">Selisih Jumlah</span>`
  }

  function renderCompareStats() {
    const target = $("compareStats")
    if (!target) return

    const totalAdmin = sumCompareCounts(state.reconcile.reportList)
    const totalDoc = sumCompareCounts(state.reconcile.docList)

    target.innerHTML = `
      <div class="stat"><span>Total ADMIN</span><strong>${totalAdmin}</strong></div>
      <div class="stat"><span>Total DOC</span><strong>${totalDoc}</strong></div>
      <div class="stat"><span>Selisih</span><strong>${state.reconcile.diffs.length}</strong></div>
    `
  }

  function sumCompareCounts(rows) {
    return rows.reduce((sum, row) => sum + (Number(row.count) || 0), 0)
  }

  function formatDelta(value) {
    if (value > 0) return `+${value}`
    return String(value)
  }

  function copyCompareDiff() {
    if (!state.reconcile.diffs.length) {
      showMessage("compareMessage", "Belum ada selisih untuk disalin.", "error")
      return
    }

    const text = state.reconcile.diffs
      .map((row) => {
        const label =
          row.status === "missing"
            ? row.delta > 0
              ? "SELISIH DI DOC"
              : "SELISIH DI ADMIN"
            : "SELISIH JUMLAH"
        return `${label}\t${row.id}\t${row.coin}\tADMIN:${row.reportCount}\tDOC:${row.docCount}\tSELISIH:${formatDelta(row.delta)}`
      })
      .join("\n")

    copyText(text, "compareMessage")
  }

  function clearCompare() {
    state.reconcile.compactView = false
    state.reconcile.reportList = []
    state.reconcile.docList = []
    state.reconcile.reportSummary = []
    state.reconcile.docSummary = []
    state.reconcile.diffs = []

    if ($("compareReportInput")) $("compareReportInput").value = ""
    if ($("compareDocInput")) $("compareDocInput").value = ""
    $("compareMessage").innerHTML = ""
    renderCompare()
  }
})()
