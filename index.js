const { appendFileSync } = require('fs')
const { join } = require('path')
const readline = require('readline')
const axios = require('axios')
const Optionator = require('optionator')
const pkg = require('./package.json')
const Alidns = require('@alicloud/alidns20150109')
const OpenApi = require('@alicloud/openapi-client')

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

let loggerPath = ''
/**
 * @type {{
 *      help: string, key: string, secret: string, domain: string,
 *      wan: string, ttl: number, one: boolean, interval: number,
 *      logger: boolean | string,
 *      type: 'A' | 'NS' |' MX' | 'TXT' | 'CNAME' | 'SRV' | 'AAAA' | 'CAA' | 'REDIRECT_URL'  | 'FORWARD_URL'
 * }}
 */
let args = {}
/**
 * @type { Alidns }
 */
let client


function date_format() {
	const dt = new Date()
	let fmt = 'MM-dd hh:mm:ss'
	let o = { 'M+': dt.getMonth() + 1, 'd+': dt.getDate(), 'h+': dt.getHours(), 'm+': dt.getMinutes(), 's+': dt.getSeconds() }
	for (let k of Object.keys(o)) {
		if (new RegExp('(' + k + ')').test(fmt))
			fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (('00' + o[k]).substr(("" + o[k]).length)))
	}
	return dt.getFullYear() + '-' + fmt
}

const logger = {
	output(type, msg){
		const str = `[${ date_format() }][${ type }]: ${ msg }`
		console.log(str)
		try {
			appendFileSync(loggerPath, str + '\n')
		}catch {}
	},
	log(msg){
		logger.output('INFO', msg)
	},
	error(msg){
		logger.output('ERROR', msg)
	}
}


async function getWanIp(){
	try {
		const res = await axios.get(args.wan)
		if (res.status === 200){
			return (res.data).trim()
		}
	}catch {}
	return ''
}

async function getRecord(){
	try {
		const arr = args.domain.split('.')
		const RR = arr.splice(0, 1)[0]
		const domainName = arr.join('.')
		const records = await client.describeDomainRecords(new Alidns.DescribeDomainRecordsRequest({ domainName: domainName, type: args.type }))
		if (records.body.totalCount > 0 && records.body.domainRecords.record.length > 0) {
			const record = records.body.domainRecords.record.find(x => x.RR.startsWith(RR))
			if (record){
				return { recordId: record.recordId, value: record.value, RR }
			}
		}
		logger.error('domain information not found or invalid')
		return undefined
	}catch (e) {
		logger.error(e.message)
	}
	return undefined
}

async function handleDDNS(){
	const wan_ip = await getWanIp()
	if (!wan_ip){
		logger.error(`get wan ip is empty`)
		return
	}
	logger.log(`current wan ip is: ${ wan_ip }`)
	const res = await getRecord()
	if (!res) return
	const { recordId, value, RR } = res
	logger.log(`current domain ${ args.type } value is: ${ value }`)
	if (wan_ip === value){
		logger.log(`no need to modify`)
		return
	}
	try {
		const updateDomainRecordRequest = new Alidns.UpdateDomainRecordRequest({
			recordId, RR, type: args.type, value: wan_ip, ttl: args.ttl
		})
		const updateDomainRecordResponse = await client.updateDomainRecord(updateDomainRecordRequest)
		if (updateDomainRecordResponse.body.recordId === recordId){
			logger.log(`update domain ${ args.type } success`)
		}
	}catch (e) {
		logger.error(e.message)
	}
}

async function Main(){
	const optionator = Optionator({
		prepend: `Usage: ${ pkg.name } [options]`,
		append: 'Version:' + pkg.version,
		options: [
			{ option: 'help', alias: 'h', type: 'Boolean', description: 'Displays help' },
			{ option: 'key', alias: 'k', type: 'String', required: true, description: 'aliyun AccessKeyId' },
			{ option: 'secret', alias: 's', type: 'String', required: true, description: 'aliyun AccessKeySecret' },
			{ option: 'domain', alias: 'd',type: 'String', required: true, description: 'domain example: www.aliyun.com、@.aliyun.com' },
			{ option: 'wan', alias: 'w',type: 'String', default: 'http://members.3322.org/dyndns/getip', description: 'Get WAN Address URL' },
			{ option: 'type', alias: 't', type: 'String', enum: 'A,NS,MX,TXT,CNAME,SRV,AAAA,CAA,REDIRECT_URL,FORWARD_URL'.split(','), default: 'A', description: 'record type' },
			{ option: 'ttl', type: 'Int', default: '600', description: 'see: https://help.aliyun.com/document_detail/29806.html?spm=a2c4g.11186623.0.0.1e207a8cxJYKhg' },
			{ option: 'one', alias: 'o', type: 'Boolean', default: 'false', description: 'run only once' },
			{ option: 'interval', alias: 'i', type: 'Int', default: '10', description: 'perform interval, unit: minutes' },
			{ option: 'logger', alias: 'l', type: 'Boolean | String', default: 'false', description: 'log file, default [cwd]/runtime.log' },
		]
	});
	let answer = ''
	if (process.argv.length === 2){
		console.log(optionator.generateHelp())
		try {
			answer = await (new Promise(resolve => rl.question('please enter options or exit or q: ', (r) => resolve(r))))
			if (!answer || answer.toLowerCase() === 'q' || answer.toLowerCase() === 'exit'){
				process.exit()
			}
		}catch{
			process.exit()
		}
	}
	try {
		args = optionator.parse(answer || process.argv)
	}catch (e) {
		console.log(e.message)
		process.exit()
	}
	
	if (args.help) {
		console.log(optionator.generateHelp())
		process.exit()
	}
	if (args.logger === true){
		loggerPath = join(process.cwd(), 'runtime.log')
	}else {
		if (args.logger !== false) {
			loggerPath = args.logger
		}
	}
	if (args.domain.split('.').length < 2){
		logger.error('domain incorrect format, example: www.aliyun.com、git.xxx.com')
	}
	client = new Alidns.default(new OpenApi.Config({ accessKeyId: args.key, accessKeySecret: args.secret, endpoint: 'alidns.cn-hangzhou.aliyuncs.com' }))
	if (!await getRecord()){
		process.exit()
	}
	if (args.one){
		await handleDDNS()
		process.exit()
	}
	async function handle() {
		await handleDDNS()
		setTimeout(handle, 1000 * 60 * args.interval)
	}
	await handle()
}
Main()
