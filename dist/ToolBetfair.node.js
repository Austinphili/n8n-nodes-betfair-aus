"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolBetfair = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const Betfair_tool_1 = require("./Betfair.tool"); // We still import your tool's logic
class ToolBetfair {
    constructor() {
        this.description = {
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
            outputs: [n8n_workflow_1.NodeConnectionTypes.AiTool],
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
    }
    // We use `supplyData` as confirmed by the official examples
    async supplyData() {
        const tool = new Betfair_tool_1.BetfairTool();
        // This passes the necessary context (like the selected credentials) to your tool's logic
        tool.setExecutionContext(this);
        // This returns the tool in the exact format the AI Agent node expects
        return {
            response: tool,
        };
    }
}
exports.ToolBetfair = ToolBetfair;
