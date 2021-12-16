# 协议生成工具
主要包含openapi文档生成（可以使用swagger工具查看）、接口代码生成（需要编写模版，目前主要支持gaia.js框架接口代码生成）

# 安装
 npm install @gaiajs/protocol_builder -g

# 组件

## 自动代码生成

### 使用方法
```
 npm run gencode
  --lang | -l <gaiajs|openapi>，可以多个参数，即同时生成多个代码或文档
  --input | -i <openapi.yaml | gapi.yaml>
  --type | -t <gapi|openapi> 输入文档类型，
  --output | -o <output path> 输出文件路径
```
