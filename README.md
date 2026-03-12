![prometheus_contract_architecture](https://github.com/user-attachments/assets/f942dd6b-78a1-43e6-8277-7e6a04f8556a)# PROMETHEUS  Smart Contract

Move smart contract deployed on **Aptos shelbynet**.

## Modules
![Uploading<svg width="100%" viewBox="0 0 680 420">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
  </defs>

  <!-- Module: document -->
  <g class="node c-purple">
    <rect x="40" y="40" width="180" height="80" rx="8" stroke-width="0.5"/>
    <text class="th" x="130" y="72" text-anchor="middle" dominant-baseline="central">document.move</text>
    <text class="ts" x="130" y="96" text-anchor="middle" dominant-baseline="central">publish, blob ref, metadata</text>
  </g>

  <!-- Module: guardian -->
  <g class="node c-teal">
    <rect x="250" y="40" width="180" height="80" rx="8" stroke-width="0.5"/>
    <text class="th" x="340" y="72" text-anchor="middle" dominant-baseline="central">guardian.move</text>
    <text class="ts" x="340" y="96" text-anchor="middle" dominant-baseline="central">stake, earn, withdraw</text>
  </g>

  <!-- Module: challenge -->
  <g class="node c-coral">
    <rect x="460" y="40" width="180" height="80" rx="8" stroke-width="0.5"/>
    <text class="th" x="550" y="72" text-anchor="middle" dominant-baseline="central">challenge.move</text>
    <text class="ts" x="550" y="96" text-anchor="middle" dominant-baseline="central">dispute, vote, slash</text>
  </g>

  <!-- arrows down to treasury -->
  <line x1="130" y1="120" x2="130" y2="200" class="arr" marker-end="url(#arrow)"/>
  <line x1="340" y1="120" x2="340" y2="200" class="arr" marker-end="url(#arrow)"/>
  <line x1="550" y1="120" x2="550" y2="200" class="arr" marker-end="url(#arrow)"/>

  <!-- Module: treasury -->
  <g class="node c-amber">
    <rect x="200" y="200" width="280" height="56" rx="8" stroke-width="0.5"/>
    <text class="th" x="340" y="222" text-anchor="middle" dominant-baseline="central">treasury.move</text>
    <text class="ts" x="340" y="244" text-anchor="middle" dominant-baseline="central">APT flows — stake, reward, slash</text>
  </g>

  <!-- arrow down -->
  <line x1="340" y1="256" x2="340" y2="316" class="arr" marker-end="url(#arrow)"/>

  <!-- Shelby ref -->
  <g class="node c-gray">
    <rect x="200" y="316" width="280" height="56" rx="8" stroke-width="0.5"/>
    <text class="th" x="340" y="336" text-anchor="middle" dominant-baseline="central">Shelby blob ref</text>
    <text class="ts" x="340" y="358" text-anchor="middle" dominant-baseline="central">account + blob_name stored on-chain</text>
  </g>
</svg> prometheus_contract_architecture.svg…]()

| Module | Responsibility |
|---|---|
| `document.move` | Publish docs, guardian registry, read tracking |
| `challenge.move` | Open disputes, vote, permissionless resolution |
| `guardian.move` | Per-guardian positions, reward accrual |
| `treasury.move` | APT stake/reward/slash flows |
| `prometheus.move` | Entry point — wires all modules |

## Deploy to shelbynet

```bash
# Install Aptos CLI
curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3

# Init account on shelbynet
aptos init --network custom \
  --rest-url https://api.shelbynet.shelby.xyz/v1 \
  --faucet-url https://faucet.shelbynet.shelby.xyz

# Compile
aptos move compile --named-addresses prometheus=<YOUR_ADDRESS>

# Deploy
aptos move publish \
  --named-addresses prometheus=<YOUR_ADDRESS> \
  --url https://api.shelbynet.shelby.xyz/v1

# Initialize (one-time)
aptos move run \
  --function-id <YOUR_ADDRESS>::prometheus::initialize \
  --url https://api.shelbynet.shelby.xyz/v1
```

## Publish a document

```bash
aptos move run \
  --function-id <YOUR_ADDRESS>::prometheus::publish_document \
  --args \
    address:<YOUR_ADDRESS> \
    string:"0xSHELBY_ACCOUNT" \
    string:"prometheus/2024-doc.pdf" \
    string:"My Title" \
    string:"Description here" \
    string:"sha256hashhere" \
    u64:10000000 \
  --url https://api.shelbynet.shelby.xyz/v1
```

## Become guardian

```bash
aptos move run \
  --function-id <YOUR_ADDRESS>::document::become_guardian \
  --args \
    address:<YOUR_ADDRESS> \
    u64:1 \
    u64:5000000 \
  --url https://api.shelbynet.shelby.xyz/v1
```

## Open challenge

```bash
aptos move run \
  --function-id <YOUR_ADDRESS>::challenge::open_challenge \
  --args \
    address:<YOUR_ADDRESS> \
    u64:1 \
    u64:20000000 \
    string:"This document is fabricated" \
  --url https://api.shelbynet.shelby.xyz/v1
```

## Vote on challenge

```bash
# true = doc is real, false = doc is fake
aptos move run \
  --function-id <YOUR_ADDRESS>::challenge::vote \
  --args \
    address:<YOUR_ADDRESS> \
    u64:1 \
    u64:1000000 \
    bool:true \
  --url https://api.shelbynet.shelby.xyz/v1
```

## Resolve (after 72h deadline)

```bash
aptos move run \
  --function-id <YOUR_ADDRESS>::challenge::resolve \
  --args address:<YOUR_ADDRESS> u64:1 \
  --url https://api.shelbynet.shelby.xyz/v1
```

## Economics

| Action | Cost |
|---|---|
| Publish doc | min 0.1 APT stake |
| Become guardian | min 0.05 APT stake |
| Open challenge | min 0.2 APT stake |
| Vote | min 0.01 APT stake |
| Read fee (server pays) | 0.001 APT → guardians |

## Document lifecycle

```
ACTIVE → challenge opened → CHALLENGED
       → challenge resolved (doc wins) → VINDICATED
       → challenge resolved (fake wins) → REMOVED
```
