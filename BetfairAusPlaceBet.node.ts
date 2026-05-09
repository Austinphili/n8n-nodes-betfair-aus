import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeProperties,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
} from 'n8n-workflow';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

// Betfair API Endpoints
const BETFAIR_API_LOGIN_URL = 'https://identitysso.betfair.com.au/api/login';
const BETFAIR_API_BASE_URL_AU = 'https://api.betfair.com.au/exchange/betting/rest/v1.0/';

// Re-usable API request helper
async function betfairApiRequest(
    this: IExecuteFunctions,
    endpoint: string,
    body: object,
    appKey: string,
    sessionToken: string,
): Promise<AxiosResponse> {
    const options: AxiosRequestConfig = {
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
        return await axios(options);
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            console.error('Betfair API Error Response Data:', JSON.stringify(error.response.data, null, 2));
            throw new NodeOperationError(this.getNode(), `Betfair API Error: ${JSON.stringify(error.response.data)} (Status: ${error.response.status})`);
        }
        throw new NodeOperationError(this.getNode(), `Betfair API Request Failed: ${(error as Error).message}`);
    }
}

export class BetfairAusPlaceBet implements INodeType {
    description: INodeTypeDescription = {
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

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        const credentials = await this.getCredentials('betfairAusApi');
        const appKey = credentials.appKey as string;
        const username = credentials.username as string;
        const password = credentials.password as string;

        // Login to get a session token for this execution
        let sessionToken: string;
        try {
            const loginPayload = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
            const loginResponse = await axios.post(BETFAIR_API_LOGIN_URL, loginPayload, {
                headers: { 'X-Application': appKey, 'Content-Type': 'application/x-www-form-urlencoded' },
            });
            if (!loginResponse.data?.token) {
                throw new NodeOperationError(this.getNode(), `Betfair login failed: ${loginResponse.data?.error || 'No token received'}`);
            }
            sessionToken = loginResponse.data.token;
        } catch (error) {
            throw new NodeOperationError(this.getNode(), `Betfair login request failed: ${(error as Error).message}`);
        }

        for (let i = 0; i < items.length; i++) {
            try {
                const isConfirmed = this.getNodeParameter('confirmPlacement', i) as boolean;

                // SAFETY CHECK: This is the most important part of the node.
                if (!isConfirmed) {
                    throw new NodeOperationError(this.getNode(), 'Bet placement not confirmed. You must tick the "Confirm Bet Placement" box to execute this node.', { itemIndex: i });
                }

                const marketId = this.getNodeParameter('marketId', i) as string;
                const selectionId = this.getNodeParameter('selectionId', i) as number;
                const side = this.getNodeParameter('side', i) as 'BACK' | 'LAY';
                const price = this.getNodeParameter('price', i) as number;
                const size = this.getNodeParameter('size', i) as number;
                const customerStrategyRef = this.getNodeParameter('customerStrategyRef', i) as string;

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

            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
                    continue;
                }
                throw error;
            }
        }

        return this.prepareOutputData(returnData);
    }
}