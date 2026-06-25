/* ─────────────────────────────────────────────────────────────
   DYNAMIC WORD CLOUD ENGINE — app.js
   Requires: d3 v7, d3-cloud v1.2.7 (loaded via CDN in index.html)
───────────────────────────────────────────────────────────── */

'use strict';

/* ── COLOUR PALETTE (sampled from wordle-word-cloud-donations.png) ── */
const COLOR_PALETTE = [
  '#FF4203', // brand-orange-500  — primary Elsevier expression
  '#0056D6', // brand-blue-500    — links / secondary CTA
  '#0C8930', // positive-500      — green
  '#F15827', // PDF accent orange — warm secondary orange
  '#6593DC', // brand-blue-300    — blue tint
  '#333333', // grey-900          — near-black (strong contrast on white)
  '#AF1D1D', // negative-500      — deep red
];

/* ── DEFAULT STOP WORDS ─────────────────────────────────────────── */
const DEFAULT_STOP_WORDS = [
  'a','about','above','after','again','against','all','am','an','and',
  'any','are','aren\'t','as','at','be','because','been','before',
  'being','below','between','both','but','by','can','can\'t','cannot',
  'could','couldn\'t','did','didn\'t','do','does','doesn\'t','doing',
  'don\'t','down','during','each','few','for','from','further','get',
  'got','had','hadn\'t','has','hasn\'t','have','haven\'t','having','he',
  'he\'d','he\'ll','he\'s','her','here','here\'s','hers','herself','him',
  'himself','his','how','how\'s','i','i\'d','i\'ll','i\'m','i\'ve','if',
  'in','into','is','isn\'t','it','it\'s','its','itself','let\'s','me',
  'more','most','mustn\'t','my','myself','no','nor','not','of','off',
  'on','once','only','or','other','ought','our','ours','ourselves',
  'out','over','own','same','shan\'t','she','she\'d','she\'ll','she\'s',
  'should','shouldn\'t','so','some','such','than','that','that\'s',
  'the','their','theirs','them','themselves','then','there','there\'s',
  'these','they','they\'d','they\'ll','they\'re','they\'ve','this',
  'those','through','to','too','under','until','up','very','was',
  'wasn\'t','we','we\'d','we\'ll','we\'re','we\'ve','were','weren\'t',
  'what','what\'s','when','when\'s','where','where\'s','which','while',
  'who','who\'s','whom','why','why\'s','will','with','won\'t','would',
  'wouldn\'t','you','you\'d','you\'ll','you\'re','you\'ve','your',
  'yours','yourself','yourselves',
];

/* ── DOM REFS ────────────────────────────────────────────────────── */
const textInput       = document.getElementById('text-input');
const stopwordsInput  = document.getElementById('stopwords-input');
const generateBtn     = document.getElementById('generate-btn');
const clearBtn        = document.getElementById('clear-btn');
const downloadBtn     = document.getElementById('download-btn');
const dropZone        = document.getElementById('drop-zone');
const fileInput       = document.getElementById('file-input');
const fileNameDisplay = document.getElementById('file-name-display');
const container       = document.getElementById('word-cloud-container');
const emptyState      = document.getElementById('empty-state');
const wordCountLabel  = document.getElementById('word-count-label');
const validationMsg   = document.getElementById('validation-msg');
const btnLabel        = generateBtn.querySelector('.btn-label');
const btnSpinner      = document.getElementById('btn-spinner');
const resetStopBtn    = document.getElementById('reset-stopwords-btn');

/* ── STATE ───────────────────────────────────────────────────────── */
let currentLayout = null; // d3-cloud layout, kept so we can stop it on re-render

/* ── INITIALISE STOP WORDS TEXTAREA ─────────────────────────────── */
function initStopWords() {
  stopwordsInput.value = DEFAULT_STOP_WORDS.join(', ');
}

function getStopWords() {
  return new Set(
    stopwordsInput.value
      .split(',')
      .map(w => w.trim().toLowerCase())
      .filter(Boolean)
  );
}

/* ── TEXT PROCESSING PIPELINE ────────────────────────────────────── */
/**
 * Takes raw text → returns [{text, value}] sorted by frequency desc.
 */
