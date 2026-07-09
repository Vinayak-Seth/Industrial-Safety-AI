// Seeds Strata with a handful of realistic *synthetic* industrial documents,
// run through the real ingestion pipeline (POST /api/documents), plus a few
// maintenance work orders to drive the RCA agent demo. Synthetic data is used
// because real proprietary industrial documents aren't available for this demo.
const BASE_URL = process.env.SEED_BASE_URL ?? "http://localhost:8080/api";

const documents = [
  {
    title: "OISD-STD-118: Pressure Relief Devices — Safety Procedure",
    docType: "safety_procedure",
    fileName: "oisd-std-118-pressure-relief.txt",
    mimeType: "text/plain",
    content: `OISD-STD-118 — SAFETY PROCEDURE FOR PRESSURE RELIEF DEVICES

1. SCOPE
This procedure governs the inspection, testing, and maintenance of pressure relief
valves (PRVs) and rupture discs installed on pressure vessels, compressors, and
process piping across the facility.

2. REQUIREMENTS
2.1 Every Pressure Relief Valve (PRV) shall be inspected and function-tested at
    least once every 12 months. A record of each test, including the "as-found"
    and "as-left" set pressure, shall be maintained.
2.2 PRVs installed on hydrocarbon service exceeding 10 bar set pressure shall be
    bench-tested at an accredited facility, not tested in-line.
2.3 Any PRV found to lift below 90% of its set pressure during testing is
    considered a critical non-conformance and must be replaced or re-set
    within 48 hours.
2.4 Personnel performing PRV testing must hold a valid Pressure Systems Safety
    certification and wear flame-resistant PPE and face shields during testing.
2.5 Rupture discs shall be replaced on a fixed 24-month schedule regardless of
    condition, and every replacement must be logged with disc burst pressure
    rating and installation date.
2.6 The maximum allowable working pressure (MAWP) for the Compressor Unit A
    discharge line is 18 bar; the associated PRV must be set no higher than
    16.5 bar (92% of MAWP) per this standard.

3. ESCALATION
Any PRV inspection that cannot be completed within the scheduled window must be
escalated to the Plant Safety Officer within 24 hours of the missed deadline.`,
  },
  {
    title: "Compressor Unit A — Operations & Maintenance Manual (Excerpt)",
    docType: "equipment_manual",
    fileName: "compressor-unit-a-om-manual.txt",
    mimeType: "text/plain",
    content: `COMPRESSOR UNIT A — CENTRIFUGAL GAS COMPRESSOR
OPERATIONS & MAINTENANCE MANUAL (EXCERPT)

EQUIPMENT: Compressor Unit A (Model CX-4400, Serial CU-A-2019-071)
LOCATION: Compression Train Building, Bay 2

1. OVERVIEW
Compressor Unit A is a two-stage centrifugal compressor used to boost natural gas
from 6 bar suction to 18 bar discharge for downstream processing. Discharge line
is protected by Pressure Relief Valve PRV-A-204.

2. OPERATING PARAMETERS
- Rated discharge pressure: 18 bar (MAWP)
- Normal operating temperature: 65-85°C at discharge
- Vibration alarm threshold: 7.1 mm/s RMS (per ISO 10816-3)
- Lubrication: Synthetic compressor oil, changed every 4,000 operating hours

3. REQUIRED MAINTENANCE
- Monthly vibration analysis on drive-end and non-drive-end bearings.
- Quarterly inspection of coupling alignment.
- Annual inspection of PRV-A-204 per OISD-STD-118.
- Bearing temperature monitored continuously; alarm at 95°C, trip at 110°C.

4. KNOWN FAILURE MODES
- Elevated vibration is most commonly caused by bearing wear or rotor imbalance
  from fouling on impeller blades due to inadequate inlet filtration.
- Repeated high-temperature trips are frequently linked to degraded lubricant
  or partially blocked oil cooler flow.

5. SAFETY
Operators must not exceed 18 bar discharge pressure under any circumstance.
Hazard: rotating equipment - lockout/tagout required before any internal work.`,
  },
  {
    title: "Compression Train Building — Q2 Inspection Report",
    docType: "inspection_report",
    fileName: "q2-inspection-report.txt",
    mimeType: "text/plain",
    content: `COMPRESSION TRAIN BUILDING — QUARTERLY INSPECTION REPORT
Inspection Date: 2026-05-14
Inspector: J. Naranjo, Certified Mechanical Inspector

FINDINGS

1. Compressor Unit A
   - Discharge pressure observed at 17.8 bar during full-load run, within MAWP.
   - Drive-end bearing vibration measured at 6.4 mm/s RMS — within threshold but
     trending upward from 4.9 mm/s RMS recorded in the Q1 inspection.
   - Coupling alignment inspected: no visible deviation.
   - PRV-A-204: inspection record NOT located during this audit. Last known
     test date on file is 2024-11-02, which exceeds the 12-month interval
     required by OISD-STD-118.

2. Cooling Water Skid
   - No anomalies noted. Flow rate and temperature nominal.

3. General Housekeeping
   - PPE stations near Compressor Unit A fully stocked.
   - Lockout/tagout log up to date for all planned maintenance in the quarter.

RECOMMENDATION
Schedule PRV-A-204 testing immediately to close the overdue inspection interval.
Continue monthly vibration trending on Compressor Unit A drive-end bearing given
the upward trend observed.`,
  },
  {
    title: "Factory Safety Regulations Act — Pressure Vessel Provisions (Excerpt)",
    docType: "regulation",
    fileName: "factory-safety-act-pressure-vessels.txt",
    mimeType: "text/plain",
    content: `FACTORY SAFETY REGULATIONS ACT — PRESSURE VESSEL & ROTATING EQUIPMENT PROVISIONS
(EXCERPT FOR COMPLIANCE REFERENCE)

Section 41 — Pressure Vessel Certification
(1) Every pressure vessel operating above 5 bar shall hold a valid certificate of
    fitness issued by a competent authority, renewed at intervals not exceeding
    24 months.
(2) The occupier of the factory shall maintain a register of all pressure
    vessels, including their MAWP, and shall make this register available for
    inspection on request.

Section 44 — Rotating Machinery Guarding
(1) All rotating machinery exceeding 5 kW shall be fitted with appropriate
    guards to prevent operator contact with moving parts.
(2) Lockout/tagout procedures shall be documented and followed prior to any
    maintenance activity on rotating machinery.

Section 52 — Personal Protective Equipment
(1) Workers engaged in high-pressure system testing or maintenance shall be
    provided with, and required to wear, flame-resistant clothing and face
    protection appropriate to the hazard.

Section 58 — Incident Reporting
(1) Any equipment failure resulting in unplanned shutdown, injury, or release
    of process fluid shall be reported to the designated safety authority
    within 24 hours of occurrence.`,
  },
  {
    title: "Maintenance Records — Compressor Unit A (Last 6 Months)",
    docType: "maintenance_record",
    fileName: "compressor-unit-a-maintenance-records.txt",
    mimeType: "text/plain",
    content: `MAINTENANCE RECORDS — COMPRESSOR UNIT A
LOG PERIOD: December 2025 – May 2026

2025-12-03 — Routine monthly vibration check. Drive-end bearing 4.2 mm/s RMS.
  No action required.

2026-01-18 — WORK ORDER MR-2026-0118: High discharge temperature alarm
  triggered (98°C). Investigation found oil cooler partially fouled with
  scale. Cooler cleaned, lubricant sampled and found within spec. Unit
  returned to service same day.

2026-02-22 — Routine monthly vibration check. Drive-end bearing 5.1 mm/s RMS.
  Slight increase noted, flagged for trending.

2026-03-30 — WORK ORDER MR-2026-0330: Unplanned trip on high bearing
  temperature (112°C, above 110°C trip threshold). Root cause not
  formally documented at the time; unit restarted after cool-down with
  no corrective action logged beyond a visual inspection.

2026-04-15 — Routine monthly vibration check. Drive-end bearing 5.8 mm/s RMS.
  Continued upward trend from January baseline.

2026-05-20 — WORK ORDER MR-2026-0520: Operators reported unusual noise and
  rising vibration on Compressor Unit A drive-end bearing during normal
  operation, coinciding with a discharge temperature reading of 101°C.
  Unit was not tripped but flagged for urgent investigation. Root cause
  analysis requested.`,
  },
];

