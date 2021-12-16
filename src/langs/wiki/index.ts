import * as fs from 'fs';
import * as path from 'path';
import * as nunjucks from 'nunjucks';
import OpenAPI, { Request } from "../../openapi";
import utils from '../utils';

export default async function(openApi: OpenAPI, outputPath: string): Promise<boolean> {
  try {
    fs.writeFileSync(path.resolve(outputPath, `wiki.html`), nunjucks.render(path.resolve(__dirname, 'template.njk'), {openApi, utils}));
  } catch (err) {
    console.error('generate wiki failed: ', err);
  }

  return true;
}