function processText(rawText) {
  // 1. Lowercase
  const lower = rawText.toLowerCase();

  // 2. Strip punctuation, numbers, special chars — keep letters & spaces
  const cleaned = lower.replace(/[^a-z\s]/g, ' ');

  // 3. Tokenise
  const tokens = cleaned.split(/\s+/).filter(Boolean);

  // 4. Filter stop words + single-char tokens
  const stopWords = getStopWords();
  const filtered = tokens.filter(t => t.length > 1 && !stopWords.has(t));

  // 5. Count frequencies
  const freq = {};
  for (const word of filtered) {
    freq[word] = (freq[word] || 0) + 1;
  }

  // 6. Convert to array, sort desc
  return Object.entries(freq)
    .map(([text, value]) => ({ text, value }))
    .sort((a, b) => b.value - a.value);
}

/* ── FONT SIZE SCALE ─────────────────────────────────────────────── */
/**
 * Maps frequency to px font size using a linear scale clamped between
 * MIN_FONT and MAX_FONT.  With only 10-30 words, a linear scale is clear
 * and readable; the range is set relative to the max frequency so the
 * dominant word always uses the full canvas.
 */
const MIN_FONT = 20;
const MAX_FONT = 110;

function buildSizeScale(words) {
  if (!words.length) return () => MIN_FONT;
  const maxVal = words[0].value; // already sorted desc
  const minVal = words[words.length - 1].value;

  if (maxVal === minVal) {
    // all same frequency — give a single mid size
    return () => Math.round((MIN_FONT + MAX_FONT) / 2);
  }

  // Linear interpolation
  return (val) => {
    const t = (val - minVal) / (maxVal - minVal); // 0..1
    return Math.round(MIN_FONT + t * (MAX_FONT - MIN_FONT));
  };
}

/* ── COLOUR ASSIGNMENT ───────────────────────────────────────────── */
/**
 * Deterministic-ish colour per word based on the word string, so the
 * same word always gets the same colour across re-renders of the same
 * input.
 */
function wordColor(word) {
  let hash = 0;
  for (let i = 0; i < word.length; i++) {
    hash = (hash * 31 + word.charCodeAt(i)) | 0;
  }
  return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length];
}

/* ── RENDER WORD CLOUD ───────────────────────────────────────────── */
function renderWordCloud(words) {
  // Abort any running layout
  if (currentLayout) {
    currentLayout.stop();
    currentLayout = null;
  }

  const canvasWidth  = container.clientWidth  || 860;
  const canvasHeight = Math.max(Math.round(canvasWidth * 0.56), 360); // ~16:9 feel
  const sizeScale    = buildSizeScale(words);

  // Attach size to each word object
  const layoutWords = words.map(d => ({
    text:  d.text,
    value: d.value,
    size:  sizeScale(d.value),
    color: wordColor(d.text),
  }));

  currentLayout = d3.layout.cloud()
    .size([canvasWidth, canvasHeight])
    .words(layoutWords)
    .padding(6)
    .rotate(0)                   // 100 % horizontal — matches reference image
    .font('Arial, Helvetica, sans-serif')
    .fontWeight('bold')
    .fontSize(d => d.size)
    .spiral('archimedean')       // tight Archimedean packing
    .on('end', draw)
    .start();

  function draw(placedWords) {
    // Clear previous SVG
    container.innerHTML = '';

    const svg = d3.select(container)
      .append('svg')
        .attr('xmlns', 'http://www.w3.org/2000/svg')
        .attr('width',  canvasWidth)
        .attr('height', canvasHeight);

    // White background rect (needed for PNG export)
    svg.append('rect')
      .attr('width',  canvasWidth)
      .attr('height', canvasHeight)
      .attr('fill', '#FFFFFF');

    // Word group — centred on canvas
    svg.append('g')
        .attr('transform', `translate(${canvasWidth / 2},${canvasHeight / 2})`)
      .selectAll('text')
      .data(placedWords)
      .enter()
        .append('text')
          .attr('text-anchor', 'middle')
          .attr('font-family', 'Arial, Helvetica, sans-serif')
          .attr('font-weight', 'bold')
          .attr('font-size', d => `${d.size}px`)
          .attr('fill', d => d.color)
          .attr('transform', d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
          .text(d => d.text);

    // Show container, hide empty state
    container.style.display = 'block';
    emptyState.style.display = 'none';

    // Update toolbar
    wordCountLabel.textContent = `${placedWords.length} word${placedWords.length !== 1 ? 's' : ''}`;
    downloadBtn.disabled = false;
  }
}

/* ── GENERATE HANDLER ────────────────────────────────────────────── */
function handleGenerate() {
  const raw = textInput.value.trim();

  // Validation: empty input
  if (!raw) {
    showValidation('Please paste some text or upload a file first.');
    return;
  }

  clearValidation();
  setLoading(true);

  // Small delay lets the spinner render before the synchronous d3 layout
  setTimeout(() => {
    const words = processText(raw);

    if (!words.length) {
      setLoading(false);
      showValidation('No meaningful words found. Try removing more stop words or adding more descriptive text.');
      return;
    }

    renderWordCloud(words);
    setLoading(false);
  }, 30);
}

/* ── CLEAR HANDLER ───────────────────────────────────────────────── */
function handleClear() {
  textInput.value = '';
  fileNameDisplay.textContent = '';
  fileInput.value = '';
  container.innerHTML = '';
  container.style.display = 'none';
  emptyState.style.display = 'flex';
  wordCountLabel.textContent = '';
  downloadBtn.disabled = true;
  clearValidation();
  if (currentLayout) { currentLayout.stop(); currentLayout = null; }
}

/* ── DOWNLOAD PNG ────────────────────────────────────────────────── */
function handleDownload() {
  const svg = container.querySelector('svg');
  if (!svg) return;

  const svgWidth  = parseInt(svg.getAttribute('width'),  10) || 860;
  const svgHeight = parseInt(svg.getAttribute('height'), 10) || 480;

  // Scale up for high-res export (2×)
  const scale  = 2;
  const canvas = document.createElement('canvas');
  canvas.width  = svgWidth  * scale;
  canvas.height = svgHeight * scale;

  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, svgWidth, svgHeight);

  const svgData = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url     = URL.createObjectURL(svgBlob);
  const img     = new Image();

  img.onload = () => {
    ctx.drawImage(img, 0, 0, svgWidth, svgHeight);
    URL.revokeObjectURL(url);

    const link = document.createElement('a');
    link.download = 'wordcloud.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  img.onerror = () => {
    URL.revokeObjectURL(url);
    // Fallback: download SVG instead
    const fallbackLink = document.createElement('a');
    fallbackLink.download = 'wordcloud.svg';
    fallbackLink.href = URL.createObjectURL(svgBlob);
    fallbackLink.click();
  };

  img.src = url;
}

