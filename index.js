const aws = require("aws-sdk");
const dynamo = new aws.DynamoDB.DocumentClient();

const ses = new aws.SES({
    accessKeyId: 'AKIAR3ONUFZZAPO6S4FE',
    secretAccessKey: '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',
    region: 'ap-southeast-2'
});

const formatUnlinkEmail = (data) => {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Pair Unlinked</title>
        </head>
        <body>
            <style>
                p, div {
                    font-family: sans-serif;
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                p {
                    margin: 10px 0;
                }
                div > p {
                    margin: 0;
                    border-top: 1px solid black;
                    border-left: 1px solid black;
                    padding: 5px 20px;
                }
                div > p:nth-child(even) {
                    border-right: 1px solid black;
                }
                div > p:nth-last-child(-n+2) {
                    border-bottom: 1px solid black;
                }
                img {
                    width: 170px;
                }
                div {
                    display: grid;
                    grid-template-columns: repeat(2, max-content);
                    margin-bottom: 20px;
                }
            </style>
        
            <img src="https://i.ibb.co/YB2wsB5N/logo.webp" alt="logo">
        
            <p>Dear student,</p>
        
            <p>A pair was recently unlinked. Please check the details below:</p>
        
            <p style="font-weight: bold; margin-top: 20px;">Details</p>
            <div>
                <p>Pair ID</p>
                <p>${data.pair_id}</p>
        
                <p>Users</p>
                <p>${data.receiver_id} &amp; ${data.sender_id}</p>
        
                <p>Day</p>
                <p>${data.day}</p>
        
                <p>Time</p>
                <p>${data.start_time} - ${data.end_time}</p>
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
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Pair Request Accepted</title>
        </head>
        <body>
            <style>
                p, div {
                    font-family: sans-serif;
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                p {
                    margin: 10px 0;
                }
                div > p {
                    margin: 0;
                    border-top: 1px solid black;
                    border-left: 1px solid black;
                    padding: 5px 20px;
                }
                div > p:nth-child(even) {
                    border-right: 1px solid black;
                }
                div > p:nth-last-child(-n+2) {
                    border-bottom: 1px solid black;
                }
                img {
                    width: 170px;
                }
                div {
                    display: grid;
                    grid-template-columns: repeat(2, max-content);
                    margin-bottom: 20px;
                }
            </style>

            <img src="https://i.ibb.co/YB2wsB5N/logo.webp" alt="logo">

            <p>Dear student,</p>

            <p>A pair request was recently accepted. Please check the details below:</p>

            <p style="font-weight: bold; margin-top: 20px;">Details</p>
            <div>
                <p>Pair ID</p>
                <p>${data.pair_id}</p>

                <p>Sent To</p>
                <p>${data.receiver_id}</p>

                <p>Day</p>
                <p>${data.day}</p>

                <p>Time</p>
                <p>${data.start_time} - ${data.end_time}</p>
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
 * @param {object} body - The request
 * @param {string[]} keys - An array of strings representing the required keys
 * @param {function} callback - The callback function
*/
const checkRequiredKeys = (body, keys, callback) => {
    try {
        if (!body) {
            throw new Error("Body is empty");
        }

        if (typeof body !== 'object') {
            throw new Error(`Body not an object. It is a ${typeof body}`);
        }

        let missingKeys = keys.filter(key => !body.hasOwnProperty(key));
        if (missingKeys.length > 0) {
            callback(null, {
                statusCode: 400,
                body: JSON.stringify({ error: "Missing required keys: " + missingKeys.join(", ") })
            });
        }
    } catch (e) {
        callback(null, {
            statusCode: 500,
            body: JSON.stringify({ error: `Failed to check required keys: ${e.message}` })
        });
    }
}

/**
 * Function to decode a JWT
 * @param {*} token - The token to decode
 * @returns {object}
 */
const decodeJWT = (token, callback) => {
    if (!token) return null;

    try {
        const payload = token.split('.')[1];
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decoded);
    } catch (e) {
        callback(null, {
            statusCode: 500,
            body: JSON.stringify({ error: `Failed to decode JWT: ${e.message}` })
        });
        return null;
    }
}

exports.handler = (event, context, callback) => {
    let body;
    let jwt;
    let decoded;
    let userId;
    const auth = event.headers;

    switch (event.routeKey) {
        case 'GET /api/pairs/user-pairs':
            try {
                checkRequiredKeys(auth, ["authorization"], callback);

                jwt = auth.authorization.split(" ")[1];
                decoded = decodeJWT(jwt, callback);
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

                dynamo.scan(params, (err, data) => {
                    if (err) throw new Error(err);

                    if (!data.Items) {
                        callback(null, {
                            statusCode: 404,
                            body: JSON.stringify({ error: "Student not found" })
                        });
                        return;
                    }

                    callback(null, {
                        statusCode: 200,
                        body: JSON.stringify(data.Items)
                    });
                });
            } catch (err) {
                callback(null, {
                    statusCode: 500,
                    body: JSON.stringify({ error: err })
                });
            }

            break;
        case 'DELETE /api/pairs/delete-pair':
            try {
                body = event.queryStringParameters;

                if (typeof body === "string") body = JSON.parse(body);

                checkRequiredKeys(body, ["id"], callback);
                checkRequiredKeys(auth, ["authorization"], callback);

                jwt = auth.authorization.split(" ")[1];
                decoded = decodeJWT(jwt, callback);
                userId = decoded["cognito:username"].toUpperCase();

                var queryParams = {
                    TableName: "pairs",
                    KeyConditionExpression: 'pair_id = :pair_id',
                    ExpressionAttributeValues: {
                        ':pair_id': Number(body.id)
                    },
                    Limit: 1
                };

                dynamo.query(queryParams, (err, data) => {
                    if (err) throw new Error(err);

                    if (!data.Items || data.Items.length === 0) {
                        callback(null, {
                            statusCode: 404,
                            body: JSON.stringify({ error: "Pair not found" })
                        });
                        return;
                    }

                    if (data.Items[0]?.receiver_id !== userId && data.Items[0]?.sender_id !== userId) {
                        callback(null, {
                            statusCode: 401,
                            body: JSON.stringify({ error: "You are not part of this pair. Hence, you are unable to delete it" })
                        });
                        return;
                    }

                    var deletingPair = data.Items[0];
                    const sender = 'teachandtackle@gmail.com';
                    // uncomment during production
                    // const receipient = [`${data.Items[0].sender_id}@student.tp.edu.sg`, `${data.Items[0].receiver_id}@student.tp.edu.sg`];
                    const receipient = ["dylanyeo918@gmail.com"];

                    var deleteParams = {
                        TableName: "pairs",
                        Key: {
                            pair_id: Number(body.id),
                            sender_id: data.Items[0]?.sender_id || "",
                        },
                    };

                    dynamo.delete(deleteParams, (err, data) => {
                        if (err) throw new Error(err);

                        const params = {
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

                        ses.sendEmail(params, (err, data) => {
                            if (err) throw new Error(err);
                            callback(null, {
                                statusCode: 200,
                                body: JSON.stringify({ message: "Pair successfully deleted" })
                            });
                        });
                    });
                });
            } catch (err) {
                callback(null, {
                    statusCode: 500,
                    body: JSON.stringify(err.message)
                });
            }

            break;
        case 'GET /api/request/user-requests':
            try {
                checkRequiredKeys(auth, ["authorization"], callback);

                jwt = auth.authorization.split(" ")[1];
                decoded = decodeJWT(jwt, callback);
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

                dynamo.scan(params, (err, data) => {
                    if (err) throw new Error(err);

                    if (!data.Items) {
                        callback(null, {
                            statusCode: 404,
                            body: JSON.stringify({ error: "Student not found" })
                        });
                        return;
                    }

                    callback(null, {
                        statusCode: 200,
                        body: JSON.stringify(data.Items)
                    })
                });
            } catch (err) {
                callback(null, {
                    statusCode: 500,
                    body: JSON.stringify(err.message)
                });
            }

            break;
        case 'DELETE /api/request/delete-request':
            try {
                body = event.queryStringParameters;

                if (typeof body === "string") body = JSON.parse(body);

                checkRequiredKeys(body, ["id"], callback);
                checkRequiredKeys(auth, ["authorization"], callback);

                jwt = auth.authorization.split(" ")[1];
                decoded = decodeJWT(jwt, callback);
                userId = decoded["cognito:username"].toUpperCase();

                var queryParams = {
                    TableName: "pairs",
                    KeyConditionExpression: 'pair_id = :pair_id',
                    ExpressionAttributeValues: {
                        ':pair_id': Number(body.id) || 0
                    },
                    Limit: 1
                };

                dynamo.query(queryParams, (err, data) => {
                    if (err) throw new Error(err);

                    if (!data.Items || data.Items.length === 0) {
                        callback(null, {
                            statusCode: 404,
                            body: JSON.stringify({ error: "Pair not found" })
                        });
                        return;
                    }

                    if (data.Items[0]?.receiver_id !== userId && data.Items[0]?.sender_id !== userId) {
                        callback(null, {
                            statusCode: 401,
                            body: JSON.stringify({ error: "You are not part of this pair. Hence, you are unable to delete it" })
                        });
                        return;
                    }

                    var deleteParams = {
                        TableName: "pairs",
                        Key: {
                            pair_id: Number(body.id) || 0,
                            sender_id: data.Items[0]?.sender_id || ""
                        }
                    };

                    dynamo.delete(deleteParams, (err1, data) => {
                        if (err1) throw new Error(err1);
                        callback(null, {
                            statusCode: 200,
                            body: JSON.stringify({ message: "Pair successfully deleted" })
                        });
                    });
                })
            } catch (err) {
                callback(null, {
                    statusCode: 500,
                    body: JSON.stringify(err.message)
                });
            }

            break;
        case "PUT /api/request/update-request-status":
            try {
                body = event.body;

                if (typeof body === "string") body = JSON.parse(body);

                checkRequiredKeys(auth, ["authorization"], callback);
                checkRequiredKeys(body, ["id"], callback);

                jwt = auth.authorization.split(" ")[1];
                decoded = decodeJWT(jwt, callback);
                userId = decoded["cognito:username"].toUpperCase();

                var queryParams = {
                    TableName: "pairs",
                    KeyConditionExpression: "pair_id = :pair_id",
                    ExpressionAttributeValues: {
                        ":pair_id": Number(body.id) || 0
                    },
                    Limit: 1
                };

                dynamo.query(queryParams, (err, data) => {
                    if (err) throw new Error(err);

                    if (!data.Items || data.Items.length === 0) {
                        callback(null, {
                            statusCode: 404,
                            body: JSON.stringify({ error: "Pair not found" })
                        });
                        return;
                    }

                    if (data.Items[0]?.receiver_id !== userId && data.Items[0]?.sender_id !== userId) {
                        callback(null, {
                            statusCode: 401,
                            body: JSON.stringify({ error: "You are not part of this pair. Hence, you are unable to update it" })
                        });
                        return;
                    }

                    var acceptingPair = data.Items[0];
                    const sender = 'teachandtackle@gmail.com';
                    // uncomment during production
                    // const receipient = [`${data.Items[0].sender_id}@student.tp.edu.sg`];
                    const receipient = ["dylanyeo918@gmail.com"];

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

                    dynamo.update(params, (err, data) => {
                        if (err) throw new Error(err);

                        const params = {
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

                        callback(null, {
                            statusCode: 200,
                            body: JSON.stringify(formatRequestAcceptedEmail(acceptingPair))
                        });
                        return;

                        ses.sendEmail(params, (err, data) => {
                            if (err) throw new Error(err);
                            callback(null, {
                                statusCode: 200,
                                body: JSON.stringify({ message: "Pair status successfully updated" })
                            });
                        });
                    });
                });
            } catch (err) {
                callback(null, {
                    statusCode: 500,
                    body: JSON.stringify(err.message)
                });
            }

            break;
        case "POST /api/request/new-request":
            try {
                body = event.body;

                if (typeof body === "string") body = JSON.parse(body);

                checkRequiredKeys(body, ["receiver_id", "module", "day", "start_time", "end_time"], callback);
                checkRequiredKeys(auth, ["authorization"], callback);

                jwt = auth.authorization.split(" ")[1];
                decoded = decodeJWT(jwt, callback);
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

                dynamo.put(postParams, (err, data) => {
                    if (err) throw new Error(err);
                    callback(null, {
                        statusCode: 200,
                        body: JSON.stringify({ message: "Request successfully created" })
                    });
                });
            } catch (err) {
                callback(null, {
                    statusCode: 500,
                    body: JSON.stringify(err.message)
                });
            }

            break;
        case "PUT /api/request/update-request-details":
            try {
                body = event.body;

                if (typeof body === "string") body = JSON.parse(body);

                checkRequiredKeys(body, ["pair_id", "module", "day", "start_time", "end_time"], callback);
                checkRequiredKeys(auth, ["authorization"], callback);

                jwt = auth.authorization.split(" ")[1];
                decoded = decodeJWT(jwt, callback);
                userId = decoded["cognito:username"].toUpperCase();

                var updateParams = {
                    TableName: "pairs",
                    Key: {
                        pair_id: Number(body.pair_id) || 0,
                        sender_id: userId
                    },
                    UpdateExpression: "set #module = :module, #day = :day, #start_time = :start_time, #end_time = :end_time",
                    ExpressionAttributeNames: {
                        "#module": "module",
                        "#day": "day",
                        "#start_time": "start_time",
                        "#end_time": "end_time"
                    },
                    ExpressionAttributeValues: {
                        ":module": body.module || "",
                        ":day": Number(body.day) || 0,
                        ":start_time": body.start_time || "",
                        ":end_time": body.end_time || "",
                    },
                };

                dynamo.update(updateParams, (err, data) => {
                    if (err) throw new Error(err);
                    callback(null, {
                        statusCode: 200,
                        body: JSON.stringify({ message: "Pair details successfully updated" })
                    });
                });
            } catch (err) {
                callback(null, {
                    statusCode: 500,
                    body: JSON.stringify(err.message)
                });
            }

            break;
        default:
            if (!event.routeKey) {
                callback(null, {
                    statusCode: 400,
                    body: JSON.stringify({ error: "Missing routeKey" })
                });
                return;
            }

            if (!event.routeKey.includes('/api/request') && !event.routeKey.includes('/api/pairs')) {
                callback(null, {
                    statusCode: 400,
                    body: JSON.stringify({ error: "This function only supports CRUD of accounts, where the routeKey starts with /api/request/* or /api/pairs/* routes" })
                });
                return;
            }

            callback(null, {
                statusCode: 404,
                body: JSON.stringify({ error: `Unsupported route: "${event.routeKey}"` })
            });
    }
}