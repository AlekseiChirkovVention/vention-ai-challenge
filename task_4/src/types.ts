export enum FlightPriority {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

export enum OperationType {
  ARRIVAL = "arrival",
  DEPARTURE = "departure",
}

export enum FlightStatus {
  PENDING = "pending",
  SCHEDULED = "scheduled",
  UNSCHEDULED = "unscheduled",
  CANCELLED = "cancelled",
}

export interface Flight {
  flightNumber: string;
  operationType: OperationType;
  priority: FlightPriority;
  dependencies: string[];
  requiredRunwayLength?: number;
  submittedAt: number;
  status: FlightStatus;
  unscheduledReason?: string;
}

export interface Runway {
  id: string;
  lengthMeters: number;
}

export interface Gate {
  id: string;
}

export interface ScheduledOperation {
  flightNumber: string;
  operationType: OperationType;
  priority: FlightPriority;
  runwayId: string;
  gateId: string;
  startTime: number;
  endTime: number;
  dependsOn: string[];
}

export interface AirportConfig {
  runways: Runway[];
  gateCount: number;
  groundCrewCount: number;
  separationSameRunwayTakeoff: number;
  separationSameRunwayLanding: number;
  separationMixed: number;
  gateTurnaroundTime: number;
  dependencyBuffer: number;
  maxSchedulingHorizonSeconds: number;
  arrivalDurationSeconds: number;
  departureDurationSeconds: number;
}

export interface ScheduleResult {
  scheduled: ScheduledOperation[];
  unscheduled: Array<{ flightNumber: string; reason: string }>;
  completionTime: number;
}

export interface AirportState {
  flights: Map<string, Flight>;
  schedule: ScheduledOperation[];
  lastScheduledAt: number | null;
  config: AirportConfig;
}

export interface BottleneckResult {
  exists: boolean;
  chain: string[];
  totalDurationSeconds: number;
}
