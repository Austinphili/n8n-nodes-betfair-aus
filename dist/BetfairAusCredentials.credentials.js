"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BetfairAusCredentials = void 0;
class BetfairAusCredentials {
    constructor() {
        this.name = 'betfairAusApi'; // Internal n8n identifier for this credential type
        this.displayName = 'Betfair Australia API'; // Display name in n8n UI
        this.documentationUrl = 'https://betfair-developer-docs.atlassian.net/wiki/spaces/1smk3cen4v3lu3yomq5qye0ni/pages/2687158/Betting+API';
        this.properties = [
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
                typeOptions: {
                    password: true,
                },
            },
        ];
    }
}
exports.BetfairAusCredentials = BetfairAusCredentials;
