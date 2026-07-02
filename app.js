const state = {
  withdraw: [],
  deposit: [],
  admin: [],
  cashbackTables: [[], [], []],
  wdQris: [],
  dpQris: [],
  wdQrisLastPaidAtMs: null,
  hiddenMenus: [],
  sort: {},
}

const $ = (id) => document.getElementById(id)

initTheme()
initAccentColor()
initMenuVisibility()

document.querySelectorAll(".nav-btn").forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab))
})

$("darkModeBtn").addEventListener("click", () => setTheme("dark"))
$("lightModeBtn").addEventListener("click", () => setTheme("light"))
$("accentColorInput")?.addEventListener("input", (event) => setAccentColor(event.target.value))
$("toggleMenuManagerBtn")?.addEventListener("click", () => {
  $("menuManager")?.classList.toggle("hidden")
})
document.querySelectorAll(".menu-visibility-toggle").forEach((checkbox) => {
  checkbox.addEventListener("change", () => toggleMenuVisibility(checkbox.dataset.menuTab, checkbox.checked))
})

$("parseWithdrawBtn").addEventListener("click", parseWithdraw)
$("copyWithdrawBtn").addEventListener("click", () => {
  copyCustom(state.withdraw, (row) => `${row.bank}\t${row.id}\t\t${row.amount}\t${row.name}\t${row.reff || ""}`, "withdrawMessage")
})
$("clearWithdrawBtn").addEventListener("click", clearWithdraw)

$("parseWdQrisBtn").addEventListener("click", parseWdQris)
$("copyWdQrisMemberBtn").addEventListener("click", () => {
  copyCustom(state.wdQris, (row) => `${row.member}\t${row.nominal}`, "wdQrisMessage")
})
$("copyWdQrisTransactionBtn").addEventListener("click", () => {
  copyCustom(state.wdQris, (row) => row.transactionId, "wdQrisMessage")
})
$("clearWdQrisBtn").addEventListener("click", clearWdQris)

$("parseDpQrisBtn").addEventListener("click", parseDpQris)
$("copyDpQrisIdAmountBtn").addEventListener("click", () => {
  copyCustom(state.dpQris, (row) => `${row.paid}\t${row.id}\t${row.amount}`, "dpQrisMessage")
})
$("copyDpQrisTransactionBtn").addEventListener("click", () => {
  copyCustom(state.dpQris, (row) => row.transactionId, "dpQrisMessage")
})
$("clearDpQrisBtn").addEventListener("click", clearDpQris)

$("depositFile").addEventListener("change", handleDepositFile)
$("copyDepositIdAmountBtn").addEventListener("click", () => copyCustom(state.deposit, (row) => `${row.id}\t${row.amount}`, "depositMessage"))
$("copyDepositRefBtn").addEventListener("click", () => copyCustom(state.deposit, (row) => row.refNumb || "", "depositMessage"))
$("clearDepositBtn").addEventListener("click", clearDeposit)

$("parseAdminBtn").addEventListener("click", parseAdmin)
$("copyAdminBtn").addEventListener("click", () => {
  copyCustom(state.admin, (row) => `${row.bank}\t${row.id}\t\t${row.amount}\t${row.name}`, "adminMessage")
})
$("clearAdminBtn").addEventListener("click", clearAdmin)

$("cashbackFile").addEventListener("change", handleCashbackFile)
$("clearCashbackBtn").addEventListener("click", clearCashback)

document.querySelectorAll("[data-copy-cashback]").forEach((button) => {
  button.addEventListener("click", () => {
    const index = Number(button.dataset.copyCashback)
    copyCustom(state.cashbackTables[index], (row) => `${row.id}\t${row.amount}`, "cashbackMessage")
  })
})

document.querySelectorAll("[data-sort-table]").forEach((header) => {
  header.addEventListener("click", () => sortTable(header.dataset.sortTable, header.dataset.sortKey))
})

function switchTab(name) {
  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === name)
  })

  document.querySelectorAll(".panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `${name}-panel`)
  })
}

function initTheme() {
  let savedTheme = "dark"
  try {
    savedTheme = localStorage.getItem("parser-theme") || "dark"
  } catch {
    savedTheme = "dark"
  }
  setTheme(savedTheme)
}

function initAccentColor() {
  let savedColor = "#f5d15f"
  try {
    savedColor = localStorage.getItem("parser-accent-color") || "#f5d15f"
  } catch {
    savedColor = "#f5d15f"
  }
  setAccentColor(savedColor)
  if ($("accentColorInput")) $("accentColorInput").value = savedColor
}

function setTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark"
  document.body.dataset.theme = nextTheme

  $("darkModeBtn")?.classList.toggle("active", nextTheme === "dark")
  $("lightModeBtn")?.classList.toggle("active", nextTheme === "light")

  try {
    localStorage.setItem("parser-theme", nextTheme)
  } catch { }
}

function hexToRgbString(hex) {
  const value = String(hex || "").replace("#", "").trim()
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return "245, 209, 95"
  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)
  return `${r}, ${g}, ${b}`
}

