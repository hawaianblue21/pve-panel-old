---
title: Support desk and AI assistant
sidebar_position: 6
---

Customers open tickets under **Support** (or *Problem with this server? Ask support* on a server page). While they type
the subject, matching help-center articles are suggested. Agents answer in the admin portal under **Tickets**:

| | |
|---|---|
| Status | *open* (support's turn) → *waiting* (after an answer: the customer's turn, shown as a badge in the menu) → *solved* / *closed*; a customer reply opens it again |
| Queues | **L1** first response; **L2** network and storage (or urgent); **L3** security. Changeable per ticket |
| Next to each ticket | the customer's servers and their state, the last account activity, matching articles (one click adds a link to the reply) |
| Notes | internal notes are never shown to the customer and never emailed |
| Email | the customer gets every answer by email (when email is set up), with a link straight to the ticket |

The **knowledge base** (admin portal → **Knowledge base**) holds Markdown articles with a draft / published state and a
visibility: *everyone* (also before sign-in, via `/api/kb`), *signed-in customers*, or *agents only*. A solved ticket can
become a draft article in one click (problem + answer; remove personal details before publishing). Help-center searches
that found nothing are listed, most frequent first, with *Write article*.

Permissions: `support.read`, `support.write`, `kb.write`. The built-in **Support agent** role has them plus read access;
**Operator** can answer and write articles; **Support (read-only)** only reads.

## AI assistant

Customers can chat with an assistant (menu **AI assistant**) once the owner sets it up in **Settings → AI assistant**:

| Provider | Settings |
|---|---|
| **Claude** (Anthropic Messages API) | API key and model (default `claude-sonnet-5-5`); address empty = `https://api.anthropic.com` |
| **OpenAI-compatible** | Address up to `/v1` (OpenAI, Azure-style gateways, or a model in your own network through vLLM, Ollama, LM Studio; http is allowed there), model, optional key |

What it can do, with tools that always run as the signed-in customer:

- search and read the **help center** (never agents-only articles) and name the articles it used as sources
- read the customer's **own servers** (state, size, usage, expiry) and **tickets**
- **propose a ticket** (subject, summary, category, priority, server): the customer sees a *Create ticket* button; the ticket
  gets the whole conversation attached and is routed like any other

What it can't do: start, stop, change, delete or order anything, or see other customers. Limits: questions per customer
per day (default 40), tool rounds per answer (5), message length (2,000 characters), answer length. If the provider
fails, customers get a friendly message and the error is in the activity log.

Administrators (`support.read`) see the usage (conversations, questions, handovers, ratings, tokens) and every
conversation including the tools the assistant called, in **AI assistant**. Questions and answers are sent to the
provider configured here: choose it to fit your privacy requirements, e.g. a local model.

## Optional: Zammad

Tickets always work in the panel. To also use a [Zammad](https://zammad.org) helpdesk (email, WhatsApp, phone, SLAs),
fill in **Settings → Helpdesk: Zammad**: the address, an API token of an agent, and the Zammad group for each queue.

- **Panel → Zammad**: new tickets (customer matched by email, created if needed), customer messages (*on behalf of* the
  customer), agent replies and notes from the panel, and status / priority / queue changes.
- **Zammad → panel**: in Zammad, add a **webhook** to the endpoint shown in Settings with the shown **HMAC SHA1 signature
  token**, and a **trigger** that calls it when a ticket is created or updated. Articles written in Zammad come back to
  the panel ticket (once each), closed tickets close in the panel. Calls with a wrong signature are refused and logged.
- If Zammad can't be reached, the panel keeps the ticket, shows the error on it, and retries every two minutes (or now,
  with *Send waiting items*).
