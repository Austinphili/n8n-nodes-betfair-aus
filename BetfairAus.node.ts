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

// Helper function to make authenticated API calls
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

export class BetfairAus implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Betfair Australia',
        name: 'betfairAus',
        icon: 'file:betfair.svg',
        group: ['transform'],
        version: 2.0, // Version updated to reflect added filters
        subtitle: '={{$parameter["operation"]}}',
        description: 'Interact with the Betfair Australia API',
        defaults: {
            name: 'Betfair AU',
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
            //================================================================================
			//                                 RESOURCE & OPERATION
			//================================================================================
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                default: 'listEventTypes',
                options: [
                    { name: 'List Event Types', value: 'listEventTypes', action: 'List all event types' },
                    { name: 'List Events', value: 'listEvents', action: 'List events for a sport' },
                    { name: 'List Venues', value: 'listVenues', action: 'List active horse-racing venues' },
                    { name: 'List Market Types', value: 'listMarketTypes', action: 'List market types for a sport' },
                    { name: 'List Competitions', value: 'listCompetition', action: 'List competitions for a sport' },
                    { name: 'List Market Book(s)', value: 'listMarketBook', action: 'Get live odds for markets' },
                    { name: 'List Market Catalogue', value: 'listMarketCatalogue', action: 'Get market details and selections' },
                    { name: 'List Current Orders', value: 'listCurrentOrders', action: 'List your current bets' },
                ],
            },

            //================================================================================
			//                                 COMMON FILTERS
			//================================================================================
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				description: 'Apply filters to the request',
				displayOptions: {
					show: {
						operation: [
							'listEvents',
							'listVenues',
							'listMarketTypes',
							'listCompetition',
							'listMarketCatalogue',
						],
					},
				},
				options: [
					{ displayName: 'Event Type ID(s)', name: 'filterEventTypeId', type: 'string', default: '7', description: 'e.g., 7 for Horse Racing. Comma-separated.' },
					{ displayName: 'Event ID(s)', name: 'filterEventIds', type: 'string', default: '', placeholder: 'e.g., 2012345,2012346', description: 'Comma-separated Event IDs.' },
					{ displayName: 'Competition ID(s)', name: 'filterCompetitionIds', type: 'string', default: '', placeholder: 'e.g., 1234,5678', description: 'Comma-separated Competition IDs.' },
					{ displayName: 'Market Country Code(s)', name: 'filterMarketCountries', type: 'string', default: 'AU', placeholder: 'e.g., AU,GB,US', description: 'Comma-separated 2-letter country codes.' },
					{ displayName: 'Market Type Code(s)', name: 'filterMarketTypeCodes', type: 'string', default: '', placeholder: 'e.g., MATCH_ODDS,WIN', description: 'Comma-separated Market Type Codes.' },
					{ displayName: 'Venue(s)', name: 'filterVenues', type: 'string', default: '', placeholder: 'e.g., Flemington,Randwick', description: 'Comma-separated venue names.'},
					{ displayName: 'Text Query', name: 'filterTextQuery', type: 'string', default: '', description: 'Free-text search string for event/competition names' },
					{ displayName: 'Market Start From', name: 'filterMarketStartFrom', type: 'dateTime', default: '' },
					{ displayName: 'Market Start To', name: 'filterMarketStartTo', type: 'dateTime', default: '' },
					{ displayName: 'BSP Offered Only', name: 'filterBspOnly', type: 'boolean', default: false, description: 'Return only markets where the Betfair Starting Price is available.' },
					{ displayName: 'In-Play Enabled Only', name: 'filterTurnInPlayEnabled', type: 'boolean', default: false, description: 'Return only markets that will turn in-play.' },
					{ displayName: 'In-Play Now Only', name: 'filterInPlayOnly', type: 'boolean', default: false, description: 'Return only markets that are currently in-play.' },
					{
						displayName: 'Market Betting Type',
						name: 'filterMarketBettingTypes',
						type: 'options',
						default: 'ODDS',
						options: [
							{ name: 'Odds', value: 'ODDS' },
							{ name: 'Line', value: 'LINE' },
							{ name: 'Asian Handicap Double Line', value: 'ASIAN_HANDICAP_DOUBLE_LINE' },
							{ name: 'Asian Handicap Single Line', value: 'ASIAN_HANDICAP_SINGLE_LINE' },
						]
					},
					{
						displayName: 'With Orders',
						name: 'filterWithOrders',
						type: 'options',
						default: 'EXECUTABLE',
						options: [
							{ name: 'Pending', value: 'PENDING' },
							{ name: 'Execution Complete', value: 'EXECUTION_COMPLETE' },
							{ name: 'Executable', value: 'EXECUTABLE' },
							{ name: 'Expired', value: 'EXPIRED' },
						]
					},
					{
						displayName: 'Race Type',
						name: 'filterRaceTypes',
						type: 'options',
						default: 'NO_VALUE',
						options: [
							{ name: 'No Filter', value: 'NO_VALUE' },
							{ name: 'Thoroughbred Flat', value: 'Flat' },
							{ name: 'Harness', value: 'Harness' },
							{ name: 'Hurdle', value: 'Hurdle' },
							{ name: 'Steeple', value: 'Steeple' },
						]
					},
				],
			},

            //================================================================================
			//                                 OPERATION-SPECIFIC PARAMETERS
			//================================================================================

            // --- Parameters for listMarketCatalogue ---
            {
                displayName: 'Market Catalogue Options', name: 'marketCatalogueOptions', type: 'collection', placeholder: 'Add Option', default: {},
                displayOptions: { show: { operation: ['listMarketCatalogue'] } },
                options: [
                    { displayName: 'Market Data to Return', name: 'marketProjection', type: 'multiOptions', default: ['EVENT', 'MARKET_START_TIME', 'RUNNER_DESCRIPTION'], options: [ { name: 'Competition', value: 'COMPETITION' }, { name: 'Event', value: 'EVENT' }, { name: 'Event Type', value: 'EVENT_TYPE' }, { name: 'Market Description', value: 'MARKET_DESCRIPTION' }, { name: 'Market Start Time', value: 'MARKET_START_TIME' }, { name: 'Runner Description', value: 'RUNNER_DESCRIPTION' }, { name: 'Runner Metadata', value: 'RUNNER_METADATA' } ] },
					{ displayName: 'Sort Order', name: 'sort', type: 'options', default: 'FIRST_TO_START', options: [ { name: 'First to Start', value: 'FIRST_TO_START' }, { name: 'Last to Start', value: 'LAST_TO_START' }, { name: 'Minimum Available', value: 'MINIMUM_AVAILABLE' }, { name: 'Maximum Available', value: 'MAXIMUM_AVAILABLE' }, { name: 'Minimum Traded', value: 'MINIMUM_TRADED' }, { name: 'Maximum Traded', value: 'MAXIMUM_TRADED' } ] },
					{ displayName: 'Max Results', name: 'maxResults', type: 'number', default: 100, typeOptions: { minValue: 1, maxValue: 1000 } },
                ],
            },

            // --- Parameters for listMarketBook ---
            {
				displayName: 'Market IDs', name: 'filterMarketIds', type: 'string', default: '', required: true, placeholder: 'e.g., 1.12345678,...', description: 'One or more comma-separated market IDs.',
                displayOptions: { show: { operation: ['listMarketBook'] } }
            },
            {
				displayName: 'Market Book Options', name: 'marketBookOptions', type: 'collection', placeholder: 'Add Option', default: {},
                displayOptions: { show: { operation: ['listMarketBook'] } },
                options: [
                    { displayName: 'Price Data', name: 'priceProjectionPriceData', type: 'multiOptions', default: ['EX_BEST_OFFERS'], options: [ { name: 'Best Offers (EX_BEST_OFFERS)', value: 'EX_BEST_OFFERS' }, { name: 'All Offers (EX_ALL_OFFERS)', value: 'EX_ALL_OFFERS' }, { name: 'Traded Volume (EX_TRADED)', value: 'EX_TRADED' }] },
                    { displayName: 'Best Offers Depth', name: 'priceProjectionExBestOffersDepth', type: 'number', typeOptions: { minValue: 1 }, default: 3, description: 'Depth of best prices if EX_BEST_OFFERS is chosen.' },
					{ displayName: 'Virtualise Prices?', name: 'priceProjectionVirtualise', type: 'boolean', default: false, description: 'Include virtual prices.' },
					{ displayName: 'Order Projection', name: 'orderProjection', type: 'options', default: 'ALL', options: [ { name: 'All My Orders', value: 'ALL' }, { name: 'My Executable Orders', value: 'EXECUTABLE' }, { name: 'My Execution Complete Orders', value: 'EXECUTION_COMPLETE' }, { name: 'Do Not Include Orders', value: 'OMIT' } ] },
					{ displayName: 'Match Projection', name: 'matchProjection', type: 'options', default: 'NO_ROLLUP', options: [ { name: 'No Rollup', value: 'NO_ROLLUP' }, { name: 'Rolled Up by Price', value: 'ROLLED_UP_BY_PRICE' }, { name: 'Rolled Up by Average Price', value: 'ROLLED_UP_BY_AVG_PRICE' }, { name: 'Do Not Include Matches', value: 'OMIT' } ] },
                ]
            },

            // --- Parameters for listCurrentOrders ---
            {
                displayName: 'Current Orders Options', name: 'currentOrdersOptions', type: 'collection', placeholder: 'Add Option', default: {},
                displayOptions: { show: { operation: ['listCurrentOrders'] } },
                options: [
                    { displayName: 'Filter by Bet IDs', name: 'currentOrdersBetIds', type: 'string', default: '', placeholder: 'e.g., 1234567890,...', description: 'Comma-separated Bet IDs.' },
                    { displayName: 'Filter by Market IDs', name: 'currentOrdersMarketIds', type: 'string', default: '', placeholder: 'e.g., 1.12345,...', description: 'Comma-separated Market IDs.' },
					{ displayName: 'Order Projection', name: 'currentOrdersOrderProjection', type: 'options', default: 'EXECUTABLE', options: [ { name: 'All Orders', value: 'ALL' }, { name: 'Executable Orders', value: 'EXECUTABLE' }, { name: 'Execution Complete Orders', value: 'EXECUTION_COMPLETE' } ] },
					{ displayName: 'Placed Date From', name: 'currentOrdersPlacedDateFrom', type: 'dateTime', default: '' },
					{ displayName: 'Placed Date To', name: 'currentOrdersPlacedDateTo', type: 'dateTime', default: '' },
					{ displayName: 'Order By', name: 'currentOrdersOrderBy', type: 'options', default: 'BY_PLACE_TIME', options: [ { name: 'By Bet ID', value: 'BY_BET' }, { name: 'By Market', value: 'BY_MARKET' }, { name: 'By Match Time', value: 'BY_MATCH_TIME' }, { name: 'By Place Time', value: 'BY_PLACE_TIME' }, { name: 'By Settled Time', value: 'BY_SETTLED_TIME' }, { name: 'By Void Time', value: 'BY_VOID_TIME' } ] },
					{ displayName: 'Sort Direction', name: 'currentOrdersSortDir', type: 'options', default: 'LATEST_TO_EARLIEST', options: [ { name: 'Latest to Earliest', value: 'LATEST_TO_EARLIEST' }, { name: 'Earliest to Latest', value: 'EARLIEST_TO_LATEST' } ] },
					{ displayName: 'From Record (Pagination)', name: 'currentOrdersFromRecord', type: 'number', default: 0, typeOptions: { minValue: 0 } },
					{ displayName: 'Record Count (Pagination)', name: 'currentOrdersRecordCount', type: 'number', default: 100, typeOptions: { minValue: 1, maxValue: 1000 } },
                ]
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const inputItems = this.getInputData();
        let returnData: INodeExecutionData[] = [];

        const credentials = await this.getCredentials('betfairAusApi');
        if (!credentials) {
            throw new NodeOperationError(this.getNode(), 'No credentials found. Please add Betfair Australia API credentials.');
        }
        const appKey = credentials.appKey as string;
        const username = credentials.username as string;
        const password = credentials.password as string;

        let sessionToken: string;
        try {
            const loginPayload = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
            const loginResponse = await axios.post(BETFAIR_API_LOGIN_URL, loginPayload, {
                headers: { 'X-Application': appKey, 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
                timeout: 10000,
            });
            if (loginResponse.data?.token) {
                sessionToken = loginResponse.data.token;
            } else {
                throw new NodeOperationError(this.getNode(), `Betfair login failed: ${loginResponse.data?.error || loginResponse.data?.loginStatus || 'No token received'}`);
            }
        } catch (error) {
            if (error instanceof NodeOperationError) throw error;
            if (axios.isAxiosError(error) && error.response) {
                throw new NodeOperationError(this.getNode(), `Betfair login API error: ${JSON.stringify(error.response.data)}`);
            }
            throw new NodeOperationError(this.getNode(), `Betfair login request error: ${(error as Error).message}`);
        }

        const executionItems = inputItems.length > 0 ? inputItems : [{ json: {} }];

        for (let itemIndex = 0; itemIndex < executionItems.length; itemIndex++) {
            try {
                let response: AxiosResponse;
                let requestBody: any = {};
                const operation = this.getNodeParameter('operation', itemIndex) as string;
                const endpoint = `${operation}/`;

                const getArrayParam = (name: string, collection: any) => {
                    const raw = collection[name] || '';
                    return raw.trim() ? raw.split(',').map((item: string) => item.trim()).filter(Boolean) : undefined;
                };

                // Build the request body based on the operation
                if (['listEventTypes', 'listEvents', 'listVenues', 'listMarketTypes', 'listCompetition', 'listMarketCatalogue'].includes(operation)) {
					const filterOptions = this.getNodeParameter('filters', itemIndex, {}) as any;
                    const filter: any = {};

					// Populate filter from the collection
					filter.eventTypeIds = getArrayParam('filterEventTypeId', filterOptions);
					filter.eventIds = getArrayParam('filterEventIds', filterOptions);
					filter.competitionIds = getArrayParam('filterCompetitionIds', filterOptions);
					filter.marketCountries = getArrayParam('filterMarketCountries', filterOptions);
					filter.marketTypeCodes = getArrayParam('filterMarketTypeCodes', filterOptions);
					filter.venues = getArrayParam('filterVenues', filterOptions);

					if (filterOptions.filterTextQuery) filter.textQuery = filterOptions.filterTextQuery;
					if (filterOptions.filterBspOnly) filter.bspOnly = true;
					if (filterOptions.filterTurnInPlayEnabled) filter.turnInPlayEnabled = true;
					if (filterOptions.filterInPlayOnly) filter.inPlayOnly = true;

					if (filterOptions.filterMarketBettingTypes) filter.marketBettingTypes = [filterOptions.filterMarketBettingTypes];
					if (filterOptions.filterWithOrders) filter.withOrders = [filterOptions.filterWithOrders];
					if (filterOptions.filterRaceTypes && filterOptions.filterRaceTypes !== 'NO_VALUE') filter.raceTypes = [filterOptions.filterRaceTypes];

					if (filterOptions.filterMarketStartFrom || filterOptions.filterMarketStartTo) {
						filter.marketStartTime = {};
						if (filterOptions.filterMarketStartFrom) filter.marketStartTime.from = new Date(filterOptions.filterMarketStartFrom).toISOString();
						if (filterOptions.filterMarketStartTo) filter.marketStartTime.to = new Date(filterOptions.filterMarketStartTo).toISOString();
					}

					requestBody.filter = filter;

					if (operation === 'listMarketCatalogue') {
						const catOptions = this.getNodeParameter('marketCatalogueOptions', itemIndex, {}) as any;
						requestBody.marketProjection = catOptions.marketProjection || ['EVENT', 'MARKET_START_TIME', 'RUNNER_DESCRIPTION'];
						requestBody.sort = catOptions.sort || 'FIRST_TO_START';
						requestBody.maxResults = catOptions.maxResults || 100;
					}

					// listEventTypes should have an empty filter
					if (operation === 'listEventTypes') {
						requestBody.filter = {};
					}

                } else if (operation === 'listMarketBook') {
                    const marketIdsRaw = this.getNodeParameter('filterMarketIds', itemIndex, '') as string;
					const marketIds = marketIdsRaw.trim() ? marketIdsRaw.split(',').map(id => id.trim()).filter(Boolean) : undefined;

                    if (!marketIds || marketIds.length === 0) {
                        throw new NodeOperationError(this.getNode(), 'Market IDs are required for List Market Book(s).', { itemIndex });
                    }
                    const options = this.getNodeParameter('marketBookOptions', itemIndex, {}) as any;
                    requestBody = { marketIds };

                    const priceProjection: any = {};
                    if (options.priceProjectionPriceData) priceProjection.priceData = options.priceProjectionPriceData;
                    if (options.priceProjectionVirtualise) priceProjection.virtualise = options.priceProjectionVirtualise;
                    if (options.priceProjectionExBestOffersDepth) priceProjection.exBestOffersOverrides = { bestPricesDepth: options.priceProjectionExBestOffersDepth };
                    if (Object.keys(priceProjection).length > 0) requestBody.priceProjection = priceProjection;

                    if (options.orderProjection && options.orderProjection !== 'OMIT') requestBody.orderProjection = options.orderProjection;
                    if (options.matchProjection && options.matchProjection !== 'OMIT') requestBody.matchProjection = options.matchProjection;

                } else if (operation === 'listCurrentOrders') {
                    const options = this.getNodeParameter('currentOrdersOptions', itemIndex, {}) as any;
					const getArrayParamOrders = (name: string) => {
						const raw = options[name] || '';
						return raw.trim() ? raw.split(',').map((item: string) => item.trim()).filter(Boolean) : undefined;
					};

                    requestBody.marketIds = getArrayParamOrders('currentOrdersMarketIds');
                    requestBody.betIds = getArrayParamOrders('currentOrdersBetIds');
                    requestBody.orderProjection = options.currentOrdersOrderProjection;
                    requestBody.orderBy = options.currentOrdersOrderBy;
                    requestBody.sortDir = options.currentOrdersSortDir;
                    requestBody.fromRecord = options.currentOrdersFromRecord;
                    requestBody.recordCount = options.currentOrdersRecordCount;

                    const placedDateFrom = options.currentOrdersPlacedDateFrom;
                    const placedDateTo = options.currentOrdersPlacedDateTo;
                    if (placedDateFrom || placedDateTo) {
                        requestBody.placedDateRange = {};
                        if(placedDateFrom) requestBody.placedDateRange.from = new Date(placedDateFrom).toISOString();
                        if(placedDateTo) requestBody.placedDateRange.to = new Date(placedDateTo).toISOString();
                    }
                } else {
                    throw new NodeOperationError(this.getNode(), `Unknown or unhandled operation '${operation}'`, { itemIndex });
                }

                // Make the API call
                response = await betfairApiRequest.call(this, endpoint, requestBody, appKey, sessionToken);

                // Process the response
                const apiResponseData = response.data;
                const results = Array.isArray(apiResponseData) ? apiResponseData : [apiResponseData];
                if (results.length > 0 && results[0] !== null) {
					returnData.push(...this.helpers.returnJsonArray(results));
				}


            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: itemIndex } });
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}