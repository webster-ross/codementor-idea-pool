import configs from './src/configs'

let uri = configs.PG_URI
if(process.env.NODE_ENV == 'test') uri += '-test'
module.exports = {client: 'pg', connection: uri}
