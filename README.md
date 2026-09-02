# shramsaathi
Cooperative-owned marketplace for verified home service workers — fair pricing, e-Shram verification, emergency matching.


"Urban Company optimizes for the customer and extracts value from the worker. SetuSeva is the first marketplace where fairness isn't a CSR footnote — it's built into the pricing, the matching, the payments, and the emergency response itself."

What it is

Shramsaathi is a cooperative-owned digital marketplace connecting Labour Cooperative Federation/Society workers with households needing verified home and community services. Unlike private gig platforms, it's built around three principles: transparent earnings, a protected wage floor, and equitable job distribution.

Key Features
e-Shram fast-track onboarding — workers verify via their Universal Account Number, pre-filling identity and work category
Skill Certification layer — tiered trust (e-Shram → ITI/Bharat Skill), with peer-vouching and photo evidence planned for undocumented workers
Fair-Share Ledger — every booking shows the live split between worker, welfare fund, and ops
Floor–Standard–Ceiling pricing — a legal wage floor that's never breached, demand-based standard pricing, and a capped ceiling to prevent surge exploitation
Emergency on-demand booking — nearest-available worker prioritized, 30s accept window, auto-escalation
Gateway-enforced payment splits — worker/welfare/ops shares are disbursed automatically, not manually reconciled
AI demand forecasting & equity-weighted matching — pre-positions workers ahead of demand and rotates opportunity toward under-booked workers
Federation Admin Dashboard — verification, disputes, pricing bands, and emergency analytics
Multilingual, icon-driven UI for low-literacy accessibility
Tech Stack
Worker App + Customer App: Flutter / React Native
Federation Admin Dashboard: React (web)
Backend: Shared across all three, powering the same Fair-Share Ledger logic
Project Structure
/worker-app        # Worker mobile app
/customer-app      # Customer mobile app
/admin-dashboard    # Federation admin web dashboard
/backend            # Shared backend & Fair-Share Ledger logic
Status

Work in progress — built for [SIH2026/26089].
