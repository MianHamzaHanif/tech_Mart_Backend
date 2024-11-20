import { Router } from "express";
import {
    registerUser, loginUser, logoutUser, changePasswordAfterLogin, changeUserPassword, resetUserPassword,
    getAllUser, editUserName, userDelete, getUserCount, searchUser
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route('/register').post(registerUser);

router.route("/login").post(loginUser);

router.route("/logout").get(verifyJWT, logoutUser);

router.route('/changePasswordAfterUserLogin').put(verifyJWT, changePasswordAfterLogin);

router.route('/changePassword').post(changeUserPassword);

router.route('/updatePassword').post(resetUserPassword);

router.route('/allUser').get(verifyJWT, getAllUser);

router.route('/editUserName').put(verifyJWT, editUserName);

router.route('/userDelete').delete(verifyJWT, userDelete);

router.route('/getUserLength').get(verifyJWT, getUserCount);

router.route('/searchUser').get(verifyJWT, searchUser);

export default router;