function setAccentColor(color) {
  const hex = /^#[0-9a-fA-F]{6}$/.test(String(color || "").trim()) ? color : "#f5d15f"
  document.documentElement.style.setProperty("--custom-accent", hex)
  document.documentElement.style.setProperty("--custom-accent-rgb", hexToRgbString(hex))
  try {
    localStorage.setItem("parser-accent-color", hex)
  } catch { }
}

function initMenuVisibility() {
  let hiddenMenus = []
  try {
    hiddenMenus = JSON.parse(localStorage.getItem("parser-hidden-menus") || "[]")
  } catch {
    hiddenMenus = []
  }
  state.hiddenMenus = Array.isArray(hiddenMenus) ? hiddenMenus : []
  applyMenuVisibility()
}

function applyMenuVisibility() {
  const navButtons = Array.from(document.querySelectorAll(".nav-btn"))
  navButtons.forEach((button) => {
    const hidden = state.hiddenMenus.includes(button.dataset.tab)
    button.classList.toggle("hidden", hidden)
  })

  document.querySelectorAll(".menu-visibility-toggle").forEach((checkbox) => {
    checkbox.checked = !state.hiddenMenus.includes(checkbox.dataset.menuTab)
  })

  const activeVisible = navButtons.find((button) => button.classList.contains("active") && !button.classList.contains("hidden"))
  if (!activeVisible) {
    const firstVisible = navButtons.find((button) => !button.classList.contains("hidden"))
    if (firstVisible) switchTab(firstVisible.dataset.tab)
  }

  try {
    localStorage.setItem("parser-hidden-menus", JSON.stringify(state.hiddenMenus))
  } catch { }
}

function toggleMenuVisibility(tab, isVisible) {
  if (!tab) return
  if (isVisible) {
    state.hiddenMenus = state.hiddenMenus.filter((item) => item !== tab)
  } else {
    const visibleCount = Array.from(document.querySelectorAll(".nav-btn")).filter((button) => !state.hiddenMenus.includes(button.dataset.tab)).length
    if (visibleCount <= 1) {
      applyMenuVisibility()
      return
    }
    if (!state.hiddenMenus.includes(tab)) state.hiddenMenus.push(tab)
  }
  applyMenuVisibility()
}

function getStoredWdQrisLastPaidAt() {
  try {
    const raw = localStorage.getItem("wdqris-last-paidat")
    const num = raw ? Number(raw) : NaN
    return Number.isFinite(num) ? num : null
  } catch {
    return null
  }
}

function setStoredWdQrisLastPaidAt(ms) {
  try {
    if (ms == null) localStorage.removeItem("wdqris-last-paidat")
    else localStorage.setItem("wdqris-last-paidat", String(ms))
  } catch { }
}

function parsePaidAt(value) {
  const raw = String(value || "").trim().replace(/\s+/g, " ")
  const match = raw.match(/(\d{4}-\d{2}-\d{2})\s*(\d{2}:\d{2}:\d{2})/)
  if (!match) return null
  const date = match[1]
  const time = match[2]
  const d = new Date(`${date}T${time}`)
  const ms = d.getTime()
  return Number.isFinite(ms) ? ms : null
}

function formatTimeOnly(ms) {
  if (!Number.isFinite(ms)) return ""
  const d = new Date(ms)
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  const ss = String(d.getSeconds()).padStart(2, "0")
  return `${hh}:${mm}:${ss}`
}

function parseTimeToSeconds(value) {
  const raw = String(value || "").trim()
  if (!raw) return null
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) return null
  const hh = Number(match[1])
  const mm = Number(match[2])
  const ss = Number(match[3] ?? "0")
  if (![hh, mm, ss].every(Number.isFinite)) return null
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59 || ss < 0 || ss > 59) return null
  return hh * 3600 + mm * 60 + ss
}

function secondsSinceMidnight(ms) {
  const d = new Date(ms)
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()
}

function showMessage(slotId, text, type = "success") {
  $(slotId).innerHTML = `<div class="message ${type}">${text}</div>`
  setTimeout(() => {
    if ($(slotId)) $(slotId).innerHTML = ""
  }, 3200)
}

function formatNumber(value) {
  const numeric = parseAmount(value)
  // Untuk tampilan Total Nominal: pakai koma (,) dan tanpa desimal/titik.
  // Contoh: 2534000 -> 2,534,000
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.trunc(numeric))
}

