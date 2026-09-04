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
  substrate: 0,
  secondarySubstrate: 0,
  ethanol: 0,
  specificGrowth: 0,
  dilution: 0,
  antifoamFlow: 0,
  acidFlow: 0,
  baseFlow: 0,
  inoculumReady: false,
  sampleCount: 0,
});

const SAMPLE_STORAGE_KEY = 'bioprocess-trainer-samples-v2';
function loadStoredSamples() {
  try {
    const stored = JSON.parse(localStorage.getItem(SAMPLE_STORAGE_KEY) || '[]');
    return Array.isArray(stored) ? stored.slice(-50) : [];
  } catch {
    return [];
  }
}

let process = freshProcess();
let gas = { oxygen: 0, air: 0, nitrogen: 0 };
let setpoints = { ph: 7, po2: 60, temperature: 30, level: 8, foam: 0.18 };
let modelMode = 'fedbatch';
let oxygenMode = 'aerobic';
let gasMode = 'active';
let model = {
  muMax: 0.42,
  ks: 0.1,
  ko: 5,
  maintenance: 0.01,
  yieldXs: 0.5,
  yieldPs: 0.45,
  feedConcentration: 100,
  kla: 180,
  feedRate: 0.12,
  outflowRate: 0.12,
  maxVolume: 20,
};
let history = [];
let samples = loadStoredSamples();
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
  const effectiveFeed = modelMode === 'batch' || process.substrate1 <= 0 ? 0 : model.feedRate;
  updateText('[data-status]', statusLabels[process.status]);
  updateText('[data-mode-label]', modelMode === 'fedbatch' ? 'Fed-batch' : modelMode[0].toUpperCase() + modelMode.slice(1));
  updateText('[data-environment-label]', oxygenMode === 'aerobic' ? 'Aerobic' : 'Anaerobic');
  updateText('[data-time]', processTime(process.seconds));
  updateText('[data-speed-label]', `${process.acceleration}x`);
  updateText('[data-message]', message);
  updateText('[data-samples]', process.sampleCount);
  updateText('[data-biomass]', fmt(process.biomass, 2));
  updateText('[data-substrate]', fmt(process.substrate, 2));
  updateText('[data-ethanol]', fmt(process.ethanol, 2));
  updateText('[data-mu]', fmt(process.specificGrowth, 3));
  updateText('[data-dilution]', fmt(process.dilution, 3));
  updateText('[data-flow="substrate1"]', `${running ? fmt(effectiveFeed * 1000 / 60, 2) : '0.00'} ml/min`);
  updateText('[data-flow="antifoam"]', `${running ? fmt(process.antifoamFlow, 2) : '0.00'} ml/min`);
  updateText('[data-flow="base"]', `${running ? fmt(process.baseFlow, 2) : '0.00'} ml/min`);
  updateText('[data-flow="acid"]', `${running ? fmt(process.acidFlow, 2) : '0.00'} ml/min`);

  $('[data-power-light]').classList.toggle('on', running);
  $('[data-bubbles]').classList.toggle('active', running);
  $('.bpt-motor').classList.toggle('running', running);
  $('[data-inoculum]').classList.toggle('ready', process.inoculumReady);
  $('[data-action="run-toggle"]').textContent = running ? 'Pause simulation' : 'Run simulation';

  $$('[data-speed]').forEach((button) => button.classList.toggle('active', Number(button.dataset.speed) === process.acceleration));
  $$('[data-mode]').forEach((button) => button.classList.toggle('active', button.dataset.mode === modelMode));
  $$('[data-environment]').forEach((button) => button.classList.toggle('active', button.dataset.environment === oxygenMode));
  $$('[data-gas-mode]').forEach((button) => button.classList.toggle('active', button.dataset.gasMode === gasMode));
  $$('[data-gas]').forEach((input) => {
    input.disabled = gasMode !== 'manual';
    input.value = gas[input.dataset.gas];
  });

  setLiquid('substrate1', process.substrate1, 10);
  setLiquid('substrate2', process.substrate2, 10);
  setLiquid('acid', process.acid, 2);
  setLiquid('base', process.base, 2);
  setLiquid('antifoam', process.antifoam, 2);
  $('[data-reactor-liquid]').style.height = `${clamp((process.reactorVolume / Math.max(model.maxVolume, 0.001)) * 100, 0, 100)}%`;
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

  updateProcessData();

  const alert = $('[data-alert]');
  alert.classList.remove('warning', 'critical');
  if (running && oxygenMode === 'aerobic' && process.po2 < 10) {
    alert.textContent = 'Critical: oxygen limited';
    alert.classList.add('critical');
  } else if (running && process.reactorVolume >= model.maxVolume * 0.98) {
    alert.textContent = 'Critical: volume limit';
    alert.classList.add('critical');
  } else if (running && process.substrate < 0.5) {
    alert.textContent = 'Warning: substrate low';
    alert.classList.add('warning');
  } else if (running && ((oxygenMode === 'aerobic' && process.po2 < 20) || Math.abs(process.ph - setpoints.ph) > 0.35)) {
    alert.textContent = oxygenMode === 'aerobic' && process.po2 < 20 ? 'Warning: pO2 low' : 'Warning: pH deviation';
    alert.classList.add('warning');
  } else {
    alert.textContent = running ? `${oxygenMode === 'aerobic' ? 'Aerobic' : 'Anaerobic'} mass balance active` : 'Model ready';
  }

  if ($('[data-dialog="trend"]').open) drawTrend();
}

