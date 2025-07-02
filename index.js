const aws = require("aws-sdk");
const dynamo = new aws.DynamoDB.DocumentClient();
const ses = new aws.SES({
    accessKeyId: 'AKIAR3ONUFZZAPO6S4FE',
    secretAccessKey: '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',
    region: 'ap-southeast-2'
});

class HttpError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = this.constructor.name;
    }
}

const formatUnlinkEmail = (data) => {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <body>
            <img style="width: 170px" src="https://i.ibb.co/xKZddhnQ/logo.jpg" alt="logo">
        
            <p>Dear student,</p>
            <p>A pair was recently unlinked. Please check the details below:</p>
            <p style="font-weight: bold; margin-top: 20px;">Details</p>

            <table style="margin-bottom: 20px; border-collapse: collapse; border: 1px solid black" cellpadding="10">
                <tr>
                    <td style="border: 1px solid black">Pair ID</td>
                    <td style="border: 1px solid black">${data.pair_id}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid black">Users</td>
                    <td style="border: 1px solid black">${data.receiver_id} &amp; ${data.sender_id}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid black">Day</td>
                    <td style="border: 1px solid black">${data.day}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid black">Time</td>
                    <td style="border: 1px solid black">${data.start_time} - ${data.end_time}</td>
                </tr>
            </div>
        
            <p>Best Regards,</p>
            <p>Teach &amp; Tackle Team</p>
        </body>
        </html>
    `;
}

const formatRequestAcceptedEmail = (data) => {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <body>
            <img style="width: 170px" src="https://i.ibb.co/xKZddhnQ/logo.jpg" alt="logo">

            <p>Dear student,</p>
            <p>A pair request was recently accepted. Please check the details below:</p>
            <p style="font-weight: bold; margin-top: 20px;">Details</p>
            
            <table style="margin-bottom: 20px; border-collapse: collapse; border: 1px solid black" cellpadding="10">
                <tr>
                    <td style="border: 1px solid black">Pair ID</td>
                    <td style="border: 1px solid black">${data.pair_id}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid black">Sent To</td>
                    <td style="border: 1px solid black">${data.receiver_id}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid black">Day</td>
                    <td style="border: 1px solid black">${data.day}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid black">Time</td>
                    <td style="border: 1px solid black">${data.start_time} - ${data.end_time}</td>
                </tr>
            </div>

            <p>Best Regards,</p>
            <p>Teach &amp; Tackle Team</p>
        </body>
        </html>
    `;
}

/**
 * Check required keys
 * 
 * @param {object} data - The request
 * @param {string[]} keys - An array of strings representing the required keys
*/
const checkRequiredKeys = (data, keys) => {
    if (!data) throw new HttpError(400, "Data is empty");
    if (typeof data !== 'object') throw new HttpError(400, `Data not an object. It is a ${typeof data}`);

    let missingKeys = keys.filter(key => !data.hasOwnProperty(key));
    if (missingKeys.length > 0) throw new HttpError(400, "Missing required keys: " + missingKeys.join(", "));
}

/**
 * Function to decode a JWT
 * @param {*} token - The token to decode
 * @returns {object}
 */
const decodeJWT = (token) => {
    if (!token) throw new HttpError(401, "No token provided");

    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const data = JSON.parse(decoded);
    const now = Math.floor(Date.now() / 1000);

    if (!data || !data.exp) throw new HttpError(401, "Invalid token");
    if (data.exp < now) throw new HttpError(401, "Token expired");
    return data;
}

/**
 * Function to parse JSON
 * @param {*} data 
 * @returns {object}
 */
const parseJsonSafe = (data) => {
    try {
        return data && typeof data === 'string' ? JSON.parse(data) : data || {};
    } catch (err) {
        return {};
    }
};

/**
 * Function to handle errors
 * @param {*} err 
 * @param {*} callback 
 */
const handleError = (err, callback) => {
    console.error(err.message)

    callback(null, {
        statusCode: err instanceof HttpError ? err.statusCode : 500,
        body: JSON.stringify({ error: `Error - ${err.message}`, stack: err?.stack }),
    });
}

