const carriers = {
  cytodex1: { name: "Cytodex 1", area: 4400, dp: 190, rho: 1.03, beads: 4.3, swell: 20 },
  cytodex3: { name: "Cytodex 3", area: 2700, dp: 175, rho: 1.04, beads: 3, swell: 15 },
  hillex2: { name: "SoloHill Hillex II", area: 515, dp: 180, rho: 1.11, beads: 0.51, swell: 5 },
  synthemax: { name: "Corning Synthemax II", area: 360, dp: 170, rho: 1.026, beads: 0.4, swell: 5 },
  cultispher: { name: "Cultispher-S", area: 3500, dp: 255, rho: 1.04, beads: 1.7, swell: 15 },
};

const presets = {
  hmsc_bm: { seedVal: 5, conflDens: 4, td: 30, load: 3, attachEff: 80 },
  hmsc_uc: { seedVal: 5, conflDens: 4.5, td: 26, load: 3, attachEff: 80 },
  vero: { seedVal: 8, conflDens: 15, td: 24, load: 3, attachEff: 85 },
  hek293: { seedVal: 10, conflDens: 12, td: 24, load: 3, attachEff: 85 },
  cho_adh: { seedVal: 8, conflDens: 10, td: 20, load: 3, attachEff: 85 },
  ipsc: { seedVal: 6, conflDens: 5, td: 34, load: 2, attachEff: 70 },
};

const impellers = { pbt45: 1.27, marine: 0.35, rushton: 5, spinner: 0.35 };
const diagnostics = {
  attach: ["Check attachment", "Use low or intermittent agitation. Verify carrier chemistry, hydration, and equilibration."],
  clump: ["Check suspension and timing", "Confirm off-bottom suspension and harvest before over-confluence."],
  shear: ["Reduce speed", "Return to Njs. Then check impeller geometry and bubble rupture."],
  yield: ["Check detachment and separation", "Verify reagent exposure, burst time, and carrier-retention losses."],
  growth: ["Check surface use", "Review empty carriers, attachment, oxygen transfer, and confluent density."],
};

const NU = 0.7e-6;
const RHO_L = 993;
const GRAVITY = 9.81;
const DETACHED_CELL_UM = 15;
let lastResult = {};

const read = (id) => {
  const input = document.getElementById(id);
  const parsed = Number.parseFloat(input?.value);
  if (!Number.isFinite(parsed)) return 0;
  const minimum = Number.isFinite(Number.parseFloat(input?.min)) ? Number.parseFloat(input.min) : Number.NEGATIVE_INFINITY;
  const maximum = Number.isFinite(Number.parseFloat(input?.max)) ? Number.parseFloat(input.max) : Number.POSITIVE_INFINITY;
  return Math.min(Math.max(parsed, minimum), maximum);
};
const setValue = (name, value) => {
  const output = document.querySelector(`[data-output="${name}"]`);
  if (output) output.textContent = value;
};
const superscripts = "⁰¹²³⁴⁵⁶⁷⁸⁹";

function scientific(value, decimals = 2) {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0";
  if (Math.abs(value) < 100000) return value.toLocaleString("en-US", { maximumFractionDigits: decimals });
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const exponentLabel = String(exponent)
    .split("")
    .map((character) => (character === "-" ? "⁻" : superscripts[Number(character)]))
    .join("");
  return `${(value / 10 ** exponent).toFixed(decimals)}×10${exponentLabel}`;
}

function kolmogorovAt(rpm, powerNumber, impellerCount, diameterMetres, volumeCubicMetres) {
  if (rpm <= 0 || diameterMetres <= 0 || volumeCubicMetres <= 0 || powerNumber <= 0) return Number.POSITIVE_INFINITY;
  const rotationsPerSecond = rpm / 60;
  const power = impellerCount * powerNumber * RHO_L * rotationsPerSecond ** 3 * diameterMetres ** 5;
  const dissipation = power / (RHO_L * volumeCubicMetres);
  return dissipation > 0 ? (NU ** 3 / dissipation) ** 0.25 : Number.POSITIVE_INFINITY;
}

