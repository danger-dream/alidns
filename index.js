// noinspection ExceptionCaughtLocallyJS

const Alidns = require('@alicloud/alidns20150109')
const OpenApi = require('@alicloud/openapi-client')
const express = require('express')
const port = 80
const app = express()
const logger = []


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

async function getRecord(client, domain, type){
	const arr = domain.split('.')
	const RR = arr.splice(0, 1)[0]
	const domainName = arr.join('.')
	const records = await client.describeDomainRecords(new Alidns.DescribeDomainRecordsRequest({ domainName, type }))
	if (records.body.totalCount > 0 && records.body.domainRecords.record.length > 0) {
		const record = records.body.domainRecords.record.find(x => x.RR.startsWith(RR))
		if (record){
			return { recordId: record.recordId, value: record.value, RR }
		}
	}
	throw new Error('domain information not found or invalid')
}

//  http://xxxxxxxx/alidns?key=&secret=&domain=&ip=
app.get('/alidns', async function (req, res){
	/**
	 * @type {{
	 *      key: string, secret: string, domain: string,
	 *      ip: string, ttl: number,
	 *      type: 'A' | 'NS' |' MX' | 'TXT' | 'CNAME' | 'SRV' | 'AAAA' | 'CAA' | 'REDIRECT_URL'  | 'FORWARD_URL'
	 * }}
	 */
	const args = Object.assign({ type: 'A', ttl: 600 }, JSON.parse(JSON.stringify(req.query)))
	let msg = ''
	try {
		if (args.domain.split('.').length < 2){
			throw new Error('domain incorrect format, example: www.aliyun.com、git.xxx.com')
		}
		const client = new Alidns.default(new OpenApi.Config({ accessKeyId: args.key, accessKeySecret: args.secret, endpoint: 'alidns.cn-hangzhou.aliyuncs.com' }))
		const record = await getRecord(client, args.domain, args.type)
		const { recordId, value, RR } = record
		if (args.ip === value){
			throw new Error('no need to modify')
		}
		const updateDomainRecordRequest = new Alidns.UpdateDomainRecordRequest({ recordId, RR, type: args.type, value: args.ip, ttl: args.ttl })
		const updateDomainRecordResponse = await client.updateDomainRecord(updateDomainRecordRequest)
		if (updateDomainRecordResponse.body.recordId === recordId){
			msg = `update [${ args.domain }][${ args.type }] -> [${ args.ip }] success`
		}
	}catch (e) {
		msg = `update error: ${ e.message }`
	}
	logger.push({ time: date_format(), msg, params: args })
	res.end(msg)
})

app.get('/', function (req, res) {
	if (req.query.token !== '147258'){
		res.end('????????')
	}else {
		res.end(JSON.stringify(logger, undefined, '\t'))
	}
})

app.listen(port, '0.0.0.0',function (){
	console.log('ddns app start, listen addr: http://localhost:' + port)
})