exports.handler = async (event, context, callback) => {
    let jwt;
    let decoded;
    let userId;
    const body = parseJsonSafe(event.body)
    const query = parseJsonSafe(event.queryStringParameters);
    const auth = parseJsonSafe(event.headers);

    switch (event.routeKey) {
        case 'GET /api/pairs/user-pairs':
            try {
                checkRequiredKeys(auth, ["authorization"]);

                jwt = auth.authorization.split(" ")[1];
                decoded = decodeJWT(jwt);
                userId = decoded["cognito:username"].toUpperCase();
                
                var params = {
                    TableName: "pairs",
                    FilterExpression: "(sender_id = :user_id OR receiver_id = :user_id) AND #status = :status",
                    ExpressionAttributeNames: {
                        "#status": "status",
                    },
                    ExpressionAttributeValues: {
                        ":user_id": userId || "",
                        ":status": 2
                    }
                };

                var data = await dynamo.scan(params).promise();
                    
                if (!data.Items) throw new HttpError(404, "Student not found");

                callback(null, {
                    statusCode: 200,
                    body: JSON.stringify(data.Items)
                });
            } catch (err) {
                handleError(err, callback);
            }

            break;
        case 'DELETE /api/pairs/delete-pair':
            try {
                checkRequiredKeys(query, ["id"]);
                checkRequiredKeys(auth, ["authorization"]);

                jwt = auth.authorization.split(" ")[1];
                decoded = decodeJWT(jwt);
                userId = decoded["cognito:username"].toUpperCase();

                var queryParams = {
                    TableName: "pairs",
                    KeyConditionExpression: 'pair_id = :pair_id',
                    ExpressionAttributeValues: {
                        ':pair_id': Number(query.id)
                    },
                    Limit: 1
                };

                var data = await dynamo.query(queryParams).promise();
                    
                if (!data.Items || data.Items.length === 0) throw new HttpError(404, "Pair not found");
                if (data.Items[0]?.receiver_id !== userId && data.Items[0]?.sender_id !== userId) throw new HttpError(401, "You are not part of this pair. Hence, you are unable to delete it");

                var deletingPair = data.Items[0];
                var sender = 'teachandtackle@gmail.com';
                // uncomment during production
                // var receipient = [`${data.Items[0].sender_id}@student.tp.edu.sg`, `${data.Items[0].receiver_id}@student.tp.edu.sg`];
                var receipient = ["dylanyeo918@gmail.com"];

                var deleteParams = {
                    TableName: "pairs",
                    Key: {
                        pair_id: Number(query.id),
                        sender_id: data.Items[0]?.sender_id || "",
                    },
                };

                await dynamo.delete(deleteParams).promise();

                var params = {
                    Source: sender,
                    Destination: {
                        ToAddresses: receipient,
                    },
                    Message: {
                        Subject: {
                            Data: "Pair Unlinked",
                        },
                        Body: {
                            Html: {
                                Data: formatUnlinkEmail(deletingPair),
                            }
                        },
                    },
                };

                await ses.sendEmail(params).promise();
                
                callback(null, {
                    statusCode: 200,
                    body: JSON.stringify({ message: "Pair successfully deleted" })
                });
            } catch (err) {
                handleError(err, callback);
            }

            break;
        case 'GET /api/request/user-requests':
            try {
                checkRequiredKeys(auth, ["authorization"]);

                jwt = auth.authorization.split(" ")[1];
                decoded = decodeJWT(jwt);
                userId = decoded["cognito:username"].toUpperCase();

                var params = {
                    TableName: "pairs",
                    FilterExpression: "(sender_id = :user_id OR receiver_id = :user_id) AND #status = :status",
                    ExpressionAttributeNames: {
                        "#status": "status",
                    },
                    ExpressionAttributeValues: {
                        ":user_id": userId,
                        ":status": 1
                    }
                };

                var data = await dynamo.scan(params).promise();
                
                if (!data.Items) throw new HttpError(404, "Student not found");    

                callback(null, {
                    statusCode: 200,
                    body: JSON.stringify(data.Items)
                });
            } catch (err) {
                handleError(err, callback);
            }

            break;
        case 'DELETE /api/request/delete-request':
            try {
                checkRequiredKeys(body, ["id"]);
                checkRequiredKeys(auth, ["authorization"]);

                jwt = auth.authorization.split(" ")[1];
                decoded = decodeJWT(jwt);
                userId = decoded["cognito:username"].toUpperCase();

                var queryParams = {
                    TableName: "pairs",
                    KeyConditionExpression: 'pair_id = :pair_id',
                    ExpressionAttributeValues: {
                        ':pair_id': Number(body.id) || 0
                    },
                    Limit: 1
                };

                var data = await dynamo.query(queryParams).promise();
                
                if (!data.Items || data.Items.length === 0) throw new HttpError(404, "Pair not found");
                if (data.Items[0]?.receiver_id !== userId && data.Items[0]?.sender_id !== userId) throw new HttpError(401, "You are not part of this pair. Hence, you are unable to delete it");

                var deleteParams = {
                    TableName: "pairs",
                    Key: {
                        pair_id: Number(body.id) || 0,
                        sender_id: data.Items[0]?.sender_id || ""
                    }
                };

                await dynamo.delete(deleteParams).promise();
                
                callback(null, {
                    statusCode: 200,
                    body: JSON.stringify({ message: "Pair successfully deleted" })
                });
            } catch (err) {
                handleError(err, callback);
            }

            break;
        case "PUT /api/request/update-request-status":
            try {
                checkRequiredKeys(auth, ["authorization"]);
                checkRequiredKeys(body, ["id"]);

                jwt = auth.authorization.split(" ")[1];
                decoded = decodeJWT(jwt);
                userId = decoded["cognito:username"].toUpperCase();

                var queryParams = {
                    TableName: "pairs",
                    KeyConditionExpression: "pair_id = :pair_id",
                    FilterExpression: "#pair_status = :status",
                    ExpressionAttributeNames: {
                        "#pair_status": "status"
                    },
                    ExpressionAttributeValues: {
                        ":pair_id": Number(body.id) || 0,
                        ":status": 1
                    },
                    Limit: 1
                };

                var data = await dynamo.query(queryParams).promise();
                
                if (!data.Items || data.Items.length === 0) throw new HttpError(404, "Pair not found or pair is not in status pending");
                if (data.Items[0]?.receiver_id !== userId && data.Items[0]?.sender_id !== userId) throw new HttpError(401, "You are not part of this pair. Hence, you are unable to update it");
                
                var acceptingPair = data.Items[0];

                var sender = 'teachandtackle@gmail.com';
                // uncomment during production
                // var receipient = [`${data.Items[0].sender_id}@student.tp.edu.sg`];
                var receipient = ["dylanyeo918@gmail.com"];

                var params = {
                    TableName: "pairs",
                    Key: {
                        pair_id: Number(body.id) || 0,
                        sender_id: data.Items[0]?.sender_id || ""
                    },
                    UpdateExpression: "set #status = :status",
                    ExpressionAttributeNames: {
                        "#status": "status",
                    },
                    ExpressionAttributeValues: {
                        ":status": 2,
                    },
                };

                await dynamo.update(params).promise();
                        
                var params = {
                    Source: sender,
                    Destination: {
                        ToAddresses: receipient,
                    },
                    Message: {
                        Subject: {
                            Data: "Pair Request Accepted",
                        },
                        Body: {
                            Html: {
                                Data: formatRequestAcceptedEmail(acceptingPair),
                            }
                        },
                    },
                };

                await ses.sendEmail(params).promise();
                            
                callback(null, {
                    statusCode: 200,
                    body: JSON.stringify({ message: "Pair status successfully updated" })
                });
            } catch (err) {
                handleError(err, callback);
            }

            break;
        case "POST /api/request/new-request":
            try {
                checkRequiredKeys(body, ["receiver_id", "module", "day", "start_time", "end_time"]);
                checkRequiredKeys(auth, ["authorization"]);

                jwt = auth.authorization.split(" ")[1];
                decoded = decodeJWT(jwt);
                userId = decoded["cognito:username"].toUpperCase();

                var postParams = {
                    TableName: "pairs",
                    Item: {
                        pair_id: Date.now(),
                        sender_id: userId || "",
                        receiver_id: body.receiver_id || "",
                        module: body.module || "",
                        day: Number(body.day) || 0,
                        start_time: body.start_time || "",
                        end_time: body.end_time || "",
                        status: 1
                    }
                };

                await dynamo.put(postParams).promise();
                
                callback(null, {
                    statusCode: 200,
                    body: JSON.stringify({ message: "Request successfully created" })
                });
            } catch (err) {
                handleError(err, callback);
            }

            break;
        case "PUT /api/request/update-request-details":
            try {
                checkRequiredKeys(body, ["pair_id", "module", "day", "start_time", "end_time"]);
                checkRequiredKeys(auth, ["authorization"]);

                jwt = auth.authorization.split(" ")[1];
                decoded = decodeJWT(jwt);
                userId = decoded["cognito:username"].toUpperCase();

                var updateParams = {
                    TableName: "pairs",
                    Key: {
                        pair_id: Number(body.pair_id) || 0,
                        sender_id: userId
                    },
                    UpdateExpression: "set #module = :module, day = :day, start_time = :start_time, end_time = :end_time",
                    ExpressionAttributeNames: {
                        "#module": "module",
                    },
                    ExpressionAttributeValues: {
                        ":module": body.module || "",
                        ":day": Number(body.day) || 0,
                        ":start_time": body.start_time || "",
                        ":end_time": body.end_time || "",
                    },
                };

                await dynamo.update(updateParams).promise();
                
                callback(null, {
                    statusCode: 200,
                    body: JSON.stringify({ message: "Pair details successfully updated" })
                });
            } catch (err) {
                handleError(err, callback);
            }

            break;
        default:
            try {
                if (!event.routeKey) throw new HttpError(400, "No routeKey provided");
                if (!event.routeKey.includes('/api/request') && !event.routeKey.includes('/api/pairs')) throw new HttpError("This function only supports CRUD of accounts, where the routeKey starts with /api/request/* or /api/pairs/* routes")
                throw new HttpError(404, `Unsupported route: "${event.routeKey}"`);
            } catch (err) {
                handleError(err, callback);
            }
    }
}