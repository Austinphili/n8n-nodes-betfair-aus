# n8n-nodes-betfair-aus

n8n community nodes for the [Betfair Australia](https://www.betfair.com.au) Exchange betting API.

## Nodes

| Node | What it does |
| --- | --- |
| **Betfair Australia** | Read-only operations: List Event Types, Events, Venues, Market Types, Competitions, Market Catalogue, Market Book(s), Current Orders. |
| **Betfair AU - Place Bet** | Places a single LIMIT bet per input item. **Real money.** See safety notes below. |
| **Betfair LangChain Tool** | Read-only AI Agent tool (`list_events:<eventTypeId>`, `list_market_catalogue:<eventId>`, `list_market_book:<marketId>`). Cannot place bets. |

## Credentials

Create a **Betfair Australia API** credential with your Application Key, username and password (interactive login, `identitysso.betfair.com.au`). Use a delayed/dev app key while testing.

## Place Bet safety

- **Confirm Bet Placement** must be ticked or the node refuses to run. It cannot be set by an expression.
- **Max Stake** (default $10), **Max Lay Liability** (default $50) and **Max Bets per Execution** (default 5) are enforced before anything is sent. Set a limit to 0 to disable it.
- Every item is validated before the first bet is placed, so one bad item cannot leave earlier ones placed.
- **Dry Run** returns the order that would be sent without placing it.
- A `customerRef` derived from the execution, node and item is sent with each order, so Betfair de-duplicates n8n retries.
- Betfair rejections (`FAILURE`, `PROCESSED_WITH_ERRORS`, `TIMEOUT`) fail the node instead of returning as success. A `TIMEOUT` means the outcome is unknown: check your account before retrying.
- Bets use persistence `LAPSE` (cancelled if unmatched when the market turns in-play).

You are responsible for any bets placed. Gamble responsibly.

## Compatibility

Tested against n8n 2.37 (AI Agent v3). The tool node implements both `supplyData` and `execute` so it works with older and current n8n.

## Changelog

- **0.3.8** - Tool node works with n8n 2.x agents (`execute`). Fixed List Competitions (`listCompetitions`), List Market Book default prices, current-orders date range, non-string filter values, `pairedItem`. Place Bet: spend limits, dry run, duplicate protection, proper failure handling.
- **0.3.7** - LangChain 1.x, published from current source.
