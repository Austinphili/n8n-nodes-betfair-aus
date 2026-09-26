import { INode, ICredentialDataDecryptedObject, NodeOperationError } from 'n8n-workflow';
import { Tool } from '@langchain/core/tools';
import { AxiosResponse } from 'axios';
import { betfairApiRequest, betfairLogin } from './BetfairApiHelper';


// The subset of the execution context the tool needs; satisfied by both
// ISupplyDataFunctions (supplyData) and IExecuteFunctions (execute).
export interface BetfairToolContext {
	getCredentials(type: string): Promise<ICredentialDataDecryptedObject>;
	getNode(): INode;
}

export class BetfairTool extends Tool {
	name = 'betfair_australia';

	description = `
        Useful for answering questions about sports betting on the Betfair Australia exchange.
        Use a command and argument format, like 'command:argument'. Do not use for anything else.
        Valid commands are:
        - 'list_events:<event_type_id>' - to find events for a sport.
        - 'list_market_catalogue:<event_id>' - to find markets for an event.
        - 'list_market_book:<market_id>' - to get live odds for a market.
    `;

	private executionContext!: BetfairToolContext;

	setExecutionContext(context: BetfairToolContext) {
		this.executionContext = context;
	}

	async _call(input: string): Promise<string> {
		if (!this.executionContext) {
			throw new Error('Execution context not set on BetfairTool.');
		}

		// Parse and validate before logging in, so a bad command never costs a Betfair login.
		const text = typeof input === 'string' ? input : '';
		const sep = text.indexOf(':');
		const command = (sep === -1 ? text : text.slice(0, sep)).trim();
		const argument = (sep === -1 ? '' : text.slice(sep + 1)).trim();
		const commands: Record<string, (arg: string) => { endpoint: string; body: object }> = {
			list_events: (arg) => ({ endpoint: 'listEvents/', body: { filter: { eventTypeIds: [arg] } } }),
			list_market_catalogue: (arg) => ({
				endpoint: 'listMarketCatalogue/',
				body: { filter: { eventIds: [arg] }, maxResults: 50, marketProjection: ['MARKET_START_TIME', 'RUNNER_DESCRIPTION', 'EVENT'] },
			}),
			list_market_book: (arg) => ({
				endpoint: 'listMarketBook/',
				body: { marketIds: [arg], priceProjection: { priceData: ['EX_BEST_OFFERS'] } },
			}),
		};
		if (!Object.prototype.hasOwnProperty.call(commands, command)) {
			return `Unknown command '${command}'. Valid commands are: list_events, list_market_catalogue, list_market_book.`;
		}
		if (!argument) {
			return `Command '${command}' needs an argument, e.g. '${command}:<id>'.`;
		}
		const { endpoint, body } = commands[command](argument);

		const credentials = await this.executionContext.getCredentials('betfairAusApi');
		if (!credentials) {
			return 'Error: Betfair credentials are not configured for this tool.';
		}
		const { appKey, username, password } = credentials;

		try {
			const sessionToken = await betfairLogin(appKey as string, username as string, password as string, () => this.executionContext.getNode());
			const response: AxiosResponse = await betfairApiRequest(endpoint, body, appKey as string, sessionToken, () => this.executionContext.getNode());
			return JSON.stringify(response.data, null, 2);
		} catch (error) {
			if (error instanceof NodeOperationError) {
				return `API Error: ${error.message}`;
			}
			return `Execution Error: ${(error as Error).message}`;
		}
	}
}
