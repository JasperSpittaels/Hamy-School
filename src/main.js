import { supabase, BUCKET } from './supabase.js'

// ── State ────────────────────────────────────────────────────
let huidigePad = '' // '' = root, 'wiskunde' = in map "wiskunde"

// ── DOM refs ─────────────────────────────────────────────────
const lijst        = document.getElementById('bestanden-lijst')
const zoek         = document.getElementById('zoek')
const uploadBtn    = document.getElementById('upload-btn')
const status       = document.getElementById('upload-status')
const mappenBtn    = document.getElementById('map-aanmaken-btn')
const mapNaamInput = document.getElementById('map-naam-input')
const breadcrumb   = document.getElementById('breadcrumb')

// ── Breadcrumb bijwerken ──────────────────────────────────────
function updateBreadcrumb() {
  if (huidigePad === '') {
    breadcrumb.innerHTML = '<span class="bc-item active">🏠 Root</span>'
  } else {
    breadcrumb.innerHTML = `
      <span class="bc-item link" id="bc-root">🏠 Root</span>
      <span class="bc-sep">›</span>
      <span class="bc-item active">📁 ${huidigePad}</span>
    `
    document.getElementById('bc-root').addEventListener('click', () => {
      huidigePad = ''
      laadBestanden()
    })
  }
}

// ── Bestanden & mappen laden ──────────────────────────────────
async function laadBestanden(filter = '') {
  updateBreadcrumb()
  lijst.innerHTML = '<p>Laden...</p>'

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(huidigePad, { sortBy: { column: 'name', order: 'asc' } })

  if (error) {
    lijst.innerHTML = '<p>❌ Fout bij laden.</p>'
    return
  }

  const gefilterd = data.filter(item =>
    item.name.toLowerCase().includes(filter.toLowerCase()) &&
    item.name !== '.emptyFolderPlaceholder'
  )

  if (gefilterd.length === 0) {
    lijst.innerHTML = '<p>Geen bestanden of mappen gevonden.</p>'
    return
  }

  lijst.innerHTML = ''

  for (const item of gefilterd) {
    const isMap = item.id === null // mappen hebben geen id in Supabase

    if (isMap) {
      // ── Map kaart ──
      const kaart = document.createElement('div')
      kaart.className = 'kaart map-kaart'
      kaart.innerHTML = `
        <div class="kaart-info" style="cursor:pointer" data-map="${item.name}">
          <span class="map-icoon">📁</span>
          <h3>${item.name}</h3>
        </div>
        <button class="verwijder-btn" data-map="${item.name}">🗑️ Verwijder map</button>
      `
      kaart.querySelector('.kaart-info').addEventListener('click', () => {
        huidigePad = huidigePad ? `${huidigePad}/${item.name}` : item.name
        laadBestanden()
      })
      kaart.querySelector('.verwijder-btn').addEventListener('click', () =>
        verwijderMap(item.name)
      )
      lijst.appendChild(kaart)

    } else {
      // ── Bestand kaart ──
      const volledigPad = huidigePad ? `${huidigePad}/${item.name}` : item.name
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
          <button class="verwijder-btn" data-pad="${volledigPad}">🗑️</button>
        </div>
      `
      kaart.querySelector('.verwijder-btn').addEventListener('click', () =>
        verwijderBestand(volledigPad)
      )
      lijst.appendChild(kaart)
    }
  }
}

// ── Bestand verwijderen ───────────────────────────────────────
async function verwijderBestand(pad) {
  if (!confirm(`Bestand verwijderen: ${pad}?`)) return

  const { error } = await supabase.storage.from(BUCKET).remove([pad])
  if (error) {
    alert('❌ Verwijderen mislukt: ' + error.message)
  } else {
    laadBestanden()
  }
}

// ── Map verwijderen (alle bestanden erin verwijderen) ─────────
async function verwijderMap(mapNaam) {
  const volledigMapPad = huidigePad ? `${huidigePad}/${mapNaam}` : mapNaam
  if (!confirm(`Map "${mapNaam}" en alle inhoud verwijderen?`)) return

  // Lijst alle bestanden in de map op
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(volledigMapPad)

  if (error) { alert('❌ Fout: ' + error.message); return }

  if (data && data.length > 0) {
    const paden = data.map(f => `${volledigMapPad}/${f.name}`)
    const { error: removeError } = await supabase.storage.from(BUCKET).remove(paden)
    if (removeError) { alert('❌ Verwijderen mislukt: ' + removeError.message); return }
  }

  // Verwijder ook de placeholder als die bestaat
  await supabase.storage.from(BUCKET).remove([`${volledigMapPad}/.emptyFolderPlaceholder`])

  laadBestanden()
}

// ── Map aanmaken ──────────────────────────────────────────────
mappenBtn.addEventListener('click', async () => {
  const naam = mapNaamInput.value.trim()
  if (!naam) { alert('Geef een mapnaam op.'); return }
  if (/[^a-zA-Z0-9_\- ]/.test(naam)) { alert('Gebruik alleen letters, cijfers, - of _'); return }

  // Supabase heeft een placeholder bestand nodig om een map aan te maken
  const pad = huidigePad ? `${huidigePad}/${naam}/.emptyFolderPlaceholder` : `${naam}/.emptyFolderPlaceholder`
  const leegBestand = new Blob([''], { type: 'text/plain' })

  const { error } = await supabase.storage.from(BUCKET).upload(pad, leegBestand)
  if (error && !error.message.includes('already exists')) {
    alert('❌ Map aanmaken mislukt: ' + error.message)
  } else {
    mapNaamInput.value = ''
    laadBestanden()
  }
})

// ── Bestand uploaden ──────────────────────────────────────────
uploadBtn.addEventListener('click', async () => {
  const bestandInput = document.getElementById('bestand-input')
  const bestand = bestandInput.files[0]
  if (!bestand) { status.textContent = '❌ Kies eerst een bestand.'; return }

  uploadBtn.disabled = true
  status.textContent = '⏳ Uploaden...'

  const pad = huidigePad ? `${huidigePad}/${bestand.name}` : bestand.name
  const { error } = await supabase.storage.from(BUCKET).upload(pad, bestand, { upsert: true })

  uploadBtn.disabled = false
  if (error) {
    status.textContent = '❌ Upload mislukt: ' + error.message
  } else {
    status.textContent = '✅ Geüpload!'
    bestandInput.value = ''
    laadBestanden()
  }
})

// ── Zoeken ────────────────────────────────────────────────────
zoek.addEventListener('input', e => laadBestanden(e.target.value))

// ── Start ─────────────────────────────────────────────────────
laadBestanden()