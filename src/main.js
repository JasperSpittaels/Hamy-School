import { supabase, BUCKET } from './supabase.js'

// ── State ─────────────────────────────────────────────────────
let padStapels = []

function huidigePad() {
  return padStapels.join('/')
}

// ── DOM refs ──────────────────────────────────────────────────
const lijst        = document.getElementById('bestanden-lijst')
const uploadBtn    = document.getElementById('upload-btn')
const status       = document.getElementById('upload-status')
const mappenBtn    = document.getElementById('map-aanmaken-btn')
const mapNaamInput = document.getElementById('map-naam-input')
const breadcrumb   = document.getElementById('breadcrumb')

// ── Breadcrumb bijwerken ───────────────────────────────────────
function updateBreadcrumb() {
  // Bouw elk niveau op als klikbare link, behalve het laatste
  const delen = []

  // Root
  const rootSpan = document.createElement('span')
  rootSpan.className = padStapels.length === 0 ? 'bc-item active' : 'bc-item link'
  rootSpan.textContent = '🏠 Root'
  if (padStapels.length > 0) {
    rootSpan.addEventListener('click', () => {
      padStapels = []
      laadBestanden()
    })
  }
  delen.push(rootSpan)

  // Elke map in het pad
  padStapels.forEach((map, index) => {
    const sep = document.createElement('span')
    sep.className = 'bc-sep'
    sep.textContent = '›'
    delen.push(sep)

    const mapSpan = document.createElement('span')
    const isLaatste = index === padStapels.length - 1
    mapSpan.className = isLaatste ? 'bc-item active' : 'bc-item link'
    mapSpan.textContent = `📁 ${map}`

    if (!isLaatste) {
      // Klik → ga terug naar dit niveau
      mapSpan.addEventListener('click', () => {
        padStapels = padStapels.slice(0, index + 1)
        laadBestanden()
      })
    }
    delen.push(mapSpan)
  })

  breadcrumb.innerHTML = ''
  delen.forEach(el => breadcrumb.appendChild(el))
}

// ── Bestanden & mappen laden ───────────────────────────────────
async function laadBestanden() {
  updateBreadcrumb()
  lijst.innerHTML = '<p>Laden...</p>'

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(huidigePad(), { sortBy: { column: 'name', order: 'asc' } })

  if (error) {
    lijst.innerHTML = '<p>❌ Fout bij laden.</p>'
    return
  }

  const gefilterd = data.filter(item =>
    item.name !== '.emptyFolderPlaceholder'
  )

  if (gefilterd.length === 0) {
    lijst.innerHTML = '<p>Geen bestanden of mappen gevonden.</p>'
    return
  }

  lijst.innerHTML = ''

  for (const item of gefilterd) {
    const isMap = item.id === null

    if (isMap) {
      const kaart = document.createElement('div')
      kaart.className = 'kaart map-kaart'
      kaart.innerHTML = `
        <div class="kaart-info" style="cursor:pointer">
          <span class="map-icoon">📁</span>
          <h3>${item.name}</h3>
        </div>
        <button class="verwijder-btn">🗑️ Verwijder map</button>
      `
      kaart.querySelector('.kaart-info').addEventListener('click', () => {
        padStapels = [...padStapels, item.name]
        laadBestanden()
      })
      kaart.querySelector('.verwijder-btn').addEventListener('click', () =>
        verwijderMap(item.name)
      )
      lijst.appendChild(kaart)

    } else {
      const pad = huidigePad()
      const volledigPad = pad ? `${pad}/${item.name}` : item.name
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(volledigPad)
      const grootte = item.metadata?.size
        ? (item.metadata.size / 1024).toFixed(1) + ' KB'
        : '?'
      const datum = item.created_at
        ? new Date(item.created_at).toLocaleDateString('nl-BE')
        : ''

      const kaart = document.createElement('div')
      kaart.className = 'kaart'
      kaart.innerHTML = `
        <div class="kaart-info">
          <h3>📄 ${item.name}</h3>
          <small>📅 ${datum} · 📦 ${grootte}</small>
        </div>
        <div class="kaart-acties">
          <a class="download-btn" href="${urlData.publicUrl}" download target="_blank">⬇️ Download</a>
          <button class="verwijder-btn">🗑️</button>
        </div>
      `
      kaart.querySelector('.verwijder-btn').addEventListener('click', () =>
        verwijderBestand(volledigPad)
      )
      lijst.appendChild(kaart)
    }
  }
}

