import  express, { type Request, type Response }  from "express";
import helmet from "helmet";
import { rateLimiter } from "./middleware/rateLimit";
import proxyRoutes from "./routes/proxy";

const app=express()
app.use(helmet())

const port=process.env.API_GATEWAY_PORT

app.use(rateLimiter)
app.use('/health',(req:Request,res:Response)=>{
    return res.json({
        status:"ok"
    })
})
app.use('/api/v1',proxyRoutes)
app.listen(port,()=>{
    console.log(`API gateway is listening at ${port}`)
})