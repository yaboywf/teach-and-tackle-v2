const aws = require("aws-sdk");
const dynamo = new aws.DynamoDB.DocumentClient();

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
        case 'GET /api/account/account-information':
            try {
                body = event.queryStringParameters;

                checkRequiredKeys(body, ["id"], callback);

                var params = {
                    TableName: "users",
                    Key: {
                        student_id: body.id
                    }
                };

                dynamo.get(params, (err, data) => {
                    if (err) throw new Error(err);

                    if (!data.Item) {
                        callback(null, {
                            statusCode: 404,
                            body: JSON.stringify({ error: "Student not found" })
                        });
                        return;
                    }

                    callback(null, {
                        statusCode: 200,
                        body: JSON.stringify(data.Item)
                    });
                });
            } catch (err) {
                callback(null, {
                    statusCode: 500,
                    body: JSON.stringify(err.message)
                });
            }

            break;
        case 'PUT /api/account/update-account':
            try {
                body = event.body;

                if (typeof body === "string") body = JSON.parse(body);

                checkRequiredKeys(body, ["diploma", "year_of_study"], callback);
                checkRequiredKeys(auth, ["authorization"], callback);

                jwt = auth.authorization.split(" ")[1];
                decoded = decodeJWT(jwt, callback);
                userId = decoded["cognito:username"].toUpperCase();

                var params = {
                    TableName: "users",
                    Key: {
                        student_id: userId
                    },
                    UpdateExpression: "set #diploma = :diploma, #year_of_study = :year_of_study",
                    ExpressionAttributeNames: {
                        "#diploma": "diploma",
                        "#year_of_study": "year_of_study"
                    },
                    ExpressionAttributeValues: {
                        ":diploma": body.diploma,
                        ":year_of_study": Number(body.year_of_study)
                    },
                };

                dynamo.update(params, (err, data) => {
                    if (err) throw new Error(err);
                    callback(null, {
                        statusCode: 200,
                        body: JSON.stringify({ message: "User Information successfully updated" })
                    });
                });
            } catch (err) {
                callback(null, {
                    statusCode: 500,
                    body: JSON.stringify(err.message)
                });
            }

            break;
        case 'DELETE /api/account/delete-account':
            if (!checkRequiredKeys(body, ["id"], callback)) return;

            var params = {
                TableName: "users",
                Key: {
                    student_id: body.id
                }
            };

            dynamo.delete(params, (err, data) => {
                if (err) throw err;
                callback(null, {
                    statusCode: 200,
                    body: JSON.stringify({ message: "User successfully deleted" })
                });
            });

            break;
        case "POST /api/account/register":
            try {
                body = event.body;

                if (typeof body === "string") body = JSON.parse(body);

                checkRequiredKeys(body, ["student_id", "name", "email", "password"], callback);

                var getParams = {
                    TableName: "users",
                    Key: {
                        student_id: body.student_id
                    }
                };
                
                dynamo.get(getParams, (err, data) => {
                    if (err) throw new Error(err);

                    if (data.Item) {
                        callback(null, {
                            statusCode: 400,
                            body: JSON.stringify({ error: "User already exists" })
                        });
                        return;
                    }

                    var postParams = {
                        TableName: "users",
                        Item: {
                            student_id: body.student_id || "",
                            name: body.name || "",
                            year_of_study: Number(body.year_of_study) || 0,
                            diploma: body.diploma || "",
                        }
                    };

                    dynamo.put(postParams, (err, data) => {
                        if (err) throw new Error(err);
                        callback(null, {
                            statusCode: 200,
                            body: JSON.stringify({ message: "User successfully registered" })
                        });
                    });
                });
            } catch (e) {
                callback(null, {
                    statusCode: 500,
                    body: JSON.stringify(e.message)
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

            if (!event.routeKey.includes('/api/account')) {
                callback(null, {
                    statusCode: 400,
                    body: JSON.stringify({ error: "This function only supports CRUD of accounts, where the routeKey starts with /api/account/* routes" })
                });
                return;
            }

            callback(null, {
                statusCode: 404,
                body: JSON.stringify({ error: `Unsupported route: "${event.routeKey}"` })
            });
    }
}