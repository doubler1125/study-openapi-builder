import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as nunjucks from 'nunjucks';
import OpenAPI, { Request } from "../../openapi";
import { makedirp } from '../utils';
import utils from './utils';

const env = new nunjucks.Environment([
  new nunjucks.FileSystemLoader(path.resolve(__dirname, 'templates'))
], {autoescape: false});

function njkEnv(): nunjucks.Environment {
  return env;
}

let _requestTemplate: nunjucks.Template
function requestTemplate(): nunjucks.Template {
  if (!_requestTemplate) {
    assert(fs.existsSync(path.resolve(__dirname, 'templates', 'request.njk')));

    _requestTemplate = nunjucks.compile(fs.readFileSync(path.resolve(__dirname, 'templates', 'request.njk')).toString(), njkEnv());
  }

  return _requestTemplate;
}

let _schemaTemplate: nunjucks.Template
function schemaTemplate(): nunjucks.Template {
  if (!_schemaTemplate) {
    assert(fs.existsSync(path.resolve(__dirname, 'templates', 'request.njk')));

    _schemaTemplate = nunjucks.compile(fs.readFileSync(path.resolve(__dirname, 'templates', 'schema.njk')).toString(), njkEnv());
  }

  return _schemaTemplate;
}

let _responseTemplate: nunjucks.Template
function responseTemplate(): nunjucks.Template {
  if (!_responseTemplate) {
    assert(fs.existsSync(path.resolve(__dirname, 'templates', 'response.njk')));

    _responseTemplate = nunjucks.compile(fs.readFileSync(path.resolve(__dirname, 'templates', 'response.njk')).toString(), njkEnv());
  }

  return _responseTemplate;
}

let _routeHandlerTemplate: nunjucks.Template
function routeHandlerTemplate(): nunjucks.Template {
  if (!_routeHandlerTemplate) {
    assert(fs.existsSync(path.resolve(__dirname, 'templates', 'handler.njk')));

    _routeHandlerTemplate = nunjucks.compile(fs.readFileSync(path.resolve(__dirname, 'templates', 'handler.njk')).toString(), njkEnv());
  }

  return _routeHandlerTemplate;
}

export default async function(openApi: OpenAPI, outputPath: string, options = {force: false}): Promise<boolean> {
  const typesPath = path.resolve(outputPath, 'types');
  makedirp(typesPath);

  Object.keys(openApi.components && openApi.components.schemas || []).forEach(name => {
    try {
      const schema = openApi.components.schemas[ name ];
      fs.writeFileSync(path.resolve(typesPath, `${name}.ts`), schemaTemplate().render({ name, schema, utils }));
    } catch (err) {
      console.error('render types failed: ', err);
    }
  });

  const requestPath = path.resolve(outputPath, 'request');
  makedirp(requestPath);

  const responsePath = path.resolve(outputPath, 'response');
  makedirp(responsePath);

  const routerPath = path.resolve(outputPath, '../routers');
  makedirp(routerPath);

  Object.keys(openApi.paths || []).forEach(pathItem => {
    let itemCount = 0;
    openApi.paths[pathItem] && Object.keys(openApi.paths[pathItem]).forEach(method => {
      if (openApi.paths[pathItem][method] instanceof Request) {
        const request: Request = openApi.paths[pathItem][method];
        try {
          const fileName = `${request.name}.ts`; //`${itemCount > 0 ? `${method}_` : ''}${request.name}.ts`;
          fs.writeFileSync(path.resolve(requestPath, fileName), requestTemplate().render({url: pathItem, request, utils}));

          request.responses && Object.keys(request.responses).forEach(statusCode => {
            const responseContent = request.responses[statusCode].content;

            Object.keys(responseContent).forEach(mimeType => {
              if (!responseContent[mimeType] || !responseContent[mimeType].schema) {
                return;
              }

              if (mimeType && mimeType !== 'application/json') {
                // 现在的模版是json response的模版
                return;
              }

              const schema = responseContent[mimeType].schema;
              fs.writeFileSync(path.resolve(responsePath, fileName), responseTemplate().render({name: request.name, response: request.responses[statusCode], utils, schema}));
            });
          });

          if (request['x-codegen-route_handler'] && (options.force || !fs.existsSync(path.resolve(routerPath, `./${pathItem}.ts`)))) {
            makedirp(path.dirname(path.resolve(routerPath, `./${pathItem}.ts`)));
            const netPath = '../'+path.relative(path.dirname(pathItem), '/net/');
            fs.writeFileSync(path.resolve(routerPath, `./${pathItem}.ts`), routeHandlerTemplate().render({request, path: pathItem, method, netPath, utils}));
          }
        } catch (err) {
          console.error('render failed', err);
        }

        itemCount ++;
      }
    })
  });

  return true;
}

export const options = {
  'o': {
    alias : 'output',
    demand: true,
    describe: 'output source code path',
    type: 'string'
  },
}
