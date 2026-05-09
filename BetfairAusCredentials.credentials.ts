import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class BetfairAusCredentials implements ICredentialType {
    name = 'betfairAusApi'; // Internal n8n identifier for this credential type
    displayName = 'Betfair Australia API'; // Display name in n8n UI
    documentationUrl = 'https://betfair-developer-docs.atlassian.net/wiki/spaces/1smk3cen4v3lu3yomq5qye0ni/pages/2687158/Betting+API';
    properties: INodeProperties[] = [
        {
            displayName: 'Application Key',
            name: 'appKey',
            type: 'string',
            default: '',
            placeholder: 'Your Betfair Application Key',
            description: 'Your unique application key from the Betfair developer portal.',
        },
        {
            displayName: 'Username',
            name: 'username',
            type: 'string',
            default: '',
            placeholder: 'Your Betfair account username',
        },
        {
            displayName: 'Password',
            name: 'password',
            type: 'string', // Changed from 'password'
            default: '',
            typeOptions: { // Added this
                password: true,
            },
        },
    ];
}