function rpmAtKolmogorov(targetMetres, powerNumber, impellerCount, diameterMetres, volumeCubicMetres) {
  const referenceRpm = 100;
  const referenceScale = kolmogorovAt(referenceRpm, powerNumber, impellerCount, diameterMetres, volumeCubicMetres);
  if (!Number.isFinite(referenceScale) || targetMetres <= 0) return Number.NaN;
  return referenceRpm * (referenceScale / targetMetres) ** (4 / 3);
}

function updateVerdict(name, kind, title, body) {
  const container = document.querySelector(`[data-output="${name}"]`);
  if (!container) return;
  container.className = `verdict verdict-${kind}`;
  const heading = container.querySelector("b");
  const copy = container.querySelector("p");
  if (heading) heading.textContent = title;
  if (copy) copy.textContent = body;
}

function svgGrid() {
  let markup = "";
  for (let row = 0; row <= 4; row += 1) {
    const y = 16 + row * 45;
    markup += `<line class="chart-grid" x1="44" y1="${y}" x2="744" y2="${y}" />`;
  }
  for (let column = 0; column <= 5; column += 1) {
    const x = 44 + column * 140;
    markup += `<line class="chart-grid" x1="${x}" y1="16" x2="${x}" y2="196" />`;
  }
  return markup;
}

function renderGrowthChart(result) {
  const chart = document.querySelector('[data-chart="growth"]');
  if (!chart) return;
  const modeledDays = Number.isFinite(result.days) ? result.days : 0;
  const daysToShow = Math.min(3650, Math.max(4, Math.ceil(Math.max(modeledDays, 1) * 1.35)));
  const pointCount = Math.min(240, Math.max(16, daysToShow * 5));
  const cellPoints = [];
  const occupancyPoints = [];

  for (let index = 0; index <= pointCount; index += 1) {
    const day = (index / pointCount) * daysToShow;
    const cells = result.doublingTime > 0
      ? Math.min(result.maxCells, result.attached * 2 ** ((day * 24) / result.doublingTime))
      : result.attached;
    const occupancy = result.maxCells > 0 ? cells / result.maxCells : 0;
    const x = 44 + (index / pointCount) * 700;
    const y = 196 - occupancy * 170;
    cellPoints.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    occupancyPoints.push(`${x.toFixed(1)},${(196 - Math.sqrt(occupancy) * 170).toFixed(1)}`);
  }

  const areaPath = `M44 196 L${cellPoints.join(" L")} L744 196 Z`;
  const dayLabels = Array.from({ length: 6 }, (_, index) => {
    const x = 44 + index * 140;
    const value = ((index / 5) * daysToShow).toFixed(index === 0 ? 0 : 1);
    return `<text class="chart-label" x="${x}" y="216" text-anchor="middle">${value} d</text>`;
  }).join("");

  chart.innerHTML = `${svgGrid()}<line class="chart-axis" x1="44" y1="196" x2="744" y2="196" />
    <path class="area-main" d="${areaPath}" />
    <polyline class="polyline-main" points="${cellPoints.join(" ")}" />
    <polyline class="polyline-secondary" points="${occupancyPoints.join(" ")}" />${dayLabels}`;
  chart.setAttribute("aria-label", `Projected expansion reaches ${scientific(result.yieldCells)} harvested cells after ${result.days.toFixed(1)} days`);
}