function parseAmount(value) {
  if (typeof value === "number") return value
  if (!value) return 0
  const cleaned = String(value).replace(/[^0-9,.-]/g, "").trim()
  if (!cleaned) return 0

  const commaCount = (cleaned.match(/,/g) || []).length
  const dotCount = (cleaned.match(/\./g) || []).length

  if (commaCount > 0 && dotCount > 0) {
    const lastComma = cleaned.lastIndexOf(",")
    const lastDot = cleaned.lastIndexOf(".")

    if (lastComma > lastDot) {
      return Number.parseFloat(cleaned.replace(/\./g, "").replace(",", ".")) || 0
    }

    return Number.parseFloat(cleaned.replace(/,/g, "")) || 0
  }

  if (commaCount > 0) {
    const parts = cleaned.split(",")
    if (parts.length === 2 && parts[1].length <= 2) {
      return Number.parseFloat(parts[0] + "." + parts[1]) || 0
    }
    return Number.parseFloat(parts.join("")) || 0
  }

  if (dotCount > 0) {
    const parts = cleaned.split(".")
    if (parts.length === 2 && parts[1].length <= 2) {
      return Number.parseFloat(cleaned) || 0
    }
    if (parts.length > 2 && parts[parts.length - 1].length <= 2) {
      const decimal = parts.pop()
      return Number.parseFloat(parts.join("") + "." + decimal) || 0
    }
    return Number.parseFloat(parts.join("")) || 0
  }

  return Number.parseFloat(cleaned) || 0
}

function updateStats(targetId, items) {
  const totalAmount = items.reduce((sum, row) => {
    return sum + parseAmount(row.amount)
  }, 0)

  const countLabel =
    targetId === "withdrawStats"
      ? "Total Withdraw"
      : targetId === "depositStats"
        ? "Total Deposit"
        : "Total baris"
  const amountLabel = "Total Nominal"

  $(targetId).innerHTML = `
    <div class="stat"><span>${countLabel}</span><strong>${items.length}</strong></div>
    <div class="stat"><span>${amountLabel}</span><strong>Rp ${formatNumber(totalAmount)}</strong></div>
  `
}

function renderTable(bodyId, rows, columns) {
  $(bodyId).innerHTML = rows
    .map((row) => {
      const cells = columns.map((column) => `<td>${escapeHtml(row[column] ?? "")}</td>`).join("")
      return `<tr>${cells}</tr>`
    })
    .join("")
}

function renderWithdraw() {
  renderTable("withdrawTableBody", state.withdraw, ["bank", "id", "spacer", "amount", "name", "reff"])
  updateStats("withdrawStats", state.withdraw)
  $("withdrawResultCard").classList.toggle("hidden", state.withdraw.length === 0)
}

function renderWdQris() {
  renderTable("wdQrisTableBody", state.wdQris, ["member", "nominal", "transactionId"])
  updateWdQrisStats()
  $("wdQrisResultCard").classList.toggle("hidden", state.wdQris.length === 0)
}

function renderDpQris() {
  renderTable("dpQrisTableBody", state.dpQris, ["paid", "id", "amount", "transactionId"])
  updateDpQrisStats()
  $("dpQrisResultCard").classList.toggle("hidden", state.dpQris.length === 0)
}

function renderDeposit() {
  renderTable("depositTableBody", state.deposit, ["id", "amount", "refNumb"])
  updateStats("depositStats", state.deposit)
  $("depositResultCard").classList.toggle("hidden", state.deposit.length === 0)
}

function renderAdmin() {
  renderTable("adminTableBody", state.admin, ["bank", "id", "spacer", "amount", "name"])
  updateStats("adminStats", state.admin)
  $("adminResultCard").classList.toggle("hidden", state.admin.length === 0)
}

function renderCashback() {
  state.cashbackTables.forEach((table, index) => {
    renderTable(`cashbackTable${index}`, table, ["id", "amount"])
  })
  const hasData = state.cashbackTables.some((table) => table.length > 0)
  $("cashbackGrid").classList.toggle("hidden", !hasData)
}

function parseWithdraw() {
  const input = $("withdrawInput").value.trim()
  if (!input) {
    showMessage("withdrawMessage", "Tempel data withdraw terlebih dahulu.", "error")
    return
  }

  const lines = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")
  const result = []

  for (let i = 0; i < lines.length; i += 1) {
    if (!/^\s*TOPJITU\s*$/.test(lines[i])) continue

    const block = []
    for (let j = i; j < lines.length && block.length < 50; j += 1) {
      block.push(lines[j])
      if (lines[j].trim() === "NOTE") {
        const get = (index) => (block[index - 1] || "").trim()
        const refCandidate = get(22)
        result.push({
          bank: get(13),
          id: get(9),
          amount: get(15).replace(/^Rp\s*/i, ""),
          name: get(11).toUpperCase(),
          reff: /^TF_\d{6}_[A-Z0-9]{15,30}$/.test(refCandidate) ? refCandidate : "",
        })
        i = j
        break
      }
    }
  }

  state.withdraw = result.filter((row) => row.id && row.name && row.bank && row.amount)
  if (state.withdraw.length === 0) {
    renderWithdraw()
    showMessage("withdrawMessage", "Tidak ada blok valid yang berhasil diparse.", "error")
    return
  }

  renderWithdraw()
  showMessage("withdrawMessage", `${state.withdraw.length} Withdraw berhasil di parse`)
}

