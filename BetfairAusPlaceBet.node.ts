import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
} from 'n8n-workflow';
import { createHash } from 'crypto';
import { betfairApiRequest, betfairLogin } from './BetfairApiHelper';

// Betfair de-duplicates placeOrders requests that reuse a customerRef (max 32 chars, ~60s window).
const PLACE_ORDERS_TIMEOUT_MS = 45000;

export class BetfairAusPlaceBet implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Betfair AU - Place Bet',
        name: 'betfairAusPlaceBet',
        icon: 'file:betfair.svg',
        group: ['transform'],
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
                description: 'A reference for your strategy (max 15 characters).',
            },
            {
                displayName: 'Max Stake ($)',
                name: 'maxStake',
                type: 'number',
                default: 10,
                typeOptions: { minValue: 0, numberPrecision: 2 },
                description: 'Refuse to place any bet with a stake above this. 0 disables the limit.',
            },
            {
                displayName: 'Max Lay Liability ($)',
                name: 'maxLiability',
                type: 'number',
                default: 50,
                typeOptions: { minValue: 0, numberPrecision: 2 },
                description: 'Refuse to place any bet whose worst-case loss (stake for a Back bet, stake x (price - 1) for a Lay bet) is above this. 0 disables the limit.',
            },
            {
                displayName: 'Max Bets per Execution',
                name: 'maxBets',
                type: 'number',
                default: 5,
                typeOptions: { minValue: 0, numberPrecision: 0 },
                description: 'Refuse to run if more than this many items arrive at this node, so a large upstream list cannot place a large number of bets. 0 disables the limit.',
            },
            {
                displayName: 'Dry Run',
                name: 'dryRun',
                type: 'boolean',
                default: false,
                description: 'Whether to validate and return the order that would be sent without placing it',
            },
            {
                displayName: 'Confirm Bet Placement',
                name: 'confirmPlacement',
                type: 'boolean',
                required: true,
                default: false,
                noDataExpression: true,
                description: 'DANGER: You must tick this box to confirm you want to place a real bet. The node will fail if this is not checked.',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
        const node = this.getNode();

        // SAFETY CHECKS run for every item before anything is sent to Betfair, so a bad
        // item cannot leave earlier items already placed.
        if (!(this.getNodeParameter('confirmPlacement', 0) as boolean)) {
            throw new NodeOperationError(node, 'Bet placement not confirmed. You must tick the "Confirm Bet Placement" box to execute this node.');
        }
        const dryRun = this.getNodeParameter('dryRun', 0, false) as boolean;
        const maxBets = this.getNodeParameter('maxBets', 0, 5) as number;
        if (maxBets > 0 && items.length > maxBets) {
            throw new NodeOperationError(
                node,
                `Refusing to run: ${items.length} items received but "Max Bets per Execution" is ${maxBets}. Nothing was placed.`,
            );
        }

        const orders = items.map((_, i) => {
            const marketId = String(this.getNodeParameter('marketId', i)).trim();
            const selectionId = Number(this.getNodeParameter('selectionId', i));
            const side = this.getNodeParameter('side', i) as string;
            const price = Number(this.getNodeParameter('price', i));
            const size = Number(this.getNodeParameter('size', i));
            const customerStrategyRef = String(this.getNodeParameter('customerStrategyRef', i)).trim();
            const maxStake = this.getNodeParameter('maxStake', i, 10) as number;
            const maxLiability = this.getNodeParameter('maxLiability', i, 50) as number;
            const fail = (msg: string) => new NodeOperationError(node, `${msg} Nothing was placed.`, { itemIndex: i });

            if (!/^\d\.\d+$/.test(marketId)) throw fail(`Invalid Market ID "${marketId}" (expected e.g. 1.12345678).`);
            if (!Number.isInteger(selectionId) || selectionId <= 0) throw fail(`Invalid Selection ID "${selectionId}".`);
            if (side !== 'BACK' && side !== 'LAY') throw fail(`Invalid side "${side}".`);
            if (!Number.isFinite(price) || price < 1.01 || price > 1000) throw fail(`Invalid price ${price} (must be 1.01 to 1000).`);
            if (!Number.isFinite(size) || size <= 0) throw fail(`Invalid stake ${size}.`);
            if (customerStrategyRef.length > 15) throw fail('Customer Strategy Reference must be 15 characters or fewer.');
            const liability = side === 'LAY' ? size * (price - 1) : size;
            if (maxStake > 0 && size > maxStake) throw fail(`Stake $${size} exceeds "Max Stake" $${maxStake}.`);
            if (maxLiability > 0 && liability > maxLiability) {
                throw fail(`Worst-case loss $${liability.toFixed(2)} exceeds "Max Lay Liability" $${maxLiability}.`);
            }

            // Same execution + node + item always yields the same ref, so an n8n retry of this
            // node cannot double-place a bet Betfair already accepted.
            const customerRef = createHash('sha1')
                .update(`${this.getExecutionId()}:${node.id}:${i}`)
                .digest('hex')
                .slice(0, 32);

            return {
                marketId,
                instructions: [
                    {
                        selectionId,
                        handicap: 0,
                        side,
                        orderType: 'LIMIT',
                        limitOrder: {
                            size,
                            price,
                            persistenceType: 'LAPSE', // cancelled if not matched when the market turns in-play
                        },
                    },
                ],
                customerRef,
                customerStrategyRef,
            };
        });

        if (dryRun) {
            return [orders.map((order, i) => ({ json: { dryRun: true, wouldPlace: order }, pairedItem: { item: i } }))];
        }

        const credentials = await this.getCredentials('betfairAusApi');
        const appKey = credentials.appKey as string;
        const sessionToken = await betfairLogin(appKey, credentials.username as string, credentials.password as string, () => this.getNode());

        for (let i = 0; i < orders.length; i++) {
            try {
                const response = await betfairApiRequest('placeOrders/', orders[i], appKey, sessionToken, () => this.getNode(), PLACE_ORDERS_TIMEOUT_MS);
                const data = response.data;

                // Betfair returns HTTP 200 for rejected or unknown-outcome orders; only SUCCESS means placed.
                if (data?.status !== 'SUCCESS') {
                    const reportError = data?.instructionReports?.[0]?.errorCode;
                    const detail = [data?.errorCode, reportError].filter(Boolean).join(' / ') || 'no error code';
                    const unknown = data?.status === 'TIMEOUT'
                        ? ' Outcome is UNKNOWN - check your Betfair account before retrying.'
                        : '';
                    throw new NodeOperationError(
                        this.getNode(),
                        `Betfair did not place the bet (status ${data?.status}: ${detail}).${unknown}`,
                        { itemIndex: i },
                    );
                }

                returnData.push({ json: { ...data, placed: true }, pairedItem: { item: i } });
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ json: { placed: false, error: (error as Error).message }, pairedItem: { item: i } });
                    continue;
                }
                throw error;
            }
        }

        return [returnData];
    }
}
