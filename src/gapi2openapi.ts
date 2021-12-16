import * as path from 'path';
import OpenAPI, { Request, Response, Parameter, Schema, Server } from "./openapi";
import * as fs from "fs";
import * as jsYaml from "js-yaml";

namespace gapi {
  export interface Schema {
    type: string
    comment: string
    format: string
    example: string
    properties: { [name: string]: Schema }
    items: Schema
  }

  interface Response extends Schema {
    mimetype: string
  }

  export interface ParameterSchema extends Schema {
    in: string
    required: boolean
  }

  export interface Path {
    name: string
    url: string
    tags: string[]
    comment: string
    summary: string
    method: string
    auth_required: boolean
    route_handler: boolean
    response: Response
    parameters: { [name: string]: ParameterSchema }
  }

  export interface GapiDoc {
    $extends: string | string[],
    title: string,
    description: string
    version: string
    ['app-name']: string | string[]
    ['common-response']: Schema
    paths: Path[]
    types: { [name: string]: Schema }
  }
}

function createSchema(gapiSchema: gapi.Schema, commonSchema?: any): Schema {
  const schema = new Schema(gapiSchema.type)
  schema.description = gapiSchema.comment || ''
  if (gapiSchema.hasOwnProperty('format')) { schema.format = gapiSchema.format }
  if (gapiSchema.hasOwnProperty('example')) { schema.example = gapiSchema.example }

  if (gapiSchema.type === 'array') {
    schema.items = createSchema(gapiSchema.items)
  }

  commonSchema && Object.keys(commonSchema.properties).forEach(name => {
    schema.addProperty(name, createSchema(commonSchema.properties[name]))
  })

  gapiSchema.properties && Object.keys(gapiSchema.properties).forEach(name => {
    schema.addProperty(name, createSchema(gapiSchema.properties[name]))
  });

  return schema
}

function readGapiTo(gapiFilePath: string, openApi: OpenAPI): OpenAPI {
  const doc: gapi.GapiDoc = jsYaml.safeLoad(fs.readFileSync(gapiFilePath, 'utf8'));

  doc.$extends && (Array.isArray(doc.$extends) ? doc.$extends : [doc.$extends]).forEach(item => {
    readGapiTo(path.resolve(path.dirname(gapiFilePath), item), openApi);
  });

  ['title', 'description', 'version'].forEach(name => {
    doc[name] && (openApi[name] = doc[name]);
  });

  // server
  if (doc["app-name"]) {
    const host = doc["app-name"]
    if (host instanceof Array) {
      for (let item of host) {
        openApi.addServer(new Server("https://" + item + ".test.17zuoye.net", "test server"));
        openApi.addServer(new Server("https://" + item + ".staging.17zuoye.net", "staging server"));
        openApi.addServer(new Server("https://" + item + ".17zuoye.com", "production server"));
      }
    }
    else {
      openApi.addServer(new Server("https://" + host + ".test.17zuoye.net", "test server"));
      openApi.addServer(new Server("https://" + host + ".staging.17zuoye.net", "staging server"));
      openApi.addServer(new Server("https://" + host + ".17zuoye.com", "production server"));
    }
  }

  // paths
  doc.paths && doc.paths.forEach(path => {
    const request = new Request(path.name, path.method || 'get')
    request.description = path.comment || ''
    if (path.hasOwnProperty('summary')) {
      request.summary = path.summary
    }

    path.tags && request.addTag(path.tags)

    if (path.auth_required !== undefined) {
      request['x-codegen-auth_required'] = path.auth_required || false
    }

    if (path.route_handler !== undefined) {
      request['x-codegen-route_handler'] = path.route_handler || false
    }

    const response = new Response();
    path.parameters && Object.keys(path.parameters).forEach(name => {

      const parameter = new Parameter(name, path.parameters[name].type)
      path.parameters[ name ].in && (parameter.in = path.parameters[ name ].in)
      if (parameter.schema) {
        parameter.schema.load(path.parameters[ name ])
      }
      parameter.required = path.parameters[name].required || false
      parameter.description = path.parameters[name].comment || ''
      request.addParameter(parameter)
    })

    if (path.response) {
      const schema = createSchema(path.response, doc["common-response"])

      response.content.addSchema(schema, path.response.mimetype || 'application/json')
      request.addResponse(response)
    }

    openApi.paths.addRequest(path.url, request)
  })

  if (doc.types) {
    Object.keys(doc.types).forEach(name => {
      openApi.addComponent(name, createSchema(doc.types[name]))
    })
  }

  return openApi
}

export default function readGapi(gapiFilePath: string): OpenAPI {
  const openApi: OpenAPI = new OpenAPI();
  readGapiTo(gapiFilePath, openApi);
  return openApi;
}