---
title: Plans and billing
sidebar_position: 5
---

![Plans and billing](/customer-billing.png)

## Plans

Plans are fixed sizes (vCPU, memory, disk, optionally a GPU) with a monthly price, managed in the admin portal under
**Plans** (owner or *Finance*). Customers then pick a plan in **New server**; with *Customers must choose a plan* switched
on, custom sizes are gone.

| | Without billing | With billing and a price |
|---|---|---|
| New server | the plan sets the size | 1, 3, 6 or 12 months are paid from the wallet first (discounts and PPN as for renewals); not enough balance: nothing is created |
| Setup fails | n/a | the order is refunded to the wallet automatically |
| Renewal | n/a | at the plan's current price (a fixed server price set by an administrator wins) |
| Larger plan | free | the difference in monthly price for the days already paid, plus tax |

- A server on a plan is resized only by moving to a larger plan (same GPU; disks only grow).
- A plan's size can't change while servers use it; retire it and add a new one. A price change applies from each server's
  next invoice; unpaid renewals at the old size or price are replaced.
- GPU plans are shown only to customers whose resource pool offers that GPU. Customer limits and pools still apply.

## Billing & payments (Xendit, Midtrans)

Off by default. The owner switches it on in **Settings → Billing**; customers then see **Billing** in the menu and a
**Renew** button on servers with an end date. Billing builds on [server expiry](../administration/expiry.md): a paid renewal moves
the end date (and starts an expired server again).

```text
Customer ── renew 1/3/6/12 months or top up ──► Invoice (PPN) ──► pay:
   wallet ─────────────────────────────────────────────────────► paid at once
   Xendit / Midtrans ─► payment page ─► webhook ─► status API check ─► paid
   bank transfer ─► customer reports reference ─► admin confirms ───► paid
Paid renewal ──► end date + 30 days per month · paid top-up ──► wallet balance
Auto-renew ──► N days before the end: one month from the wallet (email if the balance is short)
Dunning ──► D−7 invoice (due on the end date) + reminders D−7, D−1 ──► D+0 wallet charge or overdue notice
        ──► D+3 server stopped ──► grace period and deletion (Server lifecycle)
```

**Dunning** (Settings → Billing → Dunning, on by default with billing):

| Step | Default | What happens |
|---|---|---|
| Invoice | 7 days before the end date | A renewal invoice for one month, due on the end date, emailed with a pay link (not for free servers or servers the customer chose not to renew) |
| Reminders | 7 and 1 days before the due date | Email with the pay link; the server page shows the invoice |
| Due date | | Paid from the wallet when the balance covers it (`autoCharge`); otherwise one overdue email with the stop date |
| Stop | 3 days after the due date (0 to 14) | Server lifecycle stops the server (data kept); grace period and deletion follow as before |

- A payment during those 3 days extends from the old end date, so no paid day is lost.
- The lifecycle's own expiry reminders are skipped for servers with an open renewal (one set of emails, with the pay link).
- Administrators see the pipeline on the Billing tab (invoiced, due tomorrow, overdue, stopped, paused) and per
  invoice its timeline, and can **pause** dunning (no emails, no charge, not stopped) or **send a reminder** now.
- Customers choose per server what happens at the end date: *Invoice me* (default), *Pay from the wallet early*
  (auto-renew) or *Don't renew* (the open renewal is cancelled; the server ends on its end date).
- **Refunds**: a paid invoice goes back to the wallet, or is recorded as refunded outside the panel (Xendit or
  Midtrans dashboard, bank) with its reference. The end date is not changed by a refund.

- **Prices** come from a rate card (per vCPU, GB RAM, GB disk, with a minimum; rounded up to Rp 1.000) or a fixed
  price per server; discounts for 3, 6 and 12 months; tax name and rate (default PPN 11 %) are settings.
- **Top-ups** are not taxed: tax is charged on the service the balance pays for.
- **Invoices** are numbered `PREFIX-YYYYMM-0001`, carry seller and customer details (incl. NPWP) and print as PDF.
- **Gateways** are never trusted on their notification alone. Xendit: the `x-callback-token` header must match;
  Midtrans: the SHA-512 `signature_key` must match. Then the panel asks the gateway's API for the status and the paid
  amount; a smaller amount is not accepted. A payment that arrives twice (two payment pages) goes to the wallet.
- API keys are stored encrypted and never shown again.

| Gateway | Panel setting | In the gateway dashboard |
|---|---|---|
| Xendit (Invoice API) | Secret API key (Money-in write), callback verification token | Webhook *Invoices paid* → `https://portal.example.com/api/billing/webhooks/xendit` |
| Midtrans (Snap) | Server key, sandbox on/off | Notification URL → `https://portal.example.com/api/billing/webhooks/midtrans` |

Set `PANEL_PUBLIC_URL` (the customer portal address): Settings shows the webhook addresses from it, and customers return
to their invoice there after paying (without it, the address the browser used). Auto-renew runs every hour (`AUTORENEW_INTERVAL_SECONDS`).