function parseWdQris() {
  const input = $("wdQrisInput").value.trim()
  if (!input) {
    showMessage("wdQrisMessage", "Tempel data WITHDRAW QRIS terlebih dahulu.", "error")
    return
  }

  const lastTrxId = ($("wdQrisLastTrxId")?.value || "").trim()

  const rows = parseTabular(input)
  if (rows.length < 2) {
    showMessage("wdQrisMessage", "Data WD QRIS tidak valid atau kosong.", "error")
    return
  }

  const rawHeader = rows[0].map((c) => String(c || "").trim())
  const rawHeaderLower = rawHeader.map((c) => c.toLowerCase())
  const normalizedHeader = rawHeader.map((c) => normalizeHeader(c))

  const looksLikeHeader = rawHeaderLower.some((h) => {
    return (
      h === "#" ||
      h === "no" ||
      h.includes("paid date") ||
      h.includes("transaction id") ||
      h.includes("jumlah") ||
      h.includes("created") ||
      h.includes("status") ||
      h.includes("member name") ||
      h.includes("bank") ||
      h.includes("rekening")
    )
  })

  let memberIndex = -1
  let amountIndex = -1
  let trxIndex = -1
  let paidAtIndex = -1
  let dataRows = rows

  if (looksLikeHeader) {
    dataRows = rows.slice(1)
    memberIndex = normalizedHeader.findIndex((h) => h === "membername" || h === "member" || (h.includes("member") && h.includes("name")))
    amountIndex = normalizedHeader.findIndex((h) => h === "jumlah" || h === "nominal" || h.includes("jumlah"))
    trxIndex = normalizedHeader.findIndex((h) => h === "transactionid" || (h.includes("transaction") && h.includes("id")))
    paidAtIndex = normalizedHeader.findIndex((h) => h.includes("paiddate") || (h.includes("paid") && h.includes("date")))
  } else {
    // Fallback jika user paste tanpa header.
    // Urutan kolom yang umum (sesuai instruksi): #, PAID DATE, TRANSACTION ID, JUMLAH, CREATED, STATUS, MEMBER NAME, BANK, REKENING
    memberIndex = 6
    amountIndex = 3
    trxIndex = 2
    paidAtIndex = 1
    // Jika ternyata baris pertama adalah header tapi tidak terbaca (mis. tanda '#'),
    // skip baris pertama supaya tidak ikut masuk ke tabel.
    const firstRowLower = (rows[0] || []).map((c) => String(c || "").trim().toLowerCase())
    const firstLooksHeader = firstRowLower.some((c) => c.includes("member name") || c.includes("transaction id") || c.includes("jumlah"))
    if (firstLooksHeader) dataRows = rows.slice(1)
  }

  if ([memberIndex, amountIndex, trxIndex].includes(-1)) {
    showMessage(
      "wdQrisMessage",
      "Kolom wajib tidak ditemukan. Pastikan data berisi `MEMBER NAME`, `JUMLAH`, dan `TRANSACTION ID` (boleh dengan atau tanpa header).",
      "error"
    )
    return
  }

  state.wdQris = dataRows
    .map((row) => {
      if (!row || row.length === 0) return { member: "", nominal: "", transactionId: "" }
      const rawMember = (row[memberIndex] || "").trim()
      const member = rawMember.split("-")[0].trim()
      const nominalRaw = (row[amountIndex] || "").trim()
      const nominal = formatNumber(parseAmount(nominalRaw))
      const transactionId = (row[trxIndex] || "").trim()
      const paidAtMs = paidAtIndex >= 0 ? parsePaidAt(row[paidAtIndex] || "") : null
      // Buang baris header yang terlanjur ikut ter-parse (mis. "Member Name", "JUMLAH", "Transaction ID")
      if (/member\s*name/i.test(member) || /transaction\s*id/i.test(transactionId)) return null
      return { member, nominal, transactionId, paidAtMs }
    })
    .filter((row) => row && row.member && row.nominal && row.transactionId)

  // Mode manual baru: filter berdasarkan TRANSACTION ID terakhir.
  // Jika diisi, maka yang ditampilkan hanya baris setelah Transaction ID tersebut (index+1 dst) sesuai urutan input.
  if (lastTrxId) {
    const index = state.wdQris.findIndex((row) => row.transactionId === lastTrxId)
    if (index === -1) {
      renderWdQris()
      showMessage("wdQrisMessage", "Transaction ID terakhir tidak ditemukan di data yang Anda paste.", "error")
      return
    }
    state.wdQris = state.wdQris.slice(index + 1)
  }

  if (state.wdQris.length === 0) {
    renderWdQris()
    showMessage("wdQrisMessage", "Tidak ada data WD QRIS yang bisa ditampilkan.", "error")
    return
  }

  // Mode "data terbaru": tampilkan hanya transaksi di antara jam parse terakhir dan jam terbaru pada input sekarang.
  // Jika user memakai filter Transaction ID terakhir, auto-filter waktu tidak dipakai.
  if (lastTrxId) {
    renderWdQris()
    $("wdQrisMessage").innerHTML = ""
    return
  }

  const currentMaxMs = state.wdQris.reduce((max, row) => {
    return row.paidAtMs != null && row.paidAtMs > max ? row.paidAtMs : max
  }, -Infinity)

  const storedLast = state.wdQrisLastPaidAtMs ?? getStoredWdQrisLastPaidAt()
  if (storedLast != null && Number.isFinite(currentMaxMs) && currentMaxMs > storedLast) {
    const beforeCount = state.wdQris.length
    state.wdQris = state.wdQris.filter((row) => row.paidAtMs != null && row.paidAtMs > storedLast && row.paidAtMs <= currentMaxMs)
    // Jika hasil filter kosong, tetap tampilkan kosong + info singkat.
    if (state.wdQris.length === 0) {
      renderWdQris()
      showMessage("wdQrisMessage", "Tidak ada data terbaru pada rentang waktu tersebut.", "error")
      state.wdQrisLastPaidAtMs = currentMaxMs
      setStoredWdQrisLastPaidAt(currentMaxMs)
      return
    }
    showMessage(
      "wdQrisMessage",
      `${state.wdQris.length} data terbaru (${formatTimeOnly(storedLast)} - ${formatTimeOnly(currentMaxMs)})`,
      "success"
    )
    // Simpan waktu terakhir (jam terbaru di input sekarang)
    state.wdQrisLastPaidAtMs = currentMaxMs
    setStoredWdQrisLastPaidAt(currentMaxMs)
    // Agar tidak membingungkan, hilangkan pesan setelah beberapa detik (showMessage sudah handle).
  } else if (Number.isFinite(currentMaxMs)) {
    // Pertama kali parse: simpan titik awalnya.
    state.wdQrisLastPaidAtMs = currentMaxMs
    setStoredWdQrisLastPaidAt(currentMaxMs)
  }

  renderWdQris()
}

