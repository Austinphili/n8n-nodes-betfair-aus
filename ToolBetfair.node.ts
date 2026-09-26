import {
	IExecuteFunctions,
	INodeExecutionData,
	ISupplyDataFunctions,
	NodeConnectionTypes,
	SupplyData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { BetfairTool } from './Betfair.tool'; // We still import your tool's logic

export class ToolBetfair implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Betfair LangChain Tool',
		name: 'betfairLangChainTool',
		icon: 'file:betfair.svg',
		group: ['transform'], // Sticking with a known valid group
		version: 1,
		description: 'Provides a LangChain tool for interacting with the Betfair Australia API',

		defaults: {
			name: 'Betfair Tool',
		},
		inputs: [],
		// This line is critical and matches the official examples
		outputs: [NodeConnectionTypes.AiTool],
		// This provides a nice label on the output connector
		outputNames: ['Tool'],
		// The user will select their credentials on this node in the UI
		credentials: [
			{
				name: 'betfairAusApi',
				required: true,
			},
		],
		// The main properties are defined on the node itself
		properties: [
			// We can add more user-configurable options here later if needed
		],
	};

	// We use `supplyData` as confirmed by the official examples
	async supplyData(this: ISupplyDataFunctions): Promise<SupplyData> {
		const tool = new BetfairTool();

		// This passes the necessary context (like the selected credentials) to your tool's logic
		tool.setExecutionContext(this);

		// This returns the tool in the exact format the AI Agent node expects
		return {
			response: tool,
		};
	}

	// n8n 2.x agents run tool nodes through the engine, which calls execute()
	// with the model's tool arguments as the item JSON.
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const tool = new BetfairTool();
		tool.setExecutionContext(this);

		const items = this.getInputData();
		const results: INodeExecutionData[] = [];
		for (let i = 0; i < items.length; i++) {
			const args = items[i].json as Record<string, unknown>;
			const raw = [args.input, args.command, args.query].find((v) => typeof v === 'string' && v) as
				| string
				| undefined;
			const argument = typeof args.argument === 'string' ? args.argument : undefined;
			const text = raw && argument !== undefined && !raw.includes(':') ? `${raw}:${argument}` : raw;
			const response = text
				? await tool.invoke(text)
				: "Error: expected input like 'list_events:<event_type_id>'.";
			results.push({ json: { response }, pairedItem: { item: i } });
		}
		return [results];
	}
}

