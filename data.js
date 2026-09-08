// Deepam — Telugu Bhakti Books & Audio
// Replica catalog. Matches bhakti-dharma-portal.lovable.app

// ============================================================================
//  AUDIO HOSTING (Cloudflare R2) — read this before adding a new track
// ----------------------------------------------------------------------------
//  Your mp3 files are NOT stored in this project (3GB won't load reliably
//  from a website's own files). They live in a Cloudflare R2 bucket instead,
//  and each track below just points to a URL there.
//
//  ONE-TIME SETUP:
//    Paste your bucket's public base URL below. This is either:
//      - the r2.dev testing URL, e.g. 'https://pub-xxxxxxxxxx.r2.dev'
//      - or your connected custom domain, e.g. 'https://audio.yoursite.com'
//    Leave it as '' and every track below simply won't have a playable URL
//    yet (the site still works — those tracks just show "coming soon").
const AUDIO_CDN_BASE = ''; // <-- paste your R2 public URL here (no trailing slash)

//  FOLDER CONVENTION IN YOUR R2 BUCKET:
//    Upload each file as   <deity-slug>/<track-slug>.mp3
//    e.g. the "suprabhatam" track for "venkateswara" below expects a file at
//         venkateswara/suprabhatam.mp3   inside your R2 bucket.
//    Following this convention means you NEVER have to type a URL by hand —
//    every track's `localPath` is generated automatically from its `deity`
//    and `slug` fields by the helper below.
//
//  TO ADD A BRAND NEW TRACK (once AUDIO_CDN_BASE is set):
//    1. Upload the mp3 to R2 at  <deity-slug>/<new-slug>.mp3
//    2. Add one line to the `audio` array below, following the existing
//       pattern, with a matching `slug` and `deity`, and NO `comingSoon` flag.
//    3. That's it — no code changes needed beyond that one line.
//
//  TO PUBLISH A TRACK THAT'S CURRENTLY "Coming soon":
//    1. Upload the mp3 to R2 at the path matching its deity + slug.
//    2. Delete the `comingSoon: true` bit from that track's line below.
// ============================================================================
function audioUrl(deitySlug, trackSlug) {
  if (!AUDIO_CDN_BASE) return ''; // nothing set yet — track stays unplayable
  return AUDIO_CDN_BASE + '/' + deitySlug + '/' + trackSlug + '.mp3';
}

