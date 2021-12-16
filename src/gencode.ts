#!env node

import OpenAPI from "./openapi";
import * as fs from "fs";
import * as path from "path";
import * as jsYaml from "js-yaml";
import readGapi from './gapi2openapi';

async function gencodeForLang(lang: string, openApi: OpenAPI, outputPath: string): Promise<boolean> {
    let generator = require(path.resolve(__dirname, `./langs/${lang}/index`));
    generator.default && (generator = generator.default);

    // const generator = await import (`./langs/${lang}/index`);
    //const generator = require('./langs/gaiajs/index');

    return await generator(openApi, outputPath);
}

function getOpenApi(openapiPath: string): OpenAPI {
    const openApi: OpenAPI = new OpenAPI();
    const doc = jsYaml.safeLoad(fs.readFileSync(openapiPath, 'utf8'));

    openApi.load(doc);

    return openApi;
}

async function gencode(langs: string[], openApi: OpenAPI, outputPath: string): Promise<number> {
    await Promise.all(langs.map(lang => {
        return gencodeForLang(lang, openApi, outputPath).catch(err => {
            console.error(`gencode for lang ${lang} failed`, err);
        });
    }));

    return 0;
}

var argv = require('yargs')
            .option('_', {
                nargs: 2
            })
            .options({
                'l': {
                    alias : 'lang',
                    demand: true,
                    describe: 'language',
                    type: 'array'
                },
                'i': {
                    alias : 'input',
                    demand: true,
                    describe: 'input openapi or gaiajs api yaml file path',
                    type: 'string'
                },
                'o': {
                    alias : 'output',
                    demand: true,
                    describe: 'output source code path',
                    type: 'string'
                },
                't': {
                    alias : 'type',
                    demand: false,
                    describe: 'input type',
                    type: 'string'
                },
            })
            .argv;


const openApi: OpenAPI = (argv.type === 'gapi'?readGapi:getOpenApi)(argv.input);
gencode(argv.lang, openApi, argv.output).then(code => {
    console.info('done.');
    process.exit(code);
});

