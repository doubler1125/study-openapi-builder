'use strict';

var nunjucks = require("nunjucks");
var fs = require("fs");
var Parser = require('xml2js').Parser;
var olympusAdapter = require('./olympus-adaper');


function removeDuplicate(list)
{
    let tempList = [];
    for(let i = 0, lenI = list.length; i < lenI; i++)
    {
        let item = list[i];
        if(tempList.indexOf(item) >= 0)
        {
            list.splice(i, 1);
            i --;
            lenI --;
        }
        tempList.push(item);
    }

    return list;
}

function prepareNunjucks() {
    var env = new nunjucks.Environment(void(0), { autoescape: false, noCache: true, 
        tags: {
            blockStart: '<%',
            blockEnd: '%>',
            variableStart: '<$',
            variableEnd: '$>',
            commentStart: '<#',
            commentEnd: '#>'
          }
    });
    env.addGlobal('getCustomNames', function(fields)
    {
        let customNames = [];
        for(let field of fields)
        {
            // 添加子类型
            customNames = customNames.concat(field.type.subCustomNames);
            // 添加本身
            if(field.type.customName != null)
            {
                customNames.push(field.type.customName);
            }
        }
        return removeDuplicate(customNames);
    });

    return env;
}

var builder = (config) => {
    config = Object.assign({olympus: false}, config || {});

    return (templateFile, variables) => {
        var env = prepareNunjucks();

        if (typeof variables == "string" && fs.existsSync(variables)) {
            if (variables.toLowerCase().endsWith(".json")) {
                variables = JSON.parse(fs.readFileSync(variables));
            }
            else if (variables.toLowerCase().endsWith(".xml")) {
                (new Parser({explicitArray : false})).parseString(fs.readFileSync(variables).toString(), (err, result) => {
                    variables = result;
                });
            }
            else {
                console.err("file " + variables + " is not supported");
            }
        }
        
        console.dir(JSON.stringify(variables));
        if (config.olympus) {
            variables = olympusAdapter.resolveVariable(variables);
        }

        console.dir(JSON.stringify(variables));
    
        let template = fs.readFileSync(templateFile).toString();
        if (config.olympus) {
            template = olympusAdapter.resolveTemplate(template);
        }

        console.log(template);

        template = nunjucks.compile(template, env);

        template.render(variables, (err, res) => {
            // console.error(res);
        });
        return template.render(variables);
    };
}

module.exports = builder;
