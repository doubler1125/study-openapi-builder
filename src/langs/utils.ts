import * as fs from 'fs';
import * as path from 'path';
import { Request, Response, Schema, SchemaObject } from "../openapi";

export default {
  allTypes(request: Request) {
    const types = new Set<string>();
    request.parameters && request.parameters.forEach(parameter => {
      if (parameter.schema.$ref) {
        types.add(this.typeFor(parameter.schema));
      }
      else if (parameter.schema.type === 'array' && parameter.schema.items && parameter.schema.items.$ref) {
        types.add(this.typeFor(parameter.schema.items));
      } else {
        types.add(this.typeFor(parameter.schema));
      }
    });

    return types.values();
  },

  refTypes(request: Request) {
    const refs = new Set<string>();
    request.parameters && request.parameters.forEach(parameter => {
      if (parameter.schema.$ref) {
        refs.add(this.typeFor(parameter.schema));
      }
      else if (parameter.schema.type === 'array' && parameter.schema.items && parameter.schema.items.$ref) {
        refs.add(this.typeFor(parameter.schema.items));
      }
    });

    return refs.values();
  },

  refTypesForSchemaObject(schema: SchemaObject): string[] {
    const refs = new Set<string>();
    if (!schema.properties) {
      return [];
    }

    const properties = schema.properties;
    Object.keys(properties).forEach(name => {
      if (properties[name].$ref) {
        refs.add(this.typeFor(properties[name]));
      }
      else if (properties[name].type === 'array' && properties[name].items && (properties[name].items as any).$ref) {
        refs.add(this.typeFor(properties[name].items as Schema));
      }
      else if (properties[name].type === 'object' && properties[name].properties) {
        for (const value of this.refTypesForSchemaObject(properties[name])) {
          refs.add(value);
        }
      }
    });

    return new Array(...refs.values());
  },

  refTypesForResponse(response: Response) {
    const refs = new Set<string>();
    Object.keys(response.content).forEach(mimetype => {
      const schema = response.content[mimetype];

      schema.properties && Object.keys(schema.properties).forEach(name => {
        if (schema.properties[name].$ref) {
          refs.add(this.typeFor(schema.properties[name]));
        }
        else if (schema.properties[name].type === 'array' && schema.properties[name].items && schema.properties[name].items.$ref) {
          refs.add(this.typeFor(schema.properties[name].items));
        }
      });
    })

    return refs.values();
  },

  typeFor(schema: Schema) {
    if (schema.$ref) {
      const objecType = schema.$ref.split('/');
      return `${objecType[objecType.length-1]}`;
    }

    switch (schema.type) {
      case 'integer':
      case 'int':
      case 'long':
      case 'float':
      case 'double':
        return 'number';

      case 'array':
        if (schema.items) {
          return `${this.typeFor(schema.items)}[]`;
        };

        return 'Array';

      default:
        return schema.type;
    }
  }
}

export function makedirp(dir: string) {
  const absolute = dir.startsWith(path.sep);

  const paths = dir.split(path.sep)
  for (let i=0; i<paths.length; i++) {
    dir = path.resolve(absolute?path.sep:'',...paths.slice(1, i+1))

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
  }
}
