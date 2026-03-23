import express from 'express'
import authRouter from './routes/authRoutes';
import prismaClient from 'db/client'
const app=express()
app.use(express.json())
prismaClient

const PORT=process.env.PORT
if(!PORT){
    throw new Error("Port of auth service is not defined");
}

app.use('/',authRouter);


app.listen(PORT,()=>{
console.log(`Auth service is listening on ${PORT}`)
})