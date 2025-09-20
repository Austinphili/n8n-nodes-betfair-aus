"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.New = void 0;
const core_1 = require("@oclif/core");
const changeCase = __importStar(require("change-case"));
const promises_1 = require("fs/promises");
const inquirer = __importStar(require("inquirer"));
const path_1 = require("path");
const src_1 = require("../src");
class New extends core_1.Command {
    async run() {
        try {
            this.log('\nCreate new credentials/node');
            this.log('=========================');
            const typeQuestion = {
                name: 'type',
                type: 'list',
                default: 'Node',
                message: 'What do you want to create?',
                choices: ['Credentials', 'Node'],
            };
            const typeAnswers = await inquirer.prompt(typeQuestion);
            let sourceFolder = '';
            const sourceFileName = 'simple.ts';
            let defaultName = '';
            let getDescription = false;
            if (typeAnswers.type === 'Node') {
                getDescription = true;
                const nodeTypeQuestion = {
                    name: 'nodeType',
                    type: 'list',
                    default: 'Execute',
                    message: 'What kind of node do you want to create?',
                    choices: ['Execute', 'Trigger', 'Webhook'],
                };
                const nodeTypeAnswers = await inquirer.prompt(nodeTypeQuestion);
                sourceFolder = 'execute';
                defaultName = 'My Node';
                if (nodeTypeAnswers.nodeType === 'Trigger') {
                    sourceFolder = 'trigger';
                    defaultName = 'My Trigger';
                }
                else if (nodeTypeAnswers.nodeType === 'Webhook') {
                    sourceFolder = 'webhook';
                    defaultName = 'My Webhook';
                }
            }
            else {
                sourceFolder = 'credentials';
                defaultName = 'My Service API';
            }
            const additionalQuestions = [
                {
                    name: 'name',
                    type: 'input',
                    default: defaultName,
                    message: 'How should the node be called?',
                },
            ];
            if (getDescription) {
                additionalQuestions.push({
                    name: 'description',
                    type: 'input',
                    default: 'Node converts input data to chocolate',
                    message: 'What should the node description be?',
                });
            }
            const additionalAnswers = await inquirer.prompt(additionalQuestions);
            const nodeName = additionalAnswers.name;
            const destinationFilePath = (0, path_1.join)(process.cwd(), `${changeCase.pascalCase(nodeName)}.${typeAnswers.type.toLowerCase()}.ts`);
            const sourceFilePath = (0, path_1.join)(__dirname, '../../templates', sourceFolder, sourceFileName);
            try {
                await (0, promises_1.access)(destinationFilePath);
                const overwriteQuestion = [
                    {
                        name: 'overwrite',
                        type: 'confirm',
                        default: false,
                        message: `The file "${destinationFilePath}" already exists and would be overwritten. Do you want to proceed and overwrite the file?`,
                    },
                ];
                const overwriteAnswers = await inquirer.prompt(overwriteQuestion);
                if (overwriteAnswers.overwrite === false) {
                    this.log('\nNode creation got canceled!');
                    return;
                }
            }
            catch (error) {
            }
            const replaceValues = {
                ClassNameReplace: changeCase.pascalCase(nodeName),
                DisplayNameReplace: changeCase.capitalCase(nodeName),
                N8nNameReplace: changeCase.camelCase(nodeName),
                NodeDescriptionReplace: additionalAnswers.description,
            };
            await (0, src_1.createTemplate)(sourceFilePath, destinationFilePath, replaceValues);
            this.log('\nExecution was successful:');
            this.log('====================================');
            this.log(`Node got created: ${destinationFilePath}`);
        }
        catch (error) {
            this.log(`\nGOT ERROR: "${error.message}"`);
            this.log('====================================');
            this.log(error.stack);
        }
    }
}
exports.New = New;
New.description = 'Create new credentials/node';
New.examples = ['$ n8n-node-dev new'];
//# sourceMappingURL=new.js.map