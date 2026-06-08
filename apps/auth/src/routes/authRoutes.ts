import { Router } from "express";
import { loginUser, oauthUser, signupUser } from "../controllers/authControllers";

const authRouter=Router()

authRouter.post('/login',loginUser)
authRouter.post('/signup',signupUser)
authRouter.post('/oauth',oauthUser)


export default authRouter