n8n Node: Betfair Australia
This is an n8n community node for interacting with the Betfair Australia API. It allows you to automate workflows by fetching event data, retrieving live market odds, and viewing your current orders.

This node is designed to be safe for multiple users on a single n8n instance, as it does not share session tokens between executions.

Features
Authentication: Securely connect to your Betfair Australia account using n8n's credential management.

Events Resource:

List all available event types (e.g., Horse Racing, Soccer).

List specific events filtered by event type.

Markets Resource:

List market catalogues to discover available markets and selections for events.

Get live market books to see real-time odds and liquidity.

Orders Resource:

List your current active (unmatched or partially matched) orders on the exchange.

Prerequisites
Before you can use this node, you will need:

A Betfair Australia account.

An Application Key from Betfair Australia. 

Installation
Follow the n8n community node installation guide, and install n8n-nodes-betfair-aus from the community nodes list.

Configuration
Credentials
You will need to add your Betfair Australia credentials before using the node:

In your n8n instance, go to the Credentials page.

Click Add credential and search for Betfair Australia API.

Enter your Betfair Username, Password, and your Application Key.

Save the credential.

Operations
The node is organized by Resource, with each resource having one or more Operations.

Event Resource
List Event Types: Get a list of all sport/event categories and their IDs (e.g., ID 7 for Horse Racing).

List Events: Find specific upcoming events by filtering with an Event Type ID.

Market Resource
List Market Catalogue: Discover what betting markets are available for specific events. This is useful for finding the marketId you need for other operations.

List Market Book(s): Get the live odds, prices, and available money (liquidity) for one or more markets.

Orders Resource
List Current Orders: View your currently active bets on the exchange, with options to filter by market, date, and more.

License
MIT