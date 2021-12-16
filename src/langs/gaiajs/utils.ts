import utils from '../utils';
import { Schema } from "../../openapi";

Object.assign(utils, {
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
      case 'id':
        return 'number';

      case 'string':
      case 'email':
      case 'password':
      case 'url':
        return 'string';

      case 'date':
      case 'datetime':
      case 'dateTime':
        return 'Date';
      
      case 'array':
        if (schema.items) {
          if ((schema.items.type === 'object' && (schema.items.$ref || schema.items.properties)) || schema.items.type === 'array') {
            return `Array<${this.typeFor(schema.items)}>`;
          } else {
            return `${this.typeFor(schema.items)}[]`;
          }
        };

        return 'Array';

      case 'map':
        return `Map<string, ${this.typeFor(schema.additionalProperties)}>`;

      case 'object':
        if (schema.properties) {
          return '{ ' + Object.keys(schema.properties).map(name => {
            let type = this.typeFor(schema.properties[name]);
            if (schema.properties[name].format === 'enum') {
              type = schema.properties[name].enum.map(v => {return `'${v}'`}).join(' | ');
            }
            return name + ': ' + type;
          }).join('; ') + ' }';
        }
        return schema.format || schema.type;

      default:
        return schema.format || schema.type;
    }
  },

  // 在validator中声明的类型
  primitiveType(schema: Schema) {
    if (['object', 'array', 'date', 'dateTime', 'datetime', 'id', 'email', 'password', 'url', 'enum'].indexOf(schema.type) >= 0) {
      return schema.type;
    }

    return this.typeFor(schema);
  },

  // validatorType(schema: Schema) {
  //   return schema
  // }
});

export default utils;
