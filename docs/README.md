# DuPont demo architecture

These documents distinguish the publicly observed DuPont production site from
the proposed Edge Delivery Services (EDS) pilot in this repository. The target
architecture is a discussion artifact, not a migration decision or a claim
about DuPont's internal systems.

- [Current-state architecture](architecture/current-state-architecture.md):
  client-visible production components and evidence.
- [Target-state architecture](architecture/target-state-architecture.md):
  a route-level EDS pilot alongside the existing site.
- [Analytics build guide](analytics-build-guide.md): the DuPont EDS demo's
  event contract, AppMeasurement mapping, consent behavior, and validation.

## Important scope boundaries

- The production observations are based on public browser-delivered evidence;
  they do not establish DuPont's private deployment topology or system-of-record
  design.
- The EDS demo is a separate implementation and report-suite configuration. It
  is not the production DuPont website and does not establish that the demo
  report suite is the production suite.
- The demo consent banner gates Analytics collection. The existing Adobe Target
  offer continues to render before a visitor's consent choice. The target-state
  document calls this out as a policy/integration decision to validate, not an
  already implemented guarantee.
- Edge routing, shared identity, production content authoring, and analytics
  continuity require DuPont stakeholder and platform-owner validation before
  adoption.

Evidence last reviewed: 2026-10-21.