function parseDpQris() {
  const input = $("dpQrisInput").value.trim()
  if (!input) {
    showMessage("dpQrisMessage", "Tempel data DP QRIS terlebih dahulu.", "error")
    return
  }

  const lastTrxId = ($("dpQrisLastTrxId")?.value || "").trim()
  const rows = parseTabular(input)
  if (rows.length < 2) {
    showMessage("dpQrisMessage", "Data DP QRIS tidak valid atau kosong.", "error")
    return
  }

  const parsed = parseQrisRows(rows)
  if (parsed.error) {
    showMessage("dpQrisMessage", parsed.error, "error")
    return
  }

  state.dpQris = parsed.rows.map((row) => ({
    paid: formatPaidDisplay(row.rawPaidAt, row.paidAtMs),
    id: row.member,
    amount: row.nominal,
    transactionId: row.transactionId,
  }))

  if (lastTrxId) {
    const normalizedLastTrxId = normalizeTransactionId(lastTrxId)
    const index = state.dpQris.findIndex((row) => normalizeTransactionId(row.transactionId) === normalizedLastTrxId)
    if (index === -1) {
      renderDpQris()
      showMessage("dpQrisMessage", "Transaction ID terakhir tidak ditemukan di data yang Anda paste.", "error")
      return
    }
    state.dpQris = state.dpQris.slice(index + 1)
  }

  if (state.dpQris.length === 0) {
    renderDpQris()
    showMessage("dpQrisMessage", "Tidak ada data DP QRIS yang bisa ditampilkan.", "error")
    return
  }

  renderDpQris()
  $("dpQrisMessage").innerHTML = ""
}

function handleDepositFile(event) {
  const file = event.target.files?.[0]
  if (!file) return

  $("depositActions").classList.remove("hidden")
  const reader = new FileReader()
  reader.onload = () => parseDepositCsv(String(reader.result || ""))
  reader.readAsText(file)
}

function parseDepositCsv(csvText) {
  const rows = parseCsv(csvText)
  if (rows.length < 2) {
    showMessage("depositMessage", "CSV kosong atau tidak valid.", "error")
    return
  }

  const headers = rows[0].map((cell) => cell.trim().toLowerCase())
  const idIndex = headers.findIndex((header) => header.includes("id invoice"))
  const amountIndex = headers.findIndex((header) => header.includes("nominal"))
  const refIndex = headers.findIndex((header) => header.includes("ref.no") || header.includes("ref no") || header.includes("ref"))

  if ([idIndex, amountIndex, refIndex].includes(-1)) {
    showMessage("depositMessage", "Kolom wajib `ID Invoice`, `Nominal`, dan `Ref.no` tidak ditemukan.", "error")
    return
  }

  state.deposit = rows
    .slice(1)
    .map((row) => ({
      id: (row[idIndex] || "").trim(),
      amount: (row[amountIndex] || "").trim(),
      refNumb: (row[refIndex] || "").trim(),
    }))
    .filter((row) => row.id && row.amount)

  renderDeposit()
  $("depositMessage").innerHTML = ""
}

