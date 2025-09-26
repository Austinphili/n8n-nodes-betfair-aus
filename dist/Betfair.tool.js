"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BetfairTool = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const tools_1 = require("langchain/tools");
const axios_1 = __importDefault(require("axios"));
// --- Betfair API helper functions ---
const BETFAIR_API_LOGIN_URL = 'https://identitysso.betfair.com.au/api/login';
const BETFAIR_API_BASE_URL_AU = 'https://api.betfair.com.au/exchange/betting/rest/v1.0/';
async function betfairApiRequest(// Context updated to the correct type
method, endpoint, body, appKey, sessionToken) {
    const options = {
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
        const response = await (0, axios_1.default)(options);
        return response;
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error) && error.response) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Betfair API Error: ${JSON.stringify(error.response.data)}`);
        }
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Betfair API Request Failed: ${error.message}`);
    }
}
// --- End of helper functions ---
class BetfairTool extends tools_1.Tool {
    constructor() {
        super(...arguments);
        this.name = 'betfair_australia';
        this.description = `
        Useful for answering questions about sports betting on the Betfair Australia exchange.
        Use a command and argument format, like 'command:argument'. Do not use for anything else.
        Valid commands are:
        - 'list_events:<event_type_id>' - to find events for a sport.
        - 'list_market_catalogue:<event_id>' - to find markets for an event.
        - 'list_market_book:<market_id>' - to get live odds for a market.
    `;
    }
    // CORRECTED: The parameter for this method is now ISupplyDataFunctions.
    setExecutionContext(context) {
        this.executionContext = context;
    }
    async _call(input) {
        if (!this.executionContext) {
            throw new Error('Execution context not set on BetfairTool.');
        }
        // Get credentials and log in
        const credentials = await this.executionContext.getCredentials('betfairAusApi');
        if (!credentials) {
            return 'Error: Betfair credentials are not configured for this tool.';
        }
        const { appKey, username, password } = credentials;
        let sessionToken;
        try {
            const loginPayload = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
            const loginResponse = await axios_1.default.post(BETFAIR_API_LOGIN_URL, loginPayload, {
                headers: { 'X-Application': appKey, 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
                timeout: 10000,
            });
            if (!loginResponse.data || !loginResponse.data.token) {
                return `Login failed: ${JSON.stringify(loginResponse.data)}`;
            }
            sessionToken = loginResponse.data.token;
        }
        catch (error) {
            return `Error during Betfair login: ${error.message}`;
        }
        // Keyword-based router for different commands
        const [command, argument] = input.split(':');
        let response;
        let requestBody = {};
        try {
            switch (command) {
                case 'list_events':
                    requestBody = { filter: { eventTypeIds: [argument] } };
                    response = await betfairApiRequest.call(this.executionContext, 'POST', 'listEvents/', requestBody, appKey, sessionToken);
                    break;
                case 'list_market_catalogue':
                    requestBody = { filter: { eventIds: [argument] }, maxResults: 50, marketProjection: ['MARKET_START_TIME', 'RUNNER_DESCRIPTION', 'EVENT'] };
                    response = await betfairApiRequest.call(this.executionContext, 'POST', 'listMarketCatalogue/', requestBody, appKey, sessionToken);
                    break;
                case 'list_market_book':
                    requestBody = { marketIds: [argument], priceProjection: { priceData: ['EX_BEST_OFFERS'] } };
                    response = await betfairApiRequest.call(this.executionContext, 'POST', 'listMarketBook/', requestBody, appKey, sessionToken);
                    break;
                default:
                    return `Unknown command '${command}'. Valid commands are: list_events, list_market_catalogue, list_market_book.`;
            }
            return JSON.stringify(response.data, null, 2);
        }
        catch (error) {
            if (error instanceof n8n_workflow_1.NodeOperationError) {
                return `API Error: ${error.message}`;
            }
            return `Execution Error: ${error.message}`;
        }
    }
}
exports.BetfairTool = BetfairTool;
