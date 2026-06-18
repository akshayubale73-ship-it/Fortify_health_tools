// ─────────────────────────────────────────────────────────────────────────────
//  FORTIFY HEALTH — Premix Deviation Calculator
//
//  Core formula:
//    Pure premix needed = attaFlow (kg/hr) × 200 (g/MT) ÷ 1000 = g/hr
//                       e.g. 2000 kg/hr × 0.2 g/kg = 400 g/hr = 6.666 g/min
//
//    At ratio 3:7 → total output = purePremix × (10/3) = 22.22 g/min
//
//    Iron (mg/kg) = (actPure g/min ÷ attaFlow kg/hr) × 5400
//    Derivation:
//      actPure g/hr = actPure_gmin × 60
//      g premix per MT atta = (actPure_ghr ÷ attaFlow_kghr) × 1000
//      iron mg/kg = (g_per_MT ÷ 200) × 18
//      combined:  (actPure_gmin × 60 ÷ attaFlow_kghr × 1000 ÷ 200 × 18)
//               = actPure_gmin × 5400 ÷ attaFlow_kghr
//
//    Verified: 2000 kg/hr, 6.666 g/min pure → iron = 18.0 mg/kg ✓
//              2000 kg/hr, 350 g/hr (5.833 g/min) → iron = 15.75 mg/kg ✓
//
//  Calibration thresholds (from 18 mg/kg base):
//    15.84 – 20.16  → No Action Required
//    15.12 – 15.84  or  20.16 – 20.88  → Minor Calibration Required
//    < 14.00  or  > 21.25  → Major Calibration Required
// ─────────────────────────────────────────────────────────────────────────────

const STANDARD_ADDITION_G_MT = 200;  // g pure premix per MT atta — fixed
const TARGET_IRON             = 18;   // mg/kg at standard addition rate

// Calibration bands (mg/kg)
const BAND_NO_ACTION_MIN  = 15.84;
const BAND_NO_ACTION_MAX  = 20.16;
const BAND_MINOR_LOW_MIN  = 15.12;
const BAND_MINOR_LOW_MAX  = 15.84;
const BAND_MINOR_HIGH_MIN = 20.16;
const BAND_MINOR_HIGH_MAX = 20.88;
const BAND_MAJOR_LOW      = 14;      // below this → major
const BAND_MAJOR_HIGH     = 21.25;   // above this → major

function getExpectedOutput() {
  const attaFlowKgHr = parseFloat(document.getElementById("attaFlow").value);
  const ratioP       = parseFloat(document.getElementById("ratioP").value);
  const ratioD       = parseFloat(document.getElementById("ratioD").value);
  if (!attaFlowKgHr || !ratioP || !ratioD) return null;
  const purePremixGMin = (attaFlowKgHr / 60) * (STANDARD_ADDITION_G_MT / 1000);
  return purePremixGMin * ((ratioP + ratioD) / ratioP);
}