const DeepamData = {
  brand: {
    mark: 'దీ',
    name: 'Saptarushi',
    tagline: 'తెలుగు భక్తి',
  },

  deities: [
    { slug: 'venkateswara', label: 'Venkateswara', symbol: '✦', te: 'శ్రీ వేంకటేశ్వర స్వామి', desc: 'The Lord of the seven hills. Begin the day with his morning hymns, then move through stotras and scripture at your own pace.' },
    { slug: 'shiva', label: 'Shiva', symbol: '☉', te: 'శ్రీ శివుడు', desc: 'Chants, abhishekam recitals and readings for Mondays, Maha Shivaratri and every quiet evening in between.' },
    { slug: 'rama', label: 'Rama', symbol: '☀', te: 'శ్రీ రాముడు', desc: 'Ramayana readings, bhajans and stotras gathered in one calm place.' },
    { slug: 'krishna', label: 'Krishna', symbol: '☾', te: 'శ్రీ కృష్ణుడు', desc: 'Gita readings, kirtanas and flute-soft bhajans for daily listening.' },
    { slug: 'ganesha', label: 'Ganesha', symbol: '◐', te: 'శ్రీ వినాయకుడు', desc: 'Begin anything here — prayers for a clear start and a steady mind.' },
    { slug: 'hanuman', label: 'Hanuman', symbol: '➤', te: 'శ్రీ ఆంజనేయ స్వామి', desc: 'Chalisa recitals, stotras and Saturday listening for courage and calm.' },
    { slug: 'durga', label: 'Durga / Devi', symbol: '✧', te: 'శ్రీ దుర్గా దేవి', desc: 'Devi stotras and Navaratri recitals, arranged day by day.' },
    { slug: 'lakshmi', label: 'Lakshmi', symbol: '✦', te: 'శ్రీ లక్ష్మీ దేవి', desc: 'Friday prayers, ashtottaram and hymns for abundance and gratitude.' },
    { slug: 'saibaba', label: 'Saibaba', symbol: '☽', te: 'శ్రీ సాయిబాబా', desc: 'Aarti recitals and readings from Shirdi tradition.' },
    { slug: 'ayyappa', label: 'Ayyappa', symbol: '✚', te: 'శ్రీ అయ్యప్ప స్వామి', desc: 'Deeksha-season songs, saranu ghosha and travel prayers.' },
    { slug: 'subrahmanya', label: 'Subrahmanya', symbol: '☀', te: 'శ్రీ సుబ్రహ్మణ్య స్వామి', desc: 'Kavacham recitals and stotras for Skanda devotees.' },
    { slug: 'navagraha', label: 'Navagraha', symbol: '☾', te: 'నవగ్రహాలు', desc: 'Planetary prayers and mantras, one for each of the nine.' },
  ],

  audio: [
    { slug: 'suprabhatam', deity: 'venkateswara', te: 'శ్రీ వేంకటేశ సుప్రభాతం', en: 'Morning Suprabhatam recital', duration: '12:40', tag: 'Chant', localPath: audioUrl('venkateswara', 'suprabhatam'), text: 'The morning waking hymn of Sri Venkateswara — Vara veena mrudu tala, a temple bell and a fresh beginning.' },
    { slug: 'venkateswara-geetalu', deity: 'venkateswara', te: 'వేంకటేశ్వర గీతాలు', en: 'Evening bhajan set', duration: '24:02', tag: 'Bhajan', localPath: audioUrl('venkateswara', 'venkateswara-geetalu'), text: 'An evening set of Venkateswara bhajans for winding down after the day.' },
    { slug: 'deepam-aaradhana', deity: 'venkateswara', te: 'దీపం ఆరాధన', en: 'Deepam aaradhana', duration: '15:48', tag: 'Coming soon', localPath: audioUrl('venkateswara', 'deepam-aaradhana'), comingSoon: true, text: 'A gentle lamp-waving aaradhana, soon to join the library.' },
    { slug: 'shiva-abhishekam', deity: 'shiva', te: 'శివ అభిషేకం', en: 'Abhishekam recital', duration: '18:10', tag: 'Chant', localPath: audioUrl('shiva', 'shiva-abhishekam'), text: 'Rudrabhishekam chants for Shiva — calm, repetitive and clearing.' },
    { slug: 'somavara-prarthana', deity: 'shiva', te: 'సోమవార ప్రార్థన', en: 'Monday evening prayers', duration: '09:22', tag: 'Coming soon', localPath: audioUrl('shiva', 'somavara-prarthana'), comingSoon: true, text: 'Monday evening prayers for Shiva, coming soon.' },
    { slug: 'rama-bhajan', deity: 'rama', te: 'రామ భజన', en: 'Rama bhajan gathering', duration: '21:35', tag: 'Bhajan', localPath: audioUrl('rama', 'rama-bhajan'), text: 'A village-style Rama bhajan kirtan, easy to hum along to.' },
    { slug: 'krishna-kirtana', deity: 'krishna', te: 'కృష్ణ కీర్తన', en: 'Krishna kirtana', duration: '06:30', tag: 'Bhajan', localPath: audioUrl('krishna', 'krishna-kirtana'), text: 'A short Krishna kirtana — flute, jati and a bright refrain.' },
    { slug: 'vinayaka-prarthana', deity: 'ganesha', te: 'వినాయక ప్రార్థన', en: 'Vinayaka prarthana', duration: '05:14', tag: 'Chant', localPath: audioUrl('ganesha', 'vinayaka-prarthana'), text: 'A simple opening prayer to Vinayaka before any new beginning.' },
    { slug: 'anjaneya-shanivara', deity: 'hanuman', te: 'శనివార ఆంజనేయ పఠనం', en: 'Saturday Anjaneya recital', duration: '14:07', tag: 'Chant', localPath: audioUrl('hanuman', 'anjaneya-shanivara'), text: 'The Saturday Anjaneya recitation for courage and calm.' },
    { slug: 'navaratri-devi', deity: 'durga', te: 'నవరాత్రి దేవి పఠనం', en: 'Navaratri devi recital', duration: '16:44', tag: 'Coming soon', localPath: audioUrl('durga', 'navaratri-devi'), comingSoon: true, text: 'Devi recitals arranged for the nine nights of Navaratri.' },
    { slug: 'shukravara-lakshmi', deity: 'lakshmi', te: 'శుక్రవార లక్ష్మీ ప్రార్థన', en: 'Friday Lakshmi prayers', duration: '08:15', tag: 'Aarti', localPath: audioUrl('lakshmi', 'shukravara-lakshmi'), text: 'Friday Lakshmi prayers with aunty-voice warmth and a steady beat.' },
    { slug: 'sai-aarti', deity: 'saibaba', te: 'సాయి ఆరతి', en: 'Sai aarti', duration: '11:02', tag: 'Aarti', localPath: audioUrl('saibaba', 'sai-aarti'), text: 'A serene Sai aarti from the Shirdi tradition.' },
    { slug: 'saranu-ghosha', deity: 'ayyappa', te: 'శరణు ఘోష', en: 'Saranu ghosha', duration: '13:20', tag: 'Coming soon', localPath: audioUrl('ayyappa', 'saranu-ghosha'), comingSoon: true, text: 'The Ayyappa saranu ghosha call, coming soon.' },
    { slug: 'skanda-kavacham', deity: 'subrahmanya', te: 'స్కంద కవచం', en: 'Skanda kavacham recital', duration: '10:48', tag: 'Chant', localPath: audioUrl('subrahmanya', 'skanda-kavacham'), text: 'A clear recital of Sri Skanda Kavacham for Subrahmanya devotees.' },
    { slug: 'navagraha-mantras', deity: 'navagraha', te: 'నవగ్రహ మంత్రాలు', en: 'Navagraha mantras', duration: '19:30', tag: 'Chant', localPath: audioUrl('navagraha', 'navagraha-mantras'), text: 'One mantra for each of the nine planets, chanted slowly.' },
  ],

  books: [
    { slug: 'venkateswara-mahatyam', deity: 'venkateswara', te: 'శ్రీ వేంకటేశ్వర మహాత్మ్యం', en: 'The Hill of Grace — a devotee\'s guide', meta: 'Compiled for daily reading', chapters: [
      { title: 'Before you begin', paras: ['This short guide is meant to be read slowly, a page at a time.', 'It gathers the story of the Hill of Grace — Sri Venkateswara at Tirumala — into three short readings for daily devotion.'] },
      { title: 'The morning practice', paras: ['Begin before sunrise. Light a lamp, sit facing the east, and let the Suprabhatam settle the mind.', 'Read one stanza aloud, then sit in silence for a minute. The practice is repetition with attention.'] },
      { title: 'Festival days', paras: ['On festival days the hill fills with pilgrims. On the eve of Brahmotsavam, offer a coconut and a garland of tulasi.', 'Keep the day simple: one visit, one offering, one prayer said from the heart.'] },
    ] },
    { slug: 'shiva-daily', deity: 'shiva', te: 'శివ ఆరాధన', en: 'Mondays with Shiva', meta: 'Compiled for daily reading', chapters: [
      { title: 'The quiet hour', paras: ['Monday is Shiva\'s day. Keep one quiet hour for him.', 'Pour water over the lingam — or simply pour your attention into silence. Either is an abhishekam.'] },
    ] },
    { slug: 'rama-katha', deity: 'rama', te: 'రామ కథ', en: 'The story of Rama, retold simply', meta: 'Compiled for daily reading', chapters: [
      { title: 'Part one', paras: ['Rama was born to King Dasaratha as the hope of Ayodhya. This retelling keeps the story plain and free of commentary.', 'Read it aloud if you can — the tale is meant for the voice.'] },
    ] },
    { slug: 'krishna-gita-notes', deity: 'krishna', te: 'గీతా పఠన సూచనలు', en: 'Reading the Gita, chapter by chapter', meta: 'Reader\'s notes · Coming soon', comingSoon: true, chapters: [] },
    { slug: 'ganesha-prayers', deity: 'ganesha', te: 'వినాయక ప్రార్థనలు', en: 'Prayers to begin with', meta: 'Compiled for daily reading · Coming soon', comingSoon: true, chapters: [] },
    { slug: 'hanuman-readings', deity: 'hanuman', te: 'శనివార పఠనాలు', en: 'Saturday readings', meta: 'Compiled for daily reading · Coming soon', comingSoon: true, chapters: [] },
  ],
};