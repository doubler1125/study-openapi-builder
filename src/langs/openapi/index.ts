import * as fs from 'fs';
import * as path from 'path';
import OpenAPI from "../../openapi";
import { makedirp } from '../utils';

export default async function(openApi: OpenAPI, outputPath: string): Promise<boolean> {
  makedirp(outputPath);

  try {
    fs.writeFileSync(path.resolve(outputPath, `api.yaml`), openApi.dump());
  } catch (err) {
    console.error('generate openapi yaml failed: ', err);
  }

  return true;
}