function parseAdmin() {
  const input = $("adminInput").value.trim()
  if (!input) {
    showMessage("adminMessage", "Tempel data admin terlebih dahulu.", "error")
    return
  }

  const lines = input.replace(/\r\n/g, "\n").split("\n")
  const result = []
  let current = null

  lines.forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed) return

    if (/^\d+\s+\S+/.test(trimmed)) {
      if (current?.id) result.push(current)
      current = { id: trimmed.split(/\s+/)[1], bank: "", amount: "", name: "" }
      return
    }

    if (!current) return

    if (/^withdraw\b/i.test(trimmed)) {
      const parts = trimmed.split(/\s+/)
      current.amount = parts[3] || parts[parts.length - 1] || ""
      return
    }

    if (trimmed.includes(",")) {
      const parts = trimmed.split(",").map((item) => item.trim())
      current.bank = parts[0] || current.bank
      current.name = (parts.slice(2).join(", ") || current.name).toUpperCase()
    }
  })

  if (current?.id) result.push(current)

  state.admin = result.filter((row) => row.id)
  if (state.admin.length === 0) {
    renderAdmin()
    showMessage("adminMessage", "Format admin belum cocok dengan parser bawaan.", "error")
    return
  }

  renderAdmin()
  showMessage("adminMessage", `${state.admin.length} Withdraw berhasil di parse`)
}

function handleCashbackFile(event) {
  const file = event.target.files?.[0]
  if (!file) return

  $("cashbackActions").classList.remove("hidden")
  const reader = new FileReader()
  reader.onload = () => parseCashbackRows(String(reader.result || ""))
  reader.readAsText(file)
}

function parseCashbackRows(rawText) {
  let parsedRows = []

  if (rawText.includes(",")) {
    const csvRows = parseCsv(rawText)
    if (csvRows.length > 0) {
      const header = csvRows[0].map((value) => value.trim().toLowerCase())
      const looksLikeHeader = header.some((cell) => {
        return (
          cell.includes("id") ||
          cell.includes("amount") ||
          cell.includes("loss") ||
          cell.includes("player") ||
          cell.includes("pemain") ||
          cell.includes("menang") ||
          cell.includes("kalah")
        )
      })

      if (looksLikeHeader) {
        const playerIndex = header.findIndex((cell) => {
          return cell === "pemain" || cell === "player" || cell.includes("pemain") || cell.includes("player")
        })
        const playerMenangKalahIndex = header.findIndex((cell) => {
          return (
            cell.includes("player menang kalah") ||
            (cell.includes("player") && cell.includes("menang") && cell.includes("kalah")) ||
            cell.includes("menang kalah")
          )
        })
        const amountIndex = header.findIndex((cell) => {
          return (
            cell.includes("player menang kalah") ||
            (cell.includes("player") && cell.includes("menang") && cell.includes("kalah")) ||
            cell.includes("menang kalah") ||
            cell.includes("loss") ||
            cell.includes("amount") ||
            cell.includes("nominal")
          )
        })

        parsedRows = csvRows
          .slice(1)
          .map((row) => {
            const id = (row[playerIndex] || row[0] || "").trim()
            const rawAmount = (row[playerMenangKalahIndex] || row[amountIndex] || row[1] || "").trim()
            const numericAmount = parseCashbackThresholdAmount(rawAmount)
            return {
              id,
              amount: formatCashbackDisplay(rawAmount),
              numericAmount,
            }
          })
          .filter((row) => row.id && row.amount && Number.isFinite(row.numericAmount))
      } else {
        parsedRows = csvRows
          .map((row) => {
            const id = (row[0] || "").trim()
            const rawAmount = (row[1] || "").trim()
            const numericAmount = parseCashbackThresholdAmount(rawAmount)
            return {
              id,
              amount: formatCashbackDisplay(rawAmount),
              numericAmount,
            }
          })
          .filter((row) => row.id && row.amount && Number.isFinite(row.numericAmount))
      }
    }
  }

  if (parsedRows.length === 0) {
    parsedRows = rawText
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/[,\t|]/).map((item) => item.trim())
        const rawAmount = parts[1] || ""
        return {
          id: parts[0] || "",
          amount: formatCashbackDisplay(rawAmount),
          numericAmount: parseCashbackThresholdAmount(rawAmount),
        }
      })
      .filter((row) => row.id && row.amount && Number.isFinite(row.numericAmount))
  }

  parsedRows = takeCashbackRange(parsedRows)

  if (parsedRows.length === 0) {
    clearCashbackTablesOnly()
    showMessage("cashbackMessage", "Tidak ada data cashback yang memenuhi batas sampai -100000.", "error")
    return
  }

  state.cashbackTables = splitRowsEvenly(parsedRows, 3)

  renderCashback()
  $("cashbackMessage").innerHTML = ""
}

function sortTable(tableName, key) {
  const current = state.sort[tableName]
  const order = current?.key === key && current?.order === "asc" ? "desc" : "asc"
  state.sort[tableName] = { key, order }

  const compare = (a, b) => {
    const aValue = a[key] ?? ""
    const bValue = b[key] ?? ""
    const numeric = ["amount"].includes(key)
    const left = numeric ? parseAmount(aValue) : String(aValue).toLowerCase()
    const right = numeric ? parseAmount(bValue) : String(bValue).toLowerCase()
    if (left < right) return order === "asc" ? -1 : 1
    if (left > right) return order === "asc" ? 1 : -1
    return 0
  }

  state[tableName].sort(compare)

  if (tableName === "withdraw") renderWithdraw()
  if (tableName === "deposit") renderDeposit()
  if (tableName === "admin") renderAdmin()
}

