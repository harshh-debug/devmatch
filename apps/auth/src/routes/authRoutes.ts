import { Router } from "express";
import { loginUser, signupUser } from "../controllers/authControllers";

const authRouter=Router()

authRouter.post('/login',loginUser)
authRouter.post('/signup',signupUser)
authRouter.post('/oauth',)


export default authRouter