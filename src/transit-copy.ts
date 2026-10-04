import {defineCopy} from './localization-contract';
import {labs,type LabDefinition} from './labs';
export const transitCopy=defineCopy<LabDefinition>('transit-content',{
 pl:labs['transit-validation'],
 en:{
  title:'Transit integration validation',group:'Integration and acceptance',
  problem:'Inconsistent identifiers and stale data can pass through an integration even when HTTP transport succeeds.',
  input:'GTFS CSV: agency, stops, routes, trips, stop_times, calendar; GTFS-RT JSON or protobuf base64; NeTEx and SIRI XML subsets; explicit mappings.',
  processing:'Parsers → canonical journey stops → file, relationship and time validation → cross-format comparison.',
  failures:'Stale feeds, unknown trips, invalid sequences, duplicate entities, malformed XML, missing references and mappings.',
  result:'JSON/CSV report: run identifier, input hash, rule, expected and actual values, evidence and acceptance result.',
  acceptance:'The valid fixture produces no discrepancies. Each negative scenario detects its assigned rule. Repeating the input produces the same report.',
  limits:'The public scenario covers the documented NeTEx/SIRI subset, relationships, mappings and data consistency. The GTFS profile requires calendar.txt, ordered stop_times and explicit ID mappings. Integration with the operator environment and the required compliance profile are configured for each project. Evaluation clock: 2026-09-16 12:00 UTC.',
 }
});
