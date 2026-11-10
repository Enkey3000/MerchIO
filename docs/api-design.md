# API design

**Status:** proposed contract outline derived from the supplied backend plan. No production API or OpenAPI file is included. Paths and fields below are design candidates and require schema, authorization, error, and compatibility review before implementation.

## Conventions

- Base path: `/api/v1`; JSON request and response bodies.
- Authenticate protected routes with a short-lived access credential. Resolve tenant/workspace context from verified membership, not from an untrusted body field.
- Use `Idempotency-Key` for creates and state-changing actions; use `If-Match`/ETag or a version field for concurrent edits.
- Paginate collections with opaque cursors and bounded `limit`; allow only documented filters and sort fields.
- Return stable machine-readable error codes and a request ID. Never expose stack traces or secrets.
- Publish OpenAPI as the contract source; generate and version client SDKs from the approved specification.

Example error envelope:

```json
{
  "error": {
    "code": "ORDER_STOCK_INSUFFICIENT",
    "message": "One or more order lines exceed available stock.",
    "details": [],
    "requestId": "req_example"
  }
}
```

## Proposed route groups

| Area | Candidate routes | Notes |
|---|---|---|
| Identity and workspace | `/auth/*`, `/me`, `/workspaces`, `/team/members`, `/team/invitations` | Session, membership, role, and MFA controls |
| Settings and entitlements | `/settings`, `/workspace/modules`, `/billing/subscription`, `/billing/usage` | Check plan limits on every relevant write |
| Inventory | `/products`, `/products/{id}`, `/products/import`, `/products/{id}/actions/restock`, `/stock/alerts` | Stock changes must append a movement |
| Orders | `/orders`, `/orders/{id}`, `/orders/{id}/actions/advance`, `/orders/{id}/actions/cancel` | State transitions are explicit commands |
| Support | `/tickets`, `/tickets/{id}/comments`, `/tickets/{id}/actions/escalate`, `/tickets/{id}/actions/resolve` | Server calculates SLA deadlines |
| Workflows | `/workflows`, `/workflows/{id}/actions/test`, `/workflow-runs` | Runs and steps are durable, permission-scoped records |
| Marketing | `/campaigns`, `/campaigns/{id}/actions/send`, `/contacts`, `/consents`, `/suppressions` | Enforce eligibility at send time |
| Dashboard and activity | `/dashboard/summary`, `/dashboard/kpis`, `/notifications`, `/activity` | Read models must be permission and tenant scoped |
| Public site | `/public/leads`, `/public/trials`, `/public/subscribers` | Separate abuse controls; collect minimum necessary data |
| Sync (proposed V1) | `GET /sync?since=…`, `POST /sync/push`, `/devices` | Versioned, idempotent mutations and explicit conflicts |

## Example order command

```http
POST /api/v1/orders/ord_123/actions/advance
Authorization: Bearer <access-token>
Idempotency-Key: 6b0f...unique...
If-Match: "version-4"
Content-Type: application/json

{ "targetStatus": "fulfilled" }
```

On success, return the updated order and version. If stock is insufficient, return a stable conflict/business-rule error and make no changes. A stale version returns a conflict. Repeating the same idempotency key returns the original result rather than applying stock changes twice.

## Realtime event contract

The proposed WebSocket or SSE channel is a notification mechanism, not a substitute for authorization on resource reads. Events should have a versioned envelope such as `id`, `type`, `occurredAt`, and minimal `data`; do not broadcast secrets or unnecessary personal data. Suggested event names include `orders.order.updated`, `inventory.stock.low`, and `tickets.ticket.assigned`. Tenant membership and module permissions are checked before subscription and delivery.

## Webhook and provider callbacks

Verify signatures against the raw request body, enforce timestamp/replay windows, persist provider event IDs for deduplication, and process state updates idempotently. Outbound webhooks should be signed, retry with bounded backoff, and expose delivery status without leaking credentials. Restrict outbound network destinations to mitigate server-side request forgery.

## Contract and release checks

Before implementation, define schemas, auth scopes, limits, and error semantics in OpenAPI. CI should lint the contract, detect breaking changes, and exercise idempotency, tenant isolation, pagination, stale versions, webhook signature failures, and provider replay behavior. These are proposed gates; no API implementation or test suite is included in this package.
