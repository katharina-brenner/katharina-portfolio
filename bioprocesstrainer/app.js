const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const fmt = (value, digits = 1) => Number(value).toFixed(digits);

const freshProcess = () => ({
  status: 'idle',
  seconds: 0,
  acceleration: 1,
  reactorVolume: 0,
  substrate1: 0,
  substrate2: 0,
  product: 0,
  acid: 1.4,
  base: 1.4,
  antifoam: 1.4,
  ph: 7.1,
  po2: 100,
  temperature: 20,
  foam: 0,
  oxygen: 0,
  carbonDioxide: 0,
  biomass: 0,
  ethanol: 0,
  inoculumReady: false,
  sampleCount: 0,
});

let process = freshProcess();
let gas = { oxygen: 0, air: 0, nitrogen: 0 };
let setpoints = { ph: 7, po2: 60, temperature: 30, level: 8 };
let history = [];
let activeTrend = 'ph-po2';
let message = 'System ready. Start a new process.';

const statusLabels = {
  idle: 'Ready',
  prepared: 'Inoculum prepared',
  filled: 'Reactor filled',
  inoculated: 'Inoculated',
  running: 'Process running',
  paused: 'Process interrupted',
  stopped: 'Process stopped',
};

function processTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hours, minutes, secs].map((part) => String(part).padStart(2, '0')).join(':');
}

function updateClock() {
  const now = new Date();
  $('[data-date]').textContent = new Intl.DateTimeFormat('de-DE').format(now);
  $('[data-clock]').textContent = new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(now);
}

function updateText(selector, value) {
  const element = $(selector);
  if (element) element.textContent = value;
}

function setMessage(nextMessage) {
  message = nextMessage;
  updateText('[data-message]', message);
}

function setLiquid(name, amount, capacity) {
  const liquid = $(`[data-liquid="${name}"]`);
  if (liquid) liquid.style.height = `${clamp((amount / capacity) * 100, 0, 100)}%`;
  updateText(`[data-value="${name}"]`, `${fmt(amount, 2)} L`);
}

function render() {
  const running = process.status === 'running';
  updateText('[data-status]', statusLabels[process.status]);
  updateText('[data-time]', processTime(process.seconds));
  updateText('[data-speed-label]', `${process.acceleration}x`);
  updateText('[data-message]', message);
  updateText('[data-samples]', process.sampleCount);
  updateText('[data-biomass]', fmt(process.biomass, 2));
  updateText('[data-ethanol]', fmt(process.ethanol, 2));
  updateText('[data-flow="substrate1"]', `${running && process.substrate1 > 0 ? '2.00' : '0.00'} ml/min`);

  $('[data-power-light]').classList.toggle('on', running);
  $('[data-bubbles]').classList.toggle('active', running);
  $('.bpt-motor').classList.toggle('running', running);
  $('[data-inoculum]').classList.toggle('ready', process.inoculumReady);
  $('[data-action="run-toggle"]').textContent = running ? 'Pause simulation' : 'Run simulation';

  $$('[data-speed]').forEach((button) => button.classList.toggle('active', Number(button.dataset.speed) === process.acceleration));

  setLiquid('substrate1', process.substrate1, 10);
  setLiquid('substrate2', process.substrate2, 10);
  setLiquid('acid', process.acid, 2);
  setLiquid('base', process.base, 2);
  setLiquid('antifoam', process.antifoam, 2);
  $('[data-reactor-liquid]').style.height = `${clamp((process.reactorVolume / 20) * 100, 0, 100)}%`;
  $('[data-product-liquid]').style.height = `${clamp((process.product / 20) * 100, 0, 100)}%`;

  updateText('[data-reading="oxygen"]', `${fmt(process.oxygen)} %`);
  updateText('[data-reading="carbonDioxide"]', `${fmt(process.carbonDioxide)} %`);
  updateText('[data-reading="po2"]', `${fmt(process.po2)} %`);
  updateText('[data-reading="ph"]', fmt(process.ph));
  updateText('[data-reading="temperature"]', `${fmt(process.temperature)} °C`);
  updateText('[data-reading="thermal"]', `${fmt(process.temperature)} °C`);
  updateText('[data-reading="reactorVolume"]', `${fmt(process.reactorVolume)} L`);
  updateText('[data-reading="foam"]', `${fmt(process.foam)} L`);
  updateText('[data-reading="product"]', `${fmt(process.product)} L`);

  Object.entries(gas).forEach(([name, value]) => {
    updateText(`[data-gas-display="${name}"]`, fmt(value));
    updateText(`[data-gas-output="${name}"]`, `${fmt(value)} L/min`);
  });

  if ($('[data-dialog="trend"]').open) drawTrend();
}

