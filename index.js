const aws = require("aws-sdk");
const dynamo = new aws.DynamoDB.DocumentClient();

class HttpError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = this.constructor.name;
    }
}

/**
 * Check required keys
 * 
 * @param {object} body - The request
 * @param {string[]} keys - An array of strings representing the required keys
 * @param {function} callback - The callback function
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
        case "GET /api/proficiency/user-proficiency":
            try {
                checkRequiredKeys(query, ["id"]);

                var params = {
                    TableName: "proficiency",
                    FilterExpression: "student_id = :student_id",
                    ExpressionAttributeValues: {
                        ":student_id": query.id.toUpperCase() || ""
                    }
                }

                var data = await dynamo.scan(params).promise();
                
                callback(null, {
                    statusCode: 200,
                    body: JSON.stringify(data.Items)
                });
            } catch (e) {
                handleError(e, callback);
            }

            break;
        case "POST /api/proficiency/new":
            try {
                checkRequiredKeys(query, ["type", "name"], callback);
                checkRequiredKeys(auth, ["authorization"], callback);

                jwt = auth.authorization.split(" ")[1];
                decoded = decodeJWT(jwt, callback);
                userId = decoded["cognito:username"].toUpperCase();

                var postParams = {
                    TableName: "proficiency",
                    Item: {
                        proficiency_id: Date.now(),
                        student_id: userId,
                        type: Number(query.type) || 0,
                        module: query.name || "",
                    }
                }

                await dynamo.put(postParams).promise();

                callback(null, {
                    statusCode: 200,
                    body: JSON.stringify({ "message": "Proficiency added" })
                });
            } catch (e) {
                handleError(e, callback);
            }

            break;
        case "DELETE /api/proficiency/remove":
            try {
                checkRequiredKeys(query, ["id"], callback);
                checkRequiredKeys(auth, ["authorization"], callback);

                jwt = auth.authorization.split(" ")[1];
                decoded = decodeJWT(jwt, callback);
                userId = decoded["cognito:username"].toUpperCase();

                var queryParams = {
                    TableName: "proficiency",
                    KeyConditionExpression: "proficiency_id = :id",
                    ExpressionAttributeValues: {
                        ':id': Number(query.id) || 0
                    },
                    Limit: 1
                }

                var data = await dynamo.query(queryParams).promise();
                
                if (!data.Items || data.Items.length === 0) throw new HttpError(404, "Proficiency not found");
                if (data.Items[0]?.student_id.toUpperCase() !== userId) throw new HttpError(401, "You are not authorized to delete this proficiency");

                var deleteParams = {
                    TableName: "proficiency",
                    Key: {
                        "proficiency_id": Number(query.id) || 0,
                        "student_id": userId || ""
                    }
                }

                await dynamo.delete(deleteParams).promise();
                
                callback(null, {
                    statusCode: 200,
                    body: JSON.stringify({ message: "Proficiency successfully deleted" })
                });
            } catch (e) {
                handleError(e, callback);
            }

            break;
        case "GET /api/proficiency/matchable-accounts":
            try {
                checkRequiredKeys(query, ["strength", "weakness"], callback);

                const strengths = query.strength.split(',') || [];
                const weaknesses = query.weakness.split(',') || [];

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

                var data = await dynamo.scan(params).promise();
                let uniqueStudents = [];

                data.Items.forEach(item => {
                    const studentId = item.student_id.toUpperCase();
            
                    if (!uniqueStudents.includes(studentId)) uniqueStudents.push(studentId);
                });

                callback(null, {
                    statusCode: 200,
                    body: JSON.stringify(uniqueStudents)
                });
            } catch (e) {
                handleError(e, callback);
            }

            break;
        default:
            try {
                if (!event.routeKey) throw new HttpError(400, "No routeKey provided");
                if (!event.routeKey.includes('/api/proficiency')) throw new HttpError("This function only supports CRUD of accounts, where the routeKey starts with /api/proficiency/* routes")
                throw new HttpError(404, `Unsupported route: "${event.routeKey}"`);
            } catch (err) {
                handleError(err, callback);
            }
    }
}