const logs = [];

export const logError = (error, context = {}) => {
    const logEntry = {
        message: error.message,
        stack: error.stack,
        status: error.response?.status || null,
        responseData: error.response?.data || null,
        context,
        timestamp: new Date().toISOString()
    };

    logs.push(logEntry)

    console.log("ERROR LOGGED", logEntry);
};


export const getlogs = () => logs;