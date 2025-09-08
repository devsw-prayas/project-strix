# Project Documentation: Secure Financial Transactions with Decentralized Anti-Tamper DAG

---

## 1. Problem Statement
Financial systems today face two major challenges:

1. **Security & Tamper Resistance**: Centralized databases make transactions vulnerable to manipulation, fraud, or insider threats.  
2. **Performance**: Blockchain-based systems ensure security but are often too slow for real-time trading or payments.  

We aim to build an **extremely fast, tamper-resistant financial transaction system** using a **local + global DAG structure** for anti-tamper verification, orchestrated by a **high-performance backend in Go**.  

This system will power:  
- Secure money transfers between accounts.  
- Buying and selling of stocks/assets.  
- Near-instant fraud detection via anti-tamper DAG consensus.  

---

## 2. Tech Stack

### Frontend
- **Framework**: Next.js (App Router)  
- **Styling**: TailwindCSS  
- **Routing**: Next.js file-based routing  
- **State/Data Management**: Apollo GraphQL Client / urql  
- **Animations**: Tailwind transitions + keyframes  

### Backend
- **Language**: Go (for HPC and concurrency)  
- **GraphQL Orchestration**: gqlgen (Go GraphQL server)  
- **Database**: PostgreSQL (transaction ledger)  
- **Anti-Tamper DAG Layer**:  
  - Local DAG = node-level transaction graph  
  - Global DAG = cross-node tamper detection + consensus  

### Infrastructure
- **Containerization**: Docker (modular nodes, scalable horizontally)  
- **Orchestration**: Docker Compose / Kubernetes (stretch goal)  
- **Deployment**: Cloud (Vercel for frontend, AWS/GCP for backend)  

---

## 3. Core Innovations

### Anti-Tamper DAG Security
- Each transaction creates a node in a **local DAG**.  
- Local DAGs sync into a **global DAG** across multiple servers.  
- If one node/server is compromised, inconsistencies are quickly flagged in the global DAG.  
- **Tamper = instant detection** → unmatched security compared to centralized DBs.  

### Blistering Performance with Go
- Go’s concurrency (goroutines + channels) allows **thousands of transactions/second**.  
- Low-latency message passing ensures real-time updates for clients.  

### Frontend Experience
- A **banking-style dashboard** with account balances, transfers, and activity logs.  
- Real-time updates via **GraphQL subscriptions**.  
- Clean, modern UI powered by **pure Tailwind**.  

---

## 4. Implementation Plan

### Phase 1 – Core Setup
- Next.js frontend with Tailwind skeleton (dashboard, login, transfer page).  
- Go backend with GraphQL API (basic CRUD for accounts + transactions).  
- PostgreSQL database schema for accounts & ledger.  

### Phase 2 – DAG Security Layer
- Implement **Local DAG** for each node.  
- Sync mechanism to build a **Global DAG**.  
- Anti-tamper detection logic (conflict resolution + alerts).  

### Phase 3 – Advanced Features
- Real-time GraphQL subscriptions for live transaction updates.  
- Fraud/tamper visualization in **admin dashboard**.  
- Dockerized deployment (local nodes + sync).  

---

## 5. Deliverables for Hackathon
- **Frontend**: Beautiful “fake bank” UI (accounts, transfers, stock buying/selling).  
- **Backend**: Go GraphQL API with working DAG anti-tamper system.  
- **Deployment**: Dockerized nodes running locally, frontend on Vercel.  
- **Demo**: Show a transaction being tampered → caught by DAG instantly.  

---

## Decentralized Anti-Tamper Tech (BlockDAG + TPM)

### Core Idea
**Problem**: In traditional systems, tampering with a single server or DB copy can alter critical account states.  

**Solution**:  
- **BlockDAG Layer**: Each transaction/state change is stored in a **local DAG** (per institution or node cluster). Local DAGs sync to a **global DAG** distributed across multiple servers.  
- **TPM Integration**: Each participating node uses **Trusted Platform Module** to verify:  
  - Integrity of its OS / runtime environment.  
  - Cryptographic identity (signatures bound to hardware).  

**Result**: Even if one node is compromised:  
- Tampered data fails validation because other DAG replicas + TPM attestation reject it.  
- Malicious node gets quarantined automatically.  

**Current State**
Docker Server Setup Complete, inter-node and monitor node communication completed 
End points for login and register auth completed

Next.js frontend complete

**General Flow**

**Login / Signup**
1. Client signs data using a chained key setup (TPM parent + TPM child + node key).


2. Auth server verifies the signature and attestation locally.


3. If valid, the auth server creates a local DAG entry and signs it.


4. The entry is propagated to peer nodes.


5. Peers re-verify the signature and attestation.


6. If all active nodes agree, the DAGs are updated everywhere → login succeeds.


7. If any node rejects, a tamper log is created and the event is flagged.




**Transactions**

Layer 1 – Local Fast Path

1. Client signs and submits a transaction.


2. Nearest node verifies quickly, appends to its local DAG, and gives the client an immediate success.


3. This transaction is gossiped to sibling nodes in the same cluster for redundancy.



Layer 2 – Global Verification 4. The local cluster forwards the transaction to a global verifier layer.
5. Global verifier(s) re-validate against the broader DAG consensus.
6. If confirmed, the transaction is marked Finalized everywhere.
7. If not, a tamper log is generated and the offending node/transaction is quarantined.



**Security Principle**

Every step is signed + verified.

Local DAGs = speed and redundancy.

Global DAG = strong consistency and tamper detection.

Tamper logs = immutable audit trail when something fails.