function clearWithdraw() {
  state.withdraw = []
  $("withdrawInput").value = ""
  renderWithdraw()
}

function updateWdQrisStats() {
  const totalNominal = state.wdQris.reduce((sum, row) => sum + parseAmount(row.nominal), 0)
  $("wdQrisStats").innerHTML = `
    <div class="stat"><span>Total Withdraw QRIS</span><strong>${state.wdQris.length}</strong></div>
    <div class="stat"><span>Total Amount</span><strong>Rp ${formatNumber(totalNominal)}</strong></div>
  `
}

function updateDpQrisStats() {
  const totalAmount = state.dpQris.reduce((sum, row) => sum + parseAmount(row.amount), 0)
  $("dpQrisStats").innerHTML = `
    <div class="stat"><span>Total Deposit QRIS</span><strong>${state.dpQris.length}</strong></div>
    <div class="stat"><span>Total Amount</span><strong>Rp ${formatNumber(totalAmount)}</strong></div>
  `
}

function clearWdQris() {
  state.wdQris = []
  state.wdQrisLastPaidAtMs = null
  setStoredWdQrisLastPaidAt(null)
  $("wdQrisInput").value = ""
  if ($("wdQrisLastTrxId")) $("wdQrisLastTrxId").value = ""
  $("wdQrisMessage").innerHTML = ""
  renderWdQris()
}

function clearDpQris() {
  state.dpQris = []
  if ($("dpQrisInput")) $("dpQrisInput").value = ""
  if ($("dpQrisLastTrxId")) $("dpQrisLastTrxId").value = ""
  $("dpQrisMessage").innerHTML = ""
  renderDpQris()
}

function clearDeposit() {
  state.deposit = []
  $("depositFile").value = ""
  $("depositActions").classList.add("hidden")
  renderDeposit()
}

function clearAdmin() {
  state.admin = []
  $("adminInput").value = ""
  renderAdmin()
}

function clearCashbackTablesOnly() {
  state.cashbackTables = [[], [], []]
  renderCashback()
}

function clearCashback() {
  clearCashbackTablesOnly()
  $("cashbackFile").value = ""
  $("cashbackActions").classList.add("hidden")
}

function copyRows(rows, keys, slotId) {
  if (!rows.length) {
    showMessage(slotId, "Belum ada data untuk disalin.", "error")
    return
  }
  const text = rows.map((row) => keys.map((key) => row[key] ?? "").join("\t")).join("\n")
  copyText(text, slotId)
}

function copyCustom(rows, mapper, slotId) {
  if (!rows.length) {
    showMessage(slotId, "Belum ada data untuk disalin.", "error")
    return
  }
  copyText(rows.map(mapper).join("\n"), slotId)
}

async function copyText(text, slotId) {
  try {
    await navigator.clipboard.writeText(text)
    showMessage(slotId, "Data berhasil disalin.")
  } catch {
    const textarea = document.createElement("textarea")
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand("copy")
    textarea.remove()
    showMessage(slotId, "Data berhasil disalin.")
  }
}

function parseCsv(text) {
  const rows = []
  let current = []
  let value = ""
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === "," && !inQuotes) {
      current.push(value)
      value = ""
      continue
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1
      current.push(value)
      if (current.some((cell) => cell.trim() !== "")) rows.push(current)
      current = []
      value = ""
      continue
    }

    value += char
  }

  current.push(value)
  if (current.some((cell) => cell.trim() !== "")) rows.push(current)
  return rows
}

function splitRowsEvenly(rows, totalTables) {
  const result = Array.from({ length: totalTables }, () => [])
  const totalRows = rows.length
  const baseSize = Math.floor(totalRows / totalTables)
  const remainder = totalRows % totalTables
  let startIndex = 0

  for (let tableIndex = 0; tableIndex < totalTables; tableIndex += 1) {
    const currentSize = baseSize + (tableIndex < remainder ? 1 : 0)
    result[tableIndex] = rows.slice(startIndex, startIndex + currentSize)
    startIndex += currentSize
  }

  return result
}

function takeCashbackRange(rows) {
  const result = []
  let started = false

  for (const row of rows) {
    if (!row.id || !row.amount) continue

    if (row.numericAmount <= -100000) {
      started = true
      result.push(row)
      continue
    }

    if (started) {
      break
    }
  }

  return result
}

function parseCashbackThresholdAmount(value) {
  const cleaned = String(value || "").replace(/[^0-9,.-]/g, "").trim()
  if (!cleaned) return Number.NEGATIVE_INFINITY

  // Untuk data seperti: -33321210.000, -100000.000, dll.
  if (/^-?\d+[.,]000$/.test(cleaned)) {
    return Number.parseInt(cleaned.replace(/([.,]000)$/, ""), 10)
  }

  return parseAmount(cleaned)
}

