# Alidns

自动上报外网地址到阿里云

## Getting started
```bash
# clone the project
git clone https://github.com/hlxxzt/alidns.git

# enter the project web directory
cd alidns

# install dependency
yarn

# run
node index.js -k [AccessKeyId] -s [AccessKeySecret] -d [DOMAIN] -o
```

## Build
```bash
# clone the project
git clone https://github.com/hlxxzt/aliyun.git

# enter the project web directory
cd node-proxy

# install dependency and build. outpath: project/dist
# compile using pkg.js
yarn && yarn build
```

## Usage
```bash
Usage: alidns [options]

  -h, --help           Displays help
  -k, --key String     aliyun AccessKeyId
  -s, --secret String  aliyun AccessKeySecret
  -d, --domain String  domain example: www.aliyun.com、@.aliyun.com
  -w, --wan String     Get WAN Address URL - default: http://members.3322.org/dyndns/getip
  -t, --type String    record type - either: A, NS, MX, TXT, CNAME, SRV, AAAA, CAA, REDIRECT_URL, or FORWARD_URL - default: A
  --ttl Int            see: https://help.aliyun.com/document_detail/29806.html?spm=a2c4g.11186623.0.0.1e207a8cxJYKhg - default: 600
  -o, --one            run only once - default: false
  -i, --interval Int   perform interval, unit: minutes - default: 10
  -l, --logger Boolean | String  log file, default [cwd]/runtime.log - default: false

Version:1.0.0

Examles:
 - 每30分钟更新一次xxx.xxx.com域名的A记录，并记录日志
 $ alidns -k xxxx -s xxxx -d xxx.xxx.com -i 30 -l
```