function updateProcessData() {
  const current = {
    temperature: { value: process.temperature, text: `${fmt(process.temperature)} °C` },
    volume: { value: process.reactorVolume, text: `${fmt(process.reactorVolume)} L` },
    ph: { value: process.ph, text: fmt(process.ph) },
    po2: { value: process.po2, text: `${fmt(process.po2)} %` },
    oxygen: { value: process.oxygen, text: `${fmt(process.oxygen)} %` },
    carbonDioxide: { value: process.carbonDioxide, text: `${fmt(process.carbonDioxide)} %` },
  };
  Object.entries(current).forEach(([name, entry]) => {
    updateText(`[data-process-current="${name}"]`, entry.text);
    const meter = $(`[data-process-meter="${name}"]`);
    if (meter) meter.value = entry.value;
  });
  const volumeMeter = $('[data-process-meter="volume"]');
  if (volumeMeter) volumeMeter.max = model.maxVolume;

  const lastSample = samples.at(-1);
  const sampleValues = lastSample ? {
    biomassTotal: `${fmt(lastSample.biomassTotal, 2)} g/L`,
    biomassViable: `${fmt(lastSample.biomassViable, 2)} g/L`,
    substrate1: `${fmt(lastSample.substrate1, 2)} g/L`,
    substrate2: `${fmt(lastSample.substrate2, 2)} g/L`,
    product: `${fmt(lastSample.product, 2)} g/L`,
  } : {};
  $$('[data-sample-reading]').forEach((element) => {
    element.textContent = sampleValues[element.dataset.sampleReading] || '—';
  });

  const tableBody = $('[data-sample-history]');
  if (!tableBody) return;
  tableBody.innerHTML = samples.length ? samples.slice(-10).reverse().map((sample) => `
    <tr><td>${sample.id}</td><td>${processTime(sample.seconds)}</td><td>${sample.mode} · ${sample.environment}</td><td>${fmt(sample.biomassTotal, 2)}</td><td>${fmt(sample.substrate1, 2)}</td><td>${fmt(sample.product, 2)}</td></tr>
  `).join('') : '<tr><td colspan="6">No samples recorded yet.</td></tr>';
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

function fillReactor(volume = 5, substrate = 15, secondarySubstrate = 2) {
  process.status = 'filled';
  process.reactorVolume = clamp(Number(volume) || 0, 0, model.maxVolume);
  process.substrate = clamp(Number(substrate) || 0, 0, 500);
  process.secondarySubstrate = clamp(Number(secondarySubstrate) || 0, 0, 100);
  process.biomass = 0;
  process.ethanol = 0;
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
  const sample = {
    id: (samples.at(-1)?.id || 0) + 1,
    timestamp: new Date().toISOString(),
    seconds: process.seconds,
    mode: modelMode,
    environment: oxygenMode,
    biomassTotal: process.biomass,
    biomassViable: process.biomass * clamp(0.97 - process.ethanol * 0.003, 0.72, 0.97),
    substrate1: process.substrate,
    substrate2: process.secondarySubstrate,
    product: process.ethanol,
    ph: process.ph,
    po2: process.po2,
    temperature: process.temperature,
    volume: process.reactorVolume,
    oxygen: process.oxygen,
    carbonDioxide: process.carbonDioxide,
    foam: process.foam,
    specificGrowth: process.specificGrowth,
    gas: { ...gas },
    setpoints: { ...setpoints },
  };
  samples = [...samples, sample].slice(-50);
  try {
    localStorage.setItem(SAMPLE_STORAGE_KEY, JSON.stringify(samples));
  } catch {
    // Simulation remains usable if browser storage is unavailable.
  }
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

function loadDemo() {
  process = freshProcess();
  modelMode = 'fedbatch';
  oxygenMode = 'aerobic';
  gasMode = 'active';
  process.status = 'inoculated';
  process.reactorVolume = 5;
  process.substrate1 = 10;
  process.substrate2 = 10;
  process.substrate = 15;
  process.secondarySubstrate = 2;
  process.biomass = 0.18;
  process.inoculumReady = true;
  gas.air = 20;
  history = [];
  const airSlider = $('[data-gas="air"]');
  if (airSlider) airSlider.value = 20;
  setMessage('Demo loaded: fed-batch culture ready to run.');
  render();
}

function tick() {
  if (process.status !== 'running') return;
  const elapsed = process.acceleration * 60;
  process.seconds += elapsed;
  const dt = elapsed / 3600;
  const hours = process.seconds / 3600;
  const volume = Math.max(process.reactorVolume, 0.001);

  if (gasMode === 'inactive') {
    gas = { oxygen: 0, air: 0, nitrogen: 0 };
  } else if (gasMode === 'active' && oxygenMode === 'anaerobic') {
    gas.oxygen = 0;
    gas.air = 0;
    gas.nitrogen = clamp(gas.nitrogen + (10 - gas.nitrogen) * Math.min(1, dt * 10), 0, 20);
  } else if (gasMode === 'active') {
    const oxygenError = setpoints.po2 - process.po2;
    gas.air = clamp(gas.air + oxygenError * Math.min(0.22, dt * 5), 0, 60);
    gas.oxygen = clamp(gas.oxygen + Math.max(0, oxygenError - 12) * Math.min(0.08, dt * 2), 0, 20);
    gas.nitrogen = 0;
  }

  const substrateFactor = process.substrate / Math.max(model.ks + process.substrate, 0.001);
  const secondaryFactor = process.secondarySubstrate / Math.max(0.05 + process.secondarySubstrate, 0.001);
  const oxygenFactor = oxygenMode === 'aerobic' ? process.po2 / Math.max(model.ko + process.po2, 0.001) : 0.55;
  const specificGrowth = model.muMax * substrateFactor * secondaryFactor * oxygenFactor;
  const feedRate = modelMode === 'batch' || process.substrate1 <= 0 ? 0 : model.feedRate;
  const levelCorrection = clamp((volume - setpoints.level) * 0.8, -0.08, 0.5);
  const outflowRate = modelMode === 'continuous' && feedRate > 0 ? clamp(model.outflowRate + levelCorrection, 0, feedRate + 0.5) : 0;
  const nextVolume = clamp(volume + (feedRate - outflowRate) * dt, 0.001, model.maxVolume);

  const biomassMass = process.biomass * volume;
  const substrateMass = process.substrate * volume;
  const secondaryMass = process.secondarySubstrate * volume;
  const productMass = process.ethanol * volume;
  const growthRate = specificGrowth * biomassMass;
  const substrateUseRate = growthRate / Math.max(model.yieldXs, 0.001) + model.maintenance * biomassMass;
  const secondaryUseRate = substrateUseRate * 0.12;
  const productRate = model.yieldPs * (oxygenMode === 'anaerobic' ? 1.45 : 1) * substrateUseRate;
  const nextBiomassMass = Math.max(0, biomassMass + (growthRate - outflowRate * process.biomass) * dt);
  const nextSubstrateMass = Math.max(0, substrateMass + (feedRate * model.feedConcentration - outflowRate * process.substrate - substrateUseRate) * dt);
  const nextSecondaryMass = Math.max(0, secondaryMass + (feedRate * 2 - outflowRate * process.secondarySubstrate - secondaryUseRate) * dt);
  const nextProductMass = Math.max(0, productMass + (productRate - outflowRate * process.ethanol) * dt);

  process.specificGrowth = specificGrowth;
  process.dilution = outflowRate / volume;
  process.reactorVolume = nextVolume;
  process.substrate1 = clamp(process.substrate1 - feedRate * dt, 0, 10);
  process.substrate2 = clamp(process.substrate2 - feedRate * 0.25 * dt, 0, 10);
  process.product = clamp(process.product + outflowRate * dt, 0, 20);
  process.biomass = nextBiomassMass / nextVolume;
  process.substrate = nextSubstrateMass / nextVolume;
  process.secondarySubstrate = nextSecondaryMass / nextVolume;
  process.ethanol = nextProductMass / nextVolume;

  const oxygenDemand = specificGrowth * process.biomass * 9;
  const gasTransfer = model.kla / 180 * (gas.air * 2.6 + gas.oxygen * 5);
  const oxygenTarget = oxygenMode === 'anaerobic' ? 0 : clamp(gasTransfer - oxygenDemand, 0, 100);
  process.po2 = clamp(process.po2 + (oxygenTarget - process.po2) * Math.min(1, dt * 3), 0, 100);
  const metabolicAcidification = specificGrowth * process.biomass * 0.014;
  process.baseFlow = process.ph < setpoints.ph - 0.02 && process.base > 0 ? clamp((setpoints.ph - process.ph) * 20, 0, 8) : 0;
  process.acidFlow = process.ph > setpoints.ph + 0.02 && process.acid > 0 ? clamp((process.ph - setpoints.ph) * 20, 0, 8) : 0;
  process.base = clamp(process.base - process.baseFlow * 0.06 * dt, 0, 2);
  process.acid = clamp(process.acid - process.acidFlow * 0.06 * dt, 0, 2);
  process.ph = clamp(process.ph + ((setpoints.ph - process.ph) * 1.1 + (process.baseFlow - process.acidFlow) * 0.03 - metabolicAcidification) * dt, 5.5, 8.5);
  process.temperature += (setpoints.temperature - process.temperature) * Math.min(1, dt * 2.2);
  process.carbonDioxide = clamp(specificGrowth * process.biomass * (oxygenMode === 'anaerobic' ? 4.2 : 2.8) + Math.sin(hours) * 0.12, 0, 18);
  process.oxygen = oxygenMode === 'anaerobic' ? 0 : clamp(gas.oxygen * 0.2 + gas.air * 0.035 + process.po2 * 0.018, 0, 12);
  const uncontrolledFoam = clamp(process.biomass * 0.045, 0, 0.9);
  process.antifoamFlow = uncontrolledFoam > setpoints.foam && process.antifoam > 0 ? clamp((uncontrolledFoam - setpoints.foam) * 60, 0, 12) : 0;
  process.antifoam = clamp(process.antifoam - process.antifoamFlow * 0.06 * dt, 0, 2);
  process.foam = clamp(process.foam + (uncontrolledFoam - process.foam) * Math.min(1, dt * 5) - process.antifoamFlow * 0.08 * dt, 0, 0.9);

  if (modelMode === 'batch' && process.substrate <= 0.01) {
    process.status = 'paused';
    setMessage('Batch complete: substrate depleted.');
  } else if (nextVolume >= model.maxVolume && feedRate > outflowRate) {
    process.status = 'paused';
    setMessage('Safety stop: maximum reactor volume reached.');
  }

  history.push({
    seconds: process.seconds,
    ph: process.ph,
    po2: process.po2,
    temperature: process.temperature,
    oxygen: process.oxygen,
    carbonDioxide: process.carbonDioxide,
    reactorVolume: process.reactorVolume,
    biomass: process.biomass,
    substrate: process.substrate,
    secondarySubstrate: process.secondarySubstrate,
    ethanol: process.ethanol,
    specificGrowth: process.specificGrowth,
    feed: feedRate,
    outflow: outflowRate,
    antifoamFlow: process.antifoamFlow,
    mode: modelMode,
    environment: oxygenMode,
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
    kinetics: [
      { key: 'biomass', label: 'Biomass X × 2', color: '#2159c7', scale: 2 },
      { key: 'substrate', label: 'Substrate S × 4', color: '#238d3c', scale: 4 },
      { key: 'ethanol', label: 'Ethanol P × 2', color: '#d63a2e', scale: 2 },
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
    biomass: process.biomass,
    substrate: process.substrate,
    ethanol: process.ethanol,
    specificGrowth: process.specificGrowth,
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

function downloadCsv(rows, filename) {
  const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportData() {
  const rows = ['time_s,mode,environment,biomass_g_L,substrate_I_g_L,substrate_II_g_L,ethanol_g_L,mu_h-1,pH,pO2_percent,temperature_C,O2_percent,CO2_percent,volume_L,feed_L_h,outflow_L_h,antifoam_ml_min'];
  history.forEach((point) => rows.push([point.seconds, point.mode || modelMode, point.environment || oxygenMode, point.biomass, point.substrate, point.secondarySubstrate, point.ethanol, point.specificGrowth, point.ph, point.po2, point.temperature, point.oxygen, point.carbonDioxide, point.reactorVolume, point.feed, point.outflow || 0, point.antifoamFlow || 0].join(',')));
  downloadCsv(rows, 'bioprocess-data.csv');
  setMessage('Process data exported as CSV.');
}

function exportSamples() {
  const rows = ['sample,timestamp,time_s,mode,environment,biomass_total_g_L,biomass_viable_g_L,substrate_I_g_L,substrate_II_g_L,product_g_L,pH,pO2_percent,temperature_C,volume_L,O2_percent,CO2_percent,foam_L,mu_h-1,gas_O2_L_min,gas_air_L_min,gas_N2_L_min'];
  samples.forEach((sample) => rows.push([sample.id, sample.timestamp, sample.seconds, sample.mode, sample.environment, sample.biomassTotal, sample.biomassViable, sample.substrate1, sample.substrate2, sample.product, sample.ph, sample.po2, sample.temperature, sample.volume, sample.oxygen, sample.carbonDioxide, sample.foam, sample.specificGrowth, sample.gas?.oxygen, sample.gas?.air, sample.gas?.nitrogen].join(',')));
  downloadCsv(rows, 'bioprocess-samples.csv');
  setMessage('Stored samples exported as CSV.');
}

const actions = {
  new: resetProcess,
  demo: loadDemo,
  prepare: prepareInoculum,
  'fill-tanks': fillFeedTanks,
  'fill-reactor': () => fillReactor(5, 15),
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
  'export-samples': exportSamples,
  'fill-medium': () => {
    const volume = Number($('[data-medium-volume]').value);
    const substrate = Number($('[data-medium-substrate]').value);
    const secondarySubstrate = Number($('[data-medium-secondary]').value);
    fillReactor(volume, substrate, secondarySubstrate);
    $('[data-dialog="medium"]').close();
  },
};

$$('[data-action]').forEach((button) => button.addEventListener('click', () => actions[button.dataset.action]?.()));
$$('[data-open]').forEach((button) => button.addEventListener('click', () => {
  render();
  $(`[data-dialog="${button.dataset.open}"]`)?.showModal();
}));
$$('[data-trend]').forEach((button) => button.addEventListener('click', () => {
  activeTrend = button.dataset.trend;
  drawTrend();
  $('[data-dialog="trend"]').showModal();
}));
$$('[data-speed]').forEach((button) => button.addEventListener('click', () => {
  process.acceleration = Number(button.dataset.speed);
  render();
}));
$$('[data-mode]').forEach((button) => button.addEventListener('click', () => {
  modelMode = button.dataset.mode;
  setMessage(`${button.textContent.trim()} mode selected.`);
  render();
}));
$$('[data-environment]').forEach((button) => button.addEventListener('click', () => {
  oxygenMode = button.dataset.environment;
  if (oxygenMode === 'anaerobic' && gasMode === 'active') gas = { oxygen: 0, air: 0, nitrogen: 10 };
  setMessage(`${button.textContent.trim()} operation selected.`);
  render();
}));
$$('[data-gas-mode]').forEach((button) => button.addEventListener('click', () => {
  gasMode = button.dataset.gasMode;
  if (gasMode === 'inactive') gas = { oxygen: 0, air: 0, nitrogen: 0 };
  setMessage(`Gas controller set to ${button.textContent.trim().toLowerCase()}.`);
  render();
}));
$$('[data-model]').forEach((input) => input.addEventListener('input', () => {
  model[input.dataset.model] = Number(input.value);
  render();
}));
$$('[data-gas]').forEach((input) => input.addEventListener('input', () => {
  gas[input.dataset.gas] = Number(input.value);
  render();
}));
$$('[data-setpoint]').forEach((input) => input.addEventListener('input', () => {
  setpoints[input.dataset.setpoint] = Number(input.value);
  render();
}));

updateClock();
render();
setInterval(updateClock, 1000);
setInterval(tick, 800);
