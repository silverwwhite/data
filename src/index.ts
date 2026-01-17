import { serve } from '@hono/node-server'
import { Hono } from 'hono'

import db from './db/index.js' 
import hotelRoutes from './Hotel/index.js'

const app = new Hono()

app.route('/api/hotels',hotelRoutes)


app.route('/api/room',roomRoutes)

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})