import { Router } from "express";
import { linkGitHub, loginUser, oauthUser, signupUser } from "../controllers/authControllers";
import { extractUser } from "../middleware/extractUser";

const authRouter=Router()

authRouter.post('/login',loginUser)
authRouter.post('/signup',signupUser)
authRouter.post('/oauth',oauthUser)
authRouter.post("/link/github", extractUser, linkGitHub);


export default authRouter  