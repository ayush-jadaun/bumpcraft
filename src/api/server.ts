import { createApp } from './app.js'

const port = parseInt(process.env.PORT ?? '3000', 10)
const app = createApp()

const server = app.listen(port, () => {
  console.log(`Bumpcraft API running on port ${port}`)
  console.log(`Dashboard: http://localhost:${port}/dashboard`)
})

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Set PORT to a different value.`)
  } else {
    console.error(`Failed to start server: ${err.message}`)
  }
  process.exit(1)
})
