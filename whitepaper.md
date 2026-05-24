# Open Calling Graph Whitepaper

## The AgentOS trigger

The mobile era gave us apps. The agent era needs a call graph.

Mobile apps were built as endpoints: users tap icons, apps open screens, and software waits for direct manipulation. Agents change that model. If agents are becoming active operators of software, apps need to become callable participants: they must expose scoped capabilities, verify who is calling, ask for consent where risk demands it, execute their own handlers, and prove what happened.

MeshKit is the trigger for AgentOS: a working call graph for apps that can verify, consent, execute, and prove what happened.

## Apps become callable only by oath

Open Calling Graph (OCG) is a public trust layer for opt-in callable apps. It does not automate arbitrary apps. It records the capabilities that a participating app chooses to expose, the risks attached to those capabilities, the consent required before invocation, and the trust metadata needed to verify execution.

MeshKit is the SDK that lets an app honor that declaration. The target app receives a signed request, checks caller identity, validates the payload, applies policy, asks for consent when required, executes its own internal handler, and returns an auditable receipt.

## The primitive

```text
App
  -> Capability
  -> Risk
  -> Consent
  -> Target
  -> Trust
  -> Receipt
```

This chain is the contract. OCG discovery is not permission. Registration is not execution. A call becomes valid only when the target app verifies the request and the user’s policy permits it.

## Why now

AI systems need a safer surface than screen scraping and a more open surface than private app integrations. OCG gives apps a common language for actions: capability IDs, schemas, risk classes, consent policies, package identity, publisher metadata, signing keys, and verification state.

## Security model

Production targets must fail closed before business logic runs:

- observed caller binding
- package or bundle trust
- canonical payload hash
- fresh timestamp
- nonce replay protection
- request signature
- registry signature
- risk-gated consent
- budget checks for spend flows
- signed audit receipt

## Boundary

OCG does not bypass app UI, platform security, app sandboxes, target-app policy, or developer-owned handlers. Non-participating apps are not callable through MeshKit. Delegated backend execution belongs only after signed foreground consent and must preserve target-app policy and audit.

## Product thesis

The AgentOS trigger layer is not a hidden universal controller. It is a graph of accountable apps. Every callable surface is declared. Every high-risk action is gated. Every execution leaves a receipt.
