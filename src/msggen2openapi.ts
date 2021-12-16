
import OpenAPI, {Server, Request, Parameter, Response, SchemaProperty, SchemaObject} from "./openapi";
import * as fs from "fs";
import * as xml2js from 'xml2js';
import * as path from "path";

function msggen2Openapi(msggenPath: string, openapiPath: string, host?): boolean {
    // let msggen = null;

    let openAPI = new OpenAPI();

    if (host instanceof Array) {
        for (let item of host) {
            openAPI.addServer(new Server("https://"+item+".test.17zuoye.net", "test server"));
            openAPI.addServer(new Server("https://"+item+".staging.17zuoye.net", "staging server"));
            openAPI.addServer(new Server("https://"+item+".17zuoye.com", "production server"));
        }
    }
    else {
        openAPI.addServer(new Server("https://"+host+".test.17zuoye.net", "test server"));
        openAPI.addServer(new Server("https://"+host+".staging.17zuoye.net", "staging server"));
        openAPI.addServer(new Server("https://"+host+".17zuoye.com", "production server"));
    }

    if (fs.existsSync(msggenPath)) {
        if (fs.statSync(msggenPath).isDirectory) {
            for (let filePath of fs.readdirSync(msggenPath)) {
                if (!readMsgFromFile(msggenPath+"/"+filePath, openAPI)) {
                    return false;
                }
            }
        }
        else {
            return readMsgFromFile(msggenPath, openAPI);
        }
    }

    if (openapiPath == '-') {
        console.log(openAPI.dump());
    }
    else {
        fs.writeFileSync(openapiPath, openAPI.dump());
    }

    return true;
}

function readMsgFromFile(msggenPath: string, openAPI: OpenAPI): boolean {
    let msggen = null;

    if (msggenPath.toLowerCase().endsWith(".json")) {
        msggen = JSON.parse(fs.readFileSync(msggenPath).toString());
    }
    else if (msggenPath.toLowerCase().endsWith(".xml")) {
        (new xml2js.Parser({explicitArray : false})).parseString(fs.readFileSync(msggenPath).toString(), (err, result) => {
            msggen = result;
        });
    }
    else {
        console.error("file " + msggen + " is not supported");
        return false;
    }

    return convert2OpenAPI(msggen, openAPI, path.basename(msggenPath, path.extname(msggenPath)));
}

function createSchemaObject(item: any) : SchemaObject {
    let schemaObject = new SchemaObject();

    if (item.field) {
        if (item.field instanceof Array) {

            for (let field of item.field) {

                let schema = new SchemaProperty(field.$.type);
                schema.description = field.$.comment;

                schemaObject.addProperty(field.$.name, schema);

                //let schema = new Schema(item.$.name+"Response");

                // let response = new Response();
                // response.content.addSchema(schema);
                // request.addResponse(response);
            }
        }
        else {
            let schema = new SchemaProperty(item.field.$.type);
            schema.description = item.field.$.comment;

            schemaObject.addProperty(item.field.$.name, schema);

            //let schema = new Schema(item.$.name+"Response");
            //let schema = new SchemaProperty(item.$.name+"Response");

            // let response = new Response();
            // response.content.addSchema(schema);
            // request.addResponse(response);
        }
    }

    return schemaObject;
}

function addComponent(openAPI: OpenAPI, item: any, componentName: string) {
    openAPI.components.addSchema(componentName, createSchemaObject(item));
}

function createParameter(field: any) : Parameter {
    let parameter = new Parameter();
    parameter.name = field.$.name;
    parameter.description = field.$.comment;
    parameter.schemaType = field.$.type;
    if (field.$.default) {
        parameter.setDefault(field.$.default);
    }

    return parameter;
}

function createRequest(openAPI: OpenAPI, item: any, defaultMethod: string): Request {
    let request = new Request(item.$.name, item.$.method?item.$.method:defaultMethod);
    request.summary = item.$.comment;

    if (item.field) {
        if (item.field instanceof Array) {
            for (let field of item.field) {
                request.addParameter(createParameter(field));
            }
        }
        else {
            request.addParameter(createParameter(item.field));
        }
    }

    return request;
}