function prepareInoculum() {
  process.status = 'prepared';
  process.inoculumReady = true;
  setMessage('Inoculum prepared: S. cerevisiae is ready.');
  render();
}

function fillFeedTanks() {
  process.substrate1 = 10;
  process.substrate2 = 10;
  setMessage('Substrate tanks filled.');
  render();
}

function fillReactor(volume = 5) {
  process.status = 'filled';
  process.reactorVolume = clamp(Number(volume) || 0, 0, 20);
  process.temperature = 20;
  process.ph = 7.1;
  setMessage(`Reactor filled with ${fmt(process.reactorVolume)} L medium.`);
  render();
}

function inoculate() {
  if (!process.inoculumReady || process.reactorVolume === 0) {
    setMessage('Prepare inoculum and fill the reactor first.');
    return;
  }
  process.status = 'inoculated';
  process.biomass = Math.max(process.biomass, 0.18);
  setMessage('Reactor inoculated. The cultivation can start.');
  render();
}

function runProcess() {
  if (!['inoculated', 'paused', 'running'].includes(process.status)) {
    setMessage('Inoculate the filled reactor before starting the process.');
    return;
  }
  process.status = 'running';
  setMessage('Cultivation is running.');
  render();
}

function pauseProcess() {
  if (process.status !== 'running') return;
  process.status = 'paused';
  setMessage('Process interrupted.');
  render();
}

function sampleProcess() {
  if (process.reactorVolume < 0.05) {
    setMessage('No medium available for sampling.');
    return;
  }
  process.reactorVolume -= 0.01;
  process.sampleCount += 1;
  setMessage(`Sample ${process.sampleCount}: OD ${fmt(process.biomass / 0.3, 2)}, ethanol ${fmt(process.ethanol, 2)} g/L.`);
  render();
}

function resetProcess() {
  process = freshProcess();
  gas = { oxygen: 0, air: 0, nitrogen: 0 };
  history = [];
  message = 'New process initialized. Prepare the inoculum and medium.';
  $$('[data-gas]').forEach((input) => { input.value = 0; });
  render();
}

function tick() {
  if (process.status !== 'running') return;
  const elapsed = process.acceleration * 60;
  process.seconds += elapsed;
  const hours = process.seconds / 3600;
  const feedRate = process.substrate1 > 0 && process.reactorVolume > 0 ? 0.12 : 0;
  const feedLiters = feedRate * (elapsed / 3600);

  process.biomass = clamp(process.biomass + (0.055 * process.biomass + 0.012) * (elapsed / 60), 0, 38);
  process.reactorVolume = clamp(process.reactorVolume + feedLiters, 0, 20);
  process.substrate1 = clamp(process.substrate1 - feedLiters, 0, 10);
  process.ph = clamp(process.ph + (setpoints.ph - process.ph) * 0.18 + Math.sin(hours * 2) * 0.01, 5.5, 8.5);
  process.po2 = clamp(setpoints.po2 + Math.sin(hours * 3.1) * 3 - process.biomass * 0.45 + gas.air * 0.5 + gas.oxygen * 0.8, 0, 100);
  process.temperature += (setpoints.temperature - process.temperature) * 0.14;
  process.carbonDioxide = clamp(process.biomass * 0.42 + Math.sin(hours) * 0.2, 0, 18);
  process.oxygen = clamp(gas.oxygen * 0.2 + gas.air * 0.035 + process.po2 * 0.018, 0, 12);
  process.foam = clamp(process.biomass * 0.012 - process.antifoam * 0.002, 0, 0.9);
  process.ethanol = clamp(process.ethanol + process.biomass * 0.0024 * (elapsed / 60), 0, 80);

  history.push({
    seconds: process.seconds,
    ph: process.ph,
    po2: process.po2,
    temperature: process.temperature,
    oxygen: process.oxygen,
    carbonDioxide: process.carbonDioxide,
    reactorVolume: process.reactorVolume,
    feed: feedRate,
  });
  history = history.slice(-120);
  render();
}