/* ── FILE UPLOAD ─────────────────────────────────────────────────── */
function handleFile(file) {
  if (!file) return;

  const validTypes = ['text/plain', 'text/csv', 'application/csv'];
  const validExts  = ['.txt', '.csv'];
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

  if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
    showValidation('Only .txt and .csv files are supported.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    textInput.value = e.target.result;
    fileNameDisplay.textContent = `✓ ${file.name} loaded`;
    clearValidation();
  };
  reader.onerror = () => showValidation('Failed to read the file. Please try again.');
  reader.readAsText(file);
}

/* ── DRAG & DROP ─────────────────────────────────────────────────── */
function setupDropZone() {
  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') fileInput.click();
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', (e) => {
    if (!dropZone.contains(e.relatedTarget)) {
      dropZone.classList.remove('drag-over');
    }
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    handleFile(file);
  });

  fileInput.addEventListener('change', () => {
    handleFile(fileInput.files[0]);
  });
}

/* ── UI HELPERS ──────────────────────────────────────────────────── */
function setLoading(state) {
  generateBtn.disabled = state;
  btnLabel.textContent = state ? 'Generating…' : 'Generate Word Cloud';
  btnSpinner.hidden = !state;
}

function showValidation(msg) {
  validationMsg.textContent = msg;
  validationMsg.hidden = false;
}

function clearValidation() {
  validationMsg.textContent = '';
  validationMsg.hidden = true;
}

/* ── RESIZE — re-render on window resize if cloud is visible ─────── */
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (container.style.display !== 'none' && container.querySelector('svg')) {
      const raw = textInput.value.trim();
      if (raw) {
        const words = processText(raw);
        if (words.length) renderWordCloud(words);
      }
    }
  }, 300);
});

/* ── WIRE UP EVENTS ──────────────────────────────────────────────── */
generateBtn.addEventListener('click', handleGenerate);
clearBtn.addEventListener('click', handleClear);
downloadBtn.addEventListener('click', handleDownload);
resetStopBtn.addEventListener('click', initStopWords);

// Allow Ctrl+Enter / Cmd+Enter to generate
textInput.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleGenerate();
});

setupDropZone();
initStopWords();
