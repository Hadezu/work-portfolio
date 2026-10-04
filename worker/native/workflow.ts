import reference from "./reference.json";
import {
  type Data,
  Checks,
  clone,
  dumps,
  report,
  requireInput,
  validateSchema,
} from "./common";
const spec = reference["workflow-access"];
const RULESET = "workflow-access/1.0.0";
export const workflowFixture = () => clone(spec.fixture);
export const workflowRegression = () => clone(spec.regression);
function roles(model: Data, user: Data): [string[], string[]] {
  const inherited = [
    ...new Set<string>(
      model.groups
        .filter((g: Data) => g.members.includes(user.id))
        .flatMap((g: Data) => g.roles),
    ),
  ].sort();
  return [
    [...new Set<string>([...user.roles, ...inherited])].sort(),
    inherited,
  ];
}
function approvals(model: Data, req: Data): [string | null, string[]] {
  const required = req.privileged ? ["manager", "security"] : ["manager"];
  for (const a of req.approvals) {
    if (a.actor === req.requester) return ["approval.self.forbidden", required];
    const u = model.users.find((u: Data) => u.id === a.actor);
    if (u.status !== "active" || !roles(model, u)[0].includes(a.role))
      return ["approval.identity.invalid", required];
  }
  for (const [i, role] of required.entries()) {
    if (!req.approvals.some((a: Data) => a.role === role))
      return ["approval." + role + ".required", required];
    if (!req.approvals.some((a: Data) => a.role === role && a.order === i + 1))
      return ["approval.order.invalid", required];
  }
  if (
    new Set(
      req.approvals
        .filter((a: Data) => required.includes(a.role))
        .map((a: Data) => a.actor),
    ).size < required.length
  )
    return ["approval.second.required", required];
  return [null, required];
}
function transition(
  model: Data,
  c: Data,
  rs: string[],
): [string, string, string[]] {
  const req = c.request;
  if (req.state === "Closed") return ["DENY", "workflow.closed", []];
  if (!spec.edges.some((e) => e[0] === req.state && e[1] === c.target))
    return ["DENY", "workflow.transition.forbidden", []];
  const owner: Record<string, string> = {
    Submitted: "requester",
    "Manager Review": "manager",
    "Security Review": "manager",
    Approved: req.privileged ? "security" : "manager",
    Provisioned: "operator",
    Closed: "requester",
    Rejected: req.state === "Security Review" ? "security" : "manager",
    Cancelled: "requester",
  };
  const role = owner[c.target];
  if (!rs.includes(role)) return ["DENY", "workflow.actor.role", []];
  if (role === "requester" && c.user !== req.requester)
    return ["DENY", "workflow.owner", []];
  let required: string[] = [];
  if (c.target === "Security Review") {
    const [issue, need] = approvals(model, { ...req, privileged: false });
    if (issue) return ["DENY", issue, need];
  }
  if (["Approved", "Provisioned", "Closed"].includes(c.target)) {
    const [issue, need] = approvals(model, req);
    required = need;
    if (issue) return ["DENY", issue, required];
  }
  return ["ALLOW", "workflow.transition.allowed", required];
}
function evaluate(model: Data, c: Data): Data {
  const user = model.users.find((u: Data) => u.id === c.user);
  const [rs, inherited] = roles(model, user);
  let actual = "DENY",
    rule = "",
    required: string[] = [];
  if (user.status !== "active") rule = "rbac.user.inactive";
  else if (rs.includes("requester") && rs.includes("security"))
    rule = "conflict.roles";
  else if (c.request?.state === "Closed") rule = "workflow.closed";
  else if (c.action === "transition")
    [actual, rule, required] = transition(model, c, rs);
  else {
    const granted = model.roles.some(
      (r: Data) =>
        rs.includes(r.id) &&
        r.permissions.some(
          (p: Data) => p.resource === c.resource && p.action === c.action,
        ),
    );
    actual = granted ? "ALLOW" : "DENY";
    rule = granted ? "rbac.grant" : "rbac.permission.missing";
  }
  const evidence = {
    actor: user.id,
    roles: rs,
    inherited_roles: inherited,
    resource: c.resource,
    action: c.action,
    request_id: c.request?.id ?? null,
    current_state: c.request?.state ?? null,
    requested_transition: c.target ?? null,
    approvals_found: c.request?.approvals ?? [],
    approvals_required: required,
    evaluated_rule: rule,
    policy_source: RULESET,
    preconditions: c.preconditions,
    effective_permissions: model.roles
      .filter((r: Data) => rs.includes(r.id))
      .map((r: Data) => ({
        role: r.id,
        source: "roles." + r.id + ".permissions",
        permissions: r.permissions,
      })),
    expected_decision: c.expected,
    actual_decision: actual,
    expected_rule: c.expected_rule,
  };
  return {
    scenario_id: c.scenario_id,
    name: c.name,
    user: user.id,
    roles: rs,
    resource: c.resource,
    action: c.action,
    preconditions: c.preconditions,
    expected: c.expected,
    actual,
    expected_rule: c.expected_rule,
    rule,
    rule_type: rule.split(".")[0],
    severity: c.severity ?? "high",
    result: c.expected === actual && c.expected_rule === rule ? "PASS" : "FAIL",
    evidence,
  };
}
export function validateWorkflow(payload: Data): Data {
  validateSchema(payload, spec.schema);
  const m = clone(payload);
  for (const c of m.cases) {
    c.severity ??= "high";
    c.request ??= null;
    c.target ??= null;
  }
  for (const key of ["users", "roles", "groups", "resources"])
    requireInput(
      new Set(m[key].map((x: Data) => x.id)).size === m[key].length,
      "Duplicate entity ID",
    );
  requireInput(
    new Set(m.cases.map((c: Data) => c.scenario_id)).size === m.cases.length,
    "Duplicate scenario ID",
  );
  const users = new Set(m.users.map((u: Data) => u.id)),
    rs = new Set(m.roles.map((r: Data) => r.id)),
    resources = new Set(m.resources.map((r: Data) => r.id));
  for (const u of m.users)
    requireInput(
      u.roles.every((r: string) => rs.has(r)),
      "Unknown user role",
    );
  for (const g of m.groups)
    requireInput(
      g.members.every((u: string) => users.has(u)) &&
        g.roles.every((r: string) => rs.has(r)),
      "Unknown group reference",
    );
  for (const r of m.roles)
    requireInput(
      r.permissions.every((p: Data) => resources.has(p.resource)),
      "Unknown permission resource",
    );
  for (const c of m.cases) {
    requireInput(
      users.has(c.user) && resources.has(c.resource),
      "Unknown scenario reference",
    );
    requireInput(
      c.target === null || spec.states.includes(c.target),
      "Unknown target state",
    );
    requireInput(
      (c.action === "transition") === Boolean(c.request && c.target),
      "Transition needs request and target",
    );
    if (c.request) {
      requireInput(users.has(c.request.requester), "Unknown requester");
      requireInput(
        c.request.approvals.every(
          (a: Data) => users.has(a.actor) && rs.has(a.role),
        ),
        "Unknown approval reference",
      );
    }
  }
  const mode =
    dumps(payload, true) === dumps(spec.fixture, true)
      ? "baseline"
      : dumps(payload, true) === dumps(spec.regression, true)
        ? "controlled"
        : "custom";
  const rows = m.cases.map((c: Data) => evaluate(m, c));
  const checks = new Checks();
  for (const r of rows)
    checks.add(
      r.expected_rule,
      r.scenario_id,
      r.result === "PASS",
      r.expected + " / " + r.expected_rule,
      r.actual + " / " + r.rule,
      r.severity,
      dumps(r.evidence, false, false),
    );
  const matrix = m.roles.flatMap((r: Data) =>
    [
      ["document", "view"],
      ["document", "edit"],
      ["request", "approve"],
      ["configuration", "administer"],
    ].map(([resource, action]) => {
      const allowed = r.permissions.some(
        (p: Data) => p.resource === resource && p.action === action,
      );
      const expected =
        spec.fixture.roles
          .find((b) => b.id === r.id)
          ?.permissions.some(
            (p) => p.resource === resource && p.action === action,
          ) ?? false;
      return {
        role: r.id,
        resource,
        action,
        allowed,
        expected_allowed: expected,
        deviation: allowed !== expected,
        change_source:
          mode === "controlled" && allowed !== expected
            ? "controlled-regression: employee/configuration/administer DENY → ALLOW"
            : "input vs reference policy",
        source: "roles." + r.id + ".permissions",
        inherited_by: m.groups
          .filter((g: Data) => g.roles.includes(r.id))
          .map((g: Data) => g.id),
      };
    }),
  );
  const result = report("workflow-access", payload, checks, [], {
    scenarios: rows,
    matrix,
    configuration: mode,
    workflow: { states: spec.states, edges: spec.edges },
    ruleset: RULESET,
  });
  return {
    ...result,
    ruleset: RULESET,
    scenario_count: rows.length,
    passed_scenarios: result.passed,
    failed_scenarios: result.failed,
    discrepancy_count: result.discrepancies.length,
  };
}
