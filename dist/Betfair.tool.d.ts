import { ISupplyDataFunctions } from 'n8n-workflow';
import { Tool } from 'langchain/tools';
export declare class BetfairTool extends Tool {
    name: string;
    description: string;
    private executionContext;
    setExecutionContext(context: ISupplyDataFunctions): void;
    _call(input: string): Promise<string>;
}
