import { SaxesParser } from "saxes";
import Gtfs from "gtfs-realtime-bindings";
import reference from "./reference.json";
import {
  AS_OF,
  Checks,
  clone,
  pystr,
  report,
  requireInput,
  type Data,
} from "./common";
import { csvRows, dateValue } from "./tabular";
const spec = reference["transit-validation"] as Data;
export const transitFixture = () => clone(spec.fixture);
export const transitRegression = () => clone(spec.regression);
export function transitTime(value: any): number | null {
  if (typeof value !== "string" || !/^\d{2,3}:[0-5]\d:[0-5]\d$/.test(value))
    return null;
  const [h, m, s] = value.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}
export function transitRealtime(value: any): Data {
  if (typeof value === "string") {
    requireInput(
      value.length <= 300000 &&
        /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
          value,
        ),
      "Invalid base64",
    );
    const msg = Gtfs.transit_realtime.FeedMessage.decode(
      Uint8Array.from(atob(value), (c) => c.charCodeAt(0)),
    );
    const raw = Gtfs.transit_realtime.FeedMessage.toObject(msg, {
      longs: String,
      enums: String,
    });
    const snake = (v: any): any =>
      Array.isArray(v)
        ? v.map(snake)
        : v && typeof v === "object"
          ? Object.fromEntries(
              Object.entries(v).map(([k, x]) => [
                k.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase()),
                snake(x),
              ]),
            )
          : v;
    return snake(raw);
  }
  requireInput(
    value && typeof value === "object" && !Array.isArray(value),
    "Expected protobuf base64 or decoded JSON object",
  );
  return value;
}
type XmlNode = {
  tag: string;
  local: string;
  attributes: Data;
  text: string | null;
};
function xmlNodes(text: any): XmlNode[] {
  requireInput(
    typeof text === "string" && text.length <= 200000,
    "XML size/type",
  );
  if (/<!ENTITY\s/i.test(text)) {
    const e = new Error();
    e.name = "EntitiesForbidden";
    throw e;
  }
  const nodes: XmlNode[] = [],
    stack: XmlNode[] = [];
  const parser = new SaxesParser({ xmlns: true });
  parser.on("doctype", () => {
    throw Error("DTD is outside supported subset");
  });
  parser.on("opentag", (tag) => {
    requireInput(
      nodes.length < 10000 && stack.length < 100,
      "XML structure limit",
    );
    const node: XmlNode = {
      tag: tag.uri ? "{" + tag.uri + "}" + tag.local : tag.local,
      local: tag.local,
      attributes: Object.fromEntries(
        Object.values(tag.attributes).map((a) => [a.name, a.value]),
      ),
      text: null,
    };
    nodes.push(node);
    stack.push(node);
  });
  parser.on("text", (t) => {
    if (stack.length) stack.at(-1)!.text = (stack.at(-1)!.text ?? "") + t;
  });
  parser.on("closetag", () => {
    stack.pop();
  });
  parser.write(text).close();
  return nodes;
}
export function validateTransit(payload: Data): Data {
  requireInput(
    payload && typeof payload === "object" && !Array.isArray(payload),
    "Object required",
  );
  requireInput(
    !payload.files ||
      (typeof payload.files === "object" && !Array.isArray(payload.files)),
    "Files object required",
  );
  const c = new Checks(),
    tables: Data = {},
    fields: Data = spec.fields;
  for (const [name, required] of Object.entries(fields) as [
    string,
    string[],
  ][]) {
    const content = payload.files?.[name];
    c.add(
      "required_file",
      name,
      content !== undefined && content !== null,
      "file present (demo profile)",
      Boolean(content),
    );
    if (content === undefined || content === null) {
      tables[name] = [];
      continue;
    }
    let rows: Data[], headers: string[];
    try {
      requireInput(
        typeof content === "string" && content.length <= 200000,
        "CSV must be a string under 200 KB",
      );
      const parsed = csvRows(content);
      rows = parsed.rows;
      requireInput(
        rows.length <= 2000,
        "Invalid row width or more than 2000 rows",
      );
      headers = content
        .replace(/^\uFEFF/, "")
        .split(/\r?\n/)[0]
        .split(",");
      if (rows.length) headers = Object.keys(rows[0]);
      c.add("csv_parse", name, true, "valid CSV", rows.length + " rows");
    } catch (error) {
      c.add(
        "csv_parse",
        name,
        false,
        "valid CSV",
        error instanceof Error ? error.message : "Malformed CSV",
      );
      tables[name] = [];
      continue;
    }
    tables[name] = rows;
    for (const field of required)
      c.add(
        "required_field",
        name + ":" + field,
        headers.includes(field),
        "column present",
        headers,
      );
    rows.forEach((row, index) =>
      c.add(
        "required_value",
        name + ":" + (index + 2),
        required.every(
          (f) => row[f] !== undefined && row[f] !== null && row[f] !== "",
        ),
        "required values present",
        row,
      ),
    );
    const key = (
      {
        "agency.txt": "agency_id",
        "stops.txt": "stop_id",
        "routes.txt": "route_id",
        "trips.txt": "trip_id",
        "calendar.txt": "service_id",
      } as Data
    )[name];
    if (key) {
      const ids = rows.map((r) => r[key] ?? null);
      c.add(
        "unique_id",
        name,
        ids.length === new Set(ids).size,
        "unique IDs",
        ids,
      );
    }
  }
  const ids = (name: string, key: string) =>
      new Set(tables[name].map((r: Data) => r[key] ?? null)),
    stops = ids("stops.txt", "stop_id"),
    routes = ids("routes.txt", "route_id"),
    trips = ids("trips.txt", "trip_id"),
    services = ids("calendar.txt", "service_id");
  for (const r of tables["routes.txt"])
    c.add(
      "agency_reference",
      r.route_id ?? null,
      ids("agency.txt", "agency_id").has(r.agency_id ?? null),
      "existing agency",
      r.agency_id ?? null,
    );
  for (const r of tables["trips.txt"]) {
    c.add(
      "route_reference",
      r.trip_id ?? null,
      routes.has(r.route_id ?? null),
      "existing route",
      r.route_id ?? null,
    );
    c.add(
      "service_reference",
      r.trip_id ?? null,
      services.has(r.service_id ?? null),
      "existing service",
      r.service_id ?? null,
    );
  }
  const previous: Data = {},
    canonical: Data[] = [];
  tables["stop_times.txt"].forEach((r: Data, index: number) => {
    const key = "stop_times.txt:" + (index + 2);
    c.add(
      "stop_reference",
      key,
      stops.has(r.stop_id ?? null),
      "existing stop",
      r.stop_id ?? null,
    );
    c.add(
      "trip_reference",
      key,
      trips.has(r.trip_id ?? null),
      "existing trip",
      r.trip_id ?? null,
    );
    const seq = /^\d+$/.test(r.stop_sequence ?? "")
        ? Number(r.stop_sequence)
        : -1,
      arrival = transitTime(r.arrival_time),
      departure = transitTime(r.departure_time),
      [lastSeq, lastTime] = previous[r.trip_id] ?? [-1, 0];
    c.add(
      "stop_sequence",
      key,
      seq >= 0 && seq > lastSeq,
      "strictly increasing per trip in this profile",
      seq,
    );
    c.add(
      "time_format",
      key,
      arrival !== null && departure !== null,
      "HH:MM:SS; hours may exceed 24",
      r,
    );
    if (arrival !== null && departure !== null)
      c.add(
        "time_order",
        key,
        lastTime <= arrival && arrival <= departure,
        "monotonic times",
        r,
      );
    previous[r.trip_id] = [seq, departure || 0];
    canonical.push({
      trip: r.trip_id ?? null,
      stop: r.stop_id ?? null,
      sequence: seq,
      arrival_seconds: arrival,
    });
  });
  for (const r of tables["calendar.txt"]) {
    let valid = false;
    try {
      const dates = ["start_date", "end_date"].map((k) => {
        requireInput(/^\d{8}$/.test(r[k]), "Calendar date");
        return dateValue(
          r[k].slice(0, 4) + "-" + r[k].slice(4, 6) + "-" + r[k].slice(6),
        );
      });
      valid = dates[0] <= "2026-09-16" && dates[1] >= "2026-09-16";
    } catch {}
    c.add(
      "validity_window",
      r.service_id ?? null,
      valid,
      "includes 2026-09-16",
      r,
    );
    c.add(
      "calendar_flags",
      r.service_id ?? null,
      fields["calendar.txt"]
        .slice(1, 8)
        .every((day: string) => ["0", "1"].includes(r[day])),
      "weekday flags 0 or 1",
      r,
    );
  }
  try {
    const rt = transitRealtime(payload.realtime),
      header = rt.header ?? {},
      entities = rt.entity ?? [];
    c.add(
      "feed_header",
      "GTFS-RT",
      header.gtfs_realtime_version === "2.0",
      "2.0",
      header,
    );
    let age = Infinity;
    if (
      (typeof header.timestamp === "number" &&
        Number.isFinite(header.timestamp)) ||
      /^-?\d+$/.test(header.timestamp ?? "0")
    )
      age =
        Date.parse(AS_OF) / 1000 - Math.trunc(Number(header.timestamp ?? 0));
    const ageText = Number.isFinite(age) ? String(age) : "inf";
    c.add(
      "realtime_freshness",
      "GTFS-RT",
      age >= 0 && age <= 300,
      "0–300 s",
      ageText + " s",
      "high",
      `feed_timestamp=${pystr(header.timestamp ?? null)}; validation_timestamp=${AS_OF}; calculated_age_seconds=${ageText}`,
    );
    const entityIds = entities.map((e: Data) => e.id ?? null);
    c.add(
      "unique_entity",
      "GTFS-RT",
      entityIds.length === new Set(entityIds).size && entityIds.every(Boolean),
      "unique nonempty entity IDs",
      entityIds,
    );
    for (const entity of entities) {
      const eid = entity.id ?? "?";
      c.add(
        "entity_type",
        eid,
        ["trip_update", "vehicle", "alert"].filter((k) => k in entity)
          .length === 1,
        "one supported entity type",
        Object.keys(entity),
      );
      for (const kind of ["trip_update", "vehicle"]) {
        if (!(kind in entity)) continue;
        const value = entity[kind],
          trip = value.trip?.trip_id ?? null;
        c.add(
          "rt_trip_reference",
          eid,
          trips.has(trip),
          "static GTFS trip",
          trip,
        );
        const route = value.trip?.route_id;
        if (route)
          c.add(
            "descriptor_route",
            eid,
            tables["trips.txt"].some(
              (r: Data) => r.trip_id === trip && r.route_id === route,
            ),
            "route of trip",
            route,
          );
        for (const update of value.stop_time_update ?? []) {
          c.add(
            "rt_stop_sequence",
            eid,
            canonical.some(
              (r) =>
                r.trip === trip &&
                r.sequence === update.stop_sequence &&
                r.stop === update.stop_id,
            ),
            "matching static stop and sequence",
            update,
          );
          const delay = update.arrival?.delay ?? 0;
          c.add(
            "rt_delay_type",
            eid,
            typeof delay === "number" && Number.isInteger(delay),
            "integer delay seconds",
            delay,
          );
        }
        if (kind === "vehicle") {
          const pos = value.position ?? {},
            lat = pos.latitude,
            lon = pos.longitude;
          const display =
            "{" +
            Object.entries(pos)
              .map(
                ([k, v]) =>
                  "'" +
                  k +
                  "': " +
                  (typeof v === "number" && Number.isInteger(v)
                    ? v.toFixed(1)
                    : pystr(v)),
              )
              .join(", ") +
            "}";
          c.add(
            "vehicle_position",
            eid,
            typeof lat === "number" &&
              typeof lon === "number" &&
              lat >= -90 &&
              lat <= 90 &&
              lon >= -180 &&
              lon <= 180,
            "valid latitude/longitude",
            display,
          );
        }
      }
      if ("alert" in entity) {
        const selectors = entity.alert.informed_entity ?? [];
        c.add(
          "alert_reference",
          eid,
          selectors.length > 0 &&
            selectors.every((s: Data) => routes.has(s.route_id ?? null)),
          "known route selectors",
          selectors,
        );
      }
    }
  } catch {
    c.add(
      "rt_parse",
      "GTFS-RT",
      false,
      "valid supported JSON/protobuf",
      "ValueError",
    );
  }
  let xmlEntities: Data = {};
  for (const [source, rootName, namespace] of [
    ["netex", "PublicationDelivery", "http://www.netex.org.uk/netex"],
    ["siri", "Siri", "http://www.siri.org.uk/siri"],
  ]) {
    try {
      const nodes = xmlNodes(payload[source] ?? ""),
        root = nodes[0],
        get = (name: string) => nodes.filter((n) => n.local === name);
      c.add(
        "xml_root",
        source,
        root.tag === "{" + namespace + "}" + rootName,
        rootName + " with namespace",
        root.tag,
      );
      for (const name of source === "netex"
        ? ["ScheduledStopPoint", "Line", "ServiceJourney"]
        : [
            "ResponseTimestamp",
            "VehicleActivity",
            "LineRef",
            "DatedVehicleJourneyRef",
          ])
        c.add(
          "xml_structure",
          source + ":" + name,
          get(name).length > 0,
          "required subset element",
          get(name).length,
        );
      const identifiers = nodes
        .filter((n) => n.attributes.id !== undefined)
        .map((n) => n.attributes.id);
      c.add(
        "xml_identifiers",
        source,
        identifiers.length === new Set(identifiers).size &&
          identifiers.every((id) => /^[A-Za-z0-9:_-]+$/.test(id)),
        "unique nonempty profile IDs",
        identifiers,
      );
      for (const n of nodes)
        if (n.attributes.ref)
          c.add(
            "xml_reference",
            source,
            identifiers.includes(n.attributes.ref),
            "reference in document",
            n.attributes.ref,
          );
      if (source === "netex")
        xmlEntities = Object.fromEntries(
          [
            ["stops", "ScheduledStopPoint"],
            ["routes", "Line"],
            ["trips", "ServiceJourney"],
          ].map(([kind, name]) => [
            kind,
            get(name).map((n) => n.attributes.id ?? null),
          ]),
        );
      else {
        for (const n of [
          ...get("ResponseTimestamp"),
          ...get("RecordedAtTime"),
        ]) {
          const stamp = Date.parse(n.text ?? ""),
            age = Date.parse(AS_OF) - stamp;
          c.add(
            "siri_freshness",
            n.local,
            Number.isFinite(stamp) && age >= 0 && age <= 300000,
            "age 0..300s (demo policy)",
            n.text,
          );
        }
        for (const [tag, kind] of [
          ["LineRef", "routes"],
          ["DatedVehicleJourneyRef", "trips"],
        ])
          for (const n of get(tag))
            c.add(
              "siri_mapping",
              tag,
              n.text !== null &&
                Object.hasOwn(payload.mapping?.[kind] ?? {}, n.text),
              "explicit mapping",
              n.text,
            );
      }
    } catch (error) {
      c.add(
        "xml_parse",
        source,
        false,
        "safe well-formed XML",
        error instanceof Error && error.name === "EntitiesForbidden"
          ? "EntitiesForbidden"
          : "ParseError",
      );
    }
  }
  for (const [kind, targetIds] of [
    ["stops", stops],
    ["routes", routes],
    ["trips", trips],
  ] as [string, Set<any>][])
    for (const sourceId of xmlEntities[kind] ?? []) {
      const mapped = payload.mapping?.[kind]?.[sourceId] ?? null;
      c.add(
        "cross_mapping",
        sourceId,
        targetIds.has(mapped),
        "known GTFS " + kind,
        mapped,
      );
    }
  return report("transit-validation", payload, c, canonical, {
    mapping: payload.mapping ?? {},
    evaluation_clock: AS_OF,
  });
}
