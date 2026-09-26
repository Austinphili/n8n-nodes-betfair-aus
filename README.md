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

- **Confirm Bet Placement** must be explicitly ticked (an expression does not count) or the node refuses to run. Dry Run does not need it.
- **Max Stake** (default $10), **Max Worst-Case Loss** (default $50; stake for Back, stake x (price - 1) for Lay) and **Max Bets per Execution** (default 5) are enforced before anything is sent. Set a limit to 0 to disable it.
- Every item is validated before the first bet is placed, so one bad item cannot leave earlier ones placed.
- **Dry Run** returns the order that would be sent without placing it.
- A `customerRef` derived from the execution, node, run and item is sent with each order, so Betfair de-duplicates an in-execution *Retry On Fail* (Betfair's window is about 60 seconds; retrying a failed execution from the UI is a new execution and is not protected). A duplicate is returned as `placed: null, duplicate: true`.
- Betfair rejections fail the node instead of returning as success. With *Continue On Fail*, a definite rejection returns `placed: false`; a timeout, network error or 5xx returns `placed: null, outcomeUnknown: true`. Never blindly retry an unknown outcome - check your account.
- Bets use persistence `LAPSE` (cancelled if unmatched when the market turns in-play).

You are responsible for any bets placed. Gamble responsibly.

## Compatibility

Built for n8n 2.x, where AI Agent v3 runs tool nodes through `execute()`; the tool node implements both `supplyData` and `execute` so older n8n still works. The list operations were verified live against Betfair AU on n8n 2.37.

## Changelog

- **0.3.8** - Tool node works with n8n 2.x agents (`execute`). Fixed List Competitions (`listCompetitions`), List Market Book default prices, current-orders date range, non-string filter values, `pairedItem`. Place Bet: spend limits, dry run, duplicate protection, proper failure/unknown-outcome handling.
- **0.3.7** - LangChain 1.x, published from current source.
