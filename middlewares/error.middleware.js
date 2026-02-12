import { logError } from "../utils/logger.js";

const errorHandler = (err, req, res, next) => {
    logError(err, {
        path: req.path,
        method: req.method,
        body: req.body
    });

    res.status(500).json({
        success: false,
        message: "Something went wrong",
    });
};

export default errorHandler;