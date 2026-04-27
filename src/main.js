import { supabase, BUCKET } from './supabase.js'

const lijst = document.getElementById('bestanden-lijst')
const zoek = document.getElementById('zoek')
const uploadBtn = document.getElementById('upload-btn')
const status = document.getElementById('upload-status')

// ── Bestanden laden ──────────────────────────────────────────
async function laadBestanden(filter = '') {
  lijst.innerHTML = '<p>Laden...</p>'

  const { data, error } = await supabase.storage.from(BUCKET).list('', {
    sortBy: { column: 'created_at', order: 'desc' }
  })

  if (error) {
    lijst.innerHTML = '<p>Fout bij laden van bestanden.</p>'
    return
  }

  const gefilterd = data.filter(f =>
    f.name.toLowerCase().includes(filter.toLowerCase())
  )

  if (gefilterd.length === 0) {
    lijst.innerHTML = '<p>Geen bestanden gevonden.</p>'
    return
  }

  lijst.innerHTML = gefilterd.map(bestand => {
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(bestand.name)
    const grootte = (bestand.metadata?.size / 1024).toFixed(1) + ' KB'
    const datum = new Date(bestand.created_at).toLocaleDateString('nl-BE')

    return `
      <div class="kaart">
        <div class="kaart-info">
          <h3>${bestand.name}</h3>
          <small>📅 ${datum} · 📦 ${grootte}</small>
        </div>
        <a class="download-btn" href="${urlData.publicUrl}" download target="_blank">
          ⬇️ Download
        </a>
      </div>
    `
  }).join('')
}

// ── Uploaden ─────────────────────────────────────────────────
uploadBtn.addEventListener('click', async () => {
  const bestandInput = document.getElementById('bestand-input')
  const vak = document.getElementById('vak-input').value.trim()
  const beschrijving = document.getElementById('beschrijving-input').value.trim()
  const bestand = bestandInput.files[0]

  if (!bestand) { status.textContent = '❌ Kies eerst een bestand.'; return }

  uploadBtn.disabled = true
  status.textContent = '⏳ Bezig met uploaden...'

  // Bestandsnaam: vak_beschrijving_origineel.ext
  const prefix = [vak, beschrijving].filter(Boolean).join('_')
  const bestandsnaam = prefix ? `${prefix}_${bestand.name}` : bestand.name

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(bestandsnaam, bestand, { upsert: true })

  uploadBtn.disabled = false

  if (error) {
    status.textContent = '❌ Upload mislukt: ' + error.message
  } else {
    status.textContent = '✅ Geüpload!'
    bestandInput.value = ''
    document.getElementById('vak-input').value = ''
    document.getElementById('beschrijving-input').value = ''
    laadBestanden()
  }
})

// ── Zoeken ───────────────────────────────────────────────────
zoek.addEventListener('input', e => laadBestanden(e.target.value))

// ── Start ────────────────────────────────────────────────────
laadBestanden()