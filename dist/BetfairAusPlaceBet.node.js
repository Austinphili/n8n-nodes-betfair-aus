"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BetfairAusPlaceBet = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const axios_1 = __importDefault(require("axios"));
// Betfair API Endpoints
const BETFAIR_API_LOGIN_URL = 'https://identitysso.betfair.com.au/api/login';
const BETFAIR_API_BASE_URL_AU = 'https://api.betfair.com.au/exchange/betting/rest/v1.0/';
// Re-usable API request helper
async function betfairApiRequest(endpoint, body, appKey, sessionToken) {
    const options = {
        url: `${BETFAIR_API_BASE_URL_AU}${endpoint}`,
        method: 'POST',
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
        return await (0, axios_1.default)(options);
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error) && error.response) {
            console.error('Betfair API Error Response Data:', JSON.stringify(error.response.data, null, 2));
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Betfair API Error: ${JSON.stringify(error.response.data)} (Status: ${error.response.status})`);
        }
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Betfair API Request Failed: ${error.message}`);
    }
}
class BetfairAusPlaceBet {
    constructor() {
        this.description = {
            displayName: 'Betfair AU - Place Bet',
            name: 'betfairAusPlaceBet',
            icon: 'file:betfair.svg',
            group: ['transform'], // <-- CORRECTED THIS LINE
            version: 1.0,
            subtitle: '={{$parameter["side"]}} bet on {{$parameter["selectionId"]}}',
            description: 'Places a single bet on the Betfair Exchange. Use with caution.',
            defaults: {
                name: 'Betfair Place Bet',
            },
            inputs: ['main'],
            outputs: ['main'],
            credentials: [
                {
                    name: 'betfairAusApi',
                    required: true,
                },
            ],
            properties: [
                {
                    displayName: 'Market ID',
                    name: 'marketId',
                    type: 'string',
                    required: true,
                    default: '',
                    description: 'The market ID to place the bet in (e.g., 1.12345678).',
                    placeholder: '={{ $json.marketId }}',
                },
                {
                    displayName: 'Selection ID',
                    name: 'selectionId',
                    type: 'number',
                    required: true,
                    default: 0,
                    description: 'The selection ID of the runner to bet on.',
                    placeholder: '={{ $json.selectionId }}',
                },
                {
                    displayName: 'Side',
                    name: 'side',
                    type: 'options',
                    required: true,
                    default: 'BACK',
                    options: [
                        { name: 'Back', value: 'BACK' },
                        { name: 'Lay', value: 'LAY' },
                    ],
                    description: 'Whether to place a Back or a Lay bet.',
                },
                {
                    displayName: 'Price',
                    name: 'price',
                    type: 'number',
                    required: true,
                    default: 1.01,
                    typeOptions: {
                        minValue: 1.01,
                        maxValue: 1000,
                    },
                    description: 'The odds at which to place the bet.',
                    placeholder: '={{ $json.bestBackPrice }}',
                },
                {
                    displayName: 'Stake ($)',
                    name: 'size',
                    type: 'number',
                    required: true,
                    default: 5.00,
                    typeOptions: {
                        minValue: 5.00, // Minimum stake on Betfair AU
                        numberPrecision: 2,
                    },
                    description: 'The stake amount in AUD.',
                },
                {
                    displayName: 'Customer Strategy Reference',
                    name: 'customerStrategyRef',
                    type: 'string',
                    default: 'n8n-workflow-v1',
                    description: 'A reference for your strategy, required by Betfair for automated betting.',
                },
                {
                    displayName: 'Confirm Bet Placement',
                    name: 'confirmPlacement',
                    type: 'boolean',
                    required: true,
                    default: false,
                    description: 'DANGER: You must tick this box to confirm you want to place a real bet. The node will fail if this is not checked.',
                },
            ],
        };
    }
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const credentials = await this.getCredentials('betfairAusApi');
        const appKey = credentials.appKey;
        const username = credentials.username;
        const password = credentials.password;
        // Login to get a session token for this execution
        let sessionToken;
        try {
            const loginPayload = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
            const loginResponse = await axios_1.default.post(BETFAIR_API_LOGIN_URL, loginPayload, {
                headers: { 'X-Application': appKey, 'Content-Type': 'application/x-www-form-urlencoded' },
            });
            if (!loginResponse.data?.token) {
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Betfair login failed: ${loginResponse.data?.error || 'No token received'}`);
            }
            sessionToken = loginResponse.data.token;
        }
        catch (error) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Betfair login request failed: ${error.message}`);
        }
        for (let i = 0; i < items.length; i++) {
            try {
                const isConfirmed = this.getNodeParameter('confirmPlacement', i);
                // SAFETY CHECK: This is the most important part of the node.
                if (!isConfirmed) {
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Bet placement not confirmed. You must tick the "Confirm Bet Placement" box to execute this node.', { itemIndex: i });
                }
                const marketId = this.getNodeParameter('marketId', i);
                const selectionId = this.getNodeParameter('selectionId', i);
                const side = this.getNodeParameter('side', i);
                const price = this.getNodeParameter('price', i);
                const size = this.getNodeParameter('size', i);
                const customerStrategyRef = this.getNodeParameter('customerStrategyRef', i);
                const instruction = {
                    selectionId: selectionId,
                    handicap: 0,
                    side: side,
                    orderType: 'LIMIT',
                    limitOrder: {
                        size: size,
                        price: price,
                        persistenceType: 'LAPSE', // LAPSE means the bet is cancelled if not matched when the market turns in-play
                    },
                };
                const requestBody = {
                    marketId: marketId,
                    instructions: [instruction],
                    customerStrategyRef: customerStrategyRef,
                };
                const response = await betfairApiRequest.call(this, 'placeOrders/', requestBody, appKey, sessionToken);
                returnData.push({ json: response.data, pairedItem: { item: i } });
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
                    continue;
                }
                throw error;
            }
        }
        return this.prepareOutputData(returnData);
    }
}
exports.BetfairAusPlaceBet = BetfairAusPlaceBet;