function calculate() {
  const attaFlowKgHr = parseFloat(document.getElementById("attaFlow").value);
  const act          = parseFloat(document.getElementById("actOutput").value);
  const ratioP       = parseFloat(document.getElementById("ratioP").value);
  const ratioD       = parseFloat(document.getElementById("ratioD").value);
  const cal          = getExpectedOutput();

  if (isNaN(attaFlowKgHr) || attaFlowKgHr <= 0 ||
      isNaN(act)          || act <= 0           ||
      isNaN(ratioP)       || ratioP <= 0        ||
      isNaN(ratioD)       || ratioD <= 0        ||
      !cal) {
    alert("Please enter valid values in all fields.");
    return;
  }

  // ── Step 1: Pure premix extraction ──────────────────────────────────────────
  //   Pure premix (g/min) = totalOutput × premixParts / totalParts
  const totalParts    = ratioP + ratioD;
  const premixFrac    = ratioP / totalParts;
  const expPurePremix = cal * premixFrac;   // g/min
  const actPurePremix = act * premixFrac;   // g/min

  // ── Step 2: Output deviation (based on pure premix only) ────────────────────
  //   % deviation = ((actual pure − expected pure) / expected pure) × 100
  const deviation = ((actPurePremix - expPurePremix) / expPurePremix) * 100;

  // ── Step 3: Iron level ───────────────────────────────────────────────────────
  //   Iron (mg/kg) = (actPure g/min ÷ attaFlow kg/hr) × 5400
  const iron = (actPurePremix / attaFlowKgHr) * 5400;

  // ── Step 4: Calibration status ───────────────────────────────────────────────
  let statusText  = "";
  let statusClass = "";
  let statusDetail = "";

  if (iron < BAND_MAJOR_LOW || iron > BAND_MAJOR_HIGH) {
    statusText   = "⚠ Major Calibration Required";
    statusClass  = "red";
    statusDetail = "Iron level is outside acceptable range (< 14.00 or > 21.25 mg/kg)";
  } else if (iron >= BAND_NO_ACTION_MIN && iron <= BAND_NO_ACTION_MAX) {
    statusText   = "✓ No Action Required";
    statusClass  = "green";
    statusDetail = "Iron level within acceptable range (15.84 – 20.16 mg/kg)";
  } else {
    statusText   = "⚡ Minor Calibration Required";
    statusClass  = "yellow";
    statusDetail = "Iron level approaching limits (15.12 – 15.84 or 20.16 – 20.88 mg/kg)";
  }

  // ── Step 5: Supporting values ────────────────────────────────────────────────
  const dilutionFactor     = totalParts / ratioP;
  const expPurePremixGHr   = expPurePremix * 60;   // g/hr
  const actPurePremixGHr   = actPurePremix * 60;   // g/hr
  const expGperMT          = (expPurePremixGHr / attaFlowKgHr) * 1000;
  const actGperMT          = (actPurePremixGHr / attaFlowKgHr) * 1000;

  // ── Render ───────────────────────────────────────────────────────────────────
  document.getElementById("expPurePremix").innerText  = expPurePremix.toFixed(3);
  document.getElementById("actPurePremix").innerText  = actPurePremix.toFixed(3);

  const devEl = document.getElementById("deviation");
  devEl.innerText = (deviation >= 0 ? "+" : "") + deviation.toFixed(2);
  // Color matches iron threshold bands
  const absDev = Math.abs(deviation);
  devEl.className = absDev <= 12 ? "val-green" : absDev <= 16 ? "val-yellow" : "val-red";

  document.getElementById("iron").innerText           = iron.toFixed(2);
  document.getElementById("dilutionFactor").innerText = dilutionFactor.toFixed(4) + "×";
  document.getElementById("ratioDisplay").innerText   = ratioP + " : " + ratioD;
  document.getElementById("attaFlowDisplay").innerText= attaFlowKgHr + " kg/hr";
  document.getElementById("expGperMT").innerText      = expGperMT.toFixed(2) + " g/MT";
  document.getElementById("actGperMT").innerText      = actGperMT.toFixed(2) + " g/MT";

  const statusDiv    = document.getElementById("status");
  const statusDetDiv = document.getElementById("statusDetail");
  statusDiv.innerText    = statusText;
  statusDiv.className    = "status " + statusClass;
  statusDetDiv.innerText = statusDetail;
  statusDetDiv.className = "status-detail " + statusClass;

  document.getElementById("resultsBox").style.display = "block";
}

// ── Live hint: auto-compute expected calibration output ───────────────────────
function updateHint() {
  const hint = document.getElementById("expectedHint");
  const cal  = getExpectedOutput();
  const attaFlowKgHr = parseFloat(document.getElementById("attaFlow").value);
  const ratioP       = parseFloat(document.getElementById("ratioP").value);
  const ratioD       = parseFloat(document.getElementById("ratioD").value);

  if (cal && attaFlowKgHr > 0 && ratioP > 0 && ratioD > 0) {
    const purePremixGMin = (attaFlowKgHr / 60) * (STANDARD_ADDITION_G_MT / 1000);
    hint.innerHTML =
      "📐 Expected calibration output: <b>" + cal.toFixed(3) + " g/min</b>" +
      " &nbsp;|&nbsp; Pure premix at 200 g/MT: <b>" + purePremixGMin.toFixed(3) + " g/min</b>";
    hint.style.display = "block";
  } else {
    hint.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", function () {
  ["attaFlow", "ratioP", "ratioD"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", updateHint);
  });
  document.querySelectorAll("input[type='number']").forEach(function (input) {
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") calculate();
    });
  });
});
