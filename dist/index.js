"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.credentials = exports.nodes = void 0;
const BetfairAus_node_1 = require("./BetfairAus.node");
const BetfairAusPlaceBet_node_1 = require("./BetfairAusPlaceBet.node");
const BetfairAusCredentials_credentials_1 = require("./BetfairAusCredentials.credentials");
const ToolBetfair_node_1 = require("./ToolBetfair.node");
// This is the "exports" object that n8n will look for.
// It tells n8n about all the different parts of your package.
exports.nodes = [
    new BetfairAus_node_1.BetfairAus(),
    new BetfairAusPlaceBet_node_1.BetfairAusPlaceBet(),
    new ToolBetfair_node_1.ToolBetfair(),
];
exports.credentials = [new BetfairAusCredentials_credentials_1.BetfairAusCredentials()];