// ── Bestand verwijderen ────────────────────────────────────────
async function verwijderBestand(volledigPad) {
  if (!confirm(`Bestand verwijderen: ${volledigPad}?`)) return

  const { error } = await supabase.storage.from(BUCKET).remove([volledigPad])
  if (error) {
    status.textContent = '❌ Verwijderen mislukt: ' + error.message
  } else {
    laadBestanden()
  }
}

// ── Recursief alle bestanden in een map ophalen ────────────────
async function lijstAllesBestanden(mapPad) {
  const { data, error } = await supabase.storage.from(BUCKET).list(mapPad)
  if (error || !data) return []

  let allePaden = []

  for (const item of data) {
    const volledigPad = `${mapPad}/${item.name}`
    const isMap = item.id === null

    if (isMap) {
      // Recursief de submap ingaan
      const subPaden = await lijstAllesBestanden(volledigPad)
      allePaden = [...allePaden, ...subPaden]
    } else {
      allePaden.push(volledigPad)
    }
  }

  return allePaden
}

// ── Map verwijderen ────────────────────────────────
async function verwijderMap(mapNaam) {
  const pad = huidigePad()
  const volledigMapPad = pad ? `${pad}/${mapNaam}` : mapNaam
  if (!confirm(`Map "${mapNaam}" en alle inhoud verwijderen?`)) return

  status.textContent = '⏳ Bezig met verwijderen...'

  // Haal ALLE bestanden recursief op (ook in submappen)
  const allePaden = await lijstAllesBestanden(volledigMapPad)

  if (allePaden.length > 0) {
    const { error } = await supabase.storage.from(BUCKET).remove(allePaden)
    if (error) {
      status.textContent = '❌ Verwijderen mislukt: ' + error.message
      return
    }
  }

  // Verwijder ook de placeholder
  await supabase.storage.from(BUCKET).remove([`${volledigMapPad}/.emptyFolderPlaceholder`])

  status.textContent = '✅ Map verwijderd!'
  laadBestanden()
}

// ── Map aanmaken ───────────────────────────────────────────────
mappenBtn.addEventListener('click', async () => {
  const naam = mapNaamInput.value.trim()
  if (!naam) { status.textContent = 'Geef een mapnaam op.'; return }
  if (/[^a-zA-Z0-9_\- ]/.test(naam)) { status.textContent = 'Gebruik alleen letters, cijfers, - of _'; return }

  const pad = huidigePad()
  const placeholder = pad
    ? `${pad}/${naam}/.emptyFolderPlaceholder`
    : `${naam}/.emptyFolderPlaceholder`
  const leegBestand = new Blob([''], { type: 'text/plain' })

  const { error } = await supabase.storage.from(BUCKET).upload(placeholder, leegBestand)
  if (error && !error.message.includes('already exists')) {
    status.textContent = '❌ Map aanmaken mislukt: ' + error.message
  } else {
    mapNaamInput.value = ''
    laadBestanden()
  }
})

// ── Bestand uploaden ───────────────────────────────────────────
uploadBtn.addEventListener('click', async () => {
  const bestandInput = document.getElementById('bestand-input')
  const bestand = bestandInput.files[0]
  if (!bestand) { status.textContent = '❌ Kies eerst een bestand.'; return }

  uploadBtn.disabled = true
  status.textContent = '⏳ Uploaden...'

  const pad = huidigePad()
  const volledigPad = pad ? `${pad}/${bestand.name}` : bestand.name
  const { error } = await supabase.storage.from(BUCKET).upload(volledigPad, bestand, { upsert: true })

  uploadBtn.disabled = false
  if (error) {
    status.textContent = '❌ Upload mislukt: ' + error.message
  } else {
    status.textContent = '✅ Geüpload!'
    bestandInput.value = ''
    laadBestanden()
  }
})

// ── Start ──────────────────────────────────────────────────────
laadBestanden()