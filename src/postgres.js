import {Pool} from 'pg'
import configs from './configs'

let uri = configs.PG_URI
if(process.env.NODE_ENV == 'test') uri += '-test'
const client = new Pool({connectionString: uri})
export default client
