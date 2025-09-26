import { INodeType, ICredentialType } from 'n8n-workflow';
import { BetfairAus } from './BetfairAus.node';
import { BetfairAusPlaceBet } from './BetfairAusPlaceBet.node';
import { BetfairAusCredentials } from './BetfairAusCredentials.credentials';
import { ToolBetfair } from './ToolBetfair.node';

// This is the "exports" object that n8n will look for.
// It tells n8n about all the different parts of your package.
export const nodes: INodeType[] = [
	new BetfairAus(),
	new BetfairAusPlaceBet(),
	new ToolBetfair(),
];

export const credentials: ICredentialType[] = [new BetfairAusCredentials()];