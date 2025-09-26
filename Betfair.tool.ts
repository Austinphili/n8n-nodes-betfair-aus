import {
	// CORRECTED: We now import ISupplyDataFunctions, the context provided by the tool node.
	ISupplyDataFunctions,
	NodeOperationError,
} from 'n8n-workflow';
import { Tool } from 'langchain/tools';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

// --- Betfair API helper functions ---
const BETFAIR_API_LOGIN_URL = 'https://identitysso.betfair.com.au/api/login';
const BETFAIR_API_BASE_URL_AU = 'https://api.betfair.com.au/exchange/betting/rest/v1.0/';

async function betfairApiRequest(
    this: ISupplyDataFunctions, // Context updated to the correct type
    method: 'POST',
    endpoint: string,
    body: object,
    appKey: string,
    sessionToken: string,
): Promise<AxiosResponse> {
    const options: AxiosRequestConfig = {
        url: `${BETFAIR_API_BASE_URL_AU}${endpoint}`,
        method,
        headers: {
            'X-Application': appKey,
            'X-Authentication': sessionToken,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        data: body,
        timeout: 15000,
    };
    try {
        const response = await axios(options);
        return response;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            throw new NodeOperationError(this.getNode(), `Betfair API Error: ${JSON.stringify(error.response.data)}`);
        }
        throw new NodeOperationError(this.getNode(), `Betfair API Request Failed: ${(error as Error).message}`);
    }
}
// --- End of helper functions ---


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

	// CORRECTED: The context is now of the type ISupplyDataFunctions.
	private executionContext!: ISupplyDataFunctions;

	// CORRECTED: The parameter for this method is now ISupplyDataFunctions.
	setExecutionContext(context: ISupplyDataFunctions) {
		this.executionContext = context;
	}

	async _call(input: string): Promise<string> {
		if (!this.executionContext) {
			throw new Error('Execution context not set on BetfairTool.');
		}

		// Get credentials and log in
		const credentials = await this.executionContext.getCredentials('betfairAusApi');
		if (!credentials) {
			return 'Error: Betfair credentials are not configured for this tool.';
		}
		const { appKey, username, password } = credentials;

		let sessionToken: string;
		try {
			const loginPayload = `username=${encodeURIComponent(username as string)}&password=${encodeURIComponent(password as string)}`;
			const loginResponse = await axios.post(BETFAIR_API_LOGIN_URL, loginPayload, {
				headers: { 'X-Application': appKey as string, 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
				timeout: 10000,
			});
			if (!loginResponse.data || !loginResponse.data.token) {
				return `Login failed: ${JSON.stringify(loginResponse.data)}`;
			}
			sessionToken = loginResponse.data.token;
		} catch (error) {
			return `Error during Betfair login: ${(error as Error).message}`;
		}

		// Keyword-based router for different commands
		const [command, argument] = input.split(':');
		let response: AxiosResponse;
		let requestBody: any = {};

		try {
			switch (command) {
				case 'list_events':
					requestBody = { filter: { eventTypeIds: [argument] } };
					response = await betfairApiRequest.call(this.executionContext, 'POST', 'listEvents/', requestBody, appKey as string, sessionToken);
					break;

				case 'list_market_catalogue':
					requestBody = { filter: { eventIds: [argument] }, maxResults: 50, marketProjection: ['MARKET_START_TIME', 'RUNNER_DESCRIPTION', 'EVENT'] };
					response = await betfairApiRequest.call(this.executionContext, 'POST', 'listMarketCatalogue/', requestBody, appKey as string, sessionToken);
					break;

				case 'list_market_book':
					requestBody = { marketIds: [argument], priceProjection: { priceData: ['EX_BEST_OFFERS'] } };
					response = await betfairApiRequest.call(this.executionContext, 'POST', 'listMarketBook/', requestBody, appKey as string, sessionToken);
					break;

				default:
					return `Unknown command '${command}'. Valid commands are: list_events, list_market_catalogue, list_market_book.`;
			}

			return JSON.stringify(response.data, null, 2);

		} catch (error) {
			if (error instanceof NodeOperationError) {
				return `API Error: ${error.message}`;
			}
			return `Execution Error: ${(error as Error).message}`;
		}
	}
}