function formatCashbackDisplay(value) {
  const num = parseCashbackThresholdAmount(value)
  return formatCashbackNumber(num)
}

function formatCashbackNumber(num) {
  if (!Number.isFinite(num)) return ""
  const intVal = Math.trunc(num)
  // Pakai koma (,) sebagai pemisah ribuan dan tanpa desimal/titik.
  // Contoh: -100000 -> -100,000
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(intVal)
}

function parseTabular(text) {
  const normalized = String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim()
  if (!normalized) return []
  const lines = normalized.split("\n").filter((l) => l.trim().length > 0)
  // Umumnya copy dari spreadsheet = tab-separated
  if (lines.some((l) => l.includes("\t"))) {
    return lines.map((line) => line.split("\t").map((cell) => cell.trim()))
  }
  // Fallback: coba CSV
  if (lines.some((l) => l.includes(","))) {
    return parseCsv(normalized)
  }
  // Fallback terakhir: split 2+ spasi
  return lines.map((line) => line.split(/\s{2,}/).map((cell) => cell.trim()))
}

function normalizeHeader(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "")
}

function extractTimeText(value) {
  const raw = String(value || "").trim().replace(/\s+/g, " ")
  const match = raw.match(/(\d{2}:\d{2}:\d{2})/)
  return match ? match[1] : raw
}

function normalizeTransactionId(value) {
  return String(value || "").trim().replace(/\s+/g, "").toUpperCase()
}

function formatPaidDisplay(rawPaidAt, paidAtMs) {
  const raw = String(rawPaidAt || "").trim().replace(/\s+/g, " ")
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(raw)) return raw
  if (Number.isFinite(paidAtMs)) {
    const d = new Date(paidAtMs)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    const hh = String(d.getHours()).padStart(2, "0")
    const mi = String(d.getMinutes()).padStart(2, "0")
    const ss = String(d.getSeconds()).padStart(2, "0")
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
  }
  return raw
}

function parseQrisRows(rows) {
  const rawHeader = rows[0].map((c) => String(c || "").trim())
  const rawHeaderLower = rawHeader.map((c) => c.toLowerCase())
  const normalizedHeader = rawHeader.map((c) => normalizeHeader(c))

  const looksLikeHeader = rawHeaderLower.some((h) => {
    return (
      h === "#" ||
      h === "no" ||
      h.includes("paid date") ||
      h.includes("transaction id") ||
      h.includes("jumlah") ||
      h.includes("created") ||
      h.includes("status") ||
      h.includes("member name") ||
      h.includes("bank") ||
      h.includes("rekening")
    )
  })

  let memberIndex = -1
  let amountIndex = -1
  let trxIndex = -1
  let paidAtIndex = -1
  let dataRows = rows

  if (looksLikeHeader) {
    dataRows = rows.slice(1)
    memberIndex = normalizedHeader.findIndex((h) => h === "membername" || h === "member" || (h.includes("member") && h.includes("name")))
    amountIndex = normalizedHeader.findIndex((h) => h === "jumlah" || h === "nominal" || h.includes("jumlah"))
    trxIndex = normalizedHeader.findIndex((h) => h === "transactionid" || (h.includes("transaction") && h.includes("id")))
    paidAtIndex = normalizedHeader.findIndex((h) => h.includes("paiddate") || (h.includes("paid") && h.includes("date")))
  } else {
    memberIndex = 6
    amountIndex = 3
    trxIndex = 2
    paidAtIndex = 1
    const firstRowLower = (rows[0] || []).map((c) => String(c || "").trim().toLowerCase())
    const firstLooksHeader = firstRowLower.some((c) => c.includes("member name") || c.includes("transaction id") || c.includes("jumlah"))
    if (firstLooksHeader) dataRows = rows.slice(1)
  }

  if ([memberIndex, amountIndex, trxIndex].includes(-1)) {
    return {
      error: "Kolom wajib tidak ditemukan. Pastikan data berisi `MEMBER NAME`, `JUMLAH`, dan `TRANSACTION ID` (boleh dengan atau tanpa header).",
      rows: [],
    }
  }

  const parsedRows = dataRows
    .map((row) => {
      if (!row || row.length === 0) return null
      const rawMember = (row[memberIndex] || "").trim()
      const member = rawMember.split("-")[0].trim()
      const nominalRaw = (row[amountIndex] || "").trim()
      const nominal = formatNumber(parseAmount(nominalRaw))
      const transactionId = (row[trxIndex] || "").trim()
      const rawPaidAt = paidAtIndex >= 0 ? String(row[paidAtIndex] || "").trim() : ""
      const paidAtMs = paidAtIndex >= 0 ? parsePaidAt(row[paidAtIndex] || "") : null
      if (/member\s*name/i.test(member) || /transaction\s*id/i.test(transactionId)) return null
      return { member, nominal, transactionId, paidAtMs, rawPaidAt }
    })
    .filter((row) => row && row.member && row.nominal && row.transactionId)

  return { error: null, rows: parsedRows }
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}
