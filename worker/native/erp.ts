import reference from "./reference.json";
import {reconcileRecords} from '../../src/reconciliation';
import {
  Checks,
  clone,
  dumps,
  hash,
  report,
  requireInput,
  validateSchema,
  type Data,
} from "./common";
const spec = reference["erp-sync"] as Data;
export const erpFixture = () => clone(spec.fixture);
export const erpRegression = () => clone(spec.regression);
// A deterministic transaction snapshot. The API repository persists this snapshot in D1;
// domain decisions do not depend on a filesystem or on a database connection per rule.
export class SyncState {
  mappings: Data[] = [];
  entities: Data[] = [];
  events: Data = {};
  targets: Data = {};
  history: Data[] = [];
  static restore(state: Data): SyncState {
    const db = new SyncState();
    Object.assign(db, clone(state));
    return db;
  }
  dump(): Data {
    return clone({
      mappings: this.mappings,
      entities: this.entities,
      events: this.events,
      targets: this.targets,
      history: this.history,
    });
  }
  map(kind: string, source: string, target: string) {
    requireInput(
      ["customer", "product"].includes(kind),
      "Unknown mapping type",
    );
    const prior = this.mappings.find(
      (m) => m.kind === kind && m.source === source,
    );
    if (prior) prior.target = target;
    else this.mappings.push({ kind, source, target });
  }
  createEntity(kind: string, id: string, payload: Data) {
    requireInput(["customer", "product"].includes(kind), "Unknown entity type");
    const prior = this.entities.find((e) => e.kind === kind && e.id === id),
      result = !prior
        ? "created"
        : dumps(prior.payload, true) === dumps(payload, true)
          ? "no_op"
          : "version_conflict";
    if (!prior) this.entities.push({ kind, id, payload: clone(payload) });
    const evidence = {
      entity: kind,
      target_id: id,
      payload: clone(payload),
      target_write: !prior,
    };
    this.history.push({ event_id: kind + "/" + id, result, evidence });
    return { result, evidence };
  }
  sync(data: Data, timeout = false): Data {
    const keys = [
      "event_id",
      "external_id",
      "version",
      "customer",
      "sku",
      "quantity",
      "status",
    ];
    requireInput(
      Object.keys(data).length === keys.length && keys.every((k) => k in data),
      "Order event fields",
    );
    for (const k of ["event_id", "external_id", "customer", "sku"])
      requireInput(
        typeof data[k] === "string" &&
          data[k].length > 0 &&
          (!["event_id", "external_id"].includes(k) || data[k].length <= 80),
        "Order identifier",
      );
    requireInput(
      Number.isSafeInteger(data.version) &&
        data.version >= 1 &&
        Number.isSafeInteger(data.quantity) &&
        data.quantity > 0 &&
        ["ready", "cancelled"].includes(data.status),
      "Order values",
    );
    const digest = hash(dumps(data, true)),
      prior = this.events[data.event_id];
    const evidence: Data = {
      event_id: data.event_id,
      external_id: data.external_id,
      source_version: data.version,
      input_hash: digest,
    };
    const finish = (result: string, details: Data = {}) => {
      Object.assign(evidence, details);
      this.history.push({
        event_id: data.event_id,
        result,
        evidence: clone(evidence),
      });
      return { result, evidence };
    };
    if (prior && prior.hash !== digest)
      return finish("idempotency_conflict", {
        expected_hash: prior.hash,
        actual_hash: digest,
      });
    if (prior?.status === "applied")
      return finish("idempotent_replay", { target_write: false });
    if (!prior)
      this.events[data.event_id] = {
        hash: digest,
        input: clone(data),
        status: "pending",
      };
    const fail = (result: string, details: Data) => {
      this.events[data.event_id].status = "failed";
      return finish(result, details);
    };
    if (timeout)
      return fail("timeout", { target_write: false, retryable: true });
    const mapped: Data = {};
    for (const [kind, source] of [
      ["customer", data.customer],
      ["product", data.sku],
    ]) {
      const m = this.mappings.find(
        (r) => r.kind === kind && r.source === source,
      );
      if (!m)
        return fail("missing_mapping", {
          mapping_kind: kind,
          source_value: source,
          expected: "mapping exists",
          actual: "missing",
          target_write: false,
        });
      mapped[kind] = m.target;
      if (!this.entities.some((e) => e.kind === kind && e.id === m.target))
        return fail("unknown_reference", {
          mapping_kind: kind,
          source_value: source,
          target_lookup: m.target,
          target_write: false,
          retryable: false,
        });
    }
    const current = this.targets[data.external_id],
      target = {
        external_id: data.external_id,
        version: data.version,
        customer_id: mapped.customer,
        product_id: mapped.product,
        quantity: data.quantity,
        status: data.status,
      };
    if (current && data.version === current.version) {
      if (dumps(current, true) === dumps(target, true)) {
        this.events[data.event_id].status = "applied";
        return finish("no_op", {
          target_version: current.version,
          target_write: false,
        });
      }
      return fail("version_conflict", {
        target_version: current.version,
        expected: "same version implies identical content",
        actual: target,
        target_write: false,
        retryable: false,
      });
    }
    if (current && data.version <= current.version)
      return fail("stale_update", {
        target_version: current.version,
        expected: "source version > target version",
        target_write: false,
      });
    this.targets[data.external_id] = clone(target);
    this.events[data.event_id].status = "applied";
    return finish(current ? "updated" : "created", {
      target,
      target_write: true,
    });
  }
  snapshot(): Data {
    return {
      target_orders: Object.keys(this.targets)
        .sort()
        .map((k) => clone(this.targets[k])),
      exceptions: Object.keys(this.events)
        .sort()
        .filter((k) => this.events[k].status === "failed")
        .map((k) => ({ event_id: k, input: clone(this.events[k].input) })),
      history: clone(this.history),
    };
  }
  documents(): Data {
    return {
      entities: clone(this.entities).sort((a, b) =>
        (a.kind + "/" + a.id).localeCompare(b.kind + "/" + b.id),
      ),
      mappings: clone(this.mappings).sort((a, b) =>
        (a.kind + "/" + a.source).localeCompare(b.kind + "/" + b.source),
      ),
    };
  }
}
function seed(db: SyncState, controlled = false) {
  for (const [kind, source, target] of [
    ["customer", "C-001", "B-C1"],
    ["product", "SKU-001", "B-P1"],
    ["product", "SKU-X99", "B-P99"],
  ]) {
    db.createEntity(kind, target, {
      external_id: source,
      name: "Synthetic " + source,
    });
    if (!(controlled && source === "SKU-X99")) db.map(kind, source, target);
  }
  return db;
}
const event = (changes: Data = {}) => ({
  event_id: "evt-101",
  external_id: "ORD-101/L1",
  version: 1,
  customer: "C-001",
  sku: "SKU-001",
  quantity: 2,
  status: "ready",
  ...changes,
});
export function erpReconcile(source: Data[], target: Data[]): Data[] {
  return reconcileRecords(source.map(item=>({
    external_id:item.external_id, version:item.version, customer_id:'B-C1',
    product_id:item.sku==='SKU-X99'?'B-P99':'B-P1', quantity:item.quantity, status:item.status,
  })),target);
}

