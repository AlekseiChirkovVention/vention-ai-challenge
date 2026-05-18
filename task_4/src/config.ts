import { AirportConfig, Runway } from "./types";

function parsePositiveInt(value: string | undefined, name: string, errors: string[]): number {
  if (value === undefined || value.trim() === "") {
    errors.push(`${name} is required but not set`);
    return 0;
  }
  const n = parseInt(value, 10);
  if (!Number.isInteger(n) || n < 1) {
    errors.push(`${name} must be a positive integer, got: "${value}"`);
    return 0;
  }
  return n;
}

function parseNonNegativeInt(value: string | undefined, name: string, defaultVal: number, errors: string[]): number {
  if (value === undefined || value.trim() === "") {
    return defaultVal;
  }
  const n = parseInt(value, 10);
  if (!Number.isInteger(n) || n < 0) {
    errors.push(`${name} must be a non-negative integer, got: "${value}"`);
    return defaultVal;
  }
  return n;
}

function parsePositiveIntOptional(value: string | undefined, name: string, defaultVal: number, errors: string[]): number {
  if (value === undefined || value.trim() === "") {
    return defaultVal;
  }
  const n = parseInt(value, 10);
  if (!Number.isInteger(n) || n < 1) {
    errors.push(`${name} must be a positive integer (>= 1), got: "${value}"`);
    return defaultVal;
  }
  return n;
}

export function loadConfig(): AirportConfig {
  const errors: string[] = [];

  const runwayCount = parsePositiveInt(process.env["RUNWAY_COUNT"], "RUNWAY_COUNT", errors);
  const gateCount = parsePositiveInt(process.env["GATE_COUNT"], "GATE_COUNT", errors);
  const groundCrewCount = parsePositiveInt(process.env["GROUND_CREW_COUNT"], "GROUND_CREW_COUNT", errors);

  let runways: Runway[] = [];
  const runwayLengthsRaw = process.env["RUNWAY_LENGTHS"];
  if (runwayLengthsRaw === undefined || runwayLengthsRaw.trim() === "") {
    errors.push("RUNWAY_LENGTHS is required but not set");
  } else {
    const parts = runwayLengthsRaw.split(",").map((s: string) => s.trim());
    if (runwayCount > 0 && parts.length !== runwayCount) {
      errors.push(
        `RUNWAY_LENGTHS must have exactly ${runwayCount} comma-separated values (RUNWAY_COUNT=${runwayCount}), got ${parts.length}`
      );
    } else {
      const lengths: number[] = [];
      for (let i = 0; i < parts.length; i++) {
        const n = parseInt(parts[i] ?? "", 10);
        if (!Number.isInteger(n) || n < 1) {
          errors.push(`RUNWAY_LENGTHS[${i}] must be a positive integer, got: "${parts[i]}"`);
        } else {
          lengths.push(n);
        }
      }
      if (lengths.length === parts.length) {
        runways = lengths.map((len, i) => ({ id: `R${i + 1}`, lengthMeters: len }));
      }
    }
  }

  const separationSameRunwayTakeoff = parseNonNegativeInt(process.env["SEPARATION_TAKEOFF_SEC"], "SEPARATION_TAKEOFF_SEC", 60, errors);
  const separationSameRunwayLanding = parseNonNegativeInt(process.env["SEPARATION_LANDING_SEC"], "SEPARATION_LANDING_SEC", 90, errors);
  const separationMixed = parseNonNegativeInt(process.env["SEPARATION_MIXED_SEC"], "SEPARATION_MIXED_SEC", 120, errors);
  const gateTurnaroundTime = parseNonNegativeInt(process.env["GATE_TURNAROUND_SEC"], "GATE_TURNAROUND_SEC", 1800, errors);
  const dependencyBuffer = parseNonNegativeInt(process.env["DEPENDENCY_BUFFER_SEC"], "DEPENDENCY_BUFFER_SEC", 300, errors);
  const maxSchedulingHorizonSeconds = parsePositiveIntOptional(process.env["MAX_HORIZON_SEC"], "MAX_HORIZON_SEC", 86400, errors);
  const arrivalDurationSeconds = parsePositiveIntOptional(process.env["ARRIVAL_DURATION_SEC"], "ARRIVAL_DURATION_SEC", 1800, errors);
  const departureDurationSeconds = parsePositiveIntOptional(process.env["DEPARTURE_DURATION_SEC"], "DEPARTURE_DURATION_SEC", 1800, errors);

  if (errors.length > 0) {
    throw new Error(`Invalid airport configuration:\n${errors.join("\n")}`);
  }

  return {
    runways,
    gateCount,
    groundCrewCount,
    separationSameRunwayTakeoff,
    separationSameRunwayLanding,
    separationMixed,
    gateTurnaroundTime,
    dependencyBuffer,
    maxSchedulingHorizonSeconds,
    arrivalDurationSeconds,
    departureDurationSeconds,
  };
}
