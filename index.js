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
            body: JSON.stringify({ error: `Failed to check required keys: ${e}` })
        });
    }
}

/**
 * Function to decode a JWT
 * @param {*} token - The token to decode
 * @returns {object}
 */
const decodeJWT = (token) => {
    if (!token) return null;

    try {
        const payload = token.split('.')[1];
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decoded);
    } catch (e) {
        callback(null, {
            statusCode: 500,
            body: JSON.stringify({ error: `Failed to decode JWT: ${e}` })
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
        case "GET /api/proficiency/user-proficiency":
            try {
                body = event.queryStringParameters

                if (typeof body === "string") body = JSON.parse(body);

                checkRequiredKeys(body, ["id"], callback);

                var params = {
                    TableName: "proficiency",
                    FilterExpression: "student_id = :student_id",
                    ExpressionAttributeValues: {
                        ":student_id": body.id.toUpperCase() || ""
                    }
                }

                dynamo.scan(params, (err, data) => {
                    if (err) throw new Error(err);
                    callback(null, {
                        statusCode: 200,
                        body: JSON.stringify(data.Items)
                    });
                })
            } catch (e) {
                callback(null, {
                    statusCode: 500,
                    body: JSON.stringify(e.message)
                });
            }

            break;
        case "POST /api/proficiency/new":
            try {
                body = event.queryStringParameters

                if (typeof body === "string") body = JSON.parse(body);

                checkRequiredKeys(body, ["type", "name"], callback);
                checkRequiredKeys(auth, ["authorization"], callback);

                jwt = auth.authorization.split(" ")[1];
                decoded = decodeJWT(jwt, callback);
                userId = decoded["cognito:username"].toUpperCase();

                var postParams = {
                    TableName: "proficiency",
                    Item: {
                        proficiency_id: Date.now(),
                        student_id: userId,
                        type: Number(body.type) || 0,
                        module: body.name || "",
                    }
                }

                dynamo.put(postParams, (err, data) => {
                    if (err) throw new Error(err);
                    callback(null, {
                        statusCode: 200,
                        body: JSON.stringify({ "message": "Proficiency added" })
                    });
                })
            } catch (e) {
                callback(null, {
                    statusCode: 500,
                    body: JSON.stringify(e.message)
                });
            }

            break;
        case "DELETE /api/proficiency/remove":
            try {
                body = event.queryStringParameters;

                if (typeof body === "string") body = JSON.parse(body);

                checkRequiredKeys(body, ["id"], callback);
                checkRequiredKeys(auth, ["authorization"], callback);

                jwt = auth.authorization.split(" ")[1];
                decoded = decodeJWT(jwt, callback);
                userId = decoded["cognito:username"].toUpperCase();

                var queryParams = {
                    TableName: "proficiency",
                    KeyConditionExpression: "proficiency_id = :id",
                    ExpressionAttributeValues: {
                        ':id': Number(body.id) || 0
                    },
                    Limit: 1
                }

                dynamo.query(queryParams, (err, data) => {
                    if (err) throw new Error(err);

                    if (!data.Items || data.Items.length === 0) {
                        callback(null, {
                            statusCode: 404,
                            body: JSON.stringify({ error: "Proficiency not found" })
                        });
                        return;
                    }

                    if (data.Items[0]?.student_id.toUpperCase() !== userId) {
                        callback(null, {
                            statusCode: 401,
                            body: JSON.stringify({ error: "You are not authorized to delete this proficiency" })
                        });
                        return;
                    }

                    var deleteParams = {
                        TableName: "proficiency",
                        Key: {
                            "proficiency_id": Number(body.id) || 0,
                            "student_id": userId || ""
                        }
                    }

                    dynamo.delete(deleteParams, (err, data) => {
                        if (err) throw new Error(err);
                        callback(null, {
                            statusCode: 200,
                            body: JSON.stringify({ message: "Proficiency successfully deleted" })
                        });
                    })
                })
            } catch (e) {
                callback(null, {
                    statusCode: 500,
                    body: JSON.stringify(e.message)
                });
            }

            break;
        case "GET /api/proficiency/matchable-accounts":
            try {
                body = event.queryStringParameters

                if (typeof body === "string") body = JSON.parse(body);

                checkRequiredKeys(body, ["strength", "weakness"], callback);

                const strengths = body.strength.split(',') || [];
                const weaknesses = body.weakness.split(',') || [];

                const strengthParts = strengths.map((_, i) => `#mod = :mStrength${i}`);
                const strengthFilterExpression = strengthParts.join(' OR ');

                const weaknessParts = weaknesses.map((_, i) => `#mod = :mWeakness${i}`);
                const weaknessFilterExpression = weaknessParts.join(' OR ');

                const finalFilterExpression = `(#type = :typeWeakness AND (${strengthFilterExpression})) OR (#type = :typeStrength AND (${weaknessFilterExpression}))`;

                let expressionAttributeValues = {
                    ":typeStrength": 1,
                    ":typeWeakness": { N: "2" }
                };

                strengths.forEach((mod, i) => expressionAttributeValues[`:mStrength${i}`] = mod);
                weaknesses.forEach((mod, i) => expressionAttributeValues[`:mWeakness${i}`] = mod);

                const params = {
                    TableName: "proficiency",
                    FilterExpression: finalFilterExpression,
                    ExpressionAttributeNames: {
                        "#type": "type",
                        "#mod": "module"
                    },
                    ExpressionAttributeValues: expressionAttributeValues
                };

                dynamo.scan(params, (err, data) => {
                    if (err) throw new Error(err);

                    let uniqueStudents = [];

                    data.Items.forEach(item => {
                        const studentId = item.student_id.toUpperCase();
                
                        if (!uniqueStudents.includes(studentId)) uniqueStudents.push(studentId);
                    });

                    callback(null, {
                        statusCode: 200,
                        body: JSON.stringify(uniqueStudents)
                    });
                });
            } catch (e) {
                callback(null, {
                    statusCode: 500,
                    body: JSON.stringify(e)
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

            if (!event.routeKey.includes('/api/proficiency')) {
                callback(null, {
                    statusCode: 400,
                    body: JSON.stringify({ error: "This function only supports CRUD of accounts, where the routeKey starts with /api/proficiency/* routes" })
                });
                return;
            }

            callback(null, {
                statusCode: 404,
                body: JSON.stringify({ error: `Unsupported route: "${event.routeKey}"` })
            });
    }
}