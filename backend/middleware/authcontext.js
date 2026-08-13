import dotenv from "dotenv";
import {verifytoken} from "../utility/helper.js";
dotenv.config();

 const middleware = (req,res,next) => {
    const token = req.cookies.token? req.cookies.token : req.headers['token'];
    if(!token) {
        return res.status(401).json({message:"Unauthorized: No token provided"});
    }
    try{
        const decoded = verifytoken(token);
        if(!decoded){
            return res.status(401).json({message:"Unauthorized: Invalid token"});
        }
        req.user = decoded;
        next();
    } catch(err){
        return res.status(401).json({message:"Unauthorized: Invalid token", error:err.message});
    }
}

export default middleware;