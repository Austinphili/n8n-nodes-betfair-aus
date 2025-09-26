import { ISupplyDataFunctions, SupplyData, INodeType, INodeTypeDescription } from 'n8n-workflow';
export declare class ToolBetfair implements INodeType {
    description: INodeTypeDescription;
    supplyData(this: ISupplyDataFunctions): Promise<SupplyData>;
}
