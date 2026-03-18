import { createApp } from './app.js'

const port = parseInt(process.env.PORT ?? '3000', 10)
const app = createApp()

app.listen(port, () => {
  console.log(`Bumpcraft API running on port ${port}`)
  console.log(`Dashboard: http://localhost:${port}/dashboard`)
})
