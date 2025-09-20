"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTemplate = createTemplate;
const promises_1 = require("fs/promises");
const replace_in_file_1 = require("replace-in-file");
async function createTemplate(sourceFilePath, destinationFilePath, replaceValues) {
    await (0, promises_1.copyFile)(sourceFilePath, destinationFilePath);
    const options = {
        files: [destinationFilePath],
        from: [],
        to: [],
    };
    options.from = Object.keys(replaceValues).map((key) => {
        return new RegExp(key, 'g');
    });
    options.to = Object.values(replaceValues);
    await (0, replace_in_file_1.replaceInFile)(options);
}
//# sourceMappingURL=Create.js.map