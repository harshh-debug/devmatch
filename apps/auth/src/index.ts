import express from 'express'
import authRouter from './routes/authRoutes';
const app=express()
app.use(express.json())

const PORT=process.env.PORT
if(!PORT){
    throw new Error("Port of auth service is not defined");
}

app.use('/',authRouter);
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'auth-service' }))



app.listen(PORT,()=>{
console.log(`Auth service is listening on ${PORT}`)
})