const workOrders = [
  {
    equipmentName: "Compressor Unit A",
    description:
      "High discharge temperature alarm (98°C) traced to a partially fouled oil cooler; cooler cleaned and lubricant sampled.",
    status: "completed",
    priority: "medium",
    reportedDate: "2026-01-18",
    resolvedDate: "2026-01-18",
  },
  {
    equipmentName: "Compressor Unit A",
    description:
      "Unplanned trip on high bearing temperature (112°C, above the 110°C trip threshold); unit restarted after cool-down with only a visual inspection logged, no formal root cause captured.",
    status: "completed",
    priority: "high",
    reportedDate: "2026-03-30",
    resolvedDate: "2026-03-31",
  },
  {
    equipmentName: "Compressor Unit A",
    description:
      "Operators reported unusual noise and rising drive-end bearing vibration during normal operation, coinciding with a 101°C discharge temperature reading. Unit not tripped but flagged for urgent investigation.",
    status: "open",
    priority: "critical",
    reportedDate: "2026-05-20",
    resolvedDate: null,
  },
];

async function main() {
  console.log(`Seeding Strata against ${BASE_URL} ...`);

  for (const doc of documents) {
    const fileBase64 = Buffer.from(doc.content, "utf-8").toString("base64");
    const res = await fetch(`${BASE_URL}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: doc.title,
        docType: doc.docType,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        fileBase64,
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      console.error(`Failed to ingest "${doc.title}":`, body);
      continue;
    }
    console.log(`Ingested "${doc.title}" -> status=${body.status}`);
  }

  console.log("\nSeeding maintenance work orders directly (not from a document)...");
  const { db, workOrdersTable } = await import("@workspace/db");
  for (const wo of workOrders) {
    await db.insert(workOrdersTable).values(wo);
    console.log(`Created work order for ${wo.equipmentName} (${wo.reportedDate})`);
  }

  console.log("\nRunning compliance scan agent...");
  const scanRes = await fetch(`${BASE_URL}/compliance/scan`, { method: "POST" });
  const scanBody = await scanRes.json();
  console.log(`Compliance scan: ${JSON.stringify(scanBody).slice(0, 500)}`);

  console.log("\nRunning RCA agent for open work orders...");
  const rcaRes = await fetch(`${BASE_URL}/maintenance/rca/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const rcaBody = await rcaRes.json();
  console.log(`RCA agent generated ${Array.isArray(rcaBody) ? rcaBody.length : 0} insight(s)`);

  console.log("\nSeeding complete.");
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
