import { Router } from "express";
import {
    registerUser, loginUser, logoutUser, refreshAccessToken, getDetailofUserViaRefreshToken,
    getDetailofUserViaAccessToken, getAllUser, changePasswordViaBody, changePassword,
    getCurrentUser
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route('/register').post(
    upload.fields([
        { name: 'avatar', maxCount: 1 },
        { name: 'coverImage', maxCount: 2 }
    ]),
    registerUser
)

router.route("/login").post(loginUser)

router.route("/logout").post(verifyJWT, logoutUser)

router.route('/refresh-token').post(refreshAccessToken);

router.route('/userInfoViaRefreshToken').get(getDetailofUserViaRefreshToken);

router.route('/userInfoViaAccessToken').get(getDetailofUserViaAccessToken);

router.route('/allUser').get(getAllUser);

router.route('/changePasswordViaBody').post(changePasswordViaBody);

router.route('/changePassword').post(verifyJWT, changePassword);

router.route('/getCurrentUser').post(verifyJWT,getCurrentUser);

export default router;