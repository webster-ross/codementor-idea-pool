import 'babel-polyfill'
import createServer from './server'
import configs from './configs'

// start server
createServer().listen(configs.PORT)