function drawTrend() {
  const svg = $('[data-chart]');
  const legend = $('[data-trend-legend]');
  const configurations = {
    'ph-po2': [
      { key: 'ph', label: 'pH × 10', color: '#d63a2e', scale: 10 },
      { key: 'po2', label: 'pO2', color: '#2159c7', scale: 1 },
    ],
    'gas-po2': [
      { key: 'oxygen', label: 'O2 × 5', color: '#238d3c', scale: 5 },
      { key: 'carbonDioxide', label: 'CO2 × 5', color: '#d63a2e', scale: 5 },
      { key: 'po2', label: 'pO2', color: '#2159c7', scale: 1 },
    ],
    temperature: [{ key: 'temperature', label: 'Temperature × 3', color: '#d63a2e', scale: 3 }],
    feed: [
      { key: 'feed', label: 'Feed × 10', color: '#238d3c', scale: 10 },
      { key: 'reactorVolume', label: 'Volume × 8', color: '#2159c7', scale: 8 },
    ],
  };
  const config = configurations[activeTrend];
  const points = history.length ? history : [{
    seconds: process.seconds,
    ph: process.ph,
    po2: process.po2,
    temperature: process.temperature,
    oxygen: process.oxygen,
    carbonDioxide: process.carbonDioxide,
    reactorVolume: process.reactorVolume,
    feed: 0,
  }];

  legend.innerHTML = config.map((line) => `<span style="color:${line.color}">● ${line.label}</span>`).join('');
  const vertical = Array.from({ length: 7 }, (_, index) => `<line x1="${42 + index * 103.67}" y1="12" x2="${42 + index * 103.67}" y2="260" stroke="#999" stroke-dasharray="4 4" />`).join('');
  const horizontal = Array.from({ length: 6 }, (_, index) => `<line x1="42" y1="${12 + index * 49.6}" x2="664" y2="${12 + index * 49.6}" stroke="#999" stroke-dasharray="4 4" />`).join('');
  const paths = config.map((line) => {
    const path = points.map((point, index) => {
      const x = 42 + (index / Math.max(points.length - 1, 1)) * 622;
      const y = 260 - clamp(Number(point[line.key]) * line.scale, 0, 100) * 2.48;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ');
    return `<path d="${path}" fill="none" stroke="${line.color}" stroke-width="2" vector-effect="non-scaling-stroke" />`;
  }).join('');

  svg.innerHTML = `<rect x="42" y="12" width="622" height="248" fill="#fff" stroke="#222" />${vertical}${horizontal}<text x="10" y="20" font-size="10">100</text><text x="18" y="144" font-size="10">50</text><text x="24" y="260" font-size="10">0</text>${paths}<text x="42" y="282" font-size="10">Process start</text><text x="590" y="282" font-size="10">${processTime(points.at(-1).seconds)}</text>`;
}

function exportData() {
  const rows = ['time_s,pH,pO2_percent,temperature_C,O2_percent,CO2_percent,volume_L,feed_L_h'];
  history.forEach((point) => rows.push([point.seconds, point.ph, point.po2, point.temperature, point.oxygen, point.carbonDioxide, point.reactorVolume, point.feed].join(',')));
  const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'bioprocess-data.csv';
  link.click();
  URL.revokeObjectURL(url);
  setMessage('Process data exported as CSV.');
}

const actions = {
  new: resetProcess,
  prepare: prepareInoculum,
  'fill-tanks': fillFeedTanks,
  'fill-reactor': () => fillReactor(5),
  refill: () => { process.acid = 2; process.base = 2; setMessage('Acid and base tanks refilled.'); render(); },
  'empty-product': () => { process.product = 0; setMessage('Product tank emptied.'); render(); },
  inoculate,
  sample: sampleProcess,
  pause: pauseProcess,
  continue: runProcess,
  run: runProcess,
  'speed-stop': () => { process.acceleration = 1; render(); },
  stop: () => { process.status = 'stopped'; setMessage('Process stopped.'); render(); },
  'run-toggle': () => process.status === 'running' ? pauseProcess() : runProcess(),
  power: () => process.status === 'running' ? pauseProcess() : runProcess(),
  export: exportData,
  'fill-medium': () => {
    const volume = Number($('[data-medium-volume]').value);
    fillReactor(volume);
    $('[data-dialog="medium"]').close();
  },
};

$$('[data-action]').forEach((button) => button.addEventListener('click', () => actions[button.dataset.action]?.()));
$$('[data-open]').forEach((button) => button.addEventListener('click', () => $(`[data-dialog="${button.dataset.open}"]`)?.showModal()));
$$('[data-trend]').forEach((button) => button.addEventListener('click', () => {
  activeTrend = button.dataset.trend;
  drawTrend();
  $('[data-dialog="trend"]').showModal();
}));
$$('[data-speed]').forEach((button) => button.addEventListener('click', () => {
  process.acceleration = Number(button.dataset.speed);
  render();
}));
$$('[data-gas]').forEach((input) => input.addEventListener('input', () => {
  gas[input.dataset.gas] = Number(input.value);
  render();
}));
$$('[data-setpoint]').forEach((input) => input.addEventListener('input', () => {
  setpoints[input.dataset.setpoint] = Number(input.value);
}));

updateClock();
render();
setInterval(updateClock, 1000);
setInterval(tick, 800);
