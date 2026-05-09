import {
	// These are the specific types needed for a tool-providing node
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
		subtitle: '={{$o.name}}',
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
}