function assemble(
  payload: Data,
  checks: Checks,
  details: Data[],
  source: Data[],
  db: SyncState,
  configuration: string,
): Data {
  const snapshot = db.snapshot(),
    history: Data[] = snapshot.history;
  const queue = snapshot.exceptions.map((item: Data) => {
    const last = [...history]
      .reverse()
      .find((r) => r.event_id === item.event_id)!;
    return {
      ...item,
      rule: last.result,
      severity: "high",
      status: "OPEN",
      retryable: ["missing_mapping", "timeout"].includes(last.result),
      evidence: last.evidence,
    };
  });
  const reconciliation = erpReconcile(source, snapshot.target_orders);
  const result = report("erp-sync", payload, checks, source, {
    configuration,
    input: payload,
    scenarios: details,
    source,
    target: snapshot.target_orders,
    ...db.documents(),
    history,
    exceptions: queue,
    reconciliation,
  });
  Object.assign(result, {
    ruleset: "erp-sync/1.0",
    scenario_count: details.length,
    passed_scenarios: result.passed,
    failed_scenarios: result.failed,
    discrepancy_count: result.failed,
    source_records: source.length,
    target_records: snapshot.target_orders.length,
    created: history.filter((x) => x.result === "created").length,
    updated: history.filter((x) => x.result === "updated").length,
    no_op: history.filter((x) =>
      ["no_op", "idempotent_replay"].includes(x.result),
    ).length,
    rejected: history.filter((x) =>
      [
        "missing_mapping",
        "timeout",
        "stale_update",
        "version_conflict",
        "unknown_reference",
      ].includes(x.result),
    ).length,
    retried: history.filter((x, i) =>
      history
        .slice(0, i)
        .some(
          (y) =>
            y.event_id === x.event_id &&
            ["missing_mapping", "timeout"].includes(y.result),
        ),
    ).length,
    exceptions: queue.length,
    reconciliation_differences: reconciliation.filter(
      (x) => x.status !== "MATCH",
    ).length,
  });
  result.reproduction =
    "POST /lab-api/erp-sync/run with {data: {configuration: baseline|controlled}}. Recovery requires the retained parent transaction snapshot and explicit retry request. Fixed evaluation clock: " +
    result.timestamp;
  result.artifacts.sync_state = db.dump();
  return result;
}
export function validateErp(payload: Data): Data {
  validateSchema(payload, spec.schema);
  const configuration = payload.configuration ?? "baseline",
    store = seed(new SyncState(), configuration === "controlled"),
    checks = new Checks(),
    details: Data[] = [];
  const check = (
    id: string,
    name: string,
    expected: string,
    actual: string,
    evidence: Data,
    entity = "OrderLine",
  ) => {
    const ev: Data = {
      scenario_id: id,
      source_system: "SYSTEM A",
      target_system: "SYSTEM B",
      source_entity: entity,
      target_entity: entity,
      source_id:
        evidence.external_id ?? evidence.payload?.external_id ?? "ORD-101/L1",
      target_id: evidence.target?.external_id ?? null,
      mapping: evidence.mapping_kind ?? "customer + product",
      source_version: evidence.source_version ?? 1,
      target_version: evidence.target_version ?? null,
      expected,
      actual,
      rule: id,
      decision: actual,
      retryable: ["missing_mapping", "timeout"].includes(actual),
      reason: name,
      ...evidence,
    };
    Object.assign(ev, {
      expected,
      actual,
      validation_expected: evidence.expected ?? null,
      validation_actual: evidence.actual ?? null,
      target_lookup: evidence.target_lookup ?? evidence.target ?? null,
    });
    checks.add(
      id,
      ev.source_id,
      expected === actual,
      expected,
      actual,
      "high",
      dumps(ev),
      "Sprawdzić dowód i uzgodnione mapowanie przed ponowieniem.",
    );
    details.push({
      id,
      name,
      entity,
      expected,
      actual,
      status: expected === actual ? "PASS" : "FAIL",
      severity: "high",
      evidence: ev,
    });
  };
  check(
    "entity.create",
    "Utworzenie klienta",
    "created",
    store.history[0].result,
    store.history[0].evidence,
    "Customer",
  );
  let outcome = store.sync(event());
  check(
    "sync.create",
    "Utworzenie pozycji zamówienia",
    "created",
    outcome.result,
    outcome.evidence,
  );
  const updated = event({ event_id: "evt-101-v2", version: 2, quantity: 4 });
  outcome = store.sync(updated);
  check(
    "sync.update",
    "Aktualizacja wersji",
    "updated",
    outcome.result,
    outcome.evidence,
  );
  outcome = store.sync(updated);
  check(
    "sync.replay",
    "Identyczne ponowienie bez zapisu",
    "idempotent_replay",
    outcome.result,
    outcome.evidence,
  );
  const controlled = event({
    event_id: "evt-104",
    external_id: "ORD-104/L1",
    sku: "SKU-X99",
  });
  outcome = store.sync(controlled);
  check(
    "mapping.ord104",
    "ORD-104: uzgodnione mapowanie produktu",
    "created",
    outcome.result,
    outcome.evidence,
  );
  const isolated = (
    id: string,
    name: string,
    expected: string,
    operation: (db: SyncState) => Data,
  ) => {
    const result = operation(seed(new SyncState()));
    check(id, name, expected, result.result, result.evidence ?? {});
  };
  const afterCreate = (db: SyncState, data: Data) => {
    db.sync(event());
    return db.sync(data);
  };
  isolated(
    "idempotency.duplicate",
    "Duplikat żądania nie tworzy drugiej pozycji",
    "no_op",
    (db) => afterCreate(db, event({ event_id: "duplicate" })),
  );
  isolated(
    "version.stale",
    "Starsza wersja jest odrzucana",
    "stale_update",
    (db) => {
      db.sync(updated);
      return db.sync(event());
    },
  );
  isolated(
    "mapping.missing",
    "Brak mapowania jest wykrywany",
    "missing_mapping",
    (db) => db.sync(event({ sku: "UNKNOWN" })),
  );
  isolated(
    "reference.customer",
    "Nieznany klient docelowy",
    "unknown_reference",
    (db) => {
      db.map("customer", "C-001", "UNKNOWN");
      return db.sync(event());
    },
  );
  isolated(
    "sync.partial",
    "Częściowy zapis: jedna poprawna pozycja",
    "PARTIAL",
    (db) => {
      const a = db.sync(event()),
        b = db.sync(
          event({
            event_id: "line2",
            external_id: "ORD-101/L2",
            sku: "UNKNOWN",
          }),
        );
      return {
        result:
          a.result === "created" &&
          b.result === "missing_mapping" &&
          db.snapshot().target_orders.length === 1
            ? "PARTIAL"
            : "UNEXPECTED",
        evidence: {
          lines: [a, b],
          transaction_boundary: "individual order line",
        },
      };
    },
  );
  isolated(
    "retry.transient",
    "Ponowienie po kontrolowanym timeout",
    "RECOVERED",
    (db) => {
      const before = db.sync(event(), true),
        after = db.sync(event());
      return {
        result:
          before.result === "timeout" &&
          after.result === "created" &&
          !db.snapshot().exceptions.length
            ? "RECOVERED"
            : "UNEXPECTED",
        evidence: { attempts: [before, after] },
      };
    },
  );
  isolated(
    "validation.permanent",
    "Niepoprawna ilość blokuje zapis",
    "REJECT",
    (db) => {
      try {
        db.sync(event({ quantity: 0 }));
      } catch {
        return {
          result: "REJECT",
          evidence: {
            input: event({ quantity: 0 }),
            target_records: db.snapshot().target_orders.length,
            rule: "quantity > 0",
          },
        };
      }
      return { result: "ACCEPT" };
    },
  );
  const compare = (db: SyncState, tamper = false, repair = false) => {
    db.sync(event());
    if (tamper) db.targets["ORD-101/L1"].quantity = 99;
    const data = repair ? updated : event();
    if (repair) db.sync(data);
    const rows = erpReconcile([data], db.snapshot().target_orders);
    return { result: rows[0].status, evidence: { reconciliation: rows } };
  };
  isolated("reconciliation.match", "Zgodne źródło i cel", "MATCH", (db) =>
    compare(db),
  );
  isolated(
    "reconciliation.difference",
    "Zmiana po stronie celu",
    "DIFFERENCE",
    (db) => compare(db, true),
  );
  isolated(
    "reconciliation.repair",
    "Nowsza poprawiona wersja usuwa różnicę",
    "MATCH",
    (db) => compare(db, true, true),
  );
  isolated(
    "version.conflict",
    "Ta sama wersja z inną treścią",
    "version_conflict",
    (db) => afterCreate(db, event({ event_id: "conflict", quantity: 99 })),
  );
  return assemble(
    payload,
    checks,
    details,
    [updated, controlled],
    store,
    configuration,
  );
}
export function recoverErp(
  previous: Data,
  exceptionId: string,
  repairMapping = false,
): Data {
  const selected = previous.artifacts.exceptions.find(
    (e: Data) => e.event_id === exceptionId,
  );
  requireInput(selected, "Unknown exception");
  requireInput(selected.retryable, "Exception is not retryable");
  requireInput(previous.artifacts.sync_state, "Run snapshot is unavailable");
  const store = SyncState.restore(previous.artifacts.sync_state);
  if (repairMapping) {
    requireInput(
      selected.input.sku === "SKU-X99",
      "No agreed repair for this mapping",
    );
    store.map("product", "SKU-X99", "B-P99");
  }
  const outcome = store.sync(selected.input),
    details = clone(previous.artifacts.scenarios),
    checks = new Checks();
  for (const row of details) {
    if (row.id === "mapping.ord104") {
      row.actual = outcome.result;
      row.status = row.expected === row.actual ? "PASS" : "FAIL";
      Object.assign(row.evidence, {
        actual: row.actual,
        decision: row.actual,
        recovery: outcome,
        parent_run: previous.run_id,
        repair_mapping: repairMapping,
      });
    }
    checks.add(
      row.id,
      row.evidence.source_id,
      row.status === "PASS",
      row.expected,
      row.actual,
      "high",
      dumps(row.evidence),
    );
  }
  return assemble(
    {
      parent_run: previous.run_id,
      exception_id: exceptionId,
      repair_mapping: repairMapping,
    },
    checks,
    details,
    previous.artifacts.source,
    store,
    repairMapping ? "recovered" : "controlled",
  );
}