function renderShearChart(result) {
  const chart = document.querySelector('[data-chart="shear"]');
  if (!chart) return;
  const topRpm = Math.min(1000000, Math.max(120, Math.ceil((Number.isFinite(result.rpmCrit) ? result.rpmCrit : 200) * 1.55 / 10) * 10));
  const yMax = Math.max(result.beadDiameterUm * 2.2, 60);
  const points = [];

  for (let index = 0; index <= 60; index += 1) {
    const rpm = 10 + (index / 60) * (topRpm - 10);
    const scaleUm = kolmogorovAt(rpm, result.powerNumber, result.impellerCount, result.impellerDiameterMetres, result.volumeCubicMetres) * 1e6;
    const x = 44 + (rpm / topRpm) * 700;
    const y = 196 - Math.min(scaleUm / yMax, 1) * 180;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  const safeY = 196 - ((2 / 3) * result.beadDiameterUm / yMax) * 180;
  const damageY = 196 - (0.5 * result.beadDiameterUm / yMax) * 180;
  const bandStart = Number.isFinite(result.njsRpm) ? 44 + Math.min(result.njsRpm / topRpm, 1) * 700 : 44;
  const bandEnd = Number.isFinite(result.rpmCrit) ? 44 + Math.min(result.rpmCrit / topRpm, 1) * 700 : 44;
  const rpmLabels = Array.from({ length: 6 }, (_, index) => {
    const x = 44 + index * 140;
    return `<text class="chart-label" x="${x}" y="216" text-anchor="middle">${Math.round((index / 5) * topRpm)}</text>`;
  }).join("");

  chart.innerHTML = `${svgGrid()}<rect class="window-band" x="${bandStart.toFixed(1)}" y="16" width="${Math.max(0, bandEnd - bandStart).toFixed(1)}" height="180" />
    <line class="threshold-safe" x1="44" y1="${safeY.toFixed(1)}" x2="744" y2="${safeY.toFixed(1)}" />
    <line class="threshold-damage" x1="44" y1="${damageY.toFixed(1)}" x2="744" y2="${damageY.toFixed(1)}" />
    <line class="chart-axis" x1="44" y1="196" x2="744" y2="196" />
    <polyline class="polyline-main" points="${points.join(" ")}" />${rpmLabels}
    <text class="chart-label" x="744" y="229" text-anchor="end">rpm</text>`;
  chart.setAttribute("aria-label", `Modeled range from ${Number.isFinite(result.njsRpm) ? result.njsRpm.toFixed(0) : "unknown"} to ${Number.isFinite(result.rpmCrit) ? result.rpmCrit.toFixed(0) : "unknown"} rpm`);
}

function calculate({ announce = false } = {}) {
  const volumeLitres = read("vol");
  const volumeMl = volumeLitres * 1000;
  const volumeCubicMetres = volumeLitres / 1000;
  const dryMass = read("load") * volumeLitres;
  const totalArea = read("areaSpec") * dryMass;
  const beadCount = read("beadsPerG") * 1e6 * dryMass;
  const carrierKey = document.getElementById("carrier").value;
  const selectedCarrier = carriers[carrierKey];
  const swollenPercent = volumeMl ? ((selectedCarrier?.swell || 15) * dryMass / volumeMl) * 100 : 0;

  const basis = document.getElementById("seedBasis").value;
  const seedValue = read("seedVal");
  let perCarrier = seedValue;
  let perCm2 = 0;
  let perMl = 0;
  if (basis === "perCarrier") {
    perCm2 = totalArea ? (perCarrier * beadCount) / totalArea : 0;
    perMl = volumeMl ? (perCarrier * beadCount) / volumeMl : 0;
  } else if (basis === "perCm2") {
    perCm2 = seedValue;
    perCarrier = beadCount ? (perCm2 * totalArea) / beadCount : 0;
    perMl = volumeMl ? (perCm2 * totalArea) / volumeMl : 0;
  } else {
    perMl = seedValue;
    perCarrier = beadCount ? (perMl * volumeMl) / beadCount : 0;
    perCm2 = totalArea ? (perMl * volumeMl) / totalArea : 0;
  }

  const totalSeed = perCarrier * beadCount;
  const attached = totalSeed * read("attachEff") / 100;
  const stockDensity = read("stockDens") * 1e6;
  const inoculumVolume = stockDensity > 0 ? totalSeed / stockDensity : 0;
  const emptyFraction = Math.exp(-perCarrier);
  const confluentDensity = read("conflDens") * 1e4;
  const maxCells = confluentDensity * totalArea;
  const yieldCells = maxCells * read("harvestEff") / 100;
  const expansionFactor = attached > 0 ? maxCells / attached : 0;
  const doublings = expansionFactor > 1 ? Math.log2(expansionFactor) : 0;
  const doublingTime = read("td");
  const days = (doublings * doublingTime) / 24;

  const impellerDiameterMetres = read("impD") / 100;
  const powerNumber = read("np");
  const impellerCount = Math.max(1, read("nImp"));
  const beadDiameterUm = read("dp");
  const beadDiameterMetres = beadDiameterUm / 1e6;
  const solidDensity = read("rhoS") * 1000;
  const solidsMassFraction = read("load") / 1000;
  const zwietering = read("zwS");
  let njsRpm = Number.NaN;

  if (impellerDiameterMetres > 0 && solidsMassFraction > 0 && solidDensity > RHO_L) {
    const njs = zwietering
      * NU ** 0.1
      * beadDiameterMetres ** 0.2
      * (GRAVITY * (solidDensity - RHO_L) / RHO_L) ** 0.45
      * solidsMassFraction ** 0.13
      / impellerDiameterMetres ** 0.85;
    njsRpm = njs * 60;
  }

  const rpmSafe = rpmAtKolmogorov((2 / 3) * beadDiameterMetres, powerNumber, impellerCount, impellerDiameterMetres, volumeCubicMetres);
  const rpmCrit = rpmAtKolmogorov(0.5 * beadDiameterMetres, powerNumber, impellerCount, impellerDiameterMetres, volumeCubicMetres);
  const testRpm = read("setRpm");
  const operatingRpm = testRpm > 0 ? testRpm : njsRpm;
  const lambdaOperation = kolmogorovAt(operatingRpm, powerNumber, impellerCount, impellerDiameterMetres, volumeCubicMetres);
  const rotationRate = operatingRpm / 60;
  const power = impellerCount * powerNumber * RHO_L * rotationRate ** 3 * impellerDiameterMetres ** 5;
  const powerPerVolume = volumeCubicMetres > 0 && Number.isFinite(power) ? power / volumeCubicMetres : 0;
  const harvestRpm = operatingRpm * 5;
  const harvestLambda = kolmogorovAt(harvestRpm, powerNumber, impellerCount, impellerDiameterMetres, volumeCubicMetres);

  lastResult = {
    carrier: selectedCarrier?.name || "Custom carrier", totalArea, beadCount, swollenPercent, perCarrier, perCm2, perMl,
    totalSeed, attached, inoculumVolume, emptyFraction, maxCells, yieldCells, expansionFactor, doublings, days, doublingTime,
    njsRpm, rpmSafe, rpmCrit, operatingRpm, lambdaOperation, powerPerVolume, harvestRpm, harvestLambda, beadDiameterUm,
    powerNumber, impellerCount, impellerDiameterMetres, volumeCubicMetres, load: read("load"), volumeLitres,
  };

  setValue("totalArea", totalArea.toLocaleString("en-US", { maximumFractionDigits: 0 }));
  setValue("areaPerMl", volumeMl ? (totalArea / volumeMl).toFixed(1) : "—");
  setValue("beads", scientific(beadCount));
  setValue("flasks", Math.round(totalArea / 175).toLocaleString("en-US"));
  setValue("swollen", `${swollenPercent.toFixed(1)}%`);
  setValue("perCarrier", perCarrier.toFixed(1));
  setValue("perCm2", `${Math.round(perCm2).toLocaleString("en-US")} /cm²`);
  setValue("perMl", `${Math.round(perMl).toLocaleString("en-US")} /mL`);
  setValue("totalSeed", `${scientific(totalSeed)} cells`);
  setValue("inocVol", inoculumVolume >= 1000 ? `${(inoculumVolume / 1000).toFixed(2)} L` : `${inoculumVolume.toFixed(1)} mL`);
  setValue("attached", `${scientific(attached)} cells`);
  setValue("empty", `${(emptyFraction * 100).toFixed(1)}%`);
  setValue("yield", scientific(yieldCells));
  setValue("ef", `${expansionFactor.toFixed(1)}×`);
  setValue("days", `${days.toFixed(1)} d`);
  setValue("njs", Number.isFinite(njsRpm) ? `${njsRpm.toFixed(0)} rpm` : "—");
  setValue("rpmCrit", Number.isFinite(rpmCrit) ? `${rpmCrit.toFixed(0)} rpm` : "—");
  setValue("lambda", Number.isFinite(lambdaOperation) ? `${(lambdaOperation * 1e6).toFixed(0)} µm` : "—");
  setValue("pv", `${powerPerVolume.toFixed(1)} W/m³`);
  setValue("harvestRpm", Number.isFinite(harvestRpm) ? `${harvestRpm.toFixed(0)} rpm` : "—");
  setValue("harvestLambda", Number.isFinite(harvestLambda) ? `${(harvestLambda * 1e6).toFixed(0)} µm` : "—");
  setValue("harvestYield", `${scientific(yieldCells)} cells`);

  if (perCarrier < 3) {
    updateVerdict("seedVerdict", "error", "Low seeding ratio", `${(emptyFraction * 100).toFixed(0)}% of carriers may begin empty. Increase the inoculum or reduce the carrier load.`);
  } else if (perCarrier < 5) {
    updateVerdict("seedVerdict", "warn", "Check seeding ratio", `${(emptyFraction * 100).toFixed(1)}% of carriers may begin empty.`);
  } else if (swollenPercent > 25) {
    updateVerdict("seedVerdict", "warn", "Dense carrier bed", `${swollenPercent.toFixed(0)}% of working volume. Check mixing and effective medium volume.`);
  } else {
    updateVerdict("seedVerdict", "ok", `${(emptyFraction * 100).toFixed(1)}% empty`, "Expected empty-carrier fraction.");
  }

  if (!Number.isFinite(njsRpm)) {
    updateVerdict("agitationVerdict", "warn", "Njs cannot be resolved", "Check that carrier density exceeds liquid density and that the impeller diameter is greater than zero.");
  } else if (njsRpm > rpmCrit) {
    updateVerdict("agitationVerdict", "error", "No operating window", `Njs ${njsRpm.toFixed(0)} rpm exceeds the ${rpmCrit.toFixed(0)} rpm shear limit. Change geometry or carrier load.`);
  } else if (operatingRpm > rpmCrit) {
    updateVerdict("agitationVerdict", "error", "Above the shear limit", `At ${operatingRpm.toFixed(0)} rpm, λ is ${(lambdaOperation * 1e6).toFixed(0)} µm. Reduce speed toward Njs.`);
  } else if (operatingRpm > rpmSafe) {
    updateVerdict("agitationVerdict", "warn", "Near shear limit", `λ is below the conservative threshold. Stay below ${rpmSafe.toFixed(0)} rpm.`);
  } else {
    updateVerdict("agitationVerdict", "ok", `${njsRpm.toFixed(0)}–${rpmCrit.toFixed(0)} rpm`, "Njs to estimated shear limit.");
  }

  if (Number.isFinite(harvestLambda) && harvestLambda * 1e6 > DETACHED_CELL_UM) {
    updateVerdict("harvestVerdict", "ok", `λ = ${(harvestLambda * 1e6).toFixed(0)} µm`, `At ${harvestRpm.toFixed(0)} rpm; assumed cell diameter: ${DETACHED_CELL_UM} µm.`);
  } else {
    updateVerdict("harvestVerdict", "warn", "λ near cell diameter", "Reduce the multiplier or test a shorter burst.");
  }

  renderGrowthChart(lastResult);
  renderShearChart(lastResult);

  if (announce) {
    const status = document.querySelector("[data-planner-status]");
    if (status) {
      status.textContent = "";
      window.requestAnimationFrame(() => {
        status.textContent = `Results updated. ${scientific(yieldCells)} projected harvested cells after ${days.toFixed(1)} days.`;
      });
    }
  }
}

function applyCarrier(key) {
  const carrier = carriers[key];
  if (!carrier) return;
  document.getElementById("areaSpec").value = carrier.area;
  document.getElementById("dp").value = carrier.dp;
  document.getElementById("rhoS").value = carrier.rho;
  document.getElementById("beadsPerG").value = carrier.beads;
}

function applyPreset(key) {
  const preset = presets[key];
  if (!preset) return;
  Object.entries(preset).forEach(([id, value]) => {
    document.getElementById(id).value = value;
  });
  document.getElementById("seedBasis").value = "perCarrier";
}

function exportCsv() {
  const result = lastResult;
  const rows = [
    ["Parameter", "Value", "Unit"],
    ["Carrier", result.carrier, ""],
    ["Specific surface area", read("areaSpec"), "cm2/g"],
    ["Carrier load", result.load, "g/L"],
    ["Working volume", result.volumeLitres, "L"],
    ["Total growth surface", result.totalArea?.toFixed(0), "cm2"],
    ["Carrier count", result.beadCount?.toExponential(3), "carriers"],
    ["Cells per carrier", result.perCarrier?.toFixed(2), "cells/carrier"],
    ["Total inoculum", result.totalSeed?.toExponential(3), "cells"],
    ["Attached cells", result.attached?.toExponential(3), "cells"],
    ["Empty carrier fraction", (result.emptyFraction * 100)?.toFixed(2), "%"],
    ["Projected harvest", result.yieldCells?.toExponential(3), "cells"],
    ["Time to confluence", result.days?.toFixed(2), "days"],
    ["Njs", result.njsRpm?.toFixed(2), "rpm"],
    ["Conservative ceiling", result.rpmSafe?.toFixed(2), "rpm"],
    ["Damage threshold", result.rpmCrit?.toFixed(2), "rpm"],
    ["Operating speed", result.operatingRpm?.toFixed(2), "rpm"],
    ["Kolmogorov scale", (result.lambdaOperation * 1e6)?.toFixed(2), "um"],
    ["Power per volume", result.powerPerVolume?.toFixed(3), "W/m3"],
    ["Harvest burst", result.harvestRpm?.toFixed(2), "rpm"],
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "microcarrier-plan.csv";
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

document.getElementById("carrier").addEventListener("change", (event) => {
  applyCarrier(event.target.value);
});
document.getElementById("cellPreset").addEventListener("change", (event) => {
  applyPreset(event.target.value);
});
document.getElementById("impeller").addEventListener("change", (event) => {
  if (impellers[event.target.value]) document.getElementById("np").value = impellers[event.target.value];
});
["areaSpec", "dp", "rhoS", "beadsPerG"].forEach((id) => {
  document.getElementById(id).addEventListener("input", () => {
    document.getElementById("carrier").value = "custom";
  });
});

const form = document.querySelector("[data-planner-form]");
form.addEventListener("input", () => calculate());
form.addEventListener("change", (event) => {
  if (event.target instanceof HTMLInputElement && event.target.type === "number") {
    const normalized = read(event.target.id);
    event.target.value = String(normalized);
  }
  calculate({ announce: true });
});
form.addEventListener("reset", () => window.setTimeout(() => calculate({ announce: true }), 0));
document.querySelector("[data-calculate]").addEventListener("click", () => calculate({ announce: true }));
document.querySelector("[data-export]").addEventListener("click", exportCsv);
document.querySelectorAll("[data-diagnostic]").forEach((button) => {
  button.setAttribute("aria-pressed", "false");
  button.addEventListener("click", () => {
    const active = button.getAttribute("aria-pressed") === "true";
    document.querySelectorAll("[data-diagnostic]").forEach((chip) => chip.setAttribute("aria-pressed", "false"));
    if (active) {
      document.querySelector("[data-diagnostic-output]").textContent = "Select a symptom.";
      return;
    }
    button.setAttribute("aria-pressed", "true");
    const [title, copy] = diagnostics[button.dataset.diagnostic];
    document.querySelector("[data-diagnostic-output]").innerHTML = `<b>${title}.</b> ${copy}`;
  });
});

calculate();