function createResponse(item: any) : Response {
    let response = new Response();
    response.content.addSchema(createSchemaObject(item));
    if (item.$.comment) {
        response.description = item.$.comment;
    }

    return response;
}

function findResponse(msggen, requestName: string) {
    if (msggen.config.response && msggen.config.response.extra && msggen.config.response.extra.item) {
        if (msggen.config.response.extra.item instanceof Array) {
            for (let item of msggen.config.response.extra.item) {
                if (item.$.name == requestName) {
                    return createResponse(item);

                    break;
                }
            }
        }
        else if (msggen.config.response.extra.item.$.name == requestName) {
            return createResponse(msggen.config.response.extra.item);
        }
    }

    let response = new Response();
    response.content.addSchema(new SchemaObject());
    return response;
}

function createRequestWithItem(openAPI: OpenAPI, item: any, msggen: any, defaultMethod: string, tag?: string) {
    let request = createRequest(openAPI, item, defaultMethod);
    if (tag) {
        request.addTag(tag);
    }

    request.addResponse(findResponse(msggen, request.name));

    openAPI.addApi(item.$.url, request);
}

function addLoginAPI(openAPI: OpenAPI) {
    let request = new Request("DevLogin", "GET");
    request.description = '登陆';
    request.addTag('dev');
    request.addParameter(new Parameter('user_code', 'string'));
    request.addParameter(new Parameter('passwd', 'string'));
    request['security'] = [];

    let schemaResponse = new SchemaObject();
    let dataSchema = new SchemaObject();
    dataSchema.addProperty('session_key', new SchemaProperty("string"));
    dataSchema['additionalProperties'] = true;
    schemaResponse.addProperty("success", new SchemaProperty("boolean"));
    schemaResponse.addProperty("data", dataSchema);

    let response = new Response();
    response.content.addSchema(schemaResponse)
    request.addResponse(response)

    openAPI.addApi('/dev/login', request);
}

function convert2OpenAPI(msggen: any, openAPI: OpenAPI, tag?: string): boolean {
    // let defaultProtocol = 'http';
    let defaultMethod = 'GET';
    // let defaultContentType = null;

    if (msggen.config && msggen.config.type && msggen.config.type.extra && msggen.config.type.extra.item) {
        if (msggen.config.type.extra.item instanceof Array) {
            for (let item of msggen.config.type.extra.item) {
                addComponent(openAPI, item, item.$.name)
            }
        }
        else {
            addComponent(openAPI, msggen.config.type.extra.item, msggen.config.type.extra.item.$.name)
        }
    }

    if (msggen.config && msggen.config.message && msggen.config.message.default && msggen.config.message.default.$) {
        if (msggen.config.message.default.$.method) {
            defaultMethod = msggen.config.message.default.$.method;
        }

        if (msggen.config.message.default.$.protocol) {
            // defaultProtocol = msggen.config.message.default.$.protocol;
        }

        if (msggen.config.message.default.$.contentType) {
            // defaultContentType = msggen.config.message.default.$.contentType;
        }
    }

    addLoginAPI(openAPI);

    if (msggen.config && msggen.config.message && msggen.config.message.extra && msggen.config.message.extra.item) {
        if (msggen.config.message.extra.item instanceof Array) {
            for (let item of msggen.config.message.extra.item) {
                createRequestWithItem(openAPI, item, msggen, defaultMethod, tag);
            }
        }
        else {
            createRequestWithItem(openAPI, msggen.config.message.extra.item, msggen, defaultMethod, tag);
        }
    }

    return true;
}

var argv = require('yargs')
            .option('_', {
                nargs: 2
            })
            .options({
                'i': {
                    alias : 'input',
                    demand: true,
                    describe: 'msggen messages directory path',
                    type: 'string'
                },
                'o': {
                    alias : 'output',
                    demand: true,
                    describe: 'output yaml file path',
                    type: 'string'
                },
                'n': {
                    alias : 'name',
                    demand: true,
                    describe: 'application name',
                    type: 'string',
                    array: true
                }
            })
            .argv;

process.exit(msggen2Openapi(argv.input, argv.output, argv.name)?0:1);

export default msggen2Openapi;
