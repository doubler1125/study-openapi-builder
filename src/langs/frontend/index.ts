// import * as nunjucks from "nunjucks"
const nunjucks = require("nunjucks")
// import * as fs from "fs"
const fs = require("fs")
const path = require("path")

// var env = new nunjucks.Environment(new nunjucks.FileSystemLoader('templates'), { autoescape: false });

function genCode(content, outPut) {

    var str = nunjucks.renderString(fs.readFileSync(path.resolve(__dirname, "templates", "service.njk")).toString(), content)

    fs.writeFileSync(outPut, str)
}

function parseSchema(val) {
    if (val.$ref) {
        return {
            type: "In" + val.$ref.split("/").pop(),
        }
    }
    switch (val.type) {
        case "integer":
            return {
                type: "number",
            }
        case "array":
            if (val.items.$ref) {
                return {
                    type: "In" + val.items.$ref.split("/").pop() + "[]",
                }
            } else {
                let properties = parseSchema(val.items)
                if (!properties.beaf) {
                    return {
                        type: properties.type + "[]",
                    }
                }
                return {
                    type: "array",
                    beaf: true,
                    properties
                }
            }
        case "object":
            let properties = {}
            Object.entries(val.properties).forEach(([key, v]) => {
                // console.log(key, v)
                // console.log("------------------------------------------------------")
                properties[key] = parseSchema(v)
            })
            return {
                type: "object",
                beaf: true,
                properties
            }
        default:
            return {
                type: val.type,
            }
    }
}

export default function (apiDoc, outPut) {
    let services = {}
    // schemas
    let schemas = {}
    Object.entries(apiDoc.components.schemas).forEach(([key, val]) => {
        // console.log(key, val)
        // console.log("==========================================================")
        schemas[key] = parseSchema(val)
    })

    // api
    Object.entries(apiDoc.paths).forEach(([path, req]) => {
        // console.log(path)
        let current = services
        let ps = []
        path.split("/").filter(p => p).forEach(p => {
            p = p.replace("-", "_")
            if (p.startsWith(":")) {
                ps.push("${" + p.slice(1) + "}")
            } else {
                ps.push(p)
                current[p] = current[p] || {}
                current = current[p]
            }
        })
        Object.entries(req).forEach(([method, R]) => {
            let parameters = {}
            R.parameters.forEach(param => {
                // console.log(param)
                // console.log("--------------------------------------------------")
                parameters[param.in] = parameters[param.in] || {}
                param.name = param.required ? param.name : param.name + "?"
                switch (param.schema.type) {
                    case "array":
                        parameters[param.in][param.name] = { type: param.schema.items.type + "[]" }
                        break;
                    case "object":
                        parameters[param.in][param.name] = { type: param.schema.type + "" }
                        break
                    case "integer":
                        parameters[param.in][param.name] = { type: "number" }
                        break
                    default:
                        parameters[param.in][param.name] = { type: param.schema.type }
                }
            })
            current[method] = {
                ...parameters,
                method,
                url: ps.join("/")
            }
            if (R.responses) {
                current[method].responses = {}
                let responses = R.responses["200"].content["application/json"].schema.properties
                // console.log(R.responses["200"].content["application/json"].schema.properties)
                // console.log("------------------------------------------------------------")
                Object.entries(responses).forEach(([name, res]: [string, any]) => {
                    current[method].responses[name] = parseSchema(res)
                })
            }
        })
    })
    // fs.writeFileSync("service.json", JSON.stringify(services, null, 4))
    // fs.writeFileSync("schemas.json", JSON.stringify(schemas, null, 4))
    genCode({ services, schemas }, outPut)
    